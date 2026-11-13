// Which e-mails go out at each step of a submission's life, and to whom.
const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const { api, createUser, createSubmission, saveSettings, mails, mailsTo } = require("./helpers");

const ADMIN_INBOX = "org@streetshow.test";

const pngBuffer = () =>
    sharp({ create: { width: 8, height: 8, channels: 3, background: "#c00" } }).png().toBuffer();

beforeEach(() => {
    mails.length = 0;
});

describe("powiadomienia e-mail", () => {
    test("nowe zgłoszenie trafia do organizatora", async () => {
        const user = createUser();
        const res = await api(user)
            .post("/api/submissions")
            .field("firstName", "Jan")
            .field("lastName", "Kowalski")
            .field("phone", "500600700")
            .field("licensePlate", "GD 77777")
            .field("carBrand", "Skoda")
            .field("carDescription", "Opis")
            .field("acceptTerms", "true")
            .attach("photos", await pngBuffer(), "auto.png");
        assert.equal(res.status, 201, res.body.message);

        const [mail] = mailsTo(ADMIN_INBOX);
        assert.match(mail.subject, /nowe zgłoszenie/);
        assert.ok(mail.text.includes("GD 77777"));
        assert.ok(mail.text.includes(user.email));
    });

    test("decyzje organizatora trafiają do uczestnika, akceptacja z danymi do przelewu", async () => {
        saveSettings({ selectFeeAmount: "150 zł", paymentAccount: "12345678901234567890123456", paymentRecipient: "Street Show" });
        const admin = createUser({ role: "admin" });
        const client = api(admin);

        for (const [status, subject] of [
            ["approved", /zaakceptowane/],
            ["waitlist", /liście rezerwowej/],
            ["rejected", /odrzucone/],
        ]) {
            const user = createUser();
            const row = createSubmission(user);
            const res = await client
                .patch(`/api/admin/submissions/${row.id}/status`)
                .send({ status, adminNote: `Notatka ${status}` });
            assert.equal(res.status, 200);
            const [mail] = mailsTo(user.email);
            assert.match(mail.subject, subject, status);
            assert.ok(mail.text.includes(`Notatka ${status}`));
            if (status === "approved") {
                assert.ok(mail.text.includes("150 zł"));
                assert.ok(mail.text.includes("12 3456 7890"));
            }
        }
    });

    test("ta sama decyzja drugi raz nie wysyła maila ponownie", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        const row = createSubmission(user, { status: "approved" });
        await api(admin).patch(`/api/admin/submissions/${row.id}/status`).send({ status: "approved" });
        assert.equal(mailsTo(user.email).length, 0);
    });

    test("prośba o poprawki wysyła maila, zwykłe przywrócenie do oczekujących nie", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        const row = createSubmission(user, { status: "waitlist" });

        await api(admin).patch(`/api/admin/submissions/${row.id}/status`).send({ status: "pending", adminNote: "stara notatka" });
        assert.equal(mailsTo(user.email).length, 0);

        await api(admin)
            .patch(`/api/admin/submissions/${row.id}/status`)
            .send({ status: "pending", adminNote: "Dodaj zdjęcie z tyłu.", requestChanges: true });
        const [mail] = mailsTo(user.email);
        assert.match(mail.subject, /uzupełnienie zgłoszenia/);
        assert.ok(mail.text.includes("Dodaj zdjęcie z tyłu."));
        assert.ok(mail.html.includes("https://streetshow.test/panel"));
    });

    test("uczestnik wysyła poprawki → organizator dostaje maila, zgłoszenie wraca do rozpatrzenia", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        const row = createSubmission(user);

        const early = await api(user).post(`/api/submissions/${row.id}/changes-done`);
        assert.equal(early.status, 400);

        const asked = await api(admin)
            .patch(`/api/admin/submissions/${row.id}/status`)
            .send({ status: "pending", adminNote: "Dodaj zdjęcie z tyłu.", requestChanges: true });
        assert.ok(asked.body.submission.changesRequestedAt);

        assert.equal((await api(createUser()).post(`/api/submissions/${row.id}/changes-done`)).status, 404);

        const done = await api(user).post(`/api/submissions/${row.id}/changes-done`);
        assert.equal(done.status, 200, done.body.message);
        assert.equal(done.body.submission.status, "pending");
        assert.equal(done.body.submission.changesRequestedAt, null);
        assert.ok(done.body.submission.changesSubmittedAt);

        const [mail] = mailsTo(ADMIN_INBOX);
        assert.match(mail.subject, /poprawki do zgłoszenia/);
        assert.ok(mail.text.includes(user.email));
        assert.ok(mail.text.includes(`/admin/zgloszenia?id=${row.id}`));

        // a second click has nothing to answer
        assert.equal((await api(user).post(`/api/submissions/${row.id}/changes-done`)).status, 400);
        assert.equal(mailsTo(ADMIN_INBOX).length, 1);

        // a decision clears the marker
        const approved = await api(admin).patch(`/api/admin/submissions/${row.id}/status`).send({ status: "approved" });
        assert.equal(approved.body.submission.changesSubmittedAt, null);
    });

    test("prośba o poprawki bez treści nic nie wysyła", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        const row = createSubmission(user);
        await api(admin)
            .patch(`/api/admin/submissions/${row.id}/status`)
            .send({ status: "pending", adminNote: "  ", requestChanges: true });
        assert.equal(mailsTo(user.email).length, 0);
    });

    test("potwierdzenie przelewu → organizator, potwierdzenie opłaty → uczestnik (raz)", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        const row = createSubmission(user, { status: "approved" });

        await api(user).post(`/api/submissions/${row.id}/payment-proof`).attach("proof", await pngBuffer(), "przelew.png");
        assert.match(mailsTo(ADMIN_INBOX)[0].subject, /przelew|opłat|potwierdz/i);

        await api(admin).patch(`/api/admin/submissions/${row.id}/payment-status`).send({ paymentStatus: "paid" });
        await api(admin).patch(`/api/admin/submissions/${row.id}/payment-status`).send({ paymentStatus: "paid" });
        assert.equal(mailsTo(user.email).length, 1);
    });

    test("opłata zgłoszona bez potwierdzenia też trafia do organizatora (raz)", async () => {
        const user = createUser();
        const row = createSubmission(user, { status: "approved" });

        await api(user).patch(`/api/submissions/${row.id}/payment-status`);
        await api(user).patch(`/api/submissions/${row.id}/payment-status`);

        const inbox = mailsTo(ADMIN_INBOX);
        assert.equal(inbox.length, 1);
        assert.match(inbox[0].subject, /zgłoszona opłata/);
        assert.ok(inbox[0].text.includes("bez potwierdzenia przelewu"));
        assert.ok(inbox[0].text.includes(`id=${row.id}&tab=oplata`));
    });

    test("podpis wiadomości można zmienić i dotyczy wszystkich maili", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        const { sendGroupEmail } = require("../src/notifications/email");
        const row = createSubmission(user);

        await sendGroupEmail({ recipients: [{ email: user.email, first_name: "Jan" }], subject: "A", message: "B" });
        assert.ok(mailsTo(user.email)[0].text.includes("Street Show Crew"), "domyślny podpis");

        const current = (await api(admin).get("/api/admin/content/templates")).body.content;
        const saved = await api(admin)
            .patch("/api/admin/content/templates")
            .send({ content: { ...current, signature: "Pozdrawiamy\nZespół <b>Street Show</b>" } });
        assert.equal(saved.status, 200, saved.body.message);

        mails.length = 0;
        await sendGroupEmail({ recipients: [{ email: user.email, first_name: "Jan" }], subject: "A", message: "B" });
        await api(admin).patch(`/api/admin/submissions/${row.id}/status`).send({ status: "rejected", adminNote: "Nie tym razem." });

        const [group, decision] = mailsTo(user.email);
        for (const mail of [group, decision]) {
            assert.ok(mail.text.includes("Pozdrawiamy\nZespół <b>Street Show</b>"));
            assert.ok(!mail.text.includes("Street Show Crew"));
            assert.ok(mail.html.includes("Pozdrawiamy<br>Zespół &lt;b&gt;Street Show&lt;/b&gt;"), "html jest escapowany");
        }

        // blank goes back to the default
        await api(admin).patch("/api/admin/content/templates").send({ content: { ...current, signature: "  " } });
        mails.length = 0;
        await sendGroupEmail({ recipients: [{ email: user.email, first_name: "Jan" }], subject: "A", message: "B" });
        assert.ok(mailsTo(user.email)[0].text.includes("Street Show Crew"));
    });

    test("rezygnacja uczestnika trafia do organizatora", async () => {
        const user = createUser();
        const row = createSubmission(user, { status: "approved" });
        await api(user).post(`/api/submissions/${row.id}/withdraw`);
        assert.equal(mailsTo(ADMIN_INBOX).length, 1);
    });

    test("html w danych uczestnika jest escapowany w mailu", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        const row = createSubmission(user, { carBrand: '<img src=x onerror=alert(1)>' });
        await api(admin)
            .patch(`/api/admin/submissions/${row.id}/status`)
            .send({ status: "rejected", adminNote: "<script>alert(1)</script>" });
        const [mail] = mailsTo(user.email);
        assert.ok(!mail.html.includes("<script>"));
        assert.ok(mail.html.includes("&lt;script&gt;"));
    });
});
