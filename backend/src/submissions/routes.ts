const express = require("express");
const fs = require("fs");
const path = require("path");

const submissionsDb = require("../db/submissions");
const siteContentDb = require("../db/siteContent");
const { authenticate } = require("../auth/middleware");
const { createRateLimiter } = require("../utils/rateLimiter");
const {
    PHONE_REGEX,
    normalizeText,
    normalizePhone,
} = require("../utils/validation");
const {
    createImageUpload,
    verifyUploadedImages,
    removeFiles,
    isAllowedImageFilename,
    uploadErrorHandler,
} = require("../utils/imageUpload");
const { getUserSubmissionsDir } = require("../utils/paths");
const { sendNewSubmissionAdminEmail } = require("../notifications/email");

const router = express.Router();

const MAX_PHOTOS = 5;
const MAX_TOTAL_PHOTOS_SIZE = 50 * 1024 * 1024;
const TOTAL_SIZE_LABEL = "50 MB";
// Multipart framing + text fields on top of the photos themselves.
const MULTIPART_OVERHEAD = 1024 * 1024;
const DEFAULT_MAX_VEHICLES = 5;

const FIELD_LIMITS = {
    firstName: 100,
    lastName: 100,
    licensePlate: 20,
    carBrand: 100,
    carDescription: 3000,
};

const upload = createImageUpload({
    destination: (req) => getUserSubmissionsDir(req.user.sub),
    maxFiles: MAX_PHOTOS,
    // A single photo may use the whole budget; the total is checked after upload.
    maxFileSize: MAX_TOTAL_PHOTOS_SIZE,
});

const submissionRateLimit = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5,
    message: "Za dużo prób wysyłki. Spróbuj ponownie za chwilę.",
});

const STORED_PHOTO_PATTERN = /^\/uploads\/submissions\/(\d+)\/([^/]+)$/;

// Photos are stored in the DB as their legacy public path; they are now only
// reachable through the authenticated /api/submissions/photos endpoint.
function toPhotoUrl(storedPath) {
    const match = STORED_PHOTO_PATTERN.exec(storedPath);
    return match
        ? `/api/submissions/photos/${match[1]}/${match[2]}`
        : storedPath;
}

function getPhotoDiskPath(storedPath) {
    const match = STORED_PHOTO_PATTERN.exec(storedPath);
    if (!match || !isAllowedImageFilename(match[2])) return null;
    return path.join(getUserSubmissionsDir(match[1]), match[2]);
}

function removeSubmissionPhotos(row) {
    for (const storedPath of JSON.parse(row.photos || "[]")) {
        const diskPath = getPhotoDiskPath(storedPath);
        if (diskPath) fs.promises.unlink(diskPath).catch(() => {});
    }
}

function toPublicSubmission(row) {
    return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        phone: row.phone,
        licensePlate: row.license_plate,
        carBrand: row.car_brand,
        carDescription: row.car_description,
        photos: JSON.parse(row.photos || "[]").map(toPhotoUrl),
        edition: row.edition,
        status: row.status,
        paymentStatus: row.payment_status || "unpaid",
        adminNote: row.admin_note,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        userEmail: row.user_email,
    };
}

function getMaxVehicles() {
    const value = Number(siteContentDb.getSettings().maxVehiclesPerUser);
    return Number.isInteger(value) && value > 0 ? value : DEFAULT_MAX_VEHICLES;
}

function getAvailability(userId) {
    const availability = siteContentDb.getSubmissionsAvailability();
    const maxVehicles = getMaxVehicles();
    const edition = siteContentDb.getCurrentEdition();
    const activeCount = submissionsDb.countActiveForUser(userId, edition);
    return {
        ...availability,
        edition,
        maxVehicles,
        activeCount,
        remaining: Math.max(0, maxVehicles - activeCount),
    };
}

function readSubmissionFields(body) {
    const fields = {
        firstName: normalizeText(body.firstName),
        lastName: normalizeText(body.lastName),
        phone: normalizePhone(body.phone),
        licensePlate: normalizeText(body.licensePlate).toUpperCase(),
        carBrand: normalizeText(body.carBrand),
        carDescription: normalizeText(body.carDescription),
    };

    if (Object.values(fields).some((value) => !value)) {
        return { error: "Wszystkie pola są wymagane." };
    }

    if (!PHONE_REGEX.test(fields.phone)) {
        return { error: "Proszę podać poprawny numer telefonu (9-15 cyfr)." };
    }

    for (const [field, limit] of Object.entries(FIELD_LIMITS)) {
        if (fields[field].length > limit) {
            return {
                error: `Pole jest zbyt długie (maksymalnie ${limit} znaków).`,
            };
        }
    }

    return { fields };
}

function findOwnSubmission(req) {
    const submission = submissionsDb.findSubmissionById(Number(req.params.id));
    if (!submission || Number(submission.user_id) !== Number(req.user.sub)) {
        return null;
    }
    return submission;
}

// Runs before multer, so rejected requests never write files to disk.
function ensureCanSubmit(req, res, next) {
    const availability = getAvailability(req.user.sub);

    if (!availability.open) {
        return res.status(403).json({ message: availability.reason });
    }

    if (availability.remaining <= 0) {
        return res.status(400).json({
            message: `Możesz mieć maksymalnie ${availability.maxVehicles} aktywnych zgłoszeń pojazdów. Wycofaj jedno z oczekujących zgłoszeń, aby dodać kolejne.`,
        });
    }

    const contentLength = Number(req.headers["content-length"] || 0);
    if (contentLength > MAX_TOTAL_PHOTOS_SIZE + MULTIPART_OVERHEAD) {
        return res.status(413).json({
            message: `Łączny rozmiar zdjęć nie może przekraczać ${TOTAL_SIZE_LABEL}.`,
        });
    }

    next();
}

router.use(authenticate);

router.get("/", (req, res) => {
    const rows = submissionsDb.listSubmissionsByUser(req.user.sub);
    res.json({ submissions: rows.map(toPublicSubmission) });
});

router.get("/availability", (req, res) => {
    res.json({ availability: getAvailability(req.user.sub) });
});

router.get("/photos/:userId/:filename", (req, res) => {
    const ownerId = Number(req.params.userId);
    const { filename } = req.params;

    if (req.user.role !== "admin" && Number(req.user.sub) !== ownerId) {
        return res.status(404).end();
    }

    if (!Number.isInteger(ownerId) || !isAllowedImageFilename(filename)) {
        return res.status(404).end();
    }

    res.set("Cache-Control", "private, max-age=3600");
    res.sendFile(
        path.join(getUserSubmissionsDir(ownerId), filename),
        { dotfiles: "deny" },
        (error) => {
            if (error && !res.headersSent) res.status(404).end();
        },
    );
});

router.patch("/:id/payment-status", (req, res) => {
    const submission = findOwnSubmission(req);

    if (!submission) {
        return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
    }

    if (submission.status !== "approved") {
        return res.status(400).json({
            message: "Możesz zgłosić opłatę dopiero po akceptacji zgłoszenia.",
        });
    }

    if (submission.payment_status === "paid") {
        return res
            .status(400)
            .json({ message: "Ta opłata jest już potwierdzona." });
    }

    const updated = submissionsDb.updateSubmissionPaymentStatus(
        submission.id,
        "verification",
    );
    res.json({ submission: toPublicSubmission(updated) });
});

// Participants may correct a submission until an admin has reviewed it.
router.patch("/:id", (req, res) => {
    const submission = findOwnSubmission(req);

    if (!submission) {
        return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
    }

    if (submission.status !== "pending") {
        return res.status(400).json({
            message: "Można edytować tylko zgłoszenia oczekujące na rozpatrzenie.",
        });
    }

    const { fields, error } = readSubmissionFields(req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    const updated = submissionsDb.updateSubmissionDetails(
        submission.id,
        fields,
    );
    res.json({ submission: toPublicSubmission(updated) });
});

router.delete("/:id", (req, res) => {
    const submission = findOwnSubmission(req);

    if (!submission) {
        return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
    }

    if (submission.status !== "pending") {
        return res.status(400).json({
            message:
                "Można wycofać tylko zgłoszenia oczekujące na rozpatrzenie. W innej sprawie skontaktuj się z organizatorem.",
        });
    }

    submissionsDb.deleteSubmission(submission.id);
    removeSubmissionPhotos(submission);
    res.json({ message: "Zgłoszenie zostało wycofane." });
});

router.post(
    "/",
    submissionRateLimit,
    ensureCanSubmit,
    upload.array("photos", MAX_PHOTOS),
    (req, res) => {
        const savedFiles = req.files || [];

        const { fields, error } = readSubmissionFields(req.body);
        if (error) {
            removeFiles(savedFiles);
            return res.status(400).json({ message: error });
        }

        if (!savedFiles.length) {
            return res
                .status(400)
                .json({ message: "Proszę dodać przynajmniej jedno zdjęcie." });
        }

        const totalSize = savedFiles.reduce((sum, file) => sum + file.size, 0);
        if (totalSize > MAX_TOTAL_PHOTOS_SIZE) {
            removeFiles(savedFiles);
            return res.status(413).json({
                message: `Łączny rozmiar zdjęć nie może przekraczać ${TOTAL_SIZE_LABEL}.`,
            });
        }

        // Throws UploadValidationError (handled below) if a file isn't a real image.
        verifyUploadedImages(savedFiles);

        const photos = savedFiles.map(
            (file) => `/uploads/submissions/${req.user.sub}/${file.filename}`,
        );

        const submission = submissionsDb.createSubmission({
            userId: req.user.sub,
            ...fields,
            photos,
            edition: siteContentDb.getCurrentEdition(),
        });

        void sendNewSubmissionAdminEmail({
            submission,
            userEmail: req.user.email,
        }).catch((emailError) =>
            console.error(
                "[email] Powiadomienie o nowym zgłoszeniu:",
                emailError.message,
            ),
        );

        res.status(201).json({ submission: toPublicSubmission(submission) });
    },
);

router.use(
    uploadErrorHandler({
        maxFiles: MAX_PHOTOS,
        totalSizeLabel: TOTAL_SIZE_LABEL,
    }),
);

module.exports = { router, toPublicSubmission, removeSubmissionPhotos };
