const express = require("express");

const vehiclesDb = require("../db/vehicles");
const submissionsDb = require("../db/submissions");
const siteContentDb = require("../db/siteContent");
const { authenticate } = require("../auth/middleware");
const { normalizeText } = require("../utils/validation");
const {
    createImageUpload,
    verifyUploadedImages,
    removeFiles,
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
const { getUserVehiclesDir } = require("../utils/paths");

// "Garage": cars a participant keeps for quick submissions (also next year).
const router = express.Router();

const MAX_VEHICLES = 20;

const upload = createImageUpload({
    destination: (req) => getUserVehiclesDir(req.user.sub),
    maxFiles: MAX_PHOTOS,
    maxFileSize: MAX_TOTAL_PHOTOS_SIZE,
});

function toPublicVehicle(row) {
    return {
        id: row.id,
        carBrand: row.car_brand,
        licensePlate: row.license_plate,
        carDescription: row.car_description,
        photos: JSON.parse(row.photos || "[]").map(toPhotoUrl),
        updatedAt: row.updated_at,
    };
}

function readVehicleFields(body) {
    const fields = {
        carBrand: normalizeText(body.carBrand).slice(0, 100),
        licensePlate: normalizeText(body.licensePlate).toUpperCase().slice(0, 20),
        carDescription: normalizeText(body.carDescription).slice(0, 3000),
    };
    if (!fields.carBrand || !fields.licensePlate) {
        return { error: "Podaj markę i numer rejestracyjny pojazdu." };
    }
    return { fields };
}

function findOwnVehicle(req) {
    const vehicle = vehiclesDb.findVehicle(Number(req.params.id));
    return vehicle && Number(vehicle.user_id) === Number(req.user.sub) ? vehicle : null;
}

function ensureRoom(req, res, next) {
    if (vehiclesDb.countVehicles(req.user.sub) >= MAX_VEHICLES) {
        return res.status(400).json({
            message: `W garażu możesz mieć maksymalnie ${MAX_VEHICLES} pojazdów.`,
        });
    }
    next();
}

router.use(authenticate);

// Each car says whether it already has an active submission in the current
// edition, so the garage can show "Zgłoszone na <rok>" instead of the button.
router.get("/", (req, res) => {
    const userId = req.user.sub;
    const edition = siteContentDb.getCurrentEdition();
    res.json({
        edition,
        vehicles: vehiclesDb.listVehicles(userId).map((row) => ({
            ...toPublicVehicle(row),
            submittedThisEdition: submissionsDb.hasActiveSubmissionForPlate(
                userId,
                edition,
                row.license_plate,
            ),
        })),
    });
});

router.get("/photos/:userId/:filename", servePhoto("vehicles"));

router.post("/", ensureRoom, upload.array("photos", MAX_PHOTOS), (req, res) => {
    const uploaded = req.files || [];
    const { fields, error } = readVehicleFields(req.body);
    if (error) {
        removeFiles(uploaded);
        return res.status(400).json({ message: error });
    }
    if (uploaded.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_PHOTOS_SIZE) {
        removeFiles(uploaded);
        return res.status(413).json({ message: "Łączny rozmiar zdjęć nie może przekraczać 50 MB." });
    }
    verifyUploadedImages(uploaded);

    const vehicle = vehiclesDb.createVehicle({
        userId: req.user.sub,
        ...fields,
        photos: uploaded.map((file) => storedPathFor("vehicles", req.user.sub, file.filename)),
    });
    res.status(201).json({ vehicle: toPublicVehicle(vehicle) });
});

// "Zapisz w garażu" on a submission: copies its data and photos.
router.post("/from-submission/:id", ensureRoom, (req, res) => {
    const submission = submissionsDb.findSubmissionById(Number(req.params.id));
    if (!submission || Number(submission.user_id) !== Number(req.user.sub)) {
        return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
    }

    const vehicle = vehiclesDb.createVehicle({
        userId: req.user.sub,
        carBrand: submission.car_brand,
        licensePlate: submission.license_plate,
        carDescription: submission.car_description,
        photos: copyStoredPhotos(JSON.parse(submission.photos || "[]"), "vehicles", req.user.sub),
    });
    res.status(201).json({
        vehicle: toPublicVehicle(vehicle),
        message: `${vehicle.car_brand} (${vehicle.license_plate}) jest teraz w Twoim garażu.`,
    });
});

router.patch("/:id", (req, res) => {
    const vehicle = findOwnVehicle(req);
    if (!vehicle) return res.status(404).json({ message: "Nie znaleziono pojazdu." });

    const { fields, error } = readVehicleFields(req.body);
    if (error) return res.status(400).json({ message: error });

    res.json({ vehicle: toPublicVehicle(vehiclesDb.updateVehicle(vehicle.id, fields)) });
});

router.put("/:id/photos", (req, res, next) => {
    req.vehicle = findOwnVehicle(req);
    if (!req.vehicle) return res.status(404).json({ message: "Nie znaleziono pojazdu." });
    next();
}, upload.array("photos", MAX_PHOTOS), (req, res) => {
    const uploaded = req.files || [];
    verifyUploadedImages(uploaded);

    const result = applyPhotoChanges({
        currentPhotos: JSON.parse(req.vehicle.photos || "[]"),
        keepUrls: req.body.keep,
        uploadedFiles: uploaded,
        kind: "vehicles",
        userId: req.user.sub,
    });
    if (result.error) {
        removeFiles(uploaded);
        return res.status(400).json({ message: result.error });
    }

    const updated = vehiclesDb.updateVehiclePhotos(req.vehicle.id, result.photos);
    removeStoredPhotos(result.removed);
    res.json({ vehicle: toPublicVehicle(updated) });
});

router.delete("/:id", (req, res) => {
    const vehicle = findOwnVehicle(req);
    if (!vehicle) return res.status(404).json({ message: "Nie znaleziono pojazdu." });

    vehiclesDb.deleteVehicle(vehicle.id);
    removeStoredPhotos(JSON.parse(vehicle.photos || "[]"));
    res.json({ message: "Pojazd usunięty z garażu." });
});

router.use(uploadErrorHandler({ maxFiles: MAX_PHOTOS, totalSizeLabel: "50 MB" }));

module.exports = router;
