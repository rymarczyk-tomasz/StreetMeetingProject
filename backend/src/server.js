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

const googleService = new GoogleService(envPath);

app.post(
    "/upload",
    multer({ dest: "./uploads/" }).array("photo"),
    async (req, res) => {
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

        const userFolder = await googleService.createUserFolder(
            firstName,
            lastName
        );
        await googleService.uploadFilesToDrive(req.files, userFolder.id);
        await googleService.appendToSheet({
            firstName,
            lastName,
            email,
            phone,
            licensePlate,
            carBrand,
            carDescription,
            photoUrls: userFolder.link, // Zapisujemy link do folderu
        }).then((response) => response);

        res.status(200)
            .json({
                message:
                    "Gratulacje! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją :)",
            });
        // TODO: Delete files from '/uploads'
    }
);

app.listen(PORT, () => {
    console.log(`Listening on: ${PORT}`);
});
