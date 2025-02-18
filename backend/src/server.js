import multer from 'multer';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createUserFolder, appendToSheet, uploadFilesToDrive } from './google-service/google-service.js';

console.log(process.env.NODE_ENV);
const app = express();
const PORT = process.env.PORT || 33000;
const env = process.env.NODE_ENV || 'development';

const __dirname = path.resolve();

if (env === 'development') {
    dotenv.config({ path: path.join(__dirname, "../config/.env_dev") });
} else {
    dotenv.config({ path: path.join(__dirname, "../config/.env") });
}

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, "../")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/upload", multer({dest: "./uploads/"}).array("photo"), async (req, res) => {

    const {
        firstName,
        lastName,
        email,
        phone,
        licensePlate,
        carBrand,
        carDescription,
    } = req.body;

    console.log(firstName);

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

    req.files.forEach(f => {
        console.log(f.path);
    });

    const userFolder = await createUserFolder(firstName, lastName);
    await uploadFilesToDrive(req.files, userFolder.id);
    await appendToSheet({
        firstName,
        lastName,
        email,
        phone,
        licensePlate,
        carBrand,
        carDescription,
        photoUrls: userFolder.link, // Zapisujemy link do folderu
    });
    res.json({
        message:
            "Gratulacje! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją :)",
    });

    req.files.forEach(f => {
        fs.rm(f.path);
    })
});


app.listen(PORT, () => {
    console.log(`Listening on: ${PORT}`);
});
