const submissionsDb = require("./db/submissions");
const siteContentDb = require("./db/siteContent");
const auditLogDb = require("./db/auditLog");
const { removeStoredPhotos, removeStoredProof } = require("./utils/userPhotos");
const { removeShowcaseCopies } = require("./showcase/routes");
const { todayInPoland } = require("./payments");

// Agreed with the organizer: photos and the payment proof of an accepted car stay
// 12 months after the event, those of a rejected, withdrawn or never decided one
// 30 days. The rest of the submission (name, phone, car) stays for accounting.
const RETENTION = {
    approved: { months: 12 },
    other: { days: 30 },
};

function shiftDate(date, { days = 0, months = 0 }) {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCMonth(value.getUTCMonth() + months);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
}

// a past edition with no saved date certainly took place by the end of its year
function eventDateOf(edition, today) {
    const saved = siteContentDb.getEditionDate(edition);
    if (saved) return saved;
    return Number(edition) < Number(today.slice(0, 4)) ? `${edition}-12-31` : null;
}

function purgeDateOf(row, today = todayInPoland()) {
    const eventDate = eventDateOf(row.edition, today);
    if (!eventDate) return null;
    return shiftDate(eventDate, row.status === "approved" ? RETENTION.approved : RETENTION.other);
}

function purgeDueSubmissionFiles(today = todayInPoland()) {
    const purged = [];
    for (const row of submissionsDb.listSubmissionsWithFiles()) {
        const due = purgeDateOf(row, today);
        if (!due || due > today) continue;
        removeStoredPhotos(JSON.parse(row.photos || "[]"));
        removeShowcaseCopies(row.id);
        if (row.payment_proof) removeStoredProof(row.payment_proof);
        submissionsDb.markFilesPurged(row.id);
        purged.push(row.id);
    }
    if (purged.length) {
        auditLogDb.createAuditEntry({
            adminId: null,
            action: "submission.files_purged",
            targetType: "submission",
            details: { count: purged.length, ids: purged.slice(0, 100) },
        });
    }
    return purged;
}

module.exports = { purgeDueSubmissionFiles, purgeDateOf, RETENTION };
