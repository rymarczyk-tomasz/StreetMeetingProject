const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const path = require("path");

const submissionsDb = require("../db/submissions");
const siteContentDb = require("../db/siteContent");
const vehiclesDb = require("../db/vehicles");
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
    createProofUpload,
    verifyUploadedProof,
    isAllowedProofFilename,
    uploadErrorHandler,
} = require("../utils/imageUpload");
const {
    MAX_PHOTOS,
    MAX_TOTAL_PHOTOS_SIZE,
    toPhotoUrl,
    storedPathFor,
    removeStoredPhotos,
    copyStoredPhotos,
    applyPhotoChanges,
    servePhoto,
} = require("../utils/userPhotos");
const { getUserSubmissionsDir } = require("../utils/paths");
const { getPaymentDetails, getFeeAmount } = require("../payments");
const { sendNewSubmissionAdminEmail } = require("../notifications/email");

const router = express.Router();

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

const proofUpload = createProofUpload({
    destination: (req) => getUserSubmissionsDir(req.user.sub),
    maxFileSize: 10 * 1024 * 1024,
});

const submissionRateLimit = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5,
    message: "Za dużo prób wysyłki. Spróbuj ponownie za chwilę.",
});

function proofUrl(storedPath) {
    const match = /^\/uploads\/submissions\/(\d+)\/([^/]+)$/.exec(storedPath || "");
    return match ? `/api/submissions/proofs/${match[1]}/${match[2]}` : null;
}

function removeSubmissionPhotos(row) {
    removeStoredPhotos(JSON.parse(row.photos || "[]"));
    if (row.payment_proof) removeStoredProof(row.payment_proof);
}

function removeStoredProof(storedPath) {
    const match = /^\/uploads\/submissions\/(\d+)\/([^/]+)$/.exec(storedPath || "");
    if (match && isAllowedProofFilename(match[2])) {
        fs.promises.unlink(path.join(getUserSubmissionsDir(match[1]), match[2])).catch(() => {});
    }
}

function toPublicSubmission(row) {
    const approved = row.status === "approved";
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
        paymentProofUrl: proofUrl(row.payment_proof),
        payment: approved ? getPaymentDetails(row) : null,
        hasPass: approved && row.payment_status === "paid",
        checkedInAt: row.checked_in_at,
        consentAt: row.consent_at,
        photoPublishConsent: Boolean(row.photo_publish_consent),
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
        deadline: siteContentDb.getSettings().submissionsDeadline || "",
    };
}

// Problem with submitting right now, or null when the user can submit.
function availabilityError(userId) {
    const availability = getAvailability(userId);
    if (!availability.open) return { status: 403, message: availability.reason };
    if (availability.remaining <= 0) {
        return {
            status: 400,
            message: `Możesz mieć maksymalnie ${availability.maxVehicles} aktywnych zgłoszeń pojazdów w edycji ${availability.edition}. Wycofaj jedno z oczekujących zgłoszeń, aby dodać kolejne.`,
        };
    }
    return null;
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

// Regulamin + RODO are required for every submission; photo publishing is optional.
// Multipart sends "true"/"false" strings, JSON sends booleans.
function readConsents(body) {
    const accepted = body.acceptTerms === true || body.acceptTerms === "true";
    if (!accepted) {
        return {
            error: "Zaakceptuj regulamin strefy Select i zgodę na przetwarzanie danych.",
        };
    }
    return {
        consents: {
            consentVersion: siteContentDb.getContentVersion("regulamin"),
            photoPublishConsent:
                body.photoPublishConsent === true || body.photoPublishConsent === "true",
        },
    };
}

function duplicatePlateMessage(licensePlate, edition) {
    return `Pojazd ${licensePlate} jest już zgłoszony na edycję ${edition}.`;
}

function findOwnSubmission(req) {
    const submission = submissionsDb.findSubmissionById(Number(req.params.id));
    if (!submission || Number(submission.user_id) !== Number(req.user.sub)) {
        return null;
    }
    return submission;
}

function notifyOrganizers(submission, userEmail) {
    void sendNewSubmissionAdminEmail({ submission, userEmail }).catch((emailError) =>
        console.error("[email] Powiadomienie o nowym zgłoszeniu:", emailError.message),
    );
}

// Runs before multer, so rejected requests never write files to disk.
function ensureCanSubmit(req, res, next) {
    const problem = availabilityError(req.user.sub);
    if (problem) return res.status(problem.status).json({ message: problem.message });

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

// Everything the participant panel shows above the submission list.
router.get("/overview", (req, res) => {
    const settings = siteContentDb.getSettings();
    res.json({
        availability: getAvailability(req.user.sub),
        edition: siteContentDb.getContent("edition"),
        participantInfo: settings.participantInfo || "",
        contactEmail: siteContentDb.getContent("contact").email || "",
        feeAmount: getFeeAmount(settings),
        paymentDeadline: settings.paymentDeadline || "",
    });
});

router.get("/photos/:userId/:filename", servePhoto("submissions"));

router.get("/proofs/:userId/:filename", (req, res) => {
    const ownerId = Number(req.params.userId);
    const { filename } = req.params;

    if (req.user.role !== "admin" && Number(req.user.sub) !== ownerId) {
        return res.status(404).end();
    }
    if (!Number.isInteger(ownerId) || !isAllowedProofFilename(filename)) {
        return res.status(404).end();
    }

    res.set("Cache-Control", "private, max-age=3600");
    res.sendFile(path.join(getUserSubmissionsDir(ownerId), filename), { dotfiles: "deny" }, (error) => {
        if (error && !res.headersSent) res.status(404).end();
    });
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

// Transfer confirmation (screenshot or PDF); also marks the payment for verification.
router.post("/:id/payment-proof", (req, res, next) => {
    const submission = findOwnSubmission(req);
    if (!submission) return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
    if (submission.status !== "approved") {
        return res.status(400).json({
            message: "Potwierdzenie przelewu możesz dodać po akceptacji zgłoszenia.",
        });
    }
    if (submission.payment_status === "paid") {
        return res.status(400).json({ message: "Ta opłata jest już potwierdzona." });
    }
    req.submission = submission;
    next();
}, proofUpload.single("proof"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Dodaj plik z potwierdzeniem przelewu." });
    }
    verifyUploadedProof(req.file);

    if (req.submission.payment_proof) removeStoredProof(req.submission.payment_proof);
    const updated = submissionsDb.setPaymentProof(
        req.submission.id,
        storedPathFor("submissions", req.user.sub, req.file.filename),
    );
    res.json({
        submission: toPublicSubmission(updated),
        message: "Dziękujemy! Organizator sprawdzi płatność.",
    });
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

    const plateChanged =
        fields.licensePlate.replace(/\s+/g, "") !==
        String(submission.license_plate).toUpperCase().replace(/\s+/g, "");
    if (
        plateChanged &&
        submissionsDb.hasActiveSubmissionForPlate(req.user.sub, submission.edition, fields.licensePlate)
    ) {
        return res
            .status(409)
            .json({ message: duplicatePlateMessage(fields.licensePlate, submission.edition) });
    }

    const updated = submissionsDb.updateSubmissionDetails(
        submission.id,
        fields,
    );
    res.json({ submission: toPublicSubmission(updated) });
});

// Replace the photo set of a pending submission: keep[] = URLs to keep + new files.
router.put("/:id/photos", (req, res, next) => {
    const submission = findOwnSubmission(req);
    if (!submission) return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
    if (submission.status !== "pending") {
        return res.status(400).json({
            message: "Zdjęcia można zmieniać tylko w zgłoszeniach oczekujących na rozpatrzenie.",
        });
    }
    req.submission = submission;
    next();
}, upload.array("photos", MAX_PHOTOS), (req, res) => {
    const uploaded = req.files || [];
    verifyUploadedImages(uploaded);

    const result = applyPhotoChanges({
        currentPhotos: JSON.parse(req.submission.photos || "[]"),
        keepUrls: req.body.keep,
        uploadedFiles: uploaded,
        kind: "submissions",
        userId: req.user.sub,
    });
    if (result.error) {
        removeFiles(uploaded);
        return res.status(400).json({ message: result.error });
    }

    const updated = submissionsDb.updateSubmissionPhotos(req.submission.id, result.photos);
    removeStoredPhotos(result.removed);
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

// "Zgłoś ponownie": copy a submission from an earlier edition into the current one.
router.post("/:id/resubmit", submissionRateLimit, (req, res) => {
    const source = findOwnSubmission(req);
    if (!source) return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });

    const edition = siteContentDb.getCurrentEdition();
    if (source.edition >= edition) {
        return res.status(400).json({
            message: "To zgłoszenie dotyczy już bieżącej edycji.",
        });
    }

    const problem = availabilityError(req.user.sub);
    if (problem) return res.status(problem.status).json({ message: problem.message });

    const { consents, error } = readConsents(req.body || {});
    if (error) return res.status(400).json({ message: error });

    if (submissionsDb.hasActiveSubmissionForPlate(req.user.sub, edition, source.license_plate)) {
        return res.status(409).json({ message: duplicatePlateMessage(source.license_plate, edition) });
    }

    const photos = copyStoredPhotos(JSON.parse(source.photos || "[]"), "submissions", req.user.sub);
    if (!photos.length) {
        return res.status(400).json({
            message: "Zdjęcia tego zgłoszenia nie są już dostępne — wyślij nowe zgłoszenie z formularza.",
        });
    }

    const submission = submissionsDb.createSubmission({
        userId: req.user.sub,
        firstName: source.first_name,
        lastName: source.last_name,
        phone: source.phone,
        licensePlate: source.license_plate,
        carBrand: source.car_brand,
        carDescription: source.car_description,
        photos,
        edition,
        ...consents,
    });
    notifyOrganizers(submission, req.user.email);
    res.status(201).json({
        submission: toPublicSubmission(submission),
        message: `Zgłoszenie na edycję ${edition} zostało wysłane. Możesz je jeszcze poprawić, dopóki czeka na decyzję.`,
    });
});

// QR entry pass for an approved and paid car.
router.get("/:id/pass", (req, res) => {
    const submission = findOwnSubmission(req);
    if (!submission) return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
    if (submission.status !== "approved" || submission.payment_status !== "paid") {
        return res.status(400).json({
            message: "Wejściówka będzie dostępna po akceptacji zgłoszenia i potwierdzeniu opłaty.",
        });
    }

    const token = submissionsDb.ensurePassToken(
        submission.id,
        crypto.randomBytes(12).toString("hex"),
    );
    res.json({
        pass: {
            code: `SSP-${token}`,
            edition: submission.edition,
            name: `${submission.first_name} ${submission.last_name}`,
            carBrand: submission.car_brand,
            licensePlate: submission.license_plate,
            checkedInAt: submission.checked_in_at,
        },
    });
});

router.post(
    "/",
    submissionRateLimit,
    ensureCanSubmit,
    upload.array("photos", MAX_PHOTOS),
    (req, res) => {
        const savedFiles = req.files || [];

        const { fields, error } = readSubmissionFields(req.body);
        const consentResult = readConsents(req.body);
        if (error || consentResult.error) {
            removeFiles(savedFiles);
            return res.status(400).json({ message: error || consentResult.error });
        }

        const edition = siteContentDb.getCurrentEdition();
        if (submissionsDb.hasActiveSubmissionForPlate(req.user.sub, edition, fields.licensePlate)) {
            removeFiles(savedFiles);
            return res
                .status(409)
                .json({ message: duplicatePlateMessage(fields.licensePlate, edition) });
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

        let photos = savedFiles.map((file) =>
            storedPathFor("submissions", req.user.sub, file.filename),
        );

        // No new photos: reuse the photos of the chosen garage vehicle.
        if (!photos.length && req.body.vehicleId) {
            const vehicle = vehiclesDb.findVehicle(Number(req.body.vehicleId));
            if (vehicle && Number(vehicle.user_id) === Number(req.user.sub)) {
                photos = copyStoredPhotos(JSON.parse(vehicle.photos || "[]"), "submissions", req.user.sub);
            }
        }

        if (!photos.length) {
            return res
                .status(400)
                .json({ message: "Proszę dodać przynajmniej jedno zdjęcie." });
        }

        const submission = submissionsDb.createSubmission({
            userId: req.user.sub,
            ...fields,
            photos,
            edition,
            ...consentResult.consents,
        });

        notifyOrganizers(submission, req.user.email);
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
