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

// Konfiguracja Multer (upload plików)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "./uploads/"),
    filename: (req, file, cb) =>
        cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Wczytanie pliku credentials.json do autoryzacji Google API
let credentials;
try {
    const credentialsPath = path.join(__dirname, "../config/credentials.json");
    const credentialsData = fs.readFileSync(credentialsPath, "utf8");
    credentials = JSON.parse(credentialsData);
} catch (error) {
    console.error("Błąd wczytywania credentials.json:", error.message);
    process.exit(1);
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
                        data.photoUrl,
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

// Przesyłanie pliku do Google Drive
async function uploadFileToDrive(filePath, fileName) {
    const fileMetadata = {
        name: fileName,
        parents: [GOOGLE_DRIVE_FOLDER_ID],
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
        return file.data.webViewLink; // Zwróci link do pliku na Google Drive
    } catch (error) {
        console.error("Błąd przy przesyłaniu pliku do Google Drive:", error);
        throw error;
    }
}

// Endpoint do przesyłania danych (formularz)
app.post("/upload", upload.single("photo"), async (req, res) => {
    let photoPath;
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
            !req.file
        ) {
            return res
                .status(400)
                .json({ message: "Wszystkie pola są wymagane." });
        }

        photoPath = req.file.path;
        const photoUrl = await uploadFileToDrive(photoPath, req.file.filename);

        await appendToSheet({
            firstName,
            lastName,
            email,
            phone,
            licensePlate,
            carBrand,
            carDescription,
            photoUrl,
        });

        res.json({
            message: `Dziękujemy za zgłoszenie, ${firstName} ${lastName}!`,
        });
    } catch (error) {
        console.error("Błąd na serwerze:", error.message);
        res.status(500).json({ message: "Wystąpił błąd serwera." });
    } finally {
        if (photoPath) {
            fs.unlink(photoPath, (err) => {
                if (err)
                    console.error("Błąd przy usuwaniu pliku:", err.message);
            });
        }
    }
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
