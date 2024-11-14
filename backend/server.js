const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// Konfiguracja Multer do obsługi przesyłania zdjęć
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage: storage });

// Wczytaj poświadczenia Google API
const credentials = JSON.parse(fs.readFileSync("credentials.json"));
const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ],
});

const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

// Funkcja do zapisu danych w Arkuszu Google
async function appendToSheet(data) {
    const spreadsheetId = "1FJWpiKO1zJVWTtX-PSZxV9TUp_G5d4BY0IfbXupJti0";
    await sheets.spreadsheets.values.append({
        spreadsheetId,
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
}

// Funkcja do przesyłania zdjęcia na Dysk Google
async function uploadFileToDrive(filePath, fileName) {
    const fileMetadata = {
        name: fileName,
        parents: ["1OgAGdsbb9bd7GCLDP9OY2lv8yVMCBqmd"],
    };
    const media = {
        mimeType: "image/jpeg",
        body: fs.createReadStream(filePath),
    };

    const file = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: "id, webViewLink",
    });
    return file.data.webViewLink;
}

// Endpoint do obsługi przesyłania danych - dodaj `async` tutaj
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

        // Użycie `await` w funkcji asynchronicznej
        const photoUrl = await uploadFileToDrive(
            req.file.path,
            req.file.filename
        );

        // Zapisz dane w Arkuszu Google
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

        // Usuń plik po przesłaniu na Google Drive
        fs.unlink(req.file.path, (err) => {
            if (err) console.error("Błąd przy usuwaniu pliku:", err);
        });

        res.json({
            message: `Dziękujemy za zgłoszenie, ${firstName} ${lastName}!`,
        });
    } catch (error) {
        console.error("Błąd:", error);
        res.status(500).json({ message: "Wystąpił błąd serwera." });
    }
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});
