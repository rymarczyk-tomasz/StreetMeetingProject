const express = require("express");

const usersDb = require("../db/users");
const refreshTokensDb = require("../db/refreshTokens");
const submissionsDb = require("../db/submissions");
const { authenticate, requireRole } = require("../auth/middleware");
const { toPublicSubmission } = require("../submissions/routes");

const router = express.Router();

router.use(authenticate, requireRole("admin"));

router.get("/users", (req, res) => {
    res.json({ users: usersDb.listUsers() });
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
    const rows = submissionsDb.listAllSubmissions();
    res.json({ submissions: rows.map(toPublicSubmission) });
});

router.patch("/submissions/:id/status", (req, res) => {
    const id = Number(req.params.id);
    const { status, adminNote } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Nieprawidłowy status." });
    }

    const existing = submissionsDb.findSubmissionById(id);
    if (!existing) {
        return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
    }

    const updated = submissionsDb.updateSubmissionStatus(id, status, adminNote);
    res.json({ submission: toPublicSubmission(updated) });
});

module.exports = router;
