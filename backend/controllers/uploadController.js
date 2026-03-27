import fs from "fs";
import { createFolderOnDrive, uploadFileToDrive } from "../services/driveService.js";
import { appendToSheet } from "../services/sheetsService.js";

const GOOGLE_DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_REGEX = /^\+?[0-9]{9,15}$/;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;

function normalizeText(value) {
    return String(value || "").trim();
}

function normalizePhone(value) {
    return normalizeText(value).replace(/\s+/g, "");
}

async function handleUpload(req, res) {
    const savedFiles = [];

    try {
        const firstName = normalizeText(req.body.firstName);
        const lastName = normalizeText(req.body.lastName);
        const email = normalizeText(req.body.email);
        const phone = normalizePhone(req.body.phone);
        const licensePlate = normalizeText(req.body.licensePlate);
        const carBrand = normalizeText(req.body.carBrand);
        const carDescription = normalizeText(req.body.carDescription);
        const honeypot = normalizeText(req.body.website);
        const hasRodoConsent = String(req.body.rodoConsent || "").toLowerCase() === "on";

        if (honeypot) {
            return res.status(400).json({ message: "Nieprawidłowe zgłoszenie." });
        }

        if (!hasRodoConsent) {
            return res.status(400).json({
                message: "Wymagana jest akceptacja zgody RODO.",
            });
        }

        if (!firstName || !lastName || !email || !phone || !licensePlate || !carBrand || !carDescription) {
            return res.status(400).json({ message: "Wszystkie pola są wymagane." });
        }

        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({
                message: "Proszę podać poprawny adres e-mail.",
            });
        }

        if (!PHONE_REGEX.test(phone)) {
            return res.status(400).json({
                message: "Proszę podać poprawny numer telefonu (9-15 cyfr).",
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: "Proszę dodać przynajmniej jedno zdjęcie.",
            });
        }

        const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);

        if (totalSize > MAX_TOTAL_SIZE) {
            return res.status(400).json({
                message: "Łączny rozmiar plików przekracza 50MB.",
            });
        }

        const folder = await createFolderOnDrive(
            `${firstName} ${lastName}`,
            GOOGLE_DRIVE_FOLDER_ID,
        );

        await Promise.all(
            req.files.map(async (file) => {
                savedFiles.push(file.path);
                await uploadFileToDrive(file, folder.id);
            }),
        );

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

        return res.json({
            message:
                "Gratulacje! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją :)",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Wystąpił błąd serwera." });
    } finally {
        savedFiles.forEach((filePath) => {
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, () => {});
            }
        });
    }
}

export { handleUpload };
