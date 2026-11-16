const { test, describe, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { api, createUser } = require("./helpers");
const { isFullAdmin } = require("../src/auth/middleware");

afterEach(() => {
    delete process.env.TEST_MODE;
});

describe("TEST_MODE (serwer testowy bez wysyłki e-maili)", () => {
    test("domyślnie: niepotwierdzony e-mail blokuje zgłoszenie, admin bez 2FA nie wejdzie do panelu", async () => {
        const user = await createUser({ verified: false });
        const availability = (await api(user).get("/api/submissions/availability")).body.availability;
        assert.equal(availability.emailUnverified, true);

        const admin = await createUser({ role: "admin", twoFactor: false });
        assert.equal((await api(admin).get("/api/admin/stats")).body.code, "two_factor_setup_required");
    });

    test("włączony: zgłoszenie bez potwierdzenia e-maila i panel admina bez 2FA", async () => {
        process.env.TEST_MODE = "on";

        const user = await createUser({ verified: false });
        const availability = (await api(user).get("/api/submissions/availability")).body.availability;
        assert.equal(availability.emailUnverified, undefined);
        assert.equal(availability.open, true);
        assert.equal((await api(user).get("/api/auth/me")).body.user.emailVerified, true);

        const admin = await createUser({ role: "admin", twoFactor: false });
        assert.equal((await api(admin).get("/api/admin/stats")).status, 200);
        const me = (await api(admin).get("/api/auth/me")).body.user;
        assert.equal(me.twoFactorEnabled, false);
        assert.equal(me.twoFactorOptional, true);
        assert.equal(isFullAdmin({ role: "admin", twoFactorEnabled: false }), true);
        assert.equal(isFullAdmin({ role: "user", twoFactorEnabled: false }), false);
    });
});
