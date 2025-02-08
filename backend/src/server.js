const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../config/.env") });

const cors = require("cors");
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { google } = require("googleapis");

// Inicjalizacja aplikacji Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, "../")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware do serwowania plików z folderu `downloads`
app.use("/downloads", express.static(downloadsDir));

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
// const GOOGLE_DRIVE_GALLERY_FOLDER_ID = process.env.DRIVE_GALLERY_FOLDER_ID;

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
                        data.photoUrls, // Zaktualizowane pole
                    ],
                ],
            },
        });
    } catch (error) {
        console.error(
            "Błąd podczas dodawania danych do Google Sheets:",
            error.message
        );
        throw new Error("Nie udało się dodać danych do arkusza.");
    }
}

// Przesyłanie plików do Google Drive
async function uploadFilesToDrive(files) {
    const fileLinks = [];
    for (const file of files) {
        const fileMetadata = {
            name: file.originalname,
            parents: [GOOGLE_DRIVE_FOLDER_ID],
        };
        const media = {
            mimeType: file.mimetype,
            body: fs.createReadStream(file.path),
        };

        try {
            const uploadedFile = await drive.files.create({
                resource: fileMetadata,
                media,
                fields: "id, webViewLink",
            });
            fileLinks.push(uploadedFile.data.webViewLink);
        } catch (error) {
            console.error(
                "Błąd przy przesyłaniu pliku do Google Drive:",
                error
            );
            throw error;
        } finally {
            fs.unlink(file.path, (err) => {
                if (err)
                    console.error("Błąd przy usuwaniu pliku:", err.message);
            });
        }
    }
    return fileLinks;
}

// Endpoint do przesyłania danych (formularz)
app.post("/upload", upload.array("photos", 10), async (req, res) => {
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
            !carDescription ||
            !req.files
        ) {
            return res
                .status(400)
                .json({ message: "Wszystkie pola są wymagane." });
        }

        console.log("Przesyłanie plików do Google Drive...");
        const photoUrls = await uploadFilesToDrive(req.files);
        console.log("Pliki przesłane do Google Drive:", photoUrls);

        console.log("Dodawanie danych do Google Sheets...");
        await appendToSheet({
            firstName,
            lastName,
            email,
            phone,
            licensePlate,
            carBrand,
            carDescription,
            photoUrls: photoUrls.join(", "), // Zapisz linki jako ciąg znaków oddzielony przecinkami
        });
        console.log("Dane dodane do Google Sheets");

        res.json({
            message: `Gratulacje! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją :)`,
        });
    } catch (error) {
        console.error("Błąd na serwerze:", error.message);
        res.status(500).json({ message: "Wystąpił błąd serwera." });
    }
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer nasłuchuje na porcie ${PORT}`);
});
