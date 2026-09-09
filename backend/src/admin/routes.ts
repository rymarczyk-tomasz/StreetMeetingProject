const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const usersDb = require("../db/users");
const refreshTokensDb = require("../db/refreshTokens");
const submissionsDb = require("../db/submissions");
const auditLogDb = require("../db/auditLog");
const eventContentDb = require("../db/eventContent");
const siteContentDb = require("../db/siteContent");
const { authenticate, requireRole } = require("../auth/middleware");
const { toPublicSubmission } = require("../submissions/routes");
const { sendSubmissionStatusEmail } = require("../notifications/email");

const router = express.Router();

router.use(authenticate, requireRole("admin"));

const contentUploadsRoot = path.join(process.cwd(), "uploads/content");
if (!fs.existsSync(contentUploadsRoot)) {
    fs.mkdirSync(contentUploadsRoot, { recursive: true });
}

const contentImageStorage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, contentUploadsRoot);
    },
    filename(req, file, cb) {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `${Date.now()}-${safeName}`);
    },
});

const uploadContentImage = multer({
    storage: contentImageStorage,
    limits: { files: 1, fileSize: 10 * 1024 * 1024 },
    fileFilter(req, file, cb) {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(
                new Error("Tylko pliki graficzne (obrazy) są dozwolone!"),
                false,
            );
        }
    },
});

router.post(
    "/upload-image",
    uploadContentImage.single("image"),
    (req, res) => {
        if (!req.file) {
            return res
                .status(400)
                .json({ message: "Nie przesłano pliku obrazu." });
        }

        res.json({ url: `/uploads/content/${req.file.filename}` });
    },
    (err, req, res, next) => {
        res.status(400).json({
            message: err.message || "Nie udało się przesłać obrazu.",
        });
    },
);

router.get("/event", (req, res) => {
    res.json({ event: eventContentDb.getEventContent() });
});

router.patch("/event", (req, res) => {
    const event = req.body.event;
    if (
        !event ||
        typeof event.intro !== "string" ||
        !Array.isArray(event.cards) ||
        event.cards.length !== 3
    ) {
        return res.status(400).json({
            message: "Treść Eventu musi zawierać opis i trzy kafelki.",
        });
    }

    const cards = event.cards.map((card) => ({
        id: String(card.id || "").trim(),
        title: String(card.title || "").trim(),
        description: String(card.description || "").trim(),
        image: String(card.image || "").trim(),
        alt: String(card.alt || "").trim(),
        actionLabel: String(card.actionLabel || "").trim(),
        actionHref: String(card.actionHref || "").trim(),
        actionExternal: Boolean(card.actionExternal),
    }));

    if (
        !event.intro.trim() ||
        cards.some(
            (card) =>
                !card.title || !card.description || !card.image || !card.alt,
        )
    ) {
        return res.status(400).json({
            message:
                "Uzupełnij opis, tytuł, treść, zdjęcie i tekst alternatywny każdego kafelka.",
        });
    }

    const saved = eventContentDb.saveEventContent({
        intro: event.intro.trim(),
        cards,
    });
    auditLogDb.createAuditEntry({
        adminId: req.user.sub,
        action: "event.content_updated",
        targetType: "event",
        targetId: 1,
        details: { cards: cards.length },
    });
    res.json({ event: saved });
});

router.get("/home", (req, res) => {
    res.json({ home: siteContentDb.getContent("home") });
});

router.patch("/home", (req, res) => {
    const home = req.body.home;
    if (!home || typeof home !== "object") {
        return res
            .status(400)
            .json({ message: "Nieprawidłowe dane sekcji Home." });
    }

    const content = {
        heroTitle: String(home.heroTitle || "").trim(),
        heroDate: String(home.heroDate || "").trim(),
        heroLocation: String(home.heroLocation || "").trim(),
        heroImage: String(home.heroImage || "").trim(),
        ticketLabel: String(home.ticketLabel || "").trim(),
        ticketUrl: String(home.ticketUrl || "").trim(),
        exploreLabel: String(home.exploreLabel || "").trim(),
    };

    if (
        !content.heroTitle ||
        !content.heroDate ||
        !content.heroLocation ||
        !content.heroImage ||
        !content.ticketLabel ||
        !content.ticketUrl ||
        !content.exploreLabel
    ) {
        return res
            .status(400)
            .json({ message: "Uzupełnij wszystkie pola sekcji Home." });
    }

    const saved = siteContentDb.saveContent("home", content);
    auditLogDb.createAuditEntry({
        adminId: req.user.sub,
        action: "home.content_updated",
        targetType: "home",
        targetId: 1,
        details: {},
    });
    res.json({ home: saved });
});

router.get("/gallery", (req, res) => {
    res.json({ gallery: siteContentDb.getContent("gallery") });
});

router.patch("/gallery", (req, res) => {
    const gallery = req.body.gallery;
    if (!gallery || typeof gallery !== "object") {
        return res
            .status(400)
            .json({ message: "Nieprawidłowe dane sekcji Galeria." });
    }

    const content = {
        intro: String(gallery.intro || "").trim(),
        linkLabel: String(gallery.linkLabel || "").trim(),
        photos: Array.isArray(gallery.photos)
            ? gallery.photos.map((photo, index) => ({
                  id: String(photo.id || `photo-${index}`).trim(),
                  url: String(photo.url || "").trim(),
                  alt: String(photo.alt || "").trim(),
              }))
            : [],
    };

    if (!content.linkLabel) {
        return res
            .status(400)
            .json({ message: "Podaj tekst przycisku do galerii." });
    }

    if (content.photos.some((photo) => !photo.url)) {
        return res.status(400).json({
            message: "Każde zdjęcie w galerii musi mieć plik lub URL.",
        });
    }

    const saved = siteContentDb.saveContent("gallery", content);
    auditLogDb.createAuditEntry({
        adminId: req.user.sub,
        action: "gallery.content_updated",
        targetType: "gallery",
        targetId: 1,
        details: {},
    });
    res.json({ gallery: saved });
});

router.get("/contact", (req, res) => {
    res.json({ contact: siteContentDb.getContent("contact") });
});

router.patch("/contact", (req, res) => {
    const contact = req.body.contact;
    if (!contact || typeof contact !== "object") {
        return res
            .status(400)
            .json({ message: "Nieprawidłowe dane sekcji Kontakt." });
    }

    const content = {
        facebookUrl: String(contact.facebookUrl || "").trim(),
        instagramUrl: String(contact.instagramUrl || "").trim(),
        addressName: String(contact.addressName || "").trim(),
        addressLine1: String(contact.addressLine1 || "").trim(),
        addressLine2: String(contact.addressLine2 || "").trim(),
        mapUrl: String(contact.mapUrl || "").trim(),
        email: String(contact.email || "").trim(),
    };

    if (
        !content.addressName ||
        !content.addressLine1 ||
        !content.addressLine2 ||
        !content.email
    ) {
        return res
            .status(400)
            .json({ message: "Uzupełnij wymagane pola sekcji Kontakt." });
    }

    const saved = siteContentDb.saveContent("contact", content);
    auditLogDb.createAuditEntry({
        adminId: req.user.sub,
        action: "contact.content_updated",
        targetType: "contact",
        targetId: 1,
        details: {},
    });
    res.json({ contact: saved });
});

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
    const paymentStatus = String(req.query.paymentStatus || "").trim();
    const search = String(req.query.search || "").trim();

    if (status && !["pending", "approved", "rejected"].includes(status)) {
        return res
            .status(400)
            .json({ message: "Nieprawidłowy filtr statusu." });
    }

    if (
        paymentStatus &&
        !["unpaid", "verification", "paid"].includes(paymentStatus)
    ) {
        return res
            .status(400)
            .json({ message: "Nieprawidłowy status płatności." });
    }

    const rows = submissionsDb.listAllSubmissions({
        status,
        paymentStatus,
        search,
    });
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

router.patch("/submissions/:id/payment-status", (req, res) => {
    const id = Number(req.params.id);
    const paymentStatus = req.body.paymentStatus;

    if (!["unpaid", "verification", "paid"].includes(paymentStatus)) {
        return res
            .status(400)
            .json({ message: "Nieprawidłowy status płatności." });
    }

    const existing = submissionsDb.findSubmissionById(id);
    if (!existing) {
        return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
    }

    const updated = submissionsDb.updateSubmissionPaymentStatus(
        id,
        paymentStatus,
    );
    auditLogDb.createAuditEntry({
        adminId: req.user.sub,
        action: `submission.payment_${paymentStatus}`,
        targetType: "submission",
        targetId: id,
        details: {
            previousPaymentStatus: existing.payment_status || "unpaid",
            paymentStatus,
        },
    });

    res.json({ submission: toPublicSubmission(updated) });
});

module.exports = router;
