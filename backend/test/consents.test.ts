const { api, db } = require("./helpers");
const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const consentsDb = require("../src/db/consents");

const ID = "0b2c6a8e-3f4d-4b7a-9c1e-5d6f7a8b9c0d";
const rows = () => db.prepare("SELECT * FROM cookie_consents").all();

beforeEach(() => db.prepare("DELETE FROM cookie_consents").run());

describe("dziennik zgód na cookies", () => {
    test("zapisuje anonimowo identyfikator, kategorie i wersję, bez IP", async () => {
        const res = await api()
            .post("/api/consents")
            .send({ consentId: ID.toUpperCase(), categories: ["marketing", "necessary", "necessary"], revision: 0 });
        assert.equal(res.status, 204);

        const [row] = rows();
        assert.equal(row.consent_id, ID);
        assert.equal(row.categories, "marketing,necessary");
        assert.equal(row.revision, 0);
        assert.deepEqual(Object.keys(row).sort(), ["categories", "consent_id", "created_at", "id", "revision"]);
    });

    test("odrzuca złe dane", async () => {
        const bad = [
            {},
            { consentId: "abc", categories: ["necessary"], revision: 0 },
            { consentId: ID, categories: "necessary", revision: 0 },
            { consentId: ID, categories: ["necessary", "tracking"], revision: 0 },
            { consentId: ID, categories: ["necessary"], revision: -1 },
            { consentId: ID, categories: ["necessary"], revision: "0" },
        ];
        for (const body of bad) assert.equal((await api().post("/api/consents").send(body)).status, 400, JSON.stringify(body));
        assert.equal(rows().length, 0);
    });

    test("limit zapisów z jednego adresu IP", async () => {
        const client = api(null, { ip: "10.251.0.1" });
        const body = { consentId: ID, categories: ["necessary"], revision: 0 };
        for (let i = 0; i < 30; i += 1) assert.equal((await client.post("/api/consents").send(body)).status, 204);
        assert.equal((await client.post("/api/consents").send(body)).status, 429);
    });

    test("wpisy starsze niż 24 miesiące znikają", () => {
        const insert = db.prepare(
            "INSERT INTO cookie_consents (consent_id, categories, revision, created_at) VALUES (?, 'necessary', 0, datetime('now', ?))",
        );
        insert.run(ID, "-25 months");
        insert.run(ID, "-23 months");
        assert.equal(consentsDb.pruneOldConsents(), 1);
        assert.equal(rows().length, 1);
    });
});
