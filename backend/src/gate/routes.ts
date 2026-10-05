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
    res.json({ cars: rows.map(toGateView) });
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

    const updated = submissionsDb.setCheckedIn(existing.id, checkedIn);
    auditLogDb.createAuditEntry({
        adminId: req.user.sub,
        action: checkedIn ? "submission.checked_in" : "submission.checkin_undone",
        targetType: "submission",
        targetId: existing.id,
        details: { licensePlate: existing.license_plate },
    });
    res.json({ car: toGateView(updated) });
});

module.exports = router;
