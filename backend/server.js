const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../config/.env") });

const cors = require("cors");
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { google } = require("googleapis");
const { syncGalleryFromDrive } = require("./scripts/sync-gallery-from-drive");

const app = express();
const PORT = process.env.PORT || 33000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = "/tmp/uploads";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Tylko pliki graficzne (obrazy) są dozwolone!"), false);
    }
};

const upload = multer({
    dest: uploadDir,
    limits: {
        files: 5,
    },
    fileFilter,
});

const credentials = {
    type: "service_account",
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY
        ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
        : null,
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
};

if (!credentials.private_key) {
    throw new Error("GOOGLE_PRIVATE_KEY is not defined");
}

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ],
});

const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const GOOGLE_DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;
const GALLERY_DRIVE_FOLDER_INPUT =
    process.env.DRIVE_GALLERY_FOLDER_ID ||
    process.env.GALLERY_DRIVE_FOLDER_ID ||
    process.env.GALLERY_DRIVE_FOLDER_URL;

const parsedDailyHour = Number(process.env.GALLERY_SYNC_DAILY_HOUR ?? "3");
const GALLERY_SYNC_DAILY_HOUR = Number.isFinite(parsedDailyHour)
    ? Math.min(23, Math.max(0, Math.trunc(parsedDailyHour)))
    : 3;

const parsedDailyMinute = Number(process.env.GALLERY_SYNC_DAILY_MINUTE ?? "0");
const GALLERY_SYNC_DAILY_MINUTE = Number.isFinite(parsedDailyMinute)
    ? Math.min(59, Math.max(0, Math.trunc(parsedDailyMinute)))
    : 0;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let gallerySyncInProgress = false;

async function runGallerySync(reason) {
    if (!GALLERY_DRIVE_FOLDER_INPUT) {
        console.log(
            "[gallery-sync] Pominięto: brak DRIVE_GALLERY_FOLDER_ID lub GALLERY_DRIVE_FOLDER_ID.",
        );
        return;
    }

    if (gallerySyncInProgress) {
        console.log(
            `[gallery-sync] Pominięto (${reason}): poprzednia synchronizacja nadal trwa.`,
        );
        return;
    }

    gallerySyncInProgress = true;
    console.log(`[gallery-sync] Start (${reason})...`);

    try {
        const result = await syncGalleryFromDrive(GALLERY_DRIVE_FOLDER_INPUT);
        console.log(
            `[gallery-sync] Zakończono (${reason}): ${result.filesCount} zdjęć, folder ${result.folderId}.`,
        );
    } catch (error) {
        console.error(`[gallery-sync] Błąd (${reason}):`, error.message);
    } finally {
        gallerySyncInProgress = false;
    }
}

function getNextDailySyncDate(now = new Date()) {
    const nextRun = new Date(now);
    nextRun.setHours(GALLERY_SYNC_DAILY_HOUR, GALLERY_SYNC_DAILY_MINUTE, 0, 0);

    if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun;
}

function scheduleDailyGallerySync() {
    if (!GALLERY_DRIVE_FOLDER_INPUT) {
        console.log(
            "[gallery-sync] Harmonogram wyłączony: brak konfiguracji folderu galerii.",
        );
        return;
    }

    const now = new Date();
    const nextRun = getNextDailySyncDate(now);
    const delay = Math.max(1000, nextRun.getTime() - now.getTime());

    console.log(
        `[gallery-sync] Zaplanowano codziennie o ${String(GALLERY_SYNC_DAILY_HOUR).padStart(2, "0")}:${String(GALLERY_SYNC_DAILY_MINUTE).padStart(2, "0")}. Najbliższa synchronizacja: ${nextRun.toISOString()}.`,
    );

    setTimeout(async () => {
        await runGallerySync("daily-schedule");

        setInterval(() => {
            runGallerySync("daily-interval").catch(() => {});
        }, ONE_DAY_MS);
    }, delay);
}

async function createFolderOnDrive(name, parentId) {
    const folder = await drive.files.create({
        resource: {
            name,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentId],
        },
        fields: "id, webViewLink",
    });

    return folder.data;
}

async function uploadFileToDrive(file, folderId) {
    const uploaded = await drive.files.create({
        resource: {
            name: file.originalname,
            parents: [folderId],
        },
        media: {
            mimeType: file.mimetype,
            body: fs.createReadStream(file.path),
        },
        fields: "id, webViewLink",
    });

    return uploaded.data.webViewLink;
}

async function appendToSheet(data) {
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Arkusz1!A:H",
        valueInputOption: "RAW",
        resource: {
            values: [
                [
                    data.firstName,
                    data.lastName,
                    data.email,
                    data.phone,
                    data.licensePlate,
                    data.carBrand,
                    data.carDescription,
                    data.folderUrl,
                ],
            ],
        },
    });
}

app.post("/upload", upload.array("photos", 5), async (req, res) => {
    let savedFiles = [];

    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            licensePlate,
            carBrand,
            carDescription,
        } = req.body;

        if (
            !firstName ||
            !lastName ||
            !email ||
            !phone ||
            !licensePlate ||
            !carBrand ||
            !carDescription
        ) {
            return res.status(400).json({
                message: "Wszystkie pola są wymagane.",
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: "Proszę dodać przynajmniej jedno zdjęcie.",
            });
        }

        const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
        const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);

        if (totalSize > MAX_TOTAL_SIZE) {
            return res.status(400).json({
                message: "Łączny rozmiar plików przekracza 50MB.",
            });
        }

        const folder = await createFolderOnDrive(
            `${firstName} ${lastName}`,
            GOOGLE_DRIVE_FOLDER_ID,
        );

        await Promise.all(
            req.files.map(async (file) => {
                savedFiles.push(file.path);
                await uploadFileToDrive(file, folder.id);
            }),
        );

        await appendToSheet({
            firstName,
            lastName,
            email,
            phone,
            licensePlate,
            carBrand,
            carDescription,
            folderUrl: folder.webViewLink,
        });

        res.json({
            message:
                "Gratulacje! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją :)",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Wystąpił błąd serwera.",
        });
    } finally {
        savedFiles.forEach((filePath) => {
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, () => {});
            }
        });
    }
});

app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_COUNT") {
            return res
                .status(400)
                .json({ message: "Można przesłać maksymalnie 5 zdjęć." });
        }
    }

    if (error.message === "Tylko pliki graficzne (obrazy) są dozwolone!") {
        return res.status(400).json({ message: error.message });
    }

    next(error);
});

app.get("/health", (req, res) => {
    res.json({ status: "OK" });
});

app.post("/gallery/sync", async (req, res) => {
    if (!GALLERY_DRIVE_FOLDER_INPUT) {
        return res.status(400).json({
            message:
                "Brak konfiguracji folderu galerii (DRIVE_GALLERY_FOLDER_ID/GALLERY_DRIVE_FOLDER_ID).",
        });
    }

    if (gallerySyncInProgress) {
        return res.status(409).json({
            message: "Synchronizacja galerii już trwa.",
        });
    }

    try {
        const result = await syncGalleryFromDrive(GALLERY_DRIVE_FOLDER_INPUT);
        return res.json({
            message: "Synchronizacja galerii zakończona.",
            filesCount: result.filesCount,
            folderId: result.folderId,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Błąd synchronizacji galerii.",
            error: error.message,
        });
    }
});

app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
    scheduleDailyGallerySync();
});
