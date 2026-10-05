const express = require("express");

const usersDb = require("../db/users");
const refreshTokensDb = require("../db/refreshTokens");
const submissionsDb = require("../db/submissions");
const auditLogDb = require("../db/auditLog");
const messagesDb = require("../db/messages");
const siteContentDb = require("../db/siteContent");
const { authenticate, requireRole } = require("../auth/middleware");
const {
    toPublicSubmission,
    removeSubmissionPhotos,
} = require("../submissions/routes");
const {
    isEmailConfigured,
    sendSubmissionStatusEmail,
    sendGroupEmail,
} = require("../notifications/email");
const { normalizeText } = require("../utils/validation");
const {
    createImageUpload,
    verifyUploadedImages,
    createPdfUpload,
    verifyUploadedPdf,
    uploadErrorHandler,
} = require("../utils/imageUpload");
const { CONTENT_UPLOAD_ROOT } = require("../utils/paths");
const { validateContent } = require("../content/validators");
const { isPaymentOverdue, getFeeAmount } = require("../payments");
const threadsDb = require("../db/threads");
const ratingsDb = require("../db/ratings");
const { getThread, postToThread, readMessageBody } = require("../submissions/thread");
const { adminRouter: albumsRouter } = require("../gallery/routes");

const router = express.Router();

router.use(authenticate, requireRole("admin"));
router.use("/albums", albumsRouter);

const SUBMISSION_STATUSES = ["pending", "approved", "rejected", "waitlist", "withdrawn"];
// "overdue" is a filter only: approved, unpaid and past the payment deadline.
const PAYMENT_STATUSES = ["unpaid", "verification", "paid"];
const PAYMENT_FILTERS = [...PAYMENT_STATUSES, "overdue"];
const MAX_BULK_IDS = 200;

const uploadContentImage = createImageUpload({
    destination: () => CONTENT_UPLOAD_ROOT,
    maxFiles: 1,
    maxFileSize: 10 * 1024 * 1024,
});

const uploadContentPdf = createPdfUpload({
    destination: () => CONTENT_UPLOAD_ROOT,
    maxFileSize: 20 * 1024 * 1024,
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
    return {
        ...toPublicSubmission(row),
        internalNote: row.internal_note,
        approvedAt: row.approved_at,
        paymentReminderSentAt: row.payment_reminder_sent_at,
        showcaseHidden: Boolean(row.showcase_hidden),
        messages: threadsDb.threadCounts(row.id, true),
    };
}

// Places in the Select zone (Ustawienia); 0 = no limit.
function getCapacity(settings = siteContentDb.getSettings()) {
    return Number(settings.selectCapacity) || 0;
}

function toAdminUser(user) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: !!user.is_active,
        gateStaff: !!user.gate_staff,
    };
}

// "?edition=2026" → 2026, "?edition=all" → null (no filter), missing → current edition.
function readEditionFilter(value) {
    if (value === "all") return null;
    const edition = Number(value);
    return Number.isInteger(edition) && edition > 0
        ? edition
        : siteContentDb.getCurrentEdition();
}

// ---- Uploads ------------------------------------------------------------

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

router.post(
    "/upload-document",
    uploadContentPdf.single("document"),
    (req, res) => {
        if (!req.file) {
            return res.status(400).json({ message: "Nie przesłano pliku PDF." });
        }

        verifyUploadedPdf(req.file);
        res.json({ url: `/uploads/content/${req.file.filename}` });
    },
    uploadErrorHandler({ maxFiles: 1, totalSizeLabel: "20 MB" }),
);

// ---- Page content (CMS) -------------------------------------------------

function findContentKey(req, res) {
    const { key } = req.params;
    if (!siteContentDb.isKnownContentKey(key)) {
        res.status(404).json({ message: "Nieznana sekcja treści." });
        return null;
    }
    return key;
}

router.get("/content/:key", (req, res) => {
    const key = findContentKey(req, res);
    if (!key) return;
    res.json({ content: siteContentDb.getContent(key) });
});

router.patch("/content/:key", (req, res) => {
    const key = findContentKey(req, res);
    if (!key) return;

    const { content, error } = validateContent(key, req.body?.content);
    if (error) return res.status(400).json({ message: error });

    const previous = siteContentDb.getContent(key);
    const saved = siteContentDb.saveContent(key, content, req.user.sub);
    audit(
        req,
        key === "settings" ? "settings.updated" : `${key}.content_updated`,
        key,
        1,
        key === "edition" && previous.year !== saved.year
            ? { previousYear: previous.year, year: saved.year }
            : {},
    );
    res.json({ content: saved });
});

router.get("/content/:key/revisions", (req, res) => {
    const key = findContentKey(req, res);
    if (!key) return;

    res.json({
        revisions: siteContentDb.listRevisions(key).map((row) => ({
            id: row.id,
            adminEmail: row.admin_email,
            createdAt: row.created_at,
        })),
    });
});

router.post("/content/:key/revisions/:revisionId/restore", (req, res) => {
    const key = findContentKey(req, res);
    if (!key) return;

    const revision = siteContentDb.getRevisionContent(
        key,
        Number(req.params.revisionId),
    );
    if (!revision) {
        return res.status(404).json({ message: "Nie znaleziono wersji." });
    }

    // Re-validate: rules may have tightened since the revision was saved.
    const { content, error } = validateContent(key, revision);
    if (error) return res.status(400).json({ message: error });

    const saved = siteContentDb.saveContent(key, content, req.user.sub);
    audit(req, `${key}.content_restored`, key, Number(req.params.revisionId));
    res.json({ content: saved });
});

// ---- Users --------------------------------------------------------------

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

    const users = usersDb.listUsers({ search, role, active });
    auditLogDb.createThrottledAuditEntry({
        adminId: req.user.sub,
        action: "user.list_viewed",
        targetType: "user",
        targetId: null,
        details: { count: users.length },
    });
    res.json({ users });
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
// "Obsługa wjazdu": access to the gate check-in screen only (no admin panel).
router.patch("/users/:id/gate-staff", (req, res) => {
    const id = Number(req.params.id);
    const target = usersDb.findUserById(id);
    if (!target) {
        return res.status(404).json({ message: "Nie znaleziono użytkownika." });
    }

    const gateStaff = Boolean(req.body?.gateStaff);
    const updated = usersDb.updateUserGateStaff(id, gateStaff);
    audit(req, gateStaff ? "user.gate_staff_granted" : "user.gate_staff_revoked", "user", id, {
        email: updated.email,
    });
    res.json({ user: toAdminUser(updated) });
});

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

// ---- Stats --------------------------------------------------------------

router.get("/stats", (req, res) => {
    const edition = readEditionFilter(req.query.edition) || siteContentDb.getCurrentEdition();
    const users = usersDb.getUserStats();
    const submissions = submissionsDb.getSubmissionStats(edition);
    const settings = siteContentDb.getSettings();
    const capacity = getCapacity(settings);
    const overdue = submissionsDb
        .listAwaitingPayment(edition)
        .filter((row) => isPaymentOverdue(row, settings)).length;

    res.json({
        edition,
        currentEdition: siteContentDb.getCurrentEdition(),
        unreadMessages: [...threadsDb.unreadCountsForAdmin().values()].reduce((sum, count) => sum + count, 0),
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
            waitlist: submissions.waitlist || 0,
            withdrawn: submissions.withdrawn || 0,
            overdue,
            unpaid: submissions.unpaid || 0,
            paymentVerification: submissions.paymentVerification || 0,
            paid: submissions.paid || 0,
        },
        capacity,
        freePlaces: capacity ? Math.max(0, capacity - (submissions.approved || 0)) : null,
        availability: siteContentDb.getSubmissionsAvailability(settings),
        perDay: submissionsDb.getSubmissionsPerDay(edition, 30),
        topBrands: submissionsDb.getTopCarBrands(edition, 8),
    });
});

// ---- Post-event report ----------------------------------------------------

// "150 zł" / "150,50 PLN" → 150 / 150.5; null when there's no number.
function parseFeeAmount(value) {
    const match = String(value || "").replace(/\s+/g, "").match(/\d+(?:[.,]\d+)?/);
    return match ? Number(match[0].replace(",", ".")) : null;
}

// Check-ins per hour in Polish time ("14:00" → count).
function arrivalsPerHour(times) {
    const counts = new Map();
    for (const time of times) {
        const date = new Date(`${String(time).replace(" ", "T")}Z`);
        const hour = date.toLocaleTimeString("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit" });
        const label = `${hour.padStart(2, "0")}:00`;
        counts.set(label, (counts.get(label) || 0) + 1);
    }
    return [...counts.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hour, count]) => ({ hour, count }));
}

router.get("/report", (req, res) => {
    const edition = readEditionFilter(req.query.edition) || siteContentDb.getCurrentEdition();
    const summaries = submissionsDb.getEditionSummaries();
    const summary = summaries.find((row) => row.edition === edition) || { edition, total: 0 };
    const settings = siteContentDb.getSettings();
    const fee = parseFeeAmount(getFeeAmount(settings));

    auditLogDb.createThrottledAuditEntry({
        adminId: req.user.sub,
        action: "submission.report_viewed",
        targetType: "submission",
        targetId: null,
        details: { edition },
    });

    res.json({
        edition,
        summary,
        fee: { label: getFeeAmount(settings), amount: fee },
        // Estimate: today's fee × paid cars (the fee may have changed since).
        revenue: fee !== null ? Math.round(fee * (summary.paid || 0) * 100) / 100 : null,
        arrivals: arrivalsPerHour(submissionsDb.listCheckInTimes(edition)),
        noShows: submissionsDb.listNoShows(edition).map((row) => ({
            id: row.id,
            carBrand: row.car_brand,
            licensePlate: row.license_plate,
            name: `${row.first_name} ${row.last_name}`,
        })),
        topBrands: submissionsDb.getTopCarBrands(edition, 10),
        editions: summaries,
    });
});

// ---- Submissions --------------------------------------------------------

router.get("/editions", (req, res) => {
    const currentEdition = siteContentDb.getCurrentEdition();
    const editions = submissionsDb.listEditions();
    if (!editions.some((row) => row.edition === currentEdition)) {
        editions.unshift({ edition: currentEdition, count: 0 });
    }
    res.json({ currentEdition, editions });
});

function readSubmissionFilters(source) {
    const status = normalizeText(source.status);
    const paymentStatus = normalizeText(source.paymentStatus);

    if (status && !SUBMISSION_STATUSES.includes(status)) {
        return { error: "Nieprawidłowy filtr statusu." };
    }
    if (paymentStatus && !PAYMENT_FILTERS.includes(paymentStatus)) {
        return { error: "Nieprawidłowy status płatności." };
    }

    const overdue = paymentStatus === "overdue";
    return {
        filters: {
            edition: readEditionFilter(source.edition),
            status: overdue ? "approved" : status,
            paymentStatus: overdue ? "unpaid" : paymentStatus,
            search: normalizeText(source.search),
            ...(overdue ? { overdue: true } : {}),
            ...(source.unread === "1" || source.unread === true ? { unread: true } : {}),
        },
    };
}

// listAllSubmissions + the filter SQL can't express (overdue payments).
function findSubmissions(filters) {
    let rows = submissionsDb.listAllSubmissions(filters);
    if (filters.overdue) {
        const settings = siteContentDb.getSettings();
        rows = rows.filter((row) => isPaymentOverdue(row, settings));
    }
    if (filters.unread) {
        const unread = threadsDb.unreadCountsForAdmin();
        rows = rows.filter((row) => unread.has(row.id));
    }
    return rows;
}

// One recipient per account for group messages.
function findRecipients(filters) {
    if (!filters.overdue && !filters.unread) return submissionsDb.listRecipients(filters);
    const byUser = new Map();
    for (const row of findSubmissions(filters)) {
        if (!byUser.has(row.user_id)) {
            byUser.set(row.user_id, {
                user_id: row.user_id,
                email: row.user_email,
                first_name: row.first_name,
                notify_email: usersDb.findUserById(row.user_id)?.notify_group_email,
            });
        }
    }
    return [...byUser.values()];
}

// Bulk downloads of participant data, logged on every use.
const SUBMISSION_LIST_PURPOSES = {
    export: "submission.exported",
    "gate-list": "submission.gate_list_printed",
};

router.get("/submissions", (req, res) => {
    const { filters, error } = readSubmissionFilters(req.query);
    if (error) return res.status(400).json({ message: error });

    const rows = findSubmissions(filters);
    const entry = {
        adminId: req.user.sub,
        targetType: "submission",
        targetId: null,
        details: { filters, count: rows.length },
    };
    const purposeAction = SUBMISSION_LIST_PURPOSES[String(req.query.purpose || "")];
    if (purposeAction) {
        auditLogDb.createAuditEntry({ ...entry, action: purposeAction });
    } else {
        auditLogDb.createThrottledAuditEntry({ ...entry, action: "submission.list_viewed" });
    }
    const ratings = ratingsDb.ratingSummaries(req.user.sub);
    res.json({
        submissions: rows.map((row) => ({
            ...toAdminSubmission(row),
            rating: ratings.get(row.id) || { average: null, count: 0, mine: null, scores: [] },
        })),
    });
});

// The signed-in admin's 1–5 score (0/null clears it).
router.put("/submissions/:id/rating", (req, res) => {
    const existing = submissionsDb.findSubmissionById(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });

    const score = Number(req.body?.score || 0);
    if (!Number.isInteger(score) || score < 0 || score > 5) {
        return res.status(400).json({ message: "Ocena musi być liczbą od 1 do 5." });
    }
    ratingsDb.setRating(existing.id, Number(req.user.sub), score);
    res.json({
        rating: ratingsDb.ratingSummaries(req.user.sub).get(existing.id) || {
            average: null,
            count: 0,
            mine: null,
            scores: [],
        },
    });
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

    if (existing.status !== status && ["approved", "rejected", "waitlist"].includes(status)) {
        const user = usersDb.findUserById(existing.user_id);
        void sendSubmissionStatusEmail({
            submission: updated,
            user,
            status,
            adminNote,
            previousStatus: existing.status,
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
    return { status, adminNote, force: body.force === true };
}

// Approving more cars than the Select zone has places needs an explicit
// confirmation (force) — otherwise the admin is pointed at the reserve list.
function capacityProblem(submissions, status, force) {
    if (status !== "approved" || force) return null;
    const capacity = getCapacity();
    if (!capacity) return null;

    const added = new Map();
    for (const submission of submissions) {
        if (submission.status === "approved") continue;
        added.set(submission.edition, (added.get(submission.edition) || 0) + 1);
    }
    for (const [edition, count] of added) {
        const approved = submissionsDb.countApproved(edition);
        if (approved + count > capacity) {
            const free = Math.max(0, capacity - approved);
            return {
                code: "capacity_full",
                message: `Limit miejsc w strefie Select (${edition}): ${capacity}, zaakceptowano już ${approved}${free ? `, wolnych: ${free}` : ""}. Akceptacja przekroczy limit — możesz zamiast tego dodać auto do listy rezerwowej.`,
            };
        }
    }
    return null;
}

router.patch("/submissions/:id/status", (req, res) => {
    const { status, adminNote, force, error } = readStatusChange(req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    const existing = submissionsDb.findSubmissionById(Number(req.params.id));
    if (!existing) {
        return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
    }

    const problem = capacityProblem([existing], status, force);
    if (problem) return res.status(409).json(problem);

    const updated = changeSubmissionStatus(req, existing, status, adminNote);
    res.json({ submission: toAdminSubmission(updated) });
});

router.post("/submissions/bulk-status", (req, res) => {
    const { status, adminNote, force, error } = readStatusChange(req.body);
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

    const targets = ids
        .map((id) => submissionsDb.findSubmissionById(id))
        .filter((existing) => existing && existing.status !== status);
    const problem = capacityProblem(targets, status, force);
    if (problem) return res.status(409).json(problem);

    let updatedCount = 0;
    for (const existing of targets) {
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

// Conversation with the participant about a submission.
router.get("/submissions/:id/messages", (req, res) => {
    const existing = submissionsDb.findSubmissionById(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
    res.json({ messages: getThread(existing, true) });
});

router.post("/submissions/:id/messages", (req, res) => {
    const existing = submissionsDb.findSubmissionById(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });

    const { text, error } = readMessageBody(req.body);
    if (error) return res.status(400).json({ message: error });

    const messages = postToThread({ submission: existing, author: req.user.sub, fromAdmin: true, text });
    audit(req, "submission.message_sent", "submission", existing.id, {
        licensePlate: existing.license_plate,
    });
    res.status(201).json({ messages });
});

// Hide/show a car on the public "Auta strefy Select" page.
router.patch("/submissions/:id/showcase", (req, res) => {
    const existing = submissionsDb.findSubmissionById(Number(req.params.id));
    if (!existing) {
        return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
    }
    const hidden = Boolean(req.body?.hidden);
    const updated = submissionsDb.setShowcaseHidden(existing.id, hidden);
    audit(req, hidden ? "submission.showcase_hidden" : "submission.showcase_shown", "submission", existing.id, {
        licensePlate: existing.license_plate,
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

// ---- Group e-mails ------------------------------------------------------

let groupEmailInProgress = false;

router.get("/emails/recipients", (req, res) => {
    const { filters, error } = readSubmissionFilters(req.query);
    if (error) return res.status(400).json({ message: error });

    res.json({
        count: findRecipients(filters).length,
        emailConfigured: isEmailConfigured(),
        inProgress: groupEmailInProgress,
    });
});

// Every message lands in the participants' panel ("Komunikaty"); it is also
// e-mailed when SMTP is configured.
router.post("/emails", (req, res) => {
    if (groupEmailInProgress) {
        return res
            .status(409)
            .json({ message: "Poprzednia wiadomość grupowa jest jeszcze wysyłana." });
    }

    const subject = normalizeText(req.body?.subject).slice(0, 200);
    const message = String(req.body?.message || "").trim().slice(0, 10000);
    if (!subject || !message) {
        return res.status(400).json({ message: "Podaj temat i treść wiadomości." });
    }

    const { filters, error } = readSubmissionFilters(req.body?.filters || {});
    if (error) return res.status(400).json({ message: error });

    const recipients = findRecipients(filters);
    if (!recipients.length) {
        return res.status(400).json({ message: "Brak odbiorców dla wybranych filtrów." });
    }

    const adminId = req.user.sub;
    const messageId = messagesDb.createMessage(
        adminId,
        subject,
        message,
        recipients.map((recipient) => recipient.user_id),
    );

    if (!isEmailConfigured()) {
        audit(req, "email.group_sent", "email", messageId, {
            subject,
            filters,
            panelOnly: true,
            recipients: recipients.length,
        });
        return res.status(201).json({
            message: `Wiadomość jest w panelu ${recipients.length} uczestników (e-maile nie wyszły — SMTP nie jest skonfigurowany).`,
        });
    }

    // Everyone gets the message in the panel; e-mail only who didn't opt out.
    const emailRecipients = recipients.filter((recipient) => recipient.notify_email !== 0);
    const optedOut = recipients.length - emailRecipients.length;

    // Sending can take minutes; reply right away and log the outcome when done.
    groupEmailInProgress = true;
    sendGroupEmail({ recipients: emailRecipients, subject, message })
        .then((result) =>
            auditLogDb.createAuditEntry({
                adminId,
                action: "email.group_sent",
                targetType: "email",
                targetId: messageId,
                details: { subject, filters, ...result, optedOut },
            }),
        )
        .catch((sendError) => console.error("[email] Wysyłka grupowa:", sendError))
        .finally(() => {
            groupEmailInProgress = false;
        });

    res.status(202).json({
        message: `Wiadomość jest już w panelu ${recipients.length} uczestników; e-maile są wysyłane (wynik w dzienniku działań).${optedOut ? ` ${optedOut} os. wyłączyło e-maile z wiadomościami — zobaczą ją tylko w panelu.` : ""}`,
    });
});

// Gate check-in lives in src/gate/routes.ts (/api/gate), shared with gate staff.

module.exports = router;
