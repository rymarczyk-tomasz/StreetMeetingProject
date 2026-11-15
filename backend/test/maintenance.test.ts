const { test, describe, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { api, createUser } = require("./helpers");
const { validateContent } = require("../src/content/validators");

const NOTICE = { enabled: true, title: "Strona w przebudowie", message: "Wracamy wkrótce." };

async function setMaintenance(admin, content) {
    const res = await admin.patch("/api/admin/content/maintenance").send({ content });
    assert.equal(res.status, 200, res.body.message);
}

afterEach(() => {
    delete process.env.MAINTENANCE_MODE;
});

describe("tryb serwisowy", () => {
    test("walidator wymaga tytułu i zachowuje podział na linie w komunikacie", () => {
        assert.ok(validateContent("maintenance", { enabled: true, title: "  " }).error);
        const { content } = validateContent("maintenance", { ...NOTICE, message: "Linia 1\nLinia 2", extra: "x" });
        assert.equal(content.message, "Linia 1\nLinia 2");
        assert.equal(content.extra, undefined);
    });

    test("domyślnie wyłączony: strona działa normalnie", async () => {
        assert.equal((await api().get("/api/content/maintenance")).body.content.enabled, false);
        assert.equal((await api().get("/api/gallery")).status !== 503, true);
    });

    test("po włączeniu odwiedzający dostają 503, a admin i plansza działają", async () => {
        const admin = api(createUser({ role: "admin" }));
        const user = api(createUser());
        await setMaintenance(admin, NOTICE);

        // the notice screen, login and health check stay reachable
        const content = await api().get("/api/content?keys=maintenance");
        assert.equal(content.status, 200);
        assert.equal(content.body.content.maintenance.enabled, true);
        assert.equal((await api().get("/api/health")).status, 200);
        assert.equal((await api().post("/api/auth/login").send({ email: "x@y.pl", password: "zle" })).status, 401);

        // everything else is closed for anonymous visitors and ordinary accounts
        for (const client of [api(), user]) {
            const select = await client.get("/api/submissions");
            assert.equal(select.status, 503);
            assert.equal(select.body.maintenance, true);
            assert.equal((await client.get("/api/gallery")).status, 503);
            assert.equal((await client.post("/api/notify").send({ email: "a@b.pl" })).status, 503);
        }
        const register = await api()
            .post("/api/auth/register")
            .send({ firstName: "Jan", lastName: "Nowak", email: "nowy@example.com", password: "Haslo-12345-xyz", acceptTerms: true });
        assert.equal(register.status, 503);

        // admin keeps working
        assert.notEqual((await admin.get("/api/submissions")).status, 503);
        assert.equal((await admin.get("/api/admin/content/maintenance")).status, 200);
    });

    test("obsługa wjazdu zostaje czynna, zwykły użytkownik nie", async () => {
        const admin = api(createUser({ role: "admin" }));
        await setMaintenance(admin, NOTICE);
        const staff = api(createUser({ gateStaff: true }));
        assert.notEqual((await staff.get("/api/gate/cars")).status, 503);
        assert.equal((await api(createUser()).get("/api/gate/cars")).status, 503);
    });

    test("wyłączenie przywraca stronę", async () => {
        const admin = api(createUser({ role: "admin" }));
        await setMaintenance(admin, NOTICE);
        assert.equal((await api().get("/api/gallery")).status, 503);
        await setMaintenance(admin, { ...NOTICE, enabled: false });
        assert.notEqual((await api().get("/api/gallery")).status, 503);
    });

    test("MAINTENANCE_MODE w .env wymusza tryb serwisowy, którego panel nie wyłączy", async () => {
        process.env.MAINTENANCE_MODE = "on";
        const admin = api(createUser({ role: "admin" }));
        const state = (await api().get("/api/content/maintenance")).body.content;
        assert.equal(state.enabled, true);
        assert.equal(state.forcedByEnv, true);

        await setMaintenance(admin, { ...NOTICE, enabled: false });
        assert.equal((await api().get("/api/gallery")).status, 503);

        delete process.env.MAINTENANCE_MODE;
        assert.notEqual((await api().get("/api/gallery")).status, 503);
    });
});
