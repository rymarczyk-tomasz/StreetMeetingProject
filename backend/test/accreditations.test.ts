const { api, createUser, db, mails, mailsTo, smtp } = require("./helpers");
const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const siteContentDb = require("../src/db/siteContent");
const { validateContent } = require("../src/content/validators");
const { purgeDueAccreditations } = require("../src/retention");

const VALID = {
    name: "Anna Nowak",
    email: "anna@media.test",
    phone: "+48 500-600-700",
    instagram: "https://www.instagram.com/anna.foto/?hl=pl",
    consent: true,
};

const MAIL = { subject: "Decyzja", message: "Treść wiadomości" };
const rows = () => db.prepare("SELECT * FROM accreditations").all();
const apply = (patch = {}) => api().post("/api/accreditations").send({ ...VALID, ...patch });

beforeEach(() => {
    db.prepare("DELETE FROM accreditations").run();
    mails.length = 0;
});

describe("wniosek o akredytację", () => {
    test("bez konta: zapisuje dane, edycję i wersję polityki, powiadamia tylko organizatora", async () => {
        const res = await apply();
        assert.equal(res.status, 201, res.body.message);

        const [row] = rows();
        assert.equal(row.phone, "+48500600700");
        assert.equal(row.instagram_url, "https://www.instagram.com/anna.foto/");
        assert.equal(row.status, "pending");
        assert.equal(row.edition, siteContentDb.getCurrentEdition());
        assert.equal(row.consent_version, siteContentDb.getContentVersion("privacy"));

        assert.equal(mails.length, 1);
        assert.match(mailsTo("org@streetshow.test")[0].text, /Anna Nowak/);
    });

    test("osobny adres do akredytacji zastępuje adresy organizatorów", async () => {
        process.env.ACCREDITATION_NOTIFY_EMAIL = "media@streetshow.test";
        try {
            await apply();
            assert.equal(mails.length, 1);
            assert.equal(mailsTo("media@streetshow.test").length, 1);
            assert.equal(mailsTo("org@streetshow.test").length, 0);
        } finally {
            delete process.env.ACCREDITATION_NOTIFY_EMAIL;
        }
    });

    test("przyjmuje różne zapisy profilu", async () => {
        const inputs = ["@Anna.Foto", "anna.foto", "instagram.com/anna.foto", "http://m.instagram.com/anna.foto/"];
        for (const instagram of inputs) {
            db.prepare("DELETE FROM accreditations").run();
            const res = await apply({ instagram });
            assert.equal(res.status, 201, instagram);
            assert.equal(rows()[0].instagram_url, "https://www.instagram.com/anna.foto/", instagram);
        }
    });

    test("odrzuca błędne dane", async () => {
        const bad = [
            { name: "Anna" },
            { name: `Anna ${"a".repeat(100)}` },
            { email: "anna" },
            { email: "ofiara,anna@media.test" },
            { email: "<ofiara>anna@media.test" },
            { phone: "123" },
            { instagram: "" },
            { instagram: "instagram.com" },
            { instagram: "javascript:alert(1)" },
            { instagram: "https://instagram.com.zly.example/anna" },
            { instagram: "https://zly.example/anna" },
            { instagram: "https://instagram.com/p/ABC123" },
            { consent: false },
            { consent: "true" },
        ];
        for (const patch of bad) assert.equal((await apply(patch)).status, 400, JSON.stringify(patch));
        assert.equal(rows().length, 0);
        assert.equal(mails.length, 0);
    });

    test("powtórka z tego samego adresu: ta sama odpowiedź, bez drugiego wiersza i maila", async () => {
        const first = await apply();
        const second = await apply({ email: "ANNA@media.test" });
        assert.deepEqual([second.status, second.body], [first.status, first.body]);
        assert.equal(rows().length, 1);
        assert.equal(mails.length, 1);
    });

    test("dane obcej osoby są escapowane w mailu do organizatora", async () => {
        await apply({ name: '<a href="https://zly.example">Anna</a> Nowak' });
        assert.ok(!mails[0].html.includes('<a href="https://zly.example"'));
    });

    test("limit prób z jednego adresu IP", async () => {
        const client = api(null, { ip: "10.250.0.1" });
        for (let i = 0; i < 5; i += 1) {
            assert.equal((await client.post("/api/accreditations").send({})).status, 400);
        }
        assert.equal((await client.post("/api/accreditations").send(VALID)).status, 429);
    });

    test("awaria SMTP nie gubi wniosku", async () => {
        smtp.down = true;
        try {
            assert.equal((await apply()).status, 201);
            assert.equal(rows().length, 1);
        } finally {
            smtp.down = false;
        }
    });

    test("tryb serwisowy zamyka formularz", async () => {
        process.env.MAINTENANCE_MODE = "on";
        try {
            assert.equal((await apply()).status, 503);
        } finally {
            delete process.env.MAINTENANCE_MODE;
        }
    });
});

describe("akredytacje w panelu", () => {
    test("tylko administrator z 2FA widzi i zmienia wnioski", async () => {
        await apply();
        const url = `/api/admin/accreditations/${rows()[0].id}`;
        const clients = [
            [api(), 401],
            [api(createUser()), 403],
            [api(createUser({ gateStaff: true })), 403],
            [api(createUser({ role: "admin", twoFactor: false })), 403],
        ];
        for (const [client, status] of clients) {
            assert.equal((await client.get("/api/admin/accreditations")).status, status);
            assert.equal((await client.patch(`${url}/status`).send({ status: "approved" })).status, status);
            assert.equal((await client.get(`${url}/draft?status=approved`)).status, status);
            assert.equal((await client.delete(url)).status, status);
        }
        assert.equal(rows()[0].status, "pending");
    });

    for (const [status, pattern] of [
        ["approved", /została przyznana/],
        ["rejected", /nie możemy przyznać/],
    ] as const) {
        test(`decyzja ${status}: jeden mail, bez tekstu z formularza`, async () => {
            await apply({ name: "Wejdź zly.example" });
            mails.length = 0;
            const admin = api(createUser({ role: "admin" }));
            const url = `/api/admin/accreditations/${rows()[0].id}/status`;

            const draft = (await admin.get(url.replace("/status", `/draft?status=${status}`))).body;
            assert.equal((await admin.patch(url).send({ status, ...draft })).status, 200);
            assert.equal((await admin.patch(url).send({ status, ...draft })).status, 409);

            assert.equal(mails.length, 1);
            const [mail] = mailsTo(VALID.email);
            assert.match(mail.text, pattern);
            assert.ok(!`${mail.subject}${mail.text}${mail.html}`.includes("zly.example"));
        });
    }

    test("licznik w menu: tylko oczekujące z danej edycji", async () => {
        await apply();
        await apply({ email: "druga@media.test" });
        db.prepare(
            "INSERT INTO accreditations (edition, name, email, phone, instagram_url, consent_version) VALUES (2020, 'Jan Stary', 'jan@media.test', '500600700', 'https://www.instagram.com/jan/', 'default')",
        ).run();
        const admin = api(createUser({ role: "admin" }));
        const count = async (query = "") => (await admin.get(`/api/admin/stats${query}`)).body.pendingAccreditations;

        assert.equal(await count(), 2);
        assert.equal(await count("?edition=2020"), 1);
        const { id } = rows().find((row) => row.email === VALID.email);
        await admin.patch(`/api/admin/accreditations/${id}/status`).send({ status: "rejected", ...MAIL });
        assert.equal(await count(), 1);
    });

    test("nieznana decyzja i nieistniejący wniosek", async () => {
        await apply();
        const admin = api(createUser({ role: "admin" }));
        const url = `/api/admin/accreditations/${rows()[0].id}/status`;
        assert.equal((await admin.patch(url).send({ status: "paid", ...MAIL })).status, 400);
        assert.equal((await admin.patch("/api/admin/accreditations/999999/status").send({ status: "approved", ...MAIL })).status, 404);
    });

    test("lista pokazuje bieżącą edycję, wybrany rok albo wszystkie", async () => {
        await apply();
        db.prepare(
            "INSERT INTO accreditations (edition, name, email, phone, instagram_url, consent_version) VALUES (2020, 'Jan Stary', 'jan@media.test', '500600700', 'https://www.instagram.com/jan/', 'default')",
        ).run();
        const admin = api(createUser({ role: "admin" }));
        const names = async (query) =>
            (await admin.get(`/api/admin/accreditations${query}`)).body.accreditations.map((row) => row.name).sort();

        assert.deepEqual(await names(""), ["Anna Nowak"]);
        assert.deepEqual(await names("?edition=2020"), ["Jan Stary"]);
        assert.deepEqual(await names("?edition=all"), ["Anna Nowak", "Jan Stary"]);
    });

    test("usunięcie kasuje dane, także z dziennika, i nie wysyła maila", async () => {
        await apply();
        mails.length = 0;
        const admin = api(createUser({ role: "admin" }));
        assert.equal((await admin.delete(`/api/admin/accreditations/${rows()[0].id}`)).status, 200);
        assert.equal(rows().length, 0);
        assert.equal(mails.length, 0);
        const log = JSON.stringify(db.prepare("SELECT details FROM audit_log WHERE action LIKE 'accreditation.%'").all());
        assert.ok(!log.includes(VALID.email));
    });
});

describe("szablon i treść decyzji", () => {
    test("szkic bierze szablon z panelu, a wysyła się treść poprawiona przez admina", async () => {
        const templates = siteContentDb.getContent("templates");
        siteContentDb.saveContent("templates", {
            ...templates,
            accreditationApprovedSubject: "Akredytacja {rok}",
            accreditationApproved: "Witamy na Street Show {rok}.",
        });
        try {
            await apply();
            mails.length = 0;
            const admin = api(createUser({ role: "admin" }));
            const url = `/api/admin/accreditations/${rows()[0].id}`;
            const year = siteContentDb.getCurrentEdition();

            const draft = (await admin.get(`${url}/draft?status=approved`)).body;
            assert.equal(draft.subject, `Akredytacja ${year}`);
            assert.equal(draft.message, `Witamy na Street Show ${year}.`);
            assert.equal(mails.length, 0);
            assert.equal(rows()[0].status, "pending");

            const message = "**Odbiór** przy bramie C: https://example.test/mapa <script>";
            const res = await admin.patch(`${url}/status`).send({ status: "approved", subject: "Zmieniony\r\ntemat", message });
            assert.equal(res.status, 200, res.body.message);
            assert.equal(mails[0].subject, "Zmieniony temat");
            assert.match(mails[0].text, /^Odbiór przy bramie C/);
            assert.match(mails[0].html, /<strong>Odbiór<\/strong>/);
            assert.match(mails[0].html, /<a href="https:\/\/example\.test\/mapa">/);
            assert.ok(!mails[0].html.includes("<script>"));
        } finally {
            siteContentDb.saveContent("templates", templates);
        }
    });

    test("bez tematu albo treści nie ma decyzji", async () => {
        await apply();
        mails.length = 0;
        const admin = api(createUser({ role: "admin" }));
        const url = `/api/admin/accreditations/${rows()[0].id}/status`;
        const tooLong = { subject: "Temat", message: "a".repeat(5001) };
        for (const mail of [{}, { subject: "Temat" }, { message: "Treść" }, tooLong]) {
            assert.equal((await admin.patch(url).send({ status: "approved", ...mail })).status, 400);
        }
        assert.equal(rows()[0].status, "pending");
        assert.equal(mails.length, 0);
    });

    test("pusty szablon wraca do tekstu wbudowanego", () => {
        const templates = siteContentDb.getContent("templates");
        const { content } = validateContent("templates", { ...templates, accreditationRejected: "  " });
        assert.match(content.accreditationRejected, /nie możemy przyznać/);
    });
});

describe("usuwanie 3 miesiące po wydarzeniu", () => {
    const insert = (email, edition, created) =>
        db
            .prepare(
                "INSERT INTO accreditations (edition, name, email, phone, instagram_url, consent_version, created_at) VALUES (?, 'Jan Test', ?, '500600700', 'https://www.instagram.com/jan/', 'default', ?)",
            )
            .run(edition, email, created);
    const setDate = db.prepare("INSERT OR REPLACE INTO edition_dates (year, event_date) VALUES (?, ?)");

    test("liczy od wydarzenia, a spóźniony wniosek od złożenia", () => {
        setDate.run(2031, "2031-05-29");
        insert("przed@media.test", 2031, "2031-03-01 10:00:00");
        insert("po@media.test", 2031, "2031-07-10 10:00:00");

        assert.equal(purgeDueAccreditations("2031-08-28"), 0);
        assert.equal(purgeDueAccreditations("2031-08-29"), 1);
        assert.deepEqual(rows().map((row) => row.email), ["po@media.test"]);
        assert.equal(purgeDueAccreditations("2031-10-10"), 1);
        assert.equal(rows().length, 0);
    });

    test("edycja bez daty, która jeszcze trwa, nie jest ruszana", () => {
        insert("bez-daty@media.test", 2033, "2033-01-01 10:00:00");
        assert.equal(purgeDueAccreditations("2033-11-01"), 0);
        assert.equal(rows().length, 1);
    });
});

test("polityka prywatności opisuje akredytacje", () => {
    assert.match(siteContentDb.getContent("privacy").html, /Akredytacje medialne.*3 miesiące po zakończeniu/);
});
