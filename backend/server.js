const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "config/.env") });

const cors = require("cors");
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { google } = require("googleapis");

// Inicjalizacja aplikacji Express
const app = express();
const PORT = process.env.PORT || 33000;

app.use(cors());
app.use(express.static(path.join(__dirname, "../")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Konfiguracja Multer (upload plików)
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir }).array("photos", 5);

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

if (!credentials.private_key) {
    throw new Error(
        "GOOGLE_PRIVATE_KEY is not defined in environment variables."
    );
}

const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ],
});

const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const GOOGLE_DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// Funkcja do tworzenia folderu na Google Drive
async function createFolderOnDrive(firstName, lastName) {
    const folderMetadata = {
        name: `${firstName}_${lastName}_${Date.now()}`, // Dodajemy timestamp, aby uniknąć duplikatów
        mimeType: "application/vnd.google-apps.folder",
        parents: [GOOGLE_DRIVE_FOLDER_ID],
    };

    try {
        const folder = await drive.files.create({
            resource: folderMetadata,
            fields: "id, webViewLink",
        });
        return {
            id: folder.data.id,
            webViewLink: folder.data.webViewLink,
        };
    } catch (error) {
        console.error("Błąd przy tworzeniu folderu na Google Drive:", error);
        throw error;
    }
}

// Funkcja do przesyłania pliku do określonego folderu na Google Drive
async function uploadFileToDrive(filePath, fileName, folderId) {
    const fileMetadata = {
        name: fileName,
        parents: [folderId], // Ustawiamy folder docelowy
    };
    const media = {
        mimeType: "image/jpeg",
        body: fs.createReadStream(filePath),
    };

    try {
        const file = await drive.files.create({
            resource: fileMetadata,
            media,
            fields: "id",
        });
        return file.data.id; // Zwracamy ID pliku (opcjonalne, jeśli nie potrzebujemy linku)
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
                        data.folderUrl, // Zmieniono z photoUrl na folderUrl
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
app.post("/upload", upload, async (req, res) => {
    let photoPaths = [];
    try {
        console.log("Odebrano dane:", req.body); // Logowanie danych formularza
        console.log("Odebrano pliki:", req.files); // Logowanie przesłanych plików

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
            !req.files ||
            req.files.length === 0
        ) {
            console.log("Brak wymaganych pól lub plików");
            return res.status(400).json({
                message:
                    "Wszystkie pola są wymagane, w tym co najmniej jedno zdjęcie.",
            });
        }

        console.log("Tworzenie folderu...");
        const folder = await createFolderOnDrive(firstName, lastName);
        console.log("Utworzono folder:", folder);

        photoPaths = req.files.map((file) => file.path);
        console.log("Przesyłanie plików do folderu:", folder.id);
        await Promise.all(
            req.files.map((file) =>
                uploadFileToDrive(file.path, file.filename, folder.id)
            )
        );
        console.log("Pliki przesłane");

        console.log("Zapisywanie danych do Google Sheets...");
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
        console.log("Dane zapisane");

        res.json({
            message: `Gratulacje! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją :)`,
        });
    } catch (error) {
        console.error("Błąd na serwerze:", error.stack); // Pełny stack trace
        res.status(500).json({
            message: "Wystąpił błąd serwera.",
            error: error.message,
        });
    } finally {
        photoPaths.forEach((photoPath) => {
            fs.unlink(photoPath, (err) => {
                if (err)
                    console.error("Błąd przy usuwaniu pliku:", err.message);
            });
        });
    }
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
