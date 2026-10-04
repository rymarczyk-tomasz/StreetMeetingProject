const express = require("express");

const usersDb = require("../db/users");
const refreshTokensDb = require("../db/refreshTokens");
const submissionsDb = require("../db/submissions");
const auditLogDb = require("../db/auditLog");
const eventContentDb = require("../db/eventContent");
const siteContentDb = require("../db/siteContent");
const { authenticate, requireRole } = require("../auth/middleware");
const {
    toPublicSubmission,
    removeSubmissionPhotos,
} = require("../submissions/routes");
const { sendSubmissionStatusEmail } = require("../notifications/email");
const {
    EMAIL_REGEX,
    normalizeText,
    isSafeUrl,
} = require("../utils/validation");
const {
    createImageUpload,
    verifyUploadedImages,
    uploadErrorHandler,
} = require("../utils/imageUpload");
const { CONTENT_UPLOAD_ROOT } = require("../utils/paths");
const gallerySync = require("../gallery/sync");

const router = express.Router();

router.use(authenticate, requireRole("admin"));

const SUBMISSION_STATUSES = ["pending", "approved", "rejected"];
const PAYMENT_STATUSES = ["unpaid", "verification", "paid"];
const MAX_BULK_IDS = 200;

const uploadContentImage = createImageUpload({
    destination: () => CONTENT_UPLOAD_ROOT,
    maxFiles: 1,
    maxFileSize: 10 * 1024 * 1024,
});

function audit(req, action, targetType, targetId, details = {}) {
    auditLogDb.createAuditEntry({
        adminId: req.user.sub,
        action,
        targetType,
        targetId,
        details,
    });
}

function toAdminSubmission(row) {
    return { ...toPublicSubmission(row), internalNote: row.internal_note };
}

function toAdminUser(user) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: !!user.is_active,
    };
}

function invalidUrlMessage(label) {
    return `${label}: podaj adres zaczynający się od https:// lub ścieżkę zaczynającą się od /.`;
}

router.post(
    "/upload-image",
    uploadContentImage.single("image"),
    (req, res) => {
        if (!req.file) {
            return res
                .status(400)
                .json({ message: "Nie przesłano pliku obrazu." });
        }

        verifyUploadedImages([req.file]);
        res.json({ url: `/uploads/content/${req.file.filename}` });
    },
    uploadErrorHandler({ maxFiles: 1, totalSizeLabel: "10 MB" }),
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
        id: normalizeText(card.id),
        title: normalizeText(card.title),
        description: normalizeText(card.description),
        image: normalizeText(card.image),
        alt: normalizeText(card.alt),
        actionLabel: normalizeText(card.actionLabel),
        actionHref: normalizeText(card.actionHref),
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

    for (const [index, card] of cards.entries()) {
        if (!isSafeUrl(card.image)) {
            return res
                .status(400)
                .json({ message: invalidUrlMessage(`Zdjęcie kafelka ${index + 1}`) });
        }
        if (!isSafeUrl(card.actionHref, { allowEmpty: true })) {
            return res
                .status(400)
                .json({ message: invalidUrlMessage(`Link kafelka ${index + 1}`) });
        }
    }

    const saved = eventContentDb.saveEventContent({
        intro: event.intro.trim(),
        cards,
    });
    audit(req, "event.content_updated", "event", 1, { cards: cards.length });
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
        heroTitle: normalizeText(home.heroTitle),
        heroDate: normalizeText(home.heroDate),
        heroLocation: normalizeText(home.heroLocation),
        heroImage: normalizeText(home.heroImage),
        ticketLabel: normalizeText(home.ticketLabel),
        ticketUrl: normalizeText(home.ticketUrl),
        exploreLabel: normalizeText(home.exploreLabel),
    };

    if (Object.values(content).some((value) => !value)) {
        return res
            .status(400)
            .json({ message: "Uzupełnij wszystkie pola sekcji Home." });
    }

    if (!isSafeUrl(content.heroImage)) {
        return res.status(400).json({ message: invalidUrlMessage("Zdjęcie hero") });
    }
    if (!isSafeUrl(content.ticketUrl)) {
        return res.status(400).json({ message: invalidUrlMessage("Link do biletów") });
    }

    const saved = siteContentDb.saveContent("home", content);
    audit(req, "home.content_updated", "home", 1);
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
        intro: normalizeText(gallery.intro),
        linkLabel: normalizeText(gallery.linkLabel),
        photos: Array.isArray(gallery.photos)
            ? gallery.photos.map((photo, index) => ({
                  id: normalizeText(photo.id || `photo-${index}`),
                  url: normalizeText(photo.url),
                  alt: normalizeText(photo.alt),
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

    if (content.photos.some((photo) => !isSafeUrl(photo.url))) {
        return res
            .status(400)
            .json({ message: invalidUrlMessage("Zdjęcie galerii") });
    }

    const saved = siteContentDb.saveContent("gallery", content);
    audit(req, "gallery.content_updated", "gallery", 1);
    res.json({ gallery: saved });
});

router.post("/gallery/sync", async (req, res) => {
    if (!gallerySync.isGallerySyncConfigured()) {
        return res.status(400).json({
            message:
                "Brak konfiguracji folderu galerii (DRIVE_GALLERY_FOLDER_ID w backend/config/.env).",
        });
    }

    if (gallerySync.isGallerySyncInProgress()) {
        return res
            .status(409)
            .json({ message: "Synchronizacja galerii już trwa." });
    }

    try {
        const result = await gallerySync.runGallerySync("admin-panel");
        audit(req, "gallery.synced", "gallery", 1, {
            filesCount: result.filesCount,
        });
        res.json({
            message: `Synchronizacja zakończona: ${result.filesCount} zdjęć (nowe/zmienione: ${result.downloadedCount}, usunięte: ${result.removedCount}).`,
        });
    } catch (error) {
        console.error("[gallery-sync] Błąd (admin-panel):", error.message);
        res.status(500).json({ message: "Błąd synchronizacji galerii." });
    }
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
        facebookUrl: normalizeText(contact.facebookUrl),
        instagramUrl: normalizeText(contact.instagramUrl),
        addressName: normalizeText(contact.addressName),
        addressLine1: normalizeText(contact.addressLine1),
        addressLine2: normalizeText(contact.addressLine2),
        mapUrl: normalizeText(contact.mapUrl),
        email: normalizeText(contact.email),
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

    if (!EMAIL_REGEX.test(content.email)) {
        return res
            .status(400)
            .json({ message: "Podaj poprawny e-mail kontaktowy." });
    }

    for (const [field, label] of [
        ["facebookUrl", "Link do Facebooka"],
        ["instagramUrl", "Link do Instagrama"],
        ["mapUrl", "Link do mapy"],
    ]) {
        if (!isSafeUrl(content[field], { allowEmpty: true })) {
            return res.status(400).json({ message: invalidUrlMessage(label) });
        }
    }

    const saved = siteContentDb.saveContent("contact", content);
    audit(req, "contact.content_updated", "contact", 1);
    res.json({ contact: saved });
});

router.get("/settings", (req, res) => {
    res.json({ settings: siteContentDb.getSettings() });
});

router.patch("/settings", (req, res) => {
    const settings = req.body.settings;
    if (!settings || typeof settings !== "object") {
        return res.status(400).json({ message: "Nieprawidłowe ustawienia." });
    }

    const content = {
        submissionsOpen: Boolean(settings.submissionsOpen),
        submissionsDeadline: normalizeText(settings.submissionsDeadline),
        selectFeeAmount: normalizeText(settings.selectFeeAmount).slice(0, 100),
        selectCapacity: Number(settings.selectCapacity || 0),
        maxVehiclesPerUser: Number(settings.maxVehiclesPerUser || 0),
    };

    if (
        content.submissionsDeadline &&
        !/^\d{4}-\d{2}-\d{2}$/.test(content.submissionsDeadline)
    ) {
        return res
            .status(400)
            .json({ message: "Termin zgłoszeń musi być datą (RRRR-MM-DD)." });
    }

    if (
        !Number.isInteger(content.selectCapacity) ||
        content.selectCapacity < 0 ||
        content.selectCapacity > 10000
    ) {
        return res.status(400).json({
            message: "Limit miejsc musi być liczbą całkowitą (0 = bez limitu).",
        });
    }

    if (
        !Number.isInteger(content.maxVehiclesPerUser) ||
        content.maxVehiclesPerUser < 1 ||
        content.maxVehiclesPerUser > 50
    ) {
        return res.status(400).json({
            message: "Limit pojazdów na konto musi być liczbą od 1 do 50.",
        });
    }

    const saved = siteContentDb.saveContent("settings", content);
    audit(req, "settings.updated", "settings", 1, content);
    res.json({ settings: saved });
});

router.get("/users", (req, res) => {
    const role = normalizeText(req.query.role);
    const active = normalizeText(req.query.active);
    const search = normalizeText(req.query.search);

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
    const settings = siteContentDb.getSettings();

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
            unpaid: submissions.unpaid || 0,
            paymentVerification: submissions.paymentVerification || 0,
            paid: submissions.paid || 0,
        },
        capacity: Number(settings.selectCapacity) || 0,
        availability: siteContentDb.getSubmissionsAvailability(settings),
        perDay: submissionsDb.getSubmissionsPerDay(30),
        topBrands: submissionsDb.getTopCarBrands(8),
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
    audit(req, "user.role_changed", "user", id, { email: updated.email, role });
    res.json({ user: toAdminUser(updated) });
});

router.patch("/users/:id/active", (req, res) => {
    const id = Number(req.params.id);
    const isActive = !!req.body.isActive;

    const target = usersDb.findUserById(id);
    if (!target) {
        return res.status(404).json({ message: "Nie znaleziono użytkownika." });
    }

    if (!isActive && id === Number(req.user.sub)) {
        return res
            .status(400)
            .json({ message: "Nie możesz zablokować własnego konta." });
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

    audit(req, isActive ? "user.unblocked" : "user.blocked", "user", id, {
        email: updated.email,
    });
    res.json({ user: toAdminUser(updated) });
});

// Ends every session of the user (e.g. after a suspected account takeover).
router.post("/users/:id/logout", (req, res) => {
    const id = Number(req.params.id);
    const target = usersDb.findUserById(id);
    if (!target) {
        return res.status(404).json({ message: "Nie znaleziono użytkownika." });
    }

    refreshTokensDb.revokeAllUserTokens(id);
    audit(req, "user.sessions_revoked", "user", id, { email: target.email });
    res.json({ message: `Wylogowano ${target.email} ze wszystkich urządzeń.` });
});

router.get("/submissions", (req, res) => {
    const status = normalizeText(req.query.status);
    const paymentStatus = normalizeText(req.query.paymentStatus);
    const search = normalizeText(req.query.search);

    if (status && !SUBMISSION_STATUSES.includes(status)) {
        return res
            .status(400)
            .json({ message: "Nieprawidłowy filtr statusu." });
    }

    if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) {
        return res
            .status(400)
            .json({ message: "Nieprawidłowy status płatności." });
    }

    const rows = submissionsDb.listAllSubmissions({
        status,
        paymentStatus,
        search,
    });
    res.json({ submissions: rows.map(toAdminSubmission) });
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

function changeSubmissionStatus(req, existing, status, adminNote) {
    const updated = submissionsDb.updateSubmissionStatus(
        existing.id,
        status,
        adminNote,
    );
    audit(req, `submission.${status}`, "submission", existing.id, {
        previousStatus: existing.status,
        status,
        adminNote,
    });

    if (existing.status !== status && ["approved", "rejected"].includes(status)) {
        const user = usersDb.findUserById(existing.user_id);
        void sendSubmissionStatusEmail({
            submission: updated,
            user,
            status,
            adminNote,
        }).catch((error) => {
            console.error(
                `[email] Nie udało się wysłać powiadomienia dla zgłoszenia ${existing.id}:`,
                error.message,
            );
        });
    }

    return updated;
}

function readStatusChange(body) {
    const status = body.status;
    const adminNote = normalizeText(body.adminNote);

    if (!SUBMISSION_STATUSES.includes(status)) {
        return { error: "Nieprawidłowy status." };
    }
    if (adminNote.length > 2000) {
        return { error: "Komentarz może mieć maksymalnie 2000 znaków." };
    }
    return { status, adminNote };
}

router.patch("/submissions/:id/status", (req, res) => {
    const { status, adminNote, error } = readStatusChange(req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    const existing = submissionsDb.findSubmissionById(Number(req.params.id));
    if (!existing) {
        return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
    }

    const updated = changeSubmissionStatus(req, existing, status, adminNote);
    res.json({ submission: toAdminSubmission(updated) });
});

router.post("/submissions/bulk-status", (req, res) => {
    const { status, adminNote, error } = readStatusChange(req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    const ids = Array.isArray(req.body.ids)
        ? [...new Set(req.body.ids.map(Number).filter(Number.isInteger))]
        : [];
    if (!ids.length || ids.length > MAX_BULK_IDS) {
        return res.status(400).json({
            message: `Zaznacz od 1 do ${MAX_BULK_IDS} zgłoszeń.`,
        });
    }

    let updatedCount = 0;
    for (const id of ids) {
        const existing = submissionsDb.findSubmissionById(id);
        if (!existing || existing.status === status) continue;
        // Keep a per-submission note unless a bulk note was provided.
        changeSubmissionStatus(
            req,
            existing,
            status,
            adminNote || existing.admin_note || "",
        );
        updatedCount += 1;
    }

    res.json({
        message: `Zmieniono status ${updatedCount} zgłoszeń.`,
        updatedCount,
    });
});

router.patch("/submissions/:id/internal-note", (req, res) => {
    const internalNote = normalizeText(req.body.internalNote);
    if (internalNote.length > 2000) {
        return res.status(400).json({
            message: "Notatka może mieć maksymalnie 2000 znaków.",
        });
    }

    const existing = submissionsDb.findSubmissionById(Number(req.params.id));
    if (!existing) {
        return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
    }

    const updated = submissionsDb.updateSubmissionInternalNote(
        existing.id,
        internalNote,
    );
    res.json({ submission: toAdminSubmission(updated) });
});

router.patch("/submissions/:id/payment-status", (req, res) => {
    const id = Number(req.params.id);
    const paymentStatus = req.body.paymentStatus;

    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
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
    audit(req, `submission.payment_${paymentStatus}`, "submission", id, {
        previousPaymentStatus: existing.payment_status || "unpaid",
        paymentStatus,
    });

    res.json({ submission: toAdminSubmission(updated) });
});

router.delete("/submissions/:id", (req, res) => {
    const existing = submissionsDb.findSubmissionById(Number(req.params.id));
    if (!existing) {
        return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
    }

    submissionsDb.deleteSubmission(existing.id);
    removeSubmissionPhotos(existing);
    audit(req, "submission.deleted", "submission", existing.id, {
        licensePlate: existing.license_plate,
        carBrand: existing.car_brand,
    });
    res.json({ message: "Zgłoszenie zostało usunięte." });
});

module.exports = router;
