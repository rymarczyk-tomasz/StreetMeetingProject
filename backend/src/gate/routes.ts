const crypto = require("crypto");
const express = require("express");

const submissionsDb = require("../db/submissions");
const siteContentDb = require("../db/siteContent");
const auditLogDb = require("../db/auditLog");
const { authenticate, requireCheckInAccess } = require("../auth/middleware");

// Gate check-in for admins and gate staff ("Obsługa wjazdu"). Returns only what
// the gate needs — no phone numbers, e-mails, photos or notes.
const router = express.Router();

router.use(authenticate, requireCheckInAccess);

function toGateView(row) {
    const currentEdition = siteContentDb.getCurrentEdition();
    return {
        id: row.id,
        licensePlate: row.license_plate,
        carBrand: row.car_brand,
        name: `${row.first_name} ${row.last_name}`,
        edition: row.edition,
        status: row.status,
        paymentStatus: row.payment_status || "unpaid",
        checkedInAt: row.checked_in_at,
        validForCurrentEdition: row.edition === currentEdition,
        valid: row.status === "approved" && row.payment_status === "paid",
    };
}

// SHA-256 of the pass token: lets the gate phone recognise scanned passes
// offline without keeping the codes themselves on the device.
function passHash(token) {
    return token ? crypto.createHash("sha256").update(String(token).toLowerCase()).digest("hex") : null;
}

// Time of a check-in made offline and sent later; ignored unless plausible
// (from the last 2 days, not in the future).
const MAX_OFFLINE_AGE_MS = 2 * 24 * 60 * 60 * 1000;
function readOfflineTime(value) {
    if (!value) return null;
    const time = new Date(String(value));
    const age = Date.now() - time.getTime();
    return Number.isFinite(age) && age >= -5 * 60 * 1000 && age <= MAX_OFFLINE_AGE_MS
        ? new Date(Math.min(time.getTime(), Date.now()))
        : null;
}

// Accepts the QR content in any form: the link (…/wjazd?kod=SSP-…), "SSP-<token>"
// or the bare token.
function findByPassCode(code) {
    let value = String(code || "").trim();
    const fromLink = value.match(/[?&]kod=([^&#\s]+)/i);
    if (fromLink) value = decodeURIComponent(fromLink[1]);
    const token = value.replace(/^SSP-/i, "");
    return /^[a-f0-9]{24}$/i.test(token) ? submissionsDb.findSubmissionByPassToken(token) : null;
}

router.get("/cars", (req, res) => {
    const rows = submissionsDb.listAllSubmissions({
        edition: siteContentDb.getCurrentEdition(),
        status: "approved",
    });
    auditLogDb.createThrottledAuditEntry({
        adminId: req.user.sub,
        action: "submission.gate_list_viewed",
        targetType: "submission",
        targetId: null,
        details: { count: rows.length },
    });
    res.json({
        cars: rows.map((row) => ({ ...toGateView(row), passHash: passHash(row.pass_token) })),
        edition: siteContentDb.getCurrentEdition(),
        generatedAt: new Date().toISOString(),
    });
});

router.get("/check", (req, res) => {
    const submission = findByPassCode(req.query.code);
    if (!submission) {
        return res.status(404).json({ message: "Nieznany kod wejściówki." });
    }
    res.json({ car: toGateView(submission) });
});

router.post("/cars/:id/checkin", (req, res) => {
    const existing = submissionsDb.findSubmissionById(Number(req.params.id));
    if (!existing || existing.status !== "approved") {
        return res.status(404).json({ message: "Nie znaleziono zaakceptowanego zgłoszenia." });
    }

    const checkedIn = req.body?.checkedIn !== false;
    if (checkedIn && existing.payment_status !== "paid") {
        return res.status(400).json({ message: "Opłata nie jest potwierdzona — wjazd niemożliwy." });
    }

    // Already let in (e.g. by another gate phone while this one was offline):
    // keep the first entry time.
    if (checkedIn && existing.checked_in_at) {
        return res.json({ car: toGateView(existing) });
    }

    const offlineAt = readOfflineTime(req.body?.checkedInAt);
    const updated = submissionsDb.setCheckedIn(existing.id, checkedIn, offlineAt || undefined);
    auditLogDb.createAuditEntry({
        adminId: req.user.sub,
        action: checkedIn ? "submission.checked_in" : "submission.checkin_undone",
        targetType: "submission",
        targetId: existing.id,
        details: {
            licensePlate: existing.license_plate,
            ...(offlineAt ? { offline: true } : {}),
        },
    });
    res.json({ car: toGateView(updated) });
});

module.exports = router;
