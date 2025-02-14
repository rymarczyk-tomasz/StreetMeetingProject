const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../config/.env") });

const cors = require("cors");
const express = require("express");
const fs = require("fs");
//require('./services/google-service')

// Inicjalizacja aplikacji Express
const app = express();
const PORT = process.env.PORT || 33000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, "../")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint do przesyłania danych (formularz)
app.post("/upload", async (req, res) => {
    console.log(req.body);

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

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer nasłuchuje na porcie ${PORT}`);
});
