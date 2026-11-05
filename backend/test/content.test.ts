const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { api, createUser } = require("./helpers");
const { validateContent } = require("../src/content/validators");

const partner = { name: "Firma", logo: "/uploads/content/logo.png", tier: "main" };

describe("partnerzy: ukrywanie sekcji", () => {
    test("walidator zachowuje wyłączenie, a brak pola oznacza widoczną sekcję", () => {
        assert.equal(validateContent("partners", { items: [partner], enabled: false }).content.enabled, false);
        assert.equal(validateContent("partners", { items: [partner], enabled: true }).content.enabled, true);
        assert.equal(validateContent("partners", { items: [partner] }).content.enabled, true);
    });

    test("domyślnie sekcja jest widoczna", async () => {
        const res = await api().get("/api/content/partners");
        assert.equal(res.status, 200);
        assert.equal(res.body.content.enabled, true);
    });

    test("admin ukrywa i odkrywa sekcję, partnerzy zostają zapisani", async () => {
        const admin = api(createUser({ role: "admin" }));

        const hide = await admin
            .patch("/api/admin/content/partners")
            .send({ content: { title: "Partnerzy", items: [partner], enabled: false } });
        assert.equal(hide.status, 200, hide.body.message);

        let pub = (await api().get("/api/content?keys=partners")).body.content.partners;
        assert.equal(pub.enabled, false);
        assert.equal(pub.items.length, 1);

        await admin
            .patch("/api/admin/content/partners")
            .send({ content: { ...pub, enabled: true } });
        pub = (await api().get("/api/content/partners")).body.content;
        assert.equal(pub.enabled, true);
        assert.equal(pub.items[0].name, "Firma");
    });

    test("zwykły użytkownik nie może zmienić sekcji", async () => {
        const res = await api(createUser())
            .patch("/api/admin/content/partners")
            .send({ content: { items: [], enabled: false } });
        assert.equal(res.status, 403);
    });
});
