import { Router } from "express";
import multer from "multer";
import { upload } from "../middleware/multerUpload.js";
import { uploadRateLimit } from "../middleware/rateLimiter.js";
import { handleUpload } from "../controllers/uploadController.js";

const router = Router();

router.post("/upload", uploadRateLimit, upload.array("photos", 5), handleUpload);

router.use((error, _req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({ message: "Można przesłać maksymalnie 5 zdjęć." });
        }
    }

    if (error.message === "Tylko pliki graficzne (obrazy) są dozwolone!") {
        return res.status(400).json({ message: error.message });
    }

    next(error);
});

export { router as uploadRouter };
