const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const { api, createUser, attachPhotos } = require("./helpers");
const db = require("../src/db/database");
const siteContentDb = require("../src/db/siteContent");
const { DEFAULTS } = require("../src/content/defaults");

const pngBuffer = () =>
    sharp({ create: { width: 8, height: 8, channels: 3, background: "#c00" } }).png().toBuffer();

describe("dokumenty prawne 2027", () => {
    test("regulamin Select i Expo jest publiczny i ma domyślną treść", async () => {
        const res = await api().get("/api/content?keys=regulaminSelect,regulamin,privacy");
        assert.equal(res.status, 200);
        const { regulaminSelect, regulamin, privacy } = res.body.content;
        assert.match(regulaminSelect.title, /Select i Expo/);
        assert.match(regulaminSelect.html, /Odstąpienie od uczestnictwa/i);
        assert.match(regulamin.html, /29 maja 2027/);
        assert.match(regulamin.html, /kupbilecik\.pl/);
        assert.match(regulaminSelect.html, /Strefie Select nie podlega zwrotowi/);
        assert.match(privacy.html, /Marketing bezpośredni/);
        assert.match(privacy.html, /Konto uczestnika i garaż/);
        assert.match(regulaminSelect.html, /10\.6\.<\/strong> Udział w Strefie Select obejmuje prezentację/);
        assert.match(privacy.html, /Prezentacja aut Strefy Select/);
    });

    test("admin edytuje regulamin Select i Expo, zmiana trafia do historii", async () => {
        const admin = api(createUser({ role: "admin" }));
        const content = { title: "Regulamin testowy", html: "<h2>1. Test</h2><p>Treść</p>", pdfUrl: "" };
        const res = await admin.patch("/api/admin/content/regulaminSelect").send({ content });
        assert.equal(res.status, 200, res.body.message);
        assert.equal((await api().get("/api/content?keys=regulaminSelect")).body.content.regulaminSelect.title, "Regulamin testowy");
        assert.ok(siteContentDb.listRevisions("regulaminSelect").length >= 1);
        db.prepare("DELETE FROM site_content WHERE content_key = 'regulaminSelect'").run();
    });

    test("zgłoszenie zapisuje wersje obu regulaminów i zgodę na prezentację auta", async () => {
        const user = createUser();
        const res = await attachPhotos(
            api(user)
                .post("/api/submissions")
                .field("firstName", "Jan")
                .field("lastName", "Kowalski")
                .field("phone", "500600700")
                .field("licensePlate", "GD 88888")
                .field("carBrand", "Skoda")
                .field("carDescription", "Opis")
                .field("acceptTerms", "true"),
            await pngBuffer(),
        );
        assert.equal(res.status, 201, res.body.message);
        const row = db.prepare("SELECT consent_version, photo_publish_consent FROM submissions WHERE license_plate = 'GD 88888'").get();
        assert.match(row.consent_version, /^(default|rev-[0-9]+)[+](default|rev-[0-9]+)$/);
        // presenting an approved car is part of the Select terms, not a separate checkbox
        assert.equal(row.photo_publish_consent, 1);
    });

    test("migracja podmienia zapisane wcześniej teksty raz, a stare zostają w historii", () => {
        const old = { title: "Stary regulamin", html: "<p>stary</p>", pdfUrl: "/uploads/content/stary.pdf" };
        siteContentDb.saveContent("regulamin", old, null);
        siteContentDb.saveContent("privacy", { ...old, title: "Stara polityka" }, null);
        db.prepare("DELETE FROM app_meta WHERE key = 'legal_defaults_version'").run();

        const replaced = siteContentDb.applyLegalDefaults();
        assert.deepEqual(replaced.sort(), ["privacy", "regulamin"]);
        assert.equal(siteContentDb.getContent("regulamin").title, DEFAULTS.regulamin.title);
        assert.equal(siteContentDb.getContent("regulamin").pdfUrl, "");
        assert.equal(siteContentDb.getContent("privacy").title, DEFAULTS.privacy.title);

        const revisions = siteContentDb.listRevisions("regulamin");
        assert.ok(revisions.length >= 2);
        assert.equal(siteContentDb.getRevisionContent("regulamin", revisions[1].id).title, "Stary regulamin");

        // a later edit in the panel is not overwritten on the next start
        siteContentDb.saveContent("regulamin", { ...old, title: "Edycja admina" }, null);
        assert.deepEqual(siteContentDb.applyLegalDefaults(), []);
        assert.equal(siteContentDb.getContent("regulamin").title, "Edycja admina");
    });
});
