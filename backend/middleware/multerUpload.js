import fs from "fs";
import os from "os";
import path from "path";
import multer from "multer";

const uploadDir = path.join(os.tmpdir(), "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const fileFilter = (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Tylko pliki graficzne (obrazy) są dozwolone!"), false);
    }
};

const upload = multer({
    dest: uploadDir,
    limits: {
        files: 5,
    },
    fileFilter,
});

export { upload, uploadDir };
