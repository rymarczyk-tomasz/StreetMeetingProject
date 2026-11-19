// Acceptance e-mail per place (templates.acceptance); one amount and one payment link for every place (settings.paymentUrl).
const { api, createUser, createSubmission, saveSettings, mails, mailsTo, stepUpFor } = require("./helpers");
const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const siteContentDb = require("../src/db/siteContent");
const db = require("../src/db/database");

const P24 = "https://sklep.przelewy24.pl/zakup.php?z24_id_sprzedawcy=1&z24_kwota=15000";
const ACCOUNT = "12345678901234567890123456";

const TRANSFER_TEMPLATE = "Auto {marka}, miejsce: {miejsce}\nKwota: {kwota}\nLink do płatności: {link_platnosci}\nNumer konta: {numer_konta}\nTytuł przelewu: {tytul_przelewu}";

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
        paymentDeadline: "",
        paymentUrl: P24,
        paymentTitleTemplate: "Strefa Select {rok} – {rejestracja}",
        paymentLinkLabel: "kliknij, aby zapłacić przez Przelewy24",
    });
    siteContentDb.saveContent("templates", {
        ...siteContentDb.getContent("templates"),
        acceptance: undefined,
        paymentConfirmed: undefined,
        rejection: undefined,
        waitlist: undefined,
    });
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

    test("krótki link Przelewy24 też jest opisany słowami, nie adresem", async () => {
        saveSettings({ paymentUrl: "https://s.przelewy24.pl/8wLhm23vcPdw" });
        const admin = createUser({ role: "admin" });
        const user = createUser();
        await approve(admin, createSubmission(user), "tunel");

        const { html } = mailsTo(user.email)[0];
        assert.ok(html.includes('<a href="https://s.przelewy24.pl/8wLhm23vcPdw">kliknij, aby zapłacić przez Przelewy24</a>'));
    });

    test("napis linku do płatności ustawia organizator, termin jest wyróżniony", async () => {
        saveSettings({ paymentLinkLabel: "Zapłać tutaj" });
        const admin = createUser({ role: "admin" });
        const user = createUser();
        await approve(admin, createSubmission(user), "korona");

        const { html, text } = mailsTo(user.email)[0];
        assert.ok(html.includes(`<a href="${P24.replace(/&/g, "&amp;")}">Zapłać tutaj</a>`));
        assert.match(html, /<strong style="[^"]*underline[^"]*">7 dni od momentu otrzymania akceptacji\.<\/strong>/);
        assert.match(text, /w ciągu 7 dni od momentu otrzymania akceptacji\./);
        assert.doesNotMatch(text, /!!/);
    });

    test("liczba dni na opłatę w e-mailu bierze się z ustawień, bez dni — stały termin", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();

        saveSettings({ paymentDaysAfterApproval: 3 });
        await approve(admin, createSubmission(user), "tunel");
        assert.match(mailsTo(user.email)[0].text, /w ciągu 3 dni od momentu otrzymania akceptacji\./);

        mails.length = 0;
        saveSettings({ paymentDaysAfterApproval: 0, paymentDeadline: "2099-05-15" });
        await approve(admin, createSubmission(user), "tunel");
        assert.match(mailsTo(user.email)[0].text, /w strefie select do 15 maja 2099 r\./);
    });

    test("rezerwa: szablon z panelu z komentarzem organizatora pod spodem", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        const row = createSubmission(user, { carBrand: "Opel Calibra" });
        await api(admin).patch(`/api/admin/submissions/${row.id}/status`).send({ status: "waitlist", adminNote: "Trzymamy kciuki" });

        const [mail] = mailsTo(user.email);
        assert.match(mail.subject, /liście rezerwowej/);
        assert.match(mail.text, /Państwa zgłoszenie \(Opel Calibra, .+\) trafiło na listę rezerwową/);
        assert.match(mail.html, /<strong>listę rezerwową<\/strong>/);
        assert.match(mail.text, /Trzymamy kciuki/);
    });

    test("odrzucenie: szablon z panelu z komentarzem organizatora pod spodem", async () => {
        const admin = createUser({ role: "admin" });
        const user = createUser();
        const row = createSubmission(user);
        const res = await api(admin).patch(`/api/admin/submissions/${row.id}/status`).send({ status: "rejected", adminNote: "Do zobaczenia!" });
        assert.equal(res.status, 200, res.body.message);

        const [mail] = mailsTo(user.email);
        assert.match(mail.subject, /informacja o zgłoszeniu do strefy Select/);
        assert.match(mail.text, /nie możemy w tym roku zakwalifikować Państwa/);
        assert.match(mail.text, new RegExp(`udziału w Street Show ${row.edition}\\.`));
        assert.match(mail.text, /Do zobaczenia!/);

        siteContentDb.saveContent("templates", { ...siteContentDb.getContent("templates"), rejection: "Niestety nie tym razem, {marka}." });
        mails.length = 0;
        await api(admin).patch(`/api/admin/submissions/${createSubmission(user, { carBrand: "Fiat 126p" }).id}/status`).send({ status: "rejected" });
        assert.match(mailsTo(user.email)[0].text, /Niestety nie tym razem, Fiat 126p\./);
    });

    test("zapisane wcześniej szablony akceptacji i odrzucenia są raz podmieniane na nowe", () => {
        const templates = siteContentDb.getContent("templates");
        siteContentDb.saveContent("templates", { ...templates, acceptance: { murawa: "stary", tunel: "stary", korona: "stary" }, rejection: "stary", signature: "Ekipa" });
        db.prepare("DELETE FROM app_meta WHERE key = 'email_defaults_version'").run();

        assert.equal(siteContentDb.applyEmailDefaults(), true);
        const after = siteContentDb.getContent("templates");
        assert.match(after.acceptance.murawa, /Miło nam poinformować/);
        assert.match(after.rejection, /Dziękujemy za przesłanie zgłoszenia/);
        assert.equal(after.signature, "Ekipa");

        siteContentDb.saveContent("templates", { ...after, rejection: "moja wersja" });
        assert.equal(siteContentDb.applyEmailDefaults(), false);
        assert.equal(siteContentDb.getContent("templates").rejection, "moja wersja");
    });

    test("wyczyszczony tytuł przelewu nie pojawia się w e-mailu", async () => {
        saveSettings({ paymentAccount: ACCOUNT, paymentTitleTemplate: "" });
        setAcceptance({ tunel: TRANSFER_TEMPLATE });
        const admin = createUser({ role: "admin" });
        const user = createUser();
        await approve(admin, createSubmission(user), "tunel");

        const { text } = mailsTo(user.email)[0];
        assert.match(text, /Numer konta: 12 3456/);
        assert.doesNotMatch(text, /Tytuł przelewu/);
    });

    test("bez linku: dane do przelewu zamiast linku", async () => {
        saveSettings({ paymentAccount: ACCOUNT, paymentUrl: "" });
        setAcceptance({ tunel: TRANSFER_TEMPLATE });
        const admin = createUser({ role: "admin" });
        const user = createUser();
        await approve(admin, createSubmission(user), "tunel");

        const { text } = mailsTo(user.email)[0];
        assert.match(text, /Kwota: 150 zł/);
        assert.match(text, /Numer konta: 12 3456/);
        assert.doesNotMatch(text, /Link do płatności/);
    });

    test("tekst wpisany przez uczestnika nie staje się linkiem ani pogrubieniem", async () => {
        setAcceptance({ murawa: TRANSFER_TEMPLATE });
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

    test("jeden szablon dla każdego miejsca; stary zapis per miejsce daje pierwszy wypełniony tekst", async () => {
        const templates = siteContentDb.getContent("templates");
        siteContentDb.saveContent("templates", {
            ...templates,
            paymentConfirmed: { murawa: "", tunel: "Opłacone, miejsce {miejsce}.", korona: "inny" },
        });
        assert.equal(siteContentDb.getContent("templates").paymentConfirmed, "Opłacone, miejsce {miejsce}.");

        const admin = createUser({ role: "admin" });
        const user = createUser();
        const row = createSubmission(user);
        await approve(admin, row, "korona");
        mails.length = 0;
        await confirmPayment(admin, row);
        assert.match(mailsTo(user.email)[0].text, /Opłacone, miejsce Korona\./);
    });

    test("szablon: potwierdzenie, miejsce i klikalny link do wejściówki", async () => {
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
            paymentConfirmed: "",
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
