const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const submissionsDb = require("../db/submissions");
const { authenticate } = require("../auth/middleware");
const { createRateLimiter } = require("../utils/rateLimiter");

const router = express.Router();

const EMAIL_LIKE_FILENAME = /[^a-zA-Z0-9._-]/g;
const uploadsRoot = path.join(__dirname, "../../uploads/submissions");
if (!fs.existsSync(uploadsRoot)) {
    fs.mkdirSync(uploadsRoot, { recursive: true });
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        const userDir = path.join(uploadsRoot, String(req.user.sub));
        fs.mkdirSync(userDir, { recursive: true });
        cb(null, userDir);
    },
    filename(req, file, cb) {
        const safeName = file.originalname.replace(EMAIL_LIKE_FILENAME, "_");
        cb(null, `${Date.now()}-${safeName}`);
    },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Tylko pliki graficzne (obrazy) są dozwolone!"), false);
    }
};

const upload = multer({
    storage,
    limits: { files: 5, fileSize: 50 * 1024 * 1024 },
    fileFilter,
});

const submissionRateLimit = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5,
    message: "Za dużo prób wysyłki. Spróbuj ponownie za chwilę.",
});

const PHONE_REGEX = /^\+?[0-9]{9,15}$/;

function normalizeText(value) {
    return String(value || "").trim();
}

function normalizePhone(value) {
    return normalizeText(value).replace(/\s+/g, "");
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
        photos: JSON.parse(row.photos || "[]"),
        status: row.status,
        adminNote: row.admin_note,
        createdAt: row.created_at,
        userEmail: row.user_email,
    };
}

router.use(authenticate);

router.get("/", (req, res) => {
    const rows = submissionsDb.listSubmissionsByUser(req.user.sub);
    res.json({ submissions: rows.map(toPublicSubmission) });
});

router.post("/", submissionRateLimit, upload.array("photos", 5), (req, res) => {
    let savedFiles = req.files || [];

    try {
        const firstName = normalizeText(req.body.firstName);
        const lastName = normalizeText(req.body.lastName);
        const phone = normalizePhone(req.body.phone);
        const licensePlate = normalizeText(req.body.licensePlate);
        const carBrand = normalizeText(req.body.carBrand);
        const carDescription = normalizeText(req.body.carDescription);

        if (
            !firstName ||
            !lastName ||
            !phone ||
            !licensePlate ||
            !carBrand ||
            !carDescription
        ) {
            throw Object.assign(new Error("Wszystkie pola są wymagane."), {
                status: 400,
            });
        }

        if (!PHONE_REGEX.test(phone)) {
            throw Object.assign(
                new Error("Proszę podać poprawny numer telefonu (9-15 cyfr)."),
                { status: 400 },
            );
        }

        if (!savedFiles.length) {
            throw Object.assign(
                new Error("Proszę dodać przynajmniej jedno zdjęcie."),
                { status: 400 },
            );
        }

        if (submissionsDb.countPendingForUser(req.user.sub) > 0) {
            throw Object.assign(
                new Error("Masz już zgłoszenie oczekujące na rozpatrzenie."),
                { status: 409 },
            );
        }

        const photos = savedFiles.map(
            (file) => `/uploads/submissions/${req.user.sub}/${file.filename}`,
        );

        const submission = submissionsDb.createSubmission({
            userId: req.user.sub,
            firstName,
            lastName,
            phone,
            licensePlate,
            carBrand,
            carDescription,
            photos,
        });

        res.status(201).json({ submission: toPublicSubmission(submission) });
    } catch (error) {
        savedFiles.forEach((file) => {
            if (fs.existsSync(file.path)) fs.unlink(file.path, () => {});
        });
        res.status(error.status || 500).json({
            message: error.status
                ? error.message
                : "Wystąpił błąd serwera podczas wysyłki zgłoszenia.",
        });
    }
});

router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_COUNT") {
            return res
                .status(400)
                .json({ message: "Można przesłać maksymalnie 5 zdjęć." });
        }
        if (error.code === "LIMIT_FILE_SIZE") {
            return res
                .status(400)
                .json({ message: "Łączny rozmiar plików przekracza 50MB." });
        }
    }

    if (error.message === "Tylko pliki graficzne (obrazy) są dozwolone!") {
        return res.status(400).json({ message: error.message });
    }

    next(error);
});

module.exports = { router, toPublicSubmission };
