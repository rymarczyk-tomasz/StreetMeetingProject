const express = require("express");

const usersDb = require("../db/users");
const refreshTokensDb = require("../db/refreshTokens");
const submissionsDb = require("../db/submissions");
const auditLogDb = require("../db/auditLog");
const { authenticate, requireRole } = require("../auth/middleware");
const { toPublicSubmission } = require("../submissions/routes");
const { sendSubmissionStatusEmail } = require("../notifications/email");

const router = express.Router();

router.use(authenticate, requireRole("admin"));

router.get("/users", (req, res) => {
    const role = String(req.query.role || "").trim();
    const active = String(req.query.active || "").trim();
    const search = String(req.query.search || "").trim();

    if (role && !["user", "admin"].includes(role)) {
        return res.status(400).json({ message: "Nieprawidłowy filtr roli." });
    }

    if (active && !["0", "1"].includes(active)) {
        return res
            .status(400)
            .json({ message: "Nieprawidłowy filtr statusu." });
    }

    res.json({ users: usersDb.listUsers({ search, role, active }) });
});

router.get("/stats", (req, res) => {
    const users = usersDb.getUserStats();
    const submissions = submissionsDb.getSubmissionStats();

    res.json({
        users: {
            total: users.total || 0,
            active: users.active || 0,
            admins: users.admins || 0,
        },
        submissions: {
            total: submissions.total || 0,
            pending: submissions.pending || 0,
            approved: submissions.approved || 0,
            rejected: submissions.rejected || 0,
        },
    });
});

router.patch("/users/:id/role", (req, res) => {
    const id = Number(req.params.id);
    const role = req.body.role;

    if (!["user", "admin"].includes(role)) {
        return res.status(400).json({ message: "Nieprawidłowa rola." });
    }

    const target = usersDb.findUserById(id);
    if (!target) {
        return res.status(404).json({ message: "Nie znaleziono użytkownika." });
    }

    if (
        target.role === "admin" &&
        role === "user" &&
        usersDb.countAdmins() <= 1
    ) {
        return res.status(400).json({
            message: "Nie można odebrać roli ostatniemu administratorowi.",
        });
    }

    const updated = usersDb.updateUserRole(id, role);
    auditLogDb.createAuditEntry({
        adminId: req.user.sub,
        action: "user.role_changed",
        targetType: "user",
        targetId: id,
        details: { email: updated.email, role },
    });
    res.json({
        user: {
            id: updated.id,
            email: updated.email,
            firstName: updated.first_name,
            lastName: updated.last_name,
            role: updated.role,
            isActive: !!updated.is_active,
        },
    });
});

router.patch("/users/:id/active", (req, res) => {
    const id = Number(req.params.id);
    const isActive = !!req.body.isActive;

    const target = usersDb.findUserById(id);
    if (!target) {
        return res.status(404).json({ message: "Nie znaleziono użytkownika." });
    }

    if (target.role === "admin" && !isActive && usersDb.countAdmins() <= 1) {
        return res.status(400).json({
            message: "Nie można zablokować ostatniego administratora.",
        });
    }

    const updated = usersDb.updateUserActive(id, isActive);

    if (!isActive) {
        refreshTokensDb.revokeAllUserTokens(id);
    }

    auditLogDb.createAuditEntry({
        adminId: req.user.sub,
        action: isActive ? "user.unblocked" : "user.blocked",
        targetType: "user",
        targetId: id,
        details: { email: updated.email },
    });

    res.json({
        user: {
            id: updated.id,
            email: updated.email,
            firstName: updated.first_name,
            lastName: updated.last_name,
            role: updated.role,
            isActive: !!updated.is_active,
        },
    });
});

router.get("/submissions", (req, res) => {
    const status = String(req.query.status || "").trim();
    const search = String(req.query.search || "").trim();

    if (status && !["pending", "approved", "rejected"].includes(status)) {
        return res
            .status(400)
            .json({ message: "Nieprawidłowy filtr statusu." });
    }

    const rows = submissionsDb.listAllSubmissions({ status, search });
    res.json({ submissions: rows.map(toPublicSubmission) });
});

router.get("/audit-log", (req, res) => {
    const rows = auditLogDb.listAuditEntries(req.query.limit);
    res.json({
        entries: rows.map((row) => ({
            id: row.id,
            adminEmail: row.admin_email,
            action: row.action,
            targetType: row.target_type,
            targetId: row.target_id,
            details: JSON.parse(row.details || "{}"),
            createdAt: row.created_at,
        })),
    });
});

router.patch("/submissions/:id/status", (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;
    const adminNote = String(req.body.adminNote || "").trim();

    if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Nieprawidłowy status." });
    }

    if (adminNote.length > 2000) {
        return res.status(400).json({
            message: "Komentarz może mieć maksymalnie 2000 znaków.",
        });
    }

    const existing = submissionsDb.findSubmissionById(id);
    if (!existing) {
        return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
    }

    const updated = submissionsDb.updateSubmissionStatus(id, status, adminNote);
    auditLogDb.createAuditEntry({
        adminId: req.user.sub,
        action: `submission.${status}`,
        targetType: "submission",
        targetId: id,
        details: {
            previousStatus: existing.status,
            status,
            adminNote,
        },
    });

    if (
        existing.status !== status &&
        ["approved", "rejected"].includes(status)
    ) {
        const user = usersDb.findUserById(existing.user_id);
        void sendSubmissionStatusEmail({
            submission: updated,
            user,
            status,
            adminNote,
        }).catch((error) => {
            console.error(
                `[email] Nie udało się wysłać powiadomienia dla zgłoszenia ${id}:`,
                error.message,
            );
        });
    }

    res.json({ submission: toPublicSubmission(updated) });
});

module.exports = router;
