const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../config/.env") });

const cors = require("cors");
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { google } = require("googleapis");

// Inicjalizacja aplikacji Express
const app = express();
const PORT = process.env.PORT || 33000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, "../")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Konfiguracja Multer (upload plików)
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

// Wczytanie danych uwierzytelniających z zmiennych środowiskowych
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
    universe_domain: "googleapis.com",
};

// Sprawdzenie, czy wszystkie wymagane zmienne środowiskowe są zdefiniowane
if (!credentials.private_key) {
    throw new Error(
        "GOOGLE_PRIVATE_KEY is not defined in environment variables."
    );
}

// Konfiguracja autoryzacji Google Auth
const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ],
});

// Inicjalizacja Google Sheets i Google Drive
const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

// ID arkusza kalkulacyjnego i folderu Google Drive z .env
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const GOOGLE_DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// Funkcja do tworzenia folderu na Google Drive
async function createFolderOnDrive(folderName, parentFolderId) {
    const fileMetadata = {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
    };

    try {
        const folder = await drive.files.create({
            resource: fileMetadata,
            fields: "id, webViewLink",
        });
        return folder.data; // Zwraca id i link do folderu
    } catch (error) {
        console.error("Błąd przy tworzeniu folderu na Google Drive:", error);
        throw error;
    }
}

// Funkcja do przesyłania pliku do Google Drive
async function uploadFileToDrive(filePath, fileName, folderId) {
    const fileMetadata = {
        name: fileName,
        parents: [folderId], // Folder osoby
    };
    const media = {
        mimeType: "image/jpeg",
        body: fs.createReadStream(filePath),
    };

    try {
        const file = await drive.files.create({
            resource: fileMetadata,
            media,
            fields: "id, webViewLink",
        });
        return file.data.webViewLink; // Zwraca link do pliku
    } catch (error) {
        console.error("Błąd przy przesyłaniu pliku do Google Drive:", error);
        throw error;
    }
}

// Funkcja do dodawania danych do Google Sheets
async function appendToSheet(data) {
    try {
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
                        data.folderUrl, // Link do folderu
                    ],
                ],
            },
        });
    } catch (error) {
        console.error(
            "Błąd podczas dodawania danych do Arkuszy Google:",
            error.message
        );
        throw new Error("Nie udało się dodać danych do arkusza.");
    }
}

// Endpoint do przesyłania danych (formularz)
app.post("/upload", upload.array("photos", 5), async (req, res) => {
    let photoPaths = [];
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

        // Walidacja danych
        if (
            !firstName ||
            !lastName ||
            !email ||
            !phone ||
            !licensePlate ||
            !carBrand ||
            !carDescription ||
            !req.files ||
            req.files.length === 0
        ) {
            return res.status(400).json({
                message:
                    "Wszystkie pola są wymagane, w tym przynajmniej jedno zdjęcie.",
            });
        }

        // Tworzenie folderu o nazwie "Imię Nazwisko"
        const folderName = `${firstName} ${lastName}`;
        const folder = await createFolderOnDrive(
            folderName,
            GOOGLE_DRIVE_FOLDER_ID
        );

        // Przesyłanie zdjęć do folderu
        const photoUrls = await Promise.all(
            req.files.map((file) => {
                photoPaths.push(file.path); // Ścieżki do późniejszego usunięcia
                return uploadFileToDrive(file.path, file.filename, folder.id);
            })
        );

        // Zapis do Google Sheets z linkiem do folderu
        await appendToSheet({
            firstName,
            lastName,
            email,
            phone,
            licensePlate,
            carBrand,
            carDescription,
            folderUrl: folder.webViewLink, // Link do folderu
        });

        res.json({
            message:
                "Gratulacje! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją :)",
        });
    } catch (error) {
        console.error("Błąd na serwerze:", error.message, error.stack);
        res.status(500).json({
            message: "Wystąpił błąd serwera.",
            error: error.message,
        });
    } finally {
        // Usuwanie tymczasowych plików
        photoPaths.forEach((photoPath) => {
            if (photoPath) {
                fs.unlink(photoPath, (err) => {
                    if (err)
                        console.error("Błąd przy usuwaniu pliku:", err.message);
                });
            }
        });
    }
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
