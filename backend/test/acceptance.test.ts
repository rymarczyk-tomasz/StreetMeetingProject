// Acceptance e-mail per place (templates.acceptance); one amount and one payment link for every place (settings.paymentUrl).
const { api, createUser, createSubmission, saveSettings, mails, mailsTo, stepUpFor } = require("./helpers");
const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const siteContentDb = require("../src/db/siteContent");
const db = require("../src/db/database");

const P24 = "https://sklep.przelewy24.pl/zakup.php?z24_id_sprzedawcy=1&z24_kwota=15000";
const ACCOUNT = "12345678901234567890123456";

function setAcceptance(patch) {
    const templates = siteContentDb.getContent("templates");
    siteContentDb.saveContent("templates", { ...templates, acceptance: { ...templates.acceptance, ...patch } });
}

async function approve(admin, row, zone) {
    const res = await api(admin).patch(`/api/admin/submissions/${row.id}/status`).send({ status: "approved", zone });
    assert.equal(res.status, 200, res.body.message);
    return res;
}

beforeEach(() => {
    mails.length = 0;
    saveSettings({
        selectFeeAmount: "150 zł",
        paymentAccount: "",
        paymentDaysAfterApproval: 7,
        paymentUrl: P24,
    });
    siteContentDb.saveContent("templates", { ...siteContentDb.getContent("templates"), acceptance: undefined, paymentConfirmed: undefined });
});

describe("e-mail akceptacji według miejsca", () => {
    test("otok murawy: szablon z kwotą i linkiem Przelewy24, bez pustej linii z numerem konta", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        await approve(admin, createSubmission(user, { carBrand: "BMW E36" }), "murawa");

        const [mail] = mailsTo(user.email);
        assert.equal(mail.subject, "Street Show: Akceptacja na Strefę Select");
        assert.match(mail.text, /zostało pozytywnie rozpatrzone/);
        assert.match(mail.text, /Kwota: 150 zł/);
        assert.match(mail.text, /Link do płatności: https:\/\/sklep\.przelewy24\.pl/);
        assert.match(mail.text, /wjazd do wnętrza stadionu na otok murawy/);
        assert.doesNotMatch(mail.text, /Numer konta/);
        assert.doesNotMatch(mail.text, /\*\*/);
        assert.doesNotMatch(mail.text, /\{[a-z_]+\}/);

        assert.match(mail.html, /<strong>Gratulujemy!<\/strong>/);
        assert.match(mail.html, /<ul><li>wjazd do wnętrza stadionu na otok murawy,<\/li>/);
        assert.ok(mail.html.includes(`<a href="${P24.replace(/&/g, "&amp;")}">`), "link do płatności nie jest klikalny");
    });

    test("tunel: ta sama kwota i ten sam link", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        await approve(admin, createSubmission(user), "tunel");

        const { text } = mailsTo(user.email)[0];
        assert.match(text, /Kwota: 150 zł/);
        assert.match(text, /Link do płatności: https:\/\/sklep\.przelewy24\.pl/);
        assert.match(text, /miejsce w tunelu/);
    });

    test("bez linku: dane do przelewu zamiast linku", async () => {
        saveSettings({ paymentAccount: ACCOUNT, paymentUrl: "" });
        const admin = createUser({ role: "admin" });
        const user = createUser();
        await approve(admin, createSubmission(user), "tunel");

        const { text } = mailsTo(user.email)[0];
        assert.match(text, /Kwota: 150 zł/);
        assert.match(text, /Numer konta: 12 3456/);
        assert.doesNotMatch(text, /Link do płatności/);
    });

    test("tekst wpisany przez uczestnika nie staje się linkiem ani pogrubieniem", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        await approve(admin, createSubmission(user, { carBrand: "https://zly.example **Golf**" }), "murawa");

        const { html, text } = mailsTo(user.email)[0];
        assert.ok(!html.includes('href="https://zly.example'), "link uczestnika jest klikalny");
        assert.ok(!html.includes("<strong>Golf</strong>"));
        assert.match(text, /https:\/\/zly\.example Golf/);
    });

    test("pusty szablon miejsca: krótki e-mail domyślny, z linkiem do płatności", async () => {
        setAcceptance({ korona: "" });
        const admin = createUser({ role: "admin" });
        const user = createUser();
        await approve(admin, createSubmission(user), "korona");

        const { text } = mailsTo(user.email)[0];
        assert.match(text, /Miejsce na wydarzeniu: Korona\./);
        assert.match(text, /150 zł/);
        assert.match(text, /Zapłać online: https:\/\/sklep\.przelewy24\.pl/);
    });

    test("uczestnik widzi w panelu kwotę i link", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        const row = createSubmission(user);
        await approve(admin, row, "korona");

        const own = (await api(user).get("/api/submissions")).body.submissions.find((item) => item.id === row.id);
        assert.equal(own.payment.amount, "150 zł");
        assert.equal(own.payment.url, P24);
        assert.equal(own.payment.complete, true);
    });

    test("zmiana miejsca nieopłaconego auta przypomina kwotę i link", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        const row = createSubmission(user);
        await approve(admin, row, "tunel");
        mails.length = 0;

        const res = await api(admin).patch(`/api/admin/submissions/${row.id}/zone`).send({ zone: "murawa" });
        assert.equal(res.status, 200, res.body.message);
        const { text } = mailsTo(user.email)[0];
        assert.match(text, /Nowe miejsce: Otok murawy/);
        assert.match(text, /150 zł/);
        assert.match(text, /Zapłać online: https:\/\/sklep\.przelewy24\.pl/);
    });
});

describe("e-mail po potwierdzeniu opłaty", () => {
    async function confirmPayment(admin, row) {
        const res = await api(admin)
            .patch(`/api/admin/submissions/${row.id}/payment-status`)
            .send({ paymentStatus: "paid" });
        assert.equal(res.status, 200, res.body.message);
    }

    test("szablon miejsca: potwierdzenie, miejsce i klikalny link do wejściówki", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        const row = createSubmission(user, { carBrand: "Audi 80" });
        await approve(admin, row, "korona");
        mails.length = 0;

        await confirmPayment(admin, row);
        const [mail] = mailsTo(user.email);
        assert.equal(mail.subject, "Street Show: opłata potwierdzona — Twoja wejściówka");
        assert.match(mail.text, /potwierdzamy otrzymanie płatności/);
        assert.match(mail.text, /Audi 80/);
        assert.match(mail.text, /Miejsce Państwa auta: Korona/);
        assert.match(mail.html, /<a href="http[^"]*\/panel">/);
    });

    test("pusty szablon: krótki e-mail domyślny", async () => {
        const templates = siteContentDb.getContent("templates");
        siteContentDb.saveContent("templates", {
            ...templates,
            paymentConfirmed: { ...templates.paymentConfirmed, tunel: "" },
        });
        const admin = createUser({ role: "admin" });
        const user = createUser();
        const row = createSubmission(user);
        await approve(admin, row, "tunel");
        mails.length = 0;

        await confirmPayment(admin, row);
        assert.match(mailsTo(user.email)[0].text, /Potwierdziliśmy opłatę/);
    });
});

describe("ustawienia opłat", () => {
    function saveAs(admin, patch, stepUp = undefined) {
        return api(admin)
            .patch("/api/admin/content/settings")
            .send({ content: { ...siteContentDb.getSettings(), ...patch }, stepUp });
    }

    test("link do płatności musi być adresem https", async () => {
        const admin = createUser({ role: "admin" });
        const res = await saveAs(admin, { paymentUrl: "http://przelewy24.pl/x" }, stepUpFor(admin));
        assert.equal(res.status, 400);
        assert.match(res.body.message, /https/);
    });

    test("zmiana linku do płatności wymaga hasła i kodu i wysyła alert", async () => {
        const admin = createUser({ role: "admin" });
        const changed = "https://inny.example/platnosc";

        const bare = await saveAs(admin, { paymentUrl: changed });
        assert.equal(bare.status, 403);
        assert.equal(bare.body.code, "step_up_required");
        assert.equal(siteContentDb.getSettings().paymentUrl, P24);

        const ok = await saveAs(admin, { paymentUrl: changed }, stepUpFor(admin));
        assert.equal(ok.status, 200, ok.body.message);
        assert.equal(siteContentDb.getSettings().paymentUrl, changed);
        const alert = mails.find((mail) => /dane do przelewu/.test(mail.subject));
        assert.ok(alert, "brak alertu");
        assert.match(alert.text, /Link do płatności/);
    });

    test("zapis innych ustawień nie wymaga potwierdzenia", async () => {
        const admin = createUser({ role: "admin" });
        const res = await saveAs(admin, { maxVehiclesPerUser: 4 });
        assert.equal(res.status, 200, res.body.message);
    });

    test("ustawienia zapisane z kwotą i linkiem per miejsce przechodzą na wspólne", () => {
        const stored = { ...siteContentDb.getSettings(), selectFeeAmount: "", paymentUrl: undefined };
        stored.zonePayments = {
            murawa: { amount: "", url: "" },
            tunel: { amount: "199 zł", url: P24 },
            korona: { amount: "", url: "" },
        };
        db.prepare("UPDATE site_content SET content = ? WHERE content_key = 'settings'").run(JSON.stringify(stored));

        const settings = siteContentDb.getSettings();
        assert.equal(settings.selectFeeAmount, "199 zł");
        assert.equal(settings.paymentUrl, P24);
        assert.equal(settings.zonePayments, undefined);
    });
});
