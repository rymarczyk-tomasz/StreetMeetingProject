const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const request = require("supertest");
const {
    app,
    api,
    db,
    createUser,
    createSubmission,
    saveSettings,
    freshIp,
    mails,
    mailsTo,
    smtp,
    PASSWORD,
    submissionsDb,
    usersDb,
} = require("./helpers");
const siteContentDb = require("../src/db/siteContent");

const ADMIN_INBOX = "org@streetshow.test";
const edition = () => siteContentDb.getCurrentEdition();

const pngBuffer = () =>
    sharp({ create: { width: 8, height: 8, channels: 3, background: "#c00" } }).png().toBuffer();

function tokenFrom(mail, path) {
    const match = mail.text.match(new RegExp(`${path}\\?token=([^\\s]+)`));
    assert.ok(match, `brak linku ${path} w mailu`);
    return decodeURIComponent(match[1]);
}

async function postSubmission(user, overrides = {}) {
    const req = api(user).post("/api/submissions");
    const fields = {
        firstName: "Jan",
        lastName: "Kowalski",
        phone: "500600700",
        licensePlate: `GD ${Math.floor(Math.random() * 90000) + 10000}`,
        carBrand: "BMW E46",
        carDescription: "Opis",
        acceptTerms: "true",
        ...overrides,
    };
    for (const [key, value] of Object.entries(fields)) req.field(key, value);
    return req.attach("photos", await pngBuffer(), "auto.png");
}

function deleteAccount(user, password = PASSWORD) {
    return api(user).delete("/api/auth/me").send({ password });
}

beforeEach(() => {
    mails.length = 0;
});

describe("potwierdzenie e-maila przed zgłoszeniem", () => {
    test("rejestracja wysyła link, bez potwierdzenia nie da się zgłosić auta", async () => {
        const email = `nowy${Date.now()}@example.com`;
        const reg = await api().post("/api/auth/register").send({ email, password: "dlugie-haslo", acceptTerms: true });
        assert.equal(reg.status, 201);
        assert.equal(reg.body.user.emailVerified, false);

        const [mail] = mailsTo(email);
        assert.match(mail.subject, /potwierdź adres e-mail/);
        const user = usersDb.findUserByEmail(email);

        const availability = (await api(user).get("/api/submissions/availability")).body.availability;
        assert.equal(availability.open, false);
        assert.equal(availability.emailUnverified, true);

        const blocked = await api(user).post("/api/submissions").field("carBrand", "X");
        assert.equal(blocked.status, 403);
        assert.equal(submissionsDb.listSubmissionsByUser(user.id).length, 0);

        const verify = await api().post("/api/auth/verify-email").send({ token: tokenFrom(mail, "/potwierdz-email") });
        assert.equal(verify.status, 200);

        const after = (await api(user).get("/api/submissions/availability")).body.availability;
        assert.equal(after.open, true);
        const created = await postSubmission(user);
        assert.equal(created.status, 201, created.body.message);
    });

    test("link potwierdzający działa tylko raz", async () => {
        const email = `raz${Date.now()}@example.com`;
        await api().post("/api/auth/register").send({ email, password: "dlugie-haslo", acceptTerms: true });
        const token = tokenFrom(mailsTo(email)[0], "/potwierdz-email");
        assert.equal((await api().post("/api/auth/verify-email").send({ token })).status, 200);
        assert.equal((await api().post("/api/auth/verify-email").send({ token })).status, 400);
    });

    test("ponowne zgłoszenie auta z poprzedniej edycji też wymaga potwierdzenia", async () => {
        const user = createUser({ verified: false });
        const old = createSubmission(user, { edition: edition() - 1, status: "approved" });
        const res = await api(user).post(`/api/submissions/${old.id}/resubmit`).send({ acceptTerms: true });
        assert.equal(res.status, 403);
    });

    test("zamknięte zgłoszenia pokazują swój powód, nie prośbę o potwierdzenie", async () => {
        saveSettings({ submissionsOpen: false });
        try {
            const user = createUser({ verified: false });
            const availability = (await api(user).get("/api/submissions/availability")).body.availability;
            assert.equal(availability.open, false);
            assert.equal(availability.emailUnverified, undefined);
            assert.match(availability.reason, /zamknięte/);
        } finally {
            saveSettings({ submissionsOpen: true });
        }
    });

    test("ponowna wysyłka linku", async () => {
        const user = createUser({ verified: false });
        const res = await api(user).post("/api/auth/resend-verification");
        assert.equal(res.status, 200);
        assert.equal(mailsTo(user.email).length, 1);
    });

    test("awaria SMTP daje czytelny błąd zamiast wywrócić serwer", async () => {
        const user = createUser({ verified: false });
        smtp.down = true;
        try {
            const resend = await api(user).post("/api/auth/resend-verification");
            assert.equal(resend.status, 502);
            const change = await api(user)
                .post("/api/auth/change-email")
                .send({ newEmail: "nowy-adres@example.com", password: PASSWORD });
            assert.equal(change.status, 502);
        } finally {
            smtp.down = false;
        }
        assert.equal((await api(user).get("/api/auth/me")).status, 200);
        assert.equal(usersDb.findUserById(user.id).email, user.email);
    });
});

describe("e-mail o zmianie hasła", () => {
    test("zmiana hasła w ustawieniach wysyła ostrzeżenie z linkiem do odzyskania konta", async () => {
        const user = createUser();
        const res = await api(user)
            .post("/api/auth/change-password")
            .send({ currentPassword: PASSWORD, newPassword: "zupelnie-nowe-123" });
        assert.equal(res.status, 200);

        const [mail] = mailsTo(user.email);
        assert.match(mail.subject, /hasło zostało zmienione/);
        assert.match(mail.text, /Jeśli to nie Ty/);
        assert.ok(mail.text.includes("https://streetshow.test/nie-pamietam-hasla"));
        assert.ok(mail.html.includes('href="https://streetshow.test/nie-pamietam-hasla"'));
    });

    test("złe obecne hasło nie zmienia hasła i nie wysyła maila", async () => {
        const user = createUser();
        const res = await api(user)
            .post("/api/auth/change-password")
            .send({ currentPassword: "zle-haslo-000", newPassword: "zupelnie-nowe-123" });
        assert.equal(res.status, 400);
        assert.equal(mailsTo(user.email).length, 0);
    });

    test("pełna ścieżka odzyskania konta: mail z linkiem → nowe hasło → mail o zmianie", async () => {
        const user = createUser();
        await api().post("/api/auth/forgot-password").send({ email: user.email });
        const resetMail = mailsTo(user.email)[0];
        const token = tokenFrom(resetMail, "/reset-hasla");

        const reset = await api().post("/api/auth/reset-password").send({ token, password: "odzyskane-456" });
        assert.equal(reset.status, 200);

        const changed = mailsTo(user.email).find((mail) => /hasło zostało zmienione/.test(mail.subject));
        assert.ok(changed, "brak maila o zmianie hasła");

        const login = await request(app)
            .post("/api/auth/login")
            .set("X-Forwarded-For", freshIp())
            .send({ email: user.email, password: "odzyskane-456" });
        assert.equal(login.status, 200);
    });
});

describe("usuwanie konta", () => {
    test("wymaga poprawnego hasła", async () => {
        const user = createUser();
        assert.equal((await deleteAccount(user, "zle-haslo-000")).status, 400);
        assert.ok(usersDb.findUserById(user.id));
        assert.equal(mails.length, 0);
    });

    test("blokada przy opłaconym lub weryfikowanym miejscu w bieżącej edycji", async () => {
        for (const paymentStatus of ["paid", "verification"]) {
            const user = createUser();
            createSubmission(user, { status: "approved", paymentStatus });
            const res = await deleteAccount(user);
            assert.equal(res.status, 409, paymentStatus);
            assert.equal(res.body.code, "paid_submission");
            assert.match(res.body.message, /zrezygnuj/);
            assert.ok(usersDb.findUserById(user.id));
            assert.equal(submissionsDb.listSubmissionsByUser(user.id).length, 1);
        }
        assert.equal(mails.length, 0);
    });

    test("brak blokady: poprzednia edycja, po wjeździe, po rezygnacji, nieopłacone", async () => {
        const cases = [
            (user) => createSubmission(user, { status: "approved", paymentStatus: "paid", edition: edition() - 1 }),
            (user) => {
                const row = createSubmission(user, { status: "approved", paymentStatus: "paid" });
                submissionsDb.setCheckedIn(row.id, true);
            },
            (user) => createSubmission(user, { status: "withdrawn", paymentStatus: "paid" }),
            (user) => createSubmission(user, { status: "approved", paymentStatus: "unpaid" }),
        ];
        for (const [index, setup] of cases.entries()) {
            const user = createUser();
            setup(user);
            const res = await deleteAccount(user);
            assert.equal(res.status, 200, `przypadek ${index}: ${res.body.message}`);
            assert.equal(usersDb.findUserById(user.id), undefined);
        }
    });

    test("rezygnacja w panelu odblokowuje usunięcie konta", async () => {
        const user = createUser();
        const row = createSubmission(user, { status: "approved", paymentStatus: "paid" });
        assert.equal((await deleteAccount(user)).status, 409);
        assert.equal((await api(user).post(`/api/submissions/${row.id}/withdraw`)).status, 200);
        assert.equal((await deleteAccount(user)).status, 200);
    });

    test("usuwa dane, wysyła potwierdzenie uczestnikowi i informację organizatorowi", async () => {
        const user = createUser();
        const pending = createSubmission(user, { licensePlate: "GD 11111" });
        createSubmission(user, { status: "waitlist", licensePlate: "GD 22222" });
        createSubmission(user, { status: "rejected", licensePlate: "GD 33333" });

        const res = await deleteAccount(user);
        assert.equal(res.status, 200);
        assert.equal(usersDb.findUserById(user.id), undefined);
        assert.equal(submissionsDb.findSubmissionById(pending.id), undefined);
        assert.equal((await api(user).get("/api/auth/me")).status, 401);

        const [own] = mailsTo(user.email);
        assert.match(own.subject, /konto zostało usunięte/);

        const [org] = mailsTo(ADMIN_INBOX);
        assert.match(org.subject, new RegExp(user.email));
        assert.ok(org.text.includes("GD 11111"));
        assert.ok(org.text.includes("GD 22222"));
        assert.ok(!org.text.includes("GD 33333"), "odrzucone zgłoszenie nie interesuje organizatora");

        const entry = db
            .prepare("SELECT * FROM audit_log WHERE action = 'user.self_deleted' AND target_id = ?")
            .get(user.id);
        assert.equal(entry.actor_email, user.email);
        assert.equal(JSON.parse(entry.details).submissions.length, 2);
    });

    test("bez aktywnych zgłoszeń organizator nie dostaje maila", async () => {
        const user = createUser();
        createSubmission(user, { status: "rejected" });
        assert.equal((await deleteAccount(user)).status, 200);
        assert.equal(mailsTo(user.email).length, 1);
        assert.equal(mailsTo(ADMIN_INBOX).length, 0);
    });

    test("ostatni administrator nie może usunąć konta", async () => {
        db.prepare("UPDATE users SET role = 'user' WHERE role = 'admin'").run();
        const admin = createUser({ role: "admin" });
        assert.equal((await deleteAccount(admin)).status, 400);
        assert.ok(usersDb.findUserById(admin.id));
    });
});
