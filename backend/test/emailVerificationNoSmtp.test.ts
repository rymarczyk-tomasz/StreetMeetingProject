const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { api, createUser, createSubmission, mails } = require("./helpers");

// the transporter is created on first use, so dropping the variable before any send means "no SMTP"
delete process.env.SMTP_HOST;

describe("potwierdzenie e-maila bez SMTP", () => {
    test("nie jest wymagane: brak znaczka, pusty filtr, wysyłka niedostępna", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser({ verified: false });
        createSubmission(user);

        const list = await api(admin).get("/api/admin/users");
        assert.equal(list.body.emailVerification, "smtp_off");
        assert.equal(list.body.users.find((u) => u.id === user.id).email_unverified, false);
        assert.deepEqual((await api(admin).get("/api/admin/users").query({ unverified: "1" })).body.users, []);

        const submissions = (await api(admin).get("/api/admin/submissions")).body.submissions;
        assert.equal(submissions.find((s) => s.userId === user.id).userEmailUnverified, false);

        const res = await api(admin).post(`/api/admin/users/${user.id}/resend-verification`);
        assert.equal(res.status, 503);
        assert.equal(mails.length, 0);
    });
});
