import multer from "multer";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import { GoogleService } from "./google-service/google-service.js";

const app = express();
const PORT = process.env.PORT || 33000;
const env = process.env.NODE_ENV || "development";

const __dirname = path.resolve();

let envPath = "";
env === 'development' ?
    envPath = path.join(__dirname, "./.env.development") :
    envPath = path.join(__dirname, "./.env");

dotenv.config({ path: envPath });

// Ścieżki do katalogów
const uploadDir = path.join(__dirname, "uploads");
const downloadsDir = path.join(__dirname, "downloads");

// Tworzenie katalogu dla uploadów, jeśli nie istnieje
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, "../")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
<<<<<<< HEAD

const googleService = new GoogleService(envPath);

app.post(
    "/upload",
    multer({ dest: "./uploads/" }).array("photo"),
    async (req, res) => {
=======
app.use("/downloads", express.static(downloadsDir));

// Konfiguracja Multer (upload plików)
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

const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const GOOGLE_DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

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
                        data.photoUrls,
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

async function createUserFolder(firstName, lastName) {
    try {
        const folderName = `${firstName} ${lastName}`;
        const folderMetadata = {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [GOOGLE_DRIVE_FOLDER_ID], // Folder główny w Google Drive
        };

        const folder = await drive.files.create({
            resource: folderMetadata,
            fields: "id, webViewLink",
        });

        return { id: folder.data.id, link: folder.data.webViewLink };
    } catch (error) {
        console.error("Błąd przy tworzeniu folderu:", error);
        throw new Error("Nie udało się utworzyć folderu użytkownika.");
    }
}

async function uploadFilesToDrive(files, userFolderId) {
    const fileLinks = [];

    for (const file of files) {
        try {
            const uploadedFile = await drive.files.create({
                resource: {
                    name: file.originalname,
                    parents: [userFolderId], // Wysyłamy plik do folderu użytkownika
                },
                media: {
                    mimeType: file.mimetype,
                    body: fs.createReadStream(file.path),
                },
                fields: "id, webViewLink",
            });

            fileLinks.push(uploadedFile.data.webViewLink);
        } catch (error) {
            console.error(
                `Błąd przy przesyłaniu pliku ${file.originalname}:`,
                error
            );
        } finally {
            fs.unlink(file.path, (err) => {
                if (err)
                    console.error(
                        `Błąd przy usuwaniu pliku ${file.originalname}:`,
                        err
                    );
            });
        }
    }
    return fileLinks;
}

app.post("/upload", upload.array("photos", 10), async (req, res) => {
    try {
>>>>>>> featurev2
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
            return res.status(400).json({ message: "Wszystkie pola są wymagane." });
        }

<<<<<<< HEAD
        const userFolder = await googleService.createUserFolder(
            firstName,
            lastName
        );
        await googleService.uploadFilesToDrive(req.files, userFolder.id);
        await googleService.appendToSheet({
=======
        console.log("Tworzenie folderu w Google Drive...");
        const userFolder = await createUserFolder(firstName, lastName);
        console.log(`Folder użytkownika utworzony: ${userFolder.link}`);

        console.log("Przesyłanie plików do Google Drive...");
        await uploadFilesToDrive(req.files, userFolder.id);
        console.log("Pliki przesłane do Google Drive");

        console.log("Dodawanie danych do Google Sheets...");
        await appendToSheet({
>>>>>>> featurev2
            firstName,
            lastName,
            email,
            phone,
            licensePlate,
            carBrand,
            carDescription,
            photoUrls: userFolder.link, // Zapisujemy link do folderu
<<<<<<< HEAD
        }).then((response) => response);

        res.status(200)
            .json({
                message:
                    "Gratulacje! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją :)",
            });
        // TODO: Delete files from '/uploads'
=======
        });
        console.log("Dane dodane do Google Sheets");

        res.json({
            message:
                "Gratulacje! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją :)",
        });
    } catch (error) {
        console.error("Błąd na serwerze:", error.message);
        res.status(500).json({ message: "Wystąpił błąd serwera." });
>>>>>>> featurev2
    }
);

app.listen(PORT, () => {
    console.log(`Listening on: ${PORT}`);
});
