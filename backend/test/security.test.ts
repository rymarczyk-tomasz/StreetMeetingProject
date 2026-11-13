const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const {
    app,
    api,
    db,
    createUser,
    freshIp,
    mails,
    mailsTo,
    totpCode,
    stepUpFor,
    saveSettings,
    PASSWORD,
    usersDb,
} = require("./helpers");
const totp = require("../src/auth/totp");
const siteContentDb = require("../src/db/siteContent");
const twoFactorDb = require("../src/db/twoFactor");

beforeEach(() => {
    mails.length = 0;
});

function passwordLogin(email, password = PASSWORD, ip = freshIp()) {
    return request(app).post("/api/auth/login").set("X-Forwarded-For", ip).send({ email, password });
}

function codeLogin(challenge, code, ip = freshIp()) {
    return request(app).post("/api/auth/login/2fa").set("X-Forwarded-For", ip).send({ challenge, code });
}

const sessionCookie = (res) =>
    (res.headers["set-cookie"] || []).find((c) => c.startsWith("access_token="))?.split(";")[0];

function adminInboxes() {
    return usersDb.listAdminEmails();
}

describe("TOTP", () => {
    test("wektor testowy z RFC 6238 (SHA1)", () => {
        const secret = totp.base32Encode(Buffer.from("12345678901234567890"));
        // T = 59 s → step 1 → 94287082 (8 digits), last 6 = 287082
        assert.equal(totp.codeForStep(secret, 1, 8), "94287082");
        assert.equal(totp.codeForStep(secret, 1), "287082");
    });

    test("base32 w obie strony", () => {
        const bytes = Buffer.from([0, 1, 2, 250, 255, 128, 64]);
        assert.deepEqual(totp.base32Decode(totp.base32Encode(bytes)), bytes);
    });

    test("akceptuje sąsiedni krok, odrzuca starszy i powtórkę", () => {
        const secret = totp.generateSecret();
        const now = Date.now();
        const step = Math.floor(now / 30000);
        assert.equal(totp.verifyCode(secret, totp.codeForStep(secret, step - 1), { now }), step - 1);
        assert.equal(totp.verifyCode(secret, totp.codeForStep(secret, step + 1), { now }), step + 1);
        assert.equal(totp.verifyCode(secret, totp.codeForStep(secret, step - 3), { now }), null);
        assert.equal(totp.verifyCode(secret, totp.codeForStep(secret, step), { now, lastStep: step }), null);
        assert.equal(totp.verifyCode(secret, "abc", { now }), null);
    });
});

describe("logowanie dwuetapowe", () => {
    test("admin po haśle dostaje tylko wyzwanie, sesja dopiero po kodzie", async () => {
        const admin = createUser({ role: "admin" });
        const first = await passwordLogin(admin.email);
        assert.equal(first.status, 200);
        assert.equal(first.body.twoFactorRequired, true);
        assert.equal(sessionCookie(first), undefined);

        const second = await codeLogin(first.body.challenge, totpCode(admin));
        assert.equal(second.status, 200);
        assert.equal(second.body.user.twoFactorEnabled, true);
        assert.ok(sessionCookie(second));
    });

    test("zły kod, ten sam kod drugi raz i podrobione wyzwanie są odrzucane", async () => {
        const admin = createUser({ role: "admin" });
        const { challenge } = (await passwordLogin(admin.email)).body;
        assert.equal((await codeLogin(challenge, "000000")).status, 401);

        const code = totpCode(admin);
        assert.equal((await codeLogin(challenge, code)).status, 200);
        assert.equal((await codeLogin(challenge, code)).status, 401, "powtórzony kod");

        assert.equal((await codeLogin("eyJhbGciOiJIUzI1NiJ9.e30.x", totpCode(admin))).status, 401);
    });

    test("wyzwanie nie działa jako ciasteczko sesji", async () => {
        const admin = createUser({ role: "admin" });
        const { challenge } = (await passwordLogin(admin.email)).body;
        const res = await request(app).get("/api/auth/me").set("Cookie", `access_token=${challenge}`);
        assert.equal(res.status, 401);
    });

    test("po 10 złych kodach adres zgadującego jest blokowany, właściciel loguje się dalej", async () => {
        const admin = createUser({ role: "admin" });
        const { challenge } = (await passwordLogin(admin.email)).body;
        const attacker = freshIp();
        for (let i = 0; i < 10; i++) await codeLogin(challenge, "000000", attacker);
        assert.equal((await codeLogin(challenge, totpCode(admin), attacker)).status, 429);
        assert.equal((await codeLogin(challenge, totpCode(admin))).status, 200);
    });

    test("zwykły użytkownik loguje się bez kodu", async () => {
        const user = createUser();
        const res = await passwordLogin(user.email);
        assert.equal(res.status, 200);
        assert.equal(res.body.twoFactorRequired, undefined);
        assert.ok(sessionCookie(res));
    });
});

describe("konfiguracja 2FA", () => {
    test("admin bez 2FA nie ma dostępu do panelu", async () => {
        const admin = createUser({ role: "admin", twoFactor: false });
        const res = await api(admin).get("/api/admin/stats");
        assert.equal(res.status, 403);
        assert.equal(res.body.code, "two_factor_setup_required");
    });

    test("pełna konfiguracja: hasło → sekret → kod → kody zapasowe → panel", async () => {
        const admin = createUser({ role: "admin", twoFactor: false });
        const client = api(admin);

        assert.equal((await client.post("/api/auth/2fa/setup").send({ password: "zle-haslo" })).status, 400);
        const setup = await client.post("/api/auth/2fa/setup").send({ password: PASSWORD });
        assert.equal(setup.status, 200);
        assert.match(setup.body.uri, /^otpauth:\/\/totp\/Street%20Show/);

        assert.equal((await client.post("/api/auth/2fa/enable").send({ code: "000000" })).status, 400);
        const enable = await client
            .post("/api/auth/2fa/enable")
            .send({ code: totp.generateCode(setup.body.secret) });
        assert.equal(enable.status, 200);
        assert.equal(enable.body.recoveryCodes.length, 10);
        assert.match(enable.body.recoveryCodes[0], /^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);

        assert.equal((await api(admin).get("/api/admin/stats")).status, 200);
        assert.equal(mailsTo(admin.email).length, 1, "alert o włączeniu 2FA");
    });

    test("konfiguracja tylko dla administratorów", async () => {
        const res = await api(createUser()).post("/api/auth/2fa/setup").send({ password: PASSWORD });
        assert.equal(res.status, 403);
    });

    test("kod zapasowy działa raz i wysyła alert", async () => {
        const admin = createUser({ role: "admin" });
        const { recoveryCodes } = (
            await api(admin).post("/api/auth/2fa/recovery-codes").send({ stepUp: stepUpFor(admin) })
        ).body;
        const code = recoveryCodes[0].toLowerCase().replace("-", " ");

        const { challenge } = (await passwordLogin(admin.email)).body;
        assert.equal((await codeLogin(challenge, code)).status, 200);
        assert.equal((await codeLogin(challenge, code)).status, 401);
        assert.ok(mailsTo(admin.email).some((mail) => /kodem zapasowym/.test(mail.subject)));

        const status = (await api(admin).get("/api/auth/2fa")).body;
        assert.equal(status.recoveryCodesLeft, 9);
    });
});

describe("potwierdzenie wrażliwych operacji", () => {
    const account = "12345678901234567890123456";
    const otherAccount = "98765432109876543210987654";

    function saveSettingsAs(admin, patch, stepUp = undefined) {
        return api(admin)
            .patch("/api/admin/content/settings")
            .send({ content: { ...siteContentDb.getSettings(), ...patch }, stepUp });
    }

    test("zmiana numeru konta wymaga hasła i kodu, potem alert do wszystkich adminów", async () => {
        saveSettings({ paymentAccount: account });
        const admin = createUser({ role: "admin" });
        createUser({ role: "admin" });

        const bare = await saveSettingsAs(admin, { paymentAccount: otherAccount });
        assert.equal(bare.status, 403);
        assert.equal(bare.body.code, "step_up_required");
        assert.equal(bare.body.twoFactor, true);
        assert.equal(siteContentDb.getSettings().paymentAccount, account);

        const wrongPassword = await saveSettingsAs(admin, { paymentAccount: otherAccount }, { password: "zle", code: totpCode(admin) });
        assert.equal(wrongPassword.status, 403);
        const wrongCode = await saveSettingsAs(admin, { paymentAccount: otherAccount }, { password: PASSWORD, code: "000000" });
        assert.equal(wrongCode.status, 403);
        assert.equal(siteContentDb.getSettings().paymentAccount, account);

        const ok = await saveSettingsAs(admin, { paymentAccount: otherAccount }, stepUpFor(admin));
        assert.equal(ok.status, 200, ok.body.message);
        assert.equal(siteContentDb.getSettings().paymentAccount, otherAccount);

        const alert = mails.find((mail) => /dane do przelewu/.test(mail.subject));
        assert.ok(alert, "brak alertu");
        for (const email of adminInboxes()) assert.ok(String(alert.to).includes(email), email);
        assert.ok(alert.text.includes(account) && alert.text.includes(otherAccount));
        assert.ok(alert.text.includes(admin.email));
    });

    test("zmiana innych ustawień nie wymaga potwierdzenia", async () => {
        const admin = createUser({ role: "admin" });
        const res = await saveSettingsAs(admin, { maxVehiclesPerUser: 4 });
        assert.equal(res.status, 200);
        assert.equal(mails.length, 0);
    });

    test("przywrócenie starej wersji z innym kontem też wymaga potwierdzenia", async () => {
        const admin = createUser({ role: "admin" });
        saveSettings({ paymentAccount: account });
        const oldRevision = db
            .prepare("SELECT id FROM content_revisions WHERE content_key = 'settings' ORDER BY id DESC LIMIT 1")
            .get().id;
        saveSettings({ paymentAccount: otherAccount });

        const url = `/api/admin/content/settings/revisions/${oldRevision}/restore`;
        assert.equal((await api(admin).post(url).send({})).status, 403);
        assert.equal(siteContentDb.getSettings().paymentAccount, otherAccount);
        assert.equal((await api(admin).post(url).send({ stepUp: stepUpFor(admin) })).status, 200);
        assert.equal(siteContentDb.getSettings().paymentAccount, account);
    });

    test("nadanie roli admina wymaga potwierdzenia i wysyła alert", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        const url = `/api/admin/users/${user.id}/role`;

        assert.equal((await api(admin).patch(url).send({ role: "admin" })).status, 403);
        assert.equal(usersDb.findUserById(user.id).role, "user");

        assert.equal((await api(admin).patch(url).send({ role: "admin", stepUp: stepUpFor(admin) })).status, 200);
        assert.equal(usersDb.findUserById(user.id).role, "admin");
        assert.ok(mails.some((mail) => /nowy administrator/.test(mail.subject)));

        // the new admin still can't use the panel until 2FA is set up
        const promoted = usersDb.findUserById(user.id);
        assert.equal((await api(promoted).get("/api/admin/stats")).body.code, "two_factor_setup_required");
    });

    test("odebranie roli admina też wymaga potwierdzenia i wysyła alert", async () => {
        const admin = createUser({ role: "admin" });
        const other = createUser({ role: "admin" });
        const url = `/api/admin/users/${other.id}/role`;
        mails.length = 0;

        const bare = await api(admin).patch(url).send({ role: "user" });
        assert.equal(bare.status, 403);
        assert.equal(bare.body.code, "step_up_required");
        assert.equal(usersDb.findUserById(other.id).role, "admin");

        assert.equal((await api(admin).patch(url).send({ role: "user", stepUp: stepUpFor(admin) })).status, 200);
        assert.equal(usersDb.findUserById(other.id).role, "user");
        assert.ok(mails.some((mail) => /odebrano uprawnienia/.test(mail.subject)));

        // the log says what was done, not just "role changed"
        const entry = db
            .prepare("SELECT details FROM audit_log WHERE action = 'user.role_changed' AND target_id = ? ORDER BY id DESC LIMIT 1")
            .get(other.id);
        assert.deepEqual(JSON.parse(entry.details), {
            email: other.email,
            role: "user",
            previousRole: "admin",
            twoFactorReset: true,
        });

        // back to a plain account: no leftover two-step login to get locked out of
        assert.equal(twoFactorDb.isEnabled(usersDb.findUserById(other.id)), false);
        const login = await passwordLogin(other.email);
        assert.equal(login.status, 200, login.body.message);
        assert.equal(login.body.twoFactorRequired, undefined);
    });

    test("wiadomość grupowa wymaga potwierdzenia", async () => {
        const admin = createUser({ role: "admin" });
        const { createSubmission } = require("./helpers");
        createSubmission(createUser(), { status: "approved" });
        const body = { subject: "Test", message: "Treść", filters: { status: "approved" } };

        const bare = await api(admin).post("/api/admin/emails").send(body);
        assert.equal(bare.status, 403);
        assert.equal(bare.body.code, "step_up_required");

        const ok = await api(admin).post("/api/admin/emails").send({ ...body, stepUp: stepUpFor(admin) });
        assert.equal(ok.status, 202, ok.body.message);
    });

    test("reset 2FA innego admina: z potwierdzeniem, nie dla siebie", async () => {
        const admin = createUser({ role: "admin" });
        const other = createUser({ role: "admin" });

        assert.equal((await api(admin).post(`/api/admin/users/${admin.id}/2fa-reset`).send({ stepUp: stepUpFor(admin) })).status, 400);
        assert.equal((await api(admin).post(`/api/admin/users/${other.id}/2fa-reset`).send({})).status, 403);

        const res = await api(admin).post(`/api/admin/users/${other.id}/2fa-reset`).send({ stepUp: stepUpFor(admin) });
        assert.equal(res.status, 200);
        assert.equal(res.body.user.twoFactorEnabled, false);
        assert.equal((await api(usersDb.findUserById(other.id)).get("/api/admin/stats")).body.code, "two_factor_setup_required");
    });

    test("błędne potwierdzenia liczą się do blokady konta", async () => {
        saveSettings({ paymentAccount: account });
        const admin = createUser({ role: "admin" });
        // one client = one address, like a session someone else got hold of
        const client = api(admin);
        const save = (stepUp) =>
            client
                .patch("/api/admin/content/settings")
                .send({ content: { ...siteContentDb.getSettings(), paymentAccount: otherAccount }, stepUp });
        for (let i = 0; i < 10; i++) {
            await save({ password: "zle", code: "000000" });
        }
        const res = await save(stepUpFor(admin));
        assert.equal(res.status, 429);
        assert.notEqual(siteContentDb.getSettings().paymentAccount, otherAccount);
    });
});

describe("hasła administratorów", () => {
    test("admin nie ustawi hasła krótszego niż 12 znaków", async () => {
        const admin = createUser({ role: "admin" });
        const res = await api(admin)
            .post("/api/auth/change-password")
            .send({ currentPassword: PASSWORD, newPassword: "krotkie-11z" });
        assert.equal(res.status, 400);
        assert.match(res.body.message, /12 znaków/);
    });

    test("zwykły użytkownik może mieć 8 znaków", async () => {
        const user = createUser();
        const res = await api(user)
            .post("/api/auth/change-password")
            .send({ currentPassword: PASSWORD, newPassword: "osiem-zn" });
        assert.equal(res.status, 200);
    });
});
