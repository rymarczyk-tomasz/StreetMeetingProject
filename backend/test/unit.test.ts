// Pure functions - no app, no db (payments only touches the db for default settings).
require("./helpers");
const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const {
    formatAccount,
    getPaymentDueDate,
    isPaymentOverdue,
    todayInPoland,
    addDays,
    getPaymentDetails,
} = require("../src/payments");
const { sanitizeRichText, isRichTextEmpty } = require("../src/utils/html");
const { isSafeUrl, validatePassword, normalizeEmail } = require("../src/utils/validation");
const { validateContent } = require("../src/content/validators");

const settings = (patch = {}) => ({ paymentDeadline: "", paymentDaysAfterApproval: 0, ...patch });
const approvedOn = (date) => ({ approved_at: `${date} 10:00:00` });

describe("payments: termin płatności", () => {
    test("bez ustawień nie ma terminu", () => {
        assert.equal(getPaymentDueDate(approvedOn("2027-05-01"), settings()), "");
    });

    test("stały termin", () => {
        assert.equal(getPaymentDueDate(approvedOn("2027-05-01"), settings({ paymentDeadline: "2027-06-01" })), "2027-06-01");
    });

    test("N dni od akceptacji", () => {
        assert.equal(getPaymentDueDate(approvedOn("2027-05-28"), settings({ paymentDaysAfterApproval: 7 })), "2027-06-04");
    });

    test("wygrywa wcześniejsza z dwóch dat", () => {
        const s = settings({ paymentDeadline: "2027-06-01", paymentDaysAfterApproval: 7 });
        assert.equal(getPaymentDueDate(approvedOn("2027-05-01"), s), "2027-05-08");
        assert.equal(getPaymentDueDate(approvedOn("2027-05-30"), s), "2027-06-01");
    });

    test("stały termin miniony już przy akceptacji (późno z rezerwowej) jest pomijany", () => {
        const s = settings({ paymentDeadline: "2027-06-01", paymentDaysAfterApproval: 7 });
        assert.equal(getPaymentDueDate(approvedOn("2027-06-10"), s), "2027-06-17");
    });

    test("data akceptacji liczona po polskiej północy", () => {
        // 23:30 UTC on 31 May = 01:30 on 1 June in Warsaw
        const s = settings({ paymentDaysAfterApproval: 1 });
        assert.equal(getPaymentDueDate({ approved_at: "2027-05-31 23:30:00" }, s), "2027-06-02");
    });
});

describe("payments: po terminie", () => {
    const past = settings({ paymentDeadline: "2020-01-01" });

    test("zaakceptowane i nieopłacone po terminie", () => {
        assert.equal(isPaymentOverdue({ status: "approved", payment_status: "unpaid" }, past), true);
    });

    test("weryfikacja i opłacone nigdy nie są po terminie", () => {
        assert.equal(isPaymentOverdue({ status: "approved", payment_status: "verification" }, past), false);
        assert.equal(isPaymentOverdue({ status: "approved", payment_status: "paid" }, past), false);
    });

    test("tylko zaakceptowane", () => {
        for (const status of ["pending", "waitlist", "rejected", "withdrawn"]) {
            assert.equal(isPaymentOverdue({ status, payment_status: "unpaid" }, past), false, status);
        }
    });

    test("termin dzisiaj jeszcze nie minął", () => {
        const today = settings({ paymentDeadline: todayInPoland() });
        assert.equal(isPaymentOverdue({ status: "approved", payment_status: "unpaid" }, today), false);
    });
});

describe("payments: dane do przelewu", () => {
    test("formatuje numer konta z PL i bez", () => {
        const expected = "12 3456 7890 1234 5678 9012 3456";
        assert.equal(formatAccount("12345678901234567890123456"), expected);
        assert.equal(formatAccount("PL12 3456 7890 1234 5678 9012 3456"), expected);
        assert.equal(formatAccount("niepoprawny"), "niepoprawny");
        assert.equal(formatAccount(undefined), "");
    });

    test("tytuł przelewu z szablonu", () => {
        const details = getPaymentDetails(
            { edition: 2027, license_plate: "GD 12345" },
            { ...settings(), paymentTitleTemplate: "Select {rok} – {rejestracja}", selectFeeAmount: "100 zł", paymentAccount: "12345678901234567890123456" },
        );
        assert.equal(details.title, "Select 2027 – GD 12345");
        assert.equal(details.complete, true);
    });

    test("addDays przechodzi przez koniec miesiąca i roku", () => {
        assert.equal(addDays("2027-12-30", 3), "2028-01-02");
        assert.equal(addDays("2028-02-28", 1), "2028-02-29");
    });
});

describe("sanityzacja html (xss)", () => {
    test("usuwa skrypty, handlery i javascript:", () => {
        const out = sanitizeRichText(
            '<p onclick="x()">ok</p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">link</a><iframe src="https://evil"></iframe>',
        );
        assert.doesNotMatch(out, /script|onerror|onclick|javascript:|<img|<iframe/i);
        assert.match(out, /<p>ok<\/p>/);
    });

    test("zewnętrzne linki dostają noopener", () => {
        const out = sanitizeRichText('<a href="https://example.com">x</a>');
        assert.match(out, /target="_blank"/);
        assert.match(out, /rel="noopener noreferrer"/);
    });

    test("pusty tekst rozpoznawany mimo tagów", () => {
        assert.equal(isRichTextEmpty("<p> </p><br>"), true);
        assert.equal(isRichTextEmpty("<p>a</p>"), false);
    });
});

describe("walidacja", () => {
    test("isSafeUrl przepuszcza tylko http(s) i ścieżki w serwisie", () => {
        for (const ok of ["https://a.pl", "http://a.pl/x", "/regulamin", "#faq"]) assert.equal(isSafeUrl(ok), true, ok);
        for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.com", "ftp://a.pl", ""]) {
            assert.equal(isSafeUrl(bad), false, bad);
        }
        assert.equal(isSafeUrl("", { allowEmpty: true }), true);
    });

    test("hasło 8–128 znaków", () => {
        assert.ok(validatePassword("1234567"));
        assert.equal(validatePassword("12345678"), null);
        assert.ok(validatePassword("x".repeat(129)));
    });

    test("e-mail normalizowany", () => {
        assert.equal(normalizeEmail("  Jan@Example.COM "), "jan@example.com");
    });
});

describe("walidatory treści", () => {
    const validSettings = { maxVehiclesPerUser: 5 };

    test("odrzuca niepoprawny numer konta i nie-daty", () => {
        assert.ok(validateContent("settings", { ...validSettings, paymentAccount: "123" }).error);
        assert.ok(validateContent("settings", { ...validSettings, paymentDeadline: "jutro" }).error);
        assert.ok(validateContent("settings", { ...validSettings, paymentDaysAfterApproval: 91 }).error);
        assert.ok(validateContent("settings", { ...validSettings, selectCapacity: -1 }).error);
        assert.ok(validateContent("settings", { maxVehiclesPerUser: 0 }).error);
    });

    test("akceptuje IBAN ze spacjami i PL", () => {
        const res = validateContent("settings", { ...validSettings, paymentAccount: "PL12 3456 7890 1234 5678 9012 3456" });
        assert.equal(res.error, undefined);
    });

    test("odrzuca niebezpieczne linki w ogłoszeniu i u partnerów", () => {
        assert.ok(validateContent("announcement", { enabled: true, text: "x", linkUrl: "javascript:alert(1)" }).error);
        assert.ok(validateContent("partners", { items: [{ name: "A", logo: "javascript:x" }] }).error);
    });

    test("pomija nieznane pola", () => {
        const { content } = validateContent("settings", { ...validSettings, isAdmin: true });
        assert.equal(content.isAdmin, undefined);
    });

    test("nieznana sekcja i złe dane", () => {
        assert.ok(validateContent("hack", {}).error);
        assert.ok(validateContent("settings", []).error);
    });
});
