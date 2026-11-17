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

    test("sekcja Event bez opisu, kontakt z opisem w stopce", async () => {
        const card = { title: "Select", description: "Opis", image: "/img/a.jpg", alt: "Auto" };
        assert.equal(validateContent("event", { intro: "", cards: [card] }).content.intro, "");

        const admin = api(createUser({ role: "admin" }));
        const contact = (await api().get("/api/content/contact")).body.content;
        assert.match(contact.footerText, /Organizator Street Show/);
        const res = await admin
            .patch("/api/admin/content/contact")
            .send({ content: { ...contact, footerText: "Nowy opis" } });
        assert.equal(res.status, 200, res.body.message);
        assert.equal((await api().get("/api/content/contact")).body.content.footerText, "Nowy opis");
    });

    test("duże zdjęcie z aparatu (ponad 10 MB) jest pomniejszane i kompresowane", async () => {
        const sharp = require("sharp");
        const path = require("path");
        const big = await sharp({
            create: { width: 6000, height: 4000, channels: 3, noise: { type: "gaussian", mean: 128, sigma: 60 } },
        })
            .jpeg({ quality: 100 })
            .toBuffer();
        assert.ok(big.length > 10 * 1024 * 1024, `plik testowy ma ${big.length} B`);

        const admin = api(createUser({ role: "admin" }));
        const res = await admin.post("/api/admin/upload-image").attach("image", big, "aparat.jpg");
        assert.equal(res.status, 200, res.body.message);
        assert.match(res.body.url, /\.webp$/);
        const meta = await sharp(path.join(process.cwd(), res.body.url)).metadata();
        assert.equal(meta.width, 2560);
        assert.equal(meta.height, 1707);
    });

    test("zwykły użytkownik nie może zmienić sekcji", async () => {
        const res = await api(createUser())
            .patch("/api/admin/content/partners")
            .send({ content: { items: [], enabled: false } });
        assert.equal(res.status, 403);
    });
});
