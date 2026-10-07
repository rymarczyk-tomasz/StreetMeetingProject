const siteContentDb = require("./db/siteContent");

function formatAccount(account) {
    const digits = String(account || "").replace(/\s+/g, "").replace(/^PL/i, "");
    if (!/^\d{26}$/.test(digits)) return String(account || "").trim();
    return `${digits.slice(0, 2)} ${digits.slice(2).replace(/(\d{4})(?=\d)/g, "$1 ")}`;
}

function getFeeAmount(settings = siteContentDb.getSettings()) {
    return String(settings.selectFeeAmount || process.env.SELECT_FEE_AMOUNT || "").trim();
}

// deadlines flip at polish midnight, not utc
function todayInPoland(now = new Date()) {
    return now.toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });
}

function addDays(date, days) {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
}

// earlier of: N days after approval / fixed deadline; a fixed deadline already
// past at approval (late reserve-list pick) is ignored when N is set
function getPaymentDueDate(submission, settings = siteContentDb.getSettings()) {
    const fixed = String(settings.paymentDeadline || "");
    const days = Number(settings.paymentDaysAfterApproval) || 0;
    const approvedOn = submission.approved_at
        ? todayInPoland(new Date(`${String(submission.approved_at).replace(" ", "T")}Z`))
        : "";
    const relative = days > 0 && approvedOn ? addDays(approvedOn, days) : "";

    if (!relative) return fixed;
    if (!fixed || fixed < approvedOn) return relative;
    return fixed < relative ? fixed : relative;
}

function isPaymentOverdue(submission, settings = siteContentDb.getSettings()) {
    if (submission.status !== "approved" || (submission.payment_status || "unpaid") !== "unpaid") {
        return false;
    }
    const due = getPaymentDueDate(submission, settings);
    return Boolean(due) && due < todayInPoland();
}

function hasPaymentDetails(settings = siteContentDb.getSettings()) {
    return Boolean(getFeeAmount(settings) && String(settings.paymentAccount || "").trim());
}

function getPaymentDetails(submission, settings = siteContentDb.getSettings()) {
    const title = String(settings.paymentTitleTemplate || "Strefa Select {rok} – {rejestracja}")
        .replace(/\{rok\}/g, String(submission.edition ?? ""))
        .replace(/\{rejestracja\}/g, submission.license_plate || "");

    return {
        amount: getFeeAmount(settings),
        recipient: String(settings.paymentRecipient || "").trim(),
        account: formatAccount(settings.paymentAccount),
        title: title.trim(),
        deadline: getPaymentDueDate(submission, settings),
        complete: hasPaymentDetails(settings),
    };
}

module.exports = {
    getPaymentDetails,
    hasPaymentDetails,
    getPaymentDueDate,
    isPaymentOverdue,
    getFeeAmount,
    formatAccount,
    todayInPoland,
    addDays,
};
