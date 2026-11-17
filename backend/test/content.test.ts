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

        // crop of a card and of a gallery preview photo: kept, out-of-range values clamped
        const cropped = validateContent("event", { cards: [{ ...card, crop: { x: 20, y: 140, zoom: 9 } }] });
        assert.deepEqual(cropped.content.cards[0].crop, { x: 20, y: 100, zoom: 3 });
        assert.deepEqual(validateContent("event", { cards: [card] }).content.cards[0].crop, { x: 50, y: 50, zoom: 1 });
        const gallery = validateContent("gallery", {
            linkLabel: "Galeria",
            photos: [{ url: "/img/b.jpg", crop: { x: 30, y: 70, zoom: 1.5 } }],
        });
        assert.deepEqual(gallery.content.photos[0].crop, { x: 30, y: 70, zoom: 1.5 });

        // the note under the Select steps is editable and its link checked
        const steps = Array.from({ length: 4 }, (_, i) => ({ title: `Krok ${i}`, text: "Opis" }));
        const select = validateContent("select", { title: "Select", steps, note: "Do {limit}", noteLinkLabel: "FAQ", noteLinkHref: "/faq" });
        assert.equal(select.content.note, "Do {limit}");
        assert.ok(validateContent("select", { title: "Select", steps, noteLinkLabel: "x", noteLinkHref: "javascript:alert(1)" }).error);
        assert.equal((await api().get("/api/content/select")).body.content.noteLinkHref, "/faq");

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
