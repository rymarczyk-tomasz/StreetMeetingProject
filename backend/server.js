require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, "../")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) =>
        cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Check environment variables
if (!process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_CLIENT_EMAIL) {
    console.error(
        "Missing GOOGLE_PRIVATE_KEY or GOOGLE_CLIENT_EMAIL in .env file"
    );
    process.exit(1);
}

// Create auth object using environment variables
const auth = new google.auth.GoogleAuth({
    credentials: {
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
    },
    scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ],
});

const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const GOOGLE_DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

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
                    data.photoUrl,
                ],
            ],
        },
    });
}

async function uploadFileToDrive(filePath, fileName) {
    const fileMetadata = { name: fileName, parents: [GOOGLE_DRIVE_FOLDER_ID] };
    const media = {
        mimeType: "image/jpeg",
        body: fs.createReadStream(filePath),
    };
    const file = await drive.files.create({
        resource: fileMetadata,
        media,
        fields: "id, webViewLink",
    });
    return file.data.webViewLink;
}

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

        const photoUrl = await uploadFileToDrive(
            req.file.path,
            req.file.filename
        );
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

        fs.unlink(req.file.path, (err) => {
            if (err) console.error("Błąd przy usuwaniu pliku:", err);
        });

        res.json({
            message: `Dziękujemy za zgłoszenie, ${firstName} ${lastName}!`,
        });
    } catch (error) {
        console.error("Błąd na serwerze:", error);
        res.status(500).json({ message: "Wystąpił błąd serwera." });
    }
});

app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});
