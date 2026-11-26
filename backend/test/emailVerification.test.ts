const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { api, db, createUser, createSubmission, mails, mailsTo, smtp, usersDb } = require("./helpers");

const resend = (admin, user) => api(admin).post(`/api/admin/users/${user.id}/resend-verification`);

function auditEntries(action, targetId) {
    return db.prepare(`SELECT * FROM audit_log WHERE action = ? AND target_id = ?`).all(action, targetId);
}

beforeEach(() => {
    mails.length = 0;
});

afterEach(() => {
    delete process.env.TEST_MODE;
});

describe("potwierdzenie e-maila w panelu admina", () => {
    test("lista użytkowników oznacza niepotwierdzone konta i filtruje je", async () => {
        const admin = createUser({ role: "admin" });
        const unverified = createUser({ verified: false });
        const verified = createUser();

        const all = await api(admin).get("/api/admin/users");
        assert.equal(all.status, 200);
        assert.equal(all.body.emailVerification, "required");
        const byId = new Map(all.body.users.map((u) => [u.id, u]));
        assert.equal(byId.get(unverified.id).email_unverified, true);
        assert.ok(byId.get(unverified.id).created_at);
        assert.equal(byId.get(verified.id).email_unverified, false);

        const only = (await api(admin).get("/api/admin/users").query({ unverified: "1" })).body.users;
        assert.ok(only.some((u) => u.id === unverified.id));
        assert.ok(!only.some((u) => u.id === verified.id));
    });

    test("szczegóły zgłoszenia mówią, że e-mail uczestnika jest niepotwierdzony", async () => {
        const admin = createUser({ role: "admin" });
        const unverified = createUser({ verified: false });
        const verified = createUser();
        createSubmission(unverified);
        createSubmission(verified);

        const list = (await api(admin).get("/api/admin/submissions")).body.submissions;
        const of = (user) => list.find((s) => s.userId === user.id);
        assert.equal(of(unverified).userEmailUnverified, true);
        assert.ok(of(unverified).userRegisteredAt);
        assert.equal(of(verified).userEmailUnverified, false);
    });

    test("admin wysyła link ponownie: e-mail, wpis w dzienniku, limit częstotliwości", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser({ verified: false });

        const first = await resend(admin, user);
        assert.equal(first.status, 200, first.body.message);
        const [mail] = mailsTo(user.email);
        assert.match(mail.subject, /potwierdź adres e-mail/);
        assert.equal(auditEntries("user.verification_resent", user.id).length, 1);

        const second = await resend(admin, user);
        assert.equal(second.status, 429);
        assert.match(second.body.message, /min/);
        assert.equal(mailsTo(user.email).length, 1);

        db.prepare(`UPDATE email_tokens SET created_at = datetime('now', '-11 minutes') WHERE user_id = ?`).run(user.id);
        assert.equal((await resend(admin, user)).status, 200);
        assert.equal(auditEntries("user.verification_resent", user.id).length, 2);
    });

    test("nie ma ręcznego potwierdzenia: konto zostaje niepotwierdzone po wysyłce", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser({ verified: false });
        await resend(admin, user);
        assert.equal(usersDb.findUserById(user.id).email_verified_at, null);
        for (const path of ["verify-email", "verify", "email-verified"]) {
            const res = await api(admin).post(`/api/admin/users/${user.id}/${path}`).send({});
            assert.equal(res.status, 404);
        }
    });

    test("potwierdzony adres, zablokowane konto i nieznany użytkownik", async () => {
        const admin = createUser({ role: "admin" });
        assert.equal((await resend(admin, createUser())).status, 400);
        const blocked = createUser({ verified: false });
        db.prepare(`UPDATE users SET is_active = 0 WHERE id = ?`).run(blocked.id);
        assert.equal((await resend(admin, blocked)).status, 400);
        assert.equal((await resend(admin, { id: 999999 })).status, 404);
        assert.equal(mails.length, 0);
    });

    test("tylko administrator może wysłać link", async () => {
        const user = createUser();
        const other = createUser({ verified: false });
        assert.equal((await resend(user, other)).status, 403);
    });

    test("awaria SMTP: 502 i brak wpisu w dzienniku", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser({ verified: false });
        smtp.down = true;
        try {
            assert.equal((await resend(admin, user)).status, 502);
        } finally {
            smtp.down = false;
        }
        assert.equal(auditEntries("user.verification_resent", user.id).length, 0);
    });

    test("TEST_MODE: e-mail traktowany jak potwierdzony", async () => {
        process.env.TEST_MODE = "on";
        const admin = createUser({ role: "admin" });
        const user = createUser({ verified: false });
        createSubmission(user);

        const list = await api(admin).get("/api/admin/users");
        assert.equal(list.body.emailVerification, "test_mode");
        assert.equal(list.body.users.find((u) => u.id === user.id).email_unverified, false);
        assert.deepEqual((await api(admin).get("/api/admin/users").query({ unverified: "1" })).body.users, []);

        const submissions = (await api(admin).get("/api/admin/submissions")).body.submissions;
        assert.equal(submissions.find((s) => s.userId === user.id).userEmailUnverified, false);

        assert.equal((await resend(admin, user)).status, 400);
        assert.equal(mails.length, 0);
    });
});
