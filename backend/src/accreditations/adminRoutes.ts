const express = require("express");

const accreditationsDb = require("../db/accreditations");
const auditLogDb = require("../db/auditLog");
const siteContentDb = require("../db/siteContent");
const { accreditationDraft, sendAccreditationDecisionEmail } = require("../notifications/email");
const { normalizeText } = require("../utils/validation");

// mounted inside the admin router, behind requireRole("admin")
const router = express.Router();

const DECISIONS = ["approved", "rejected"];

function toAdminAccreditation(row) {
    return {
        id: row.id,
        edition: row.edition,
        name: row.name,
        email: row.email,
        phone: row.phone,
        instagramUrl: row.instagram_url,
        status: row.status,
        createdAt: row.created_at,
        decidedAt: row.decided_at,
    };
}

// ids only: the audit log must not keep personal data of a deleted request
function audit(req, action, id) {
    auditLogDb.createAuditEntry({
        adminId: req.user.sub,
        action,
        targetType: "accreditation",
        targetId: id,
    });
}

router.get("/", (req, res) => {
    const requested = String(req.query.edition || "");
    let edition = siteContentDb.getCurrentEdition();
    if (requested === "all") edition = null;
    else if (/^\d{4}$/.test(requested)) edition = Number(requested);

    auditLogDb.createThrottledAuditEntry({
        adminId: req.user.sub,
        action: "accreditation.list_viewed",
        targetType: "accreditation",
    });
    res.json({ accreditations: accreditationsDb.listAccreditations(edition).map(toAdminAccreditation) });
});

router.get("/:id/draft", (req, res) => {
    const status = String(req.query.status || "");
    if (!DECISIONS.includes(status)) {
        return res.status(400).json({ message: "Nieprawidłowa decyzja." });
    }
    const row = accreditationsDb.findAccreditation(Number(req.params.id));
    if (!row) return res.status(404).json({ message: "Nie znaleziono wniosku." });
    res.json(accreditationDraft(row, status));
});

router.patch("/:id/status", (req, res) => {
    const status = req.body?.status;
    if (!DECISIONS.includes(status)) {
        return res.status(400).json({ message: "Nieprawidłowa decyzja." });
    }
    const subject = normalizeText(req.body?.subject).replace(/\s+/g, " ");
    const message = normalizeText(req.body?.message).replace(/\r\n/g, "\n");
    if (!subject || subject.length > 200 || !message || message.length > 5000) {
        return res.status(400).json({ message: "Podaj temat (do 200 znaków) i treść wiadomości (do 5000 znaków)." });
    }
    const current = accreditationsDb.findAccreditation(Number(req.params.id));
    if (!current) return res.status(404).json({ message: "Nie znaleziono wniosku." });
    // a double click or a second admin must not send the same e-mail again
    if (current.status === status) {
        return res.status(409).json({ message: "Ten wniosek ma już taką decyzję." });
    }

    const accreditation = accreditationsDb.setAccreditationStatus(current.id, status);
    audit(req, `accreditation.${status}`, current.id);
    void sendAccreditationDecisionEmail({ accreditation, subject, message }).catch((error) =>
        console.error("[email] Decyzja o akredytacji:", error.message),
    );
    res.json({ accreditation: toAdminAccreditation(accreditation) });
});

router.delete("/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!accreditationsDb.deleteAccreditation(id)) {
        return res.status(404).json({ message: "Nie znaleziono wniosku." });
    }
    audit(req, "accreditation.deleted", id);
    res.json({ message: "Usunięto wniosek." });
});

module.exports = router;
