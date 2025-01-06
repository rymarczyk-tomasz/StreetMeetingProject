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

// Konfiguracja folderu do przechowywania pobranych zdjęć
const downloadsDir = path.join(__dirname, "downloads");
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

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
    scopes: ["https://www.googleapis.com/auth/drive"],
});

// Inicjalizacja Google Drive
const drive = google.drive({ version: "v3", auth });

// ID folderu Google Drive z .env
const GOOGLE_DRIVE_GALLERY_FOLDER_ID = process.env.DRIVE_GALLERY_FOLDER_ID;

// Endpoint do pobierania zdjęć z Google Drive i zapisywania ich lokalnie
app.get("/api/gallery", async (req, res) => {
    try {
        const response = await drive.files.list({
            q: `'${GOOGLE_DRIVE_GALLERY_FOLDER_ID}' in parents and mimeType contains 'image/'`,
            fields: "files(id, name)",
        });

        const files = await Promise.all(
            response.data.files.map(async (file) => {
                const filePath = path.join(downloadsDir, file.name);

                // Sprawdź, czy plik już istnieje
                if (!fs.existsSync(filePath)) {
                    const dest = fs.createWriteStream(filePath);
                    await drive.files.get(
                        { fileId: file.id, alt: "media" },
                        { responseType: "stream" },
                        (err, response) => {
                            if (err) throw err;
                            response.data.pipe(dest);
                        }
                    );
                }

                return { name: file.name, path: `/downloads/${file.name}` };
            })
        );

        res.json(files); // Zwraca listę plików z lokalnymi ścieżkami
    } catch (error) {
        console.error("Błąd przy pobieraniu zdjęć:", error.message);
        res.status(500).json({ message: "Nie udało się pobrać zdjęć." });
    }
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer nasłuchuje na porcie ${PORT}`);
});
