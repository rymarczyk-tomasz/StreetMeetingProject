const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { app, api, createUser, freshIp, PASSWORD, usersDb } = require("./helpers");
const passwordResetTokensDb = require("../src/db/passwordResetTokens");

function cookieNames(res) {
    return (res.headers["set-cookie"] || []).map((c) => c.split("=")[0]);
}

function login(agent, email, password = PASSWORD, ip = freshIp()) {
    return agent.post("/api/auth/login").set("X-Forwarded-For", ip).send({ email, password });
}

describe("rejestracja", () => {
    test("tworzy konto i od razu loguje", async () => {
        const res = await api().post("/api/auth/register").send({
            email: "Nowy@Example.com ",
            password: "dlugie-haslo",
            firstName: "Anna",
            acceptTerms: true,
        });
        assert.equal(res.status, 201);
        assert.equal(res.body.user.email, "nowy@example.com");
        assert.equal(res.body.user.role, "user");
        assert.deepEqual(cookieNames(res).sort(), ["access_token", "refresh_token"]);
    });

    test("nie pozwala ustawić sobie roli admina", async () => {
        const res = await api().post("/api/auth/register").send({
            email: "sprytny@example.com",
            password: "dlugie-haslo",
            acceptTerms: true,
            role: "admin",
        });
        assert.equal(res.status, 201);
        assert.equal(res.body.user.role, "user");
    });

    test("wymaga akceptacji regulaminu, poprawnego e-maila i hasła", async () => {
        const base = { email: "x@example.com", password: "dlugie-haslo", acceptTerms: true };
        for (const body of [
            { ...base, acceptTerms: undefined },
            { ...base, email: "nie-email" },
            { ...base, password: "krotkie" },
        ]) {
            const res = await api().post("/api/auth/register").send(body);
            assert.equal(res.status, 400, JSON.stringify(body));
        }
    });

    test("odrzuca zajęty e-mail", async () => {
        const user = createUser();
        const res = await api().post("/api/auth/register").send({
            email: user.email.toUpperCase(),
            password: "dlugie-haslo",
            acceptTerms: true,
        });
        assert.equal(res.status, 409);
    });
});

describe("logowanie", () => {
    test("poprawne dane ustawiają sesję", async () => {
        const user = createUser();
        const res = await login(request(app), user.email);
        assert.equal(res.status, 200);
        assert.equal(res.body.user.id, user.id);
        assert.ok(cookieNames(res).includes("access_token"));
    });

    test("złe hasło i nieznany e-mail dają ten sam komunikat", async () => {
        const user = createUser();
        const wrong = await login(request(app), user.email, "zle-haslo-123");
        const unknown = await login(request(app), "nikt@example.com");
        assert.equal(wrong.status, 401);
        assert.equal(unknown.status, 401);
        assert.equal(wrong.body.message, unknown.body.message);
    });

    test("zablokowane konto nie może się zalogować", async () => {
        const user = createUser();
        usersDb.updateUserActive(user.id, false);
        const res = await login(request(app), user.email);
        assert.equal(res.status, 403);
    });

    test("po 10 błędnych hasłach konto jest blokowane nawet z innych ip", async () => {
        const user = createUser();
        for (let i = 0; i < 10; i++) {
            await login(request(app), user.email, "zle-haslo-123");
        }
        const res = await login(request(app), user.email);
        assert.equal(res.status, 429);
    });

    test("limit żądań na ip", async () => {
        const ip = freshIp();
        const statuses = [];
        for (let i = 0; i < 11; i++) {
            const res = await login(request(app), `limit${i}@example.com`, PASSWORD, ip);
            statuses.push(res.status);
        }
        assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401));
        assert.equal(statuses[10], 429);
    });
});

describe("sesja", () => {
    test("/me wymaga logowania", async () => {
        assert.equal((await api().get("/api/auth/me")).status, 401);
    });

    test("podrobiony token jest odrzucany", async () => {
        const res = await request(app)
            .get("/api/auth/me")
            .set("Cookie", "access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjF9.zly-podpis");
        assert.equal(res.status, 401);
    });

    test("zablokowanie konta działa od razu, mimo ważnego tokena", async () => {
        const user = createUser();
        const client = api(user);
        assert.equal((await client.get("/api/auth/me")).status, 200);
        usersDb.updateUserActive(user.id, false);
        assert.equal((await client.get("/api/auth/me")).status, 401);
    });

    test("refresh rotuje token, a stary przestaje działać", async () => {
        const user = createUser();
        const res = await login(request(app), user.email);
        const oldCookie = res.headers["set-cookie"]
            .find((c) => c.startsWith("refresh_token="))
            .split(";")[0];

        const refresh = () => request(app).post("/api/auth/refresh").set("Cookie", oldCookie);
        const first = await refresh();
        assert.equal(first.status, 200);
        assert.ok(cookieNames(first).includes("refresh_token"));
        assert.equal((await refresh()).status, 401);
    });

    test("wylogowanie unieważnia refresh token", async () => {
        const user = createUser();
        const agent = request.agent(app);
        await login(agent, user.email);
        await agent.post("/api/auth/logout");
        const res = await agent.post("/api/auth/refresh");
        assert.equal(res.status, 401);
    });
});

describe("reset hasła", () => {
    test("forgot-password nie zdradza, czy konto istnieje", async () => {
        const user = createUser();
        const known = await api().post("/api/auth/forgot-password").send({ email: user.email });
        const unknown = await api().post("/api/auth/forgot-password").send({ email: "brak@example.com" });
        assert.equal(known.status, 200);
        assert.deepEqual(known.body, unknown.body);
    });

    test("token działa jeden raz i wylogowuje inne sesje", async () => {
        const user = createUser();
        const agent = request.agent(app);
        await login(agent, user.email);

        const token = passwordResetTokensDb.createResetToken(user.id);
        const reset = await api().post("/api/auth/reset-password").send({ token, password: "nowe-haslo-456" });
        assert.equal(reset.status, 200);

        const again = await api().post("/api/auth/reset-password").send({ token, password: "inne-haslo-789" });
        assert.equal(again.status, 400);

        assert.equal((await agent.post("/api/auth/refresh")).status, 401);
        assert.equal((await login(request(app), user.email)).status, 401);
        assert.equal((await login(request(app), user.email, "nowe-haslo-456")).status, 200);
    });

    test("zmyślony token jest odrzucany", async () => {
        const res = await api().post("/api/auth/reset-password").send({ token: "abc", password: "nowe-haslo-456" });
        assert.equal(res.status, 400);
    });
});
