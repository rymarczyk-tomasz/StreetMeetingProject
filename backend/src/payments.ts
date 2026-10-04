const siteContentDb = require("./db/siteContent");

// "12345678901234567890123456" → "12 3456 7890 1234 5678 9012 3456" (Polish IBAN layout).
function formatAccount(account) {
    const digits = String(account || "").replace(/\s+/g, "").replace(/^PL/i, "");
    if (!/^\d{26}$/.test(digits)) return String(account || "").trim();
    return `${digits.slice(0, 2)} ${digits.slice(2).replace(/(\d{4})(?=\d)/g, "$1 ")}`;
}

function getFeeAmount(settings = siteContentDb.getSettings()) {
    return String(settings.selectFeeAmount || process.env.SELECT_FEE_AMOUNT || "").trim();
}

// Transfer details for one submission, from Admin → Ustawienia.
// `complete` is false until the organizer filled in the account number.
function getPaymentDetails(submission, settings = siteContentDb.getSettings()) {
    const title = String(settings.paymentTitleTemplate || "Strefa Select {rok} – {rejestracja}")
        .replace(/\{rok\}/g, String(submission.edition ?? ""))
        .replace(/\{rejestracja\}/g, submission.license_plate || "");

    return {
        amount: getFeeAmount(settings),
        recipient: String(settings.paymentRecipient || "").trim(),
        account: formatAccount(settings.paymentAccount),
        title: title.trim(),
        deadline: settings.paymentDeadline || "",
        complete: Boolean(String(settings.paymentAccount || "").trim()),
    };
}

module.exports = { getPaymentDetails, getFeeAmount, formatAccount };
