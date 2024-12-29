const cors = require("cors");
const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const { google } = require("googleapis");
require("dotenv").config();

// Inicjalizacja aplikacji Express
const app = express();
const PORT = 3000;

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
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
} catch (error) {
    console.error("Błąd wczytywania credentials.json:", error);
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
        console.error("Błąd na serwerze:", error);
        res.status(500).json({ message: "Wystąpił błąd serwera." });
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
            !req.file
        ) {
            return res
                .status(400)
                .json({ message: "Wszystkie pola są wymagane." });
        }

        // Przesyłanie pliku do Google Drive
        const photoUrl = await uploadFileToDrive(
            req.file.path,
            req.file.filename
        );

        // Dodanie danych do Google Sheets
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

        // Usunięcie pliku z serwera po wysłaniu
        fs.unlink(req.file.path, (err) => {
            if (err) console.error("Błąd przy usuwaniu pliku:", err);
        });

        // Odpowiedź dla użytkownika
        res.json({
            message: `Dziękujemy za zgłoszenie, ${firstName} ${lastName}!`,
        });
    } catch (error) {
        console.error("Błąd na serwerze:", error);
        res.status(500).json({ message: "Wystąpił błąd serwera." });
    }
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});
