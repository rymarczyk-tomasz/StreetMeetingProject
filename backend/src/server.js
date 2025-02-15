import multer from 'multer';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
//import googleservice from 'google-service';

const app = express();
const PORT = process.env.PORT || 33000;
const env = process.env.NODE_ENV || 'development';

const __dirname = path.resolve();

if (env === 'development') {
    dotenv.config();
} else {
    dotenv.config({ path: path.join(__dirname, "../config/.env") });
}

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, "../")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/upload", multer({dest: "./uploads/"}).array("photo"), async (req, res) => {
    console.log(req.body);

    console.log(req.files);
    res.status(200).send(req.body);
});
// app.post("/upload", upload.single("photo"), async (req, res) => {
//     throw new Error("reached")
//     let photoPath;
//     try {
//         const {
//             firstName,
//             lastName,
//             email,
//             phone,
//             licensePlate,
//             carBrand,
//             carDescription,
//         } = req.body;

//         if (
//             !firstName ||
//             !lastName ||
//             !email ||
//             !phone ||
//             !licensePlate ||
//             !carBrand ||
//             !carDescription ||
//             !req.file
//         ) {
//             return res
//                 .status(400)
//                 .json({ message: "Wszystkie pola są wymagane." });
//         }

//         photoPath = req.file.path;
//         const photoUrl = await uploadFileToDrive(photoPath, req.file.filename);

//         await appendToSheet({
//             firstName,
//             lastName,
//             email,
//             phone,
//             licensePlate,
//             carBrand,
//             carDescription,
//             photoUrl,
//         });

//         res.json({
//             message: `Gratulacje! Twoje zgłoszenie zostało przyjęte, niebawem odezwiemy się z decyzją :)`,
//         });
//     } catch (error) {
//         console.error("Błąd na serwerze:", error.message);
//         res.status(500).json({ message: "Wystąpił błąd serwera." });
//     } finally {
//         if (photoPath) {
//             fs.unlink(photoPath, (err) => {
//                 if (err)
//                     console.error("Błąd przy usuwaniu pliku:", err.message);
//             });
//         }
//     }
// });

app.listen(PORT, () => {
    console.log(`Listening on: ${PORT}`);
});
