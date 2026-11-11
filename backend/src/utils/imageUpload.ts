const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { getSharp } = require("./sharp");

// mimetype/filename from the browser are untrusted - extension comes from this
// whitelist and the content is checked after upload (no .html/.svg on our origin)
const MIME_TO_EXTENSION = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/pjpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/avif": ".avif",
};

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

// some browsers send no type for webp/avif, content is verified later anyway
function imageExtensionFor(file) {
    const fromMime = MIME_TO_EXTENSION[file.mimetype];
    if (fromMime) return fromMime;
    if (file.mimetype && file.mimetype !== "application/octet-stream") return null;
    const extension = path.extname(file.originalname || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) return null;
    return extension === ".jpeg" ? ".jpg" : extension;
}

const INVALID_IMAGE_MESSAGE =
    "Dozwolone są tylko zdjęcia w formatach JPG, PNG, WEBP lub AVIF.";

class UploadValidationError extends Error {
    status = 400;
}

function detectImageExtension(buffer) {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return ".jpg";
    }
    if (
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
        return ".png";
    }
    if (
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
        return ".webp";
    }
    if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
        const brands = buffer.toString("ascii", 8, Math.min(buffer.length, 64));
        if (/avif|avis/.test(brands)) return ".avif";
    }
    return null;
}

function readFileHead(filePath, length = 64) {
    const fd = fs.openSync(filePath, "r");
    try {
        const buffer = Buffer.alloc(length);
        const bytesRead = fs.readSync(fd, buffer, 0, length, 0);
        return buffer.subarray(0, bytesRead);
    } finally {
        fs.closeSync(fd);
    }
}

function removeFiles(files) {
    for (const file of files || []) {
        fs.promises.unlink(file.path).catch(() => {});
    }
}

// magic bytes check; fixes the extension if it's another allowed format
function verifyUploadedImages(files) {
    for (const file of files) {
        const detected = detectImageExtension(readFileHead(file.path));
        if (!detected) {
            removeFiles(files);
            throw new UploadValidationError(INVALID_IMAGE_MESSAGE);
        }

        if (path.extname(file.filename) !== detected) {
            const filename = `${path.basename(file.filename, path.extname(file.filename))}${detected}`;
            const newPath = path.join(path.dirname(file.path), filename);
            fs.renameSync(file.path, newPath);
            file.filename = filename;
            file.path = newPath;
        }
    }
}

// Participants' photos are stored without EXIF (phones save the GPS position of the
// garage) and no larger than MAX_PHOTO_EDGE px. Quality 92 with full chroma is not
// visibly different from the upload; PNG stays lossless.
const MAX_PHOTO_EDGE = 4000;
const PHOTO_QUALITY = 92;

async function processUploadedImages(files) {
    for (const file of files) {
        const sourceExtension = path.extname(file.filename);
        // AVIF encoding takes many seconds per photo on a small server
        const extension = sourceExtension === ".avif" ? ".jpg" : sourceExtension;
        const base = path.basename(file.filename, sourceExtension);
        const temp = path.join(path.dirname(file.path), `${base}.tmp`);
        try {
            // rotate() applies the EXIF orientation before the metadata is dropped
            let image = getSharp()(file.path)
                .rotate()
                .resize({ width: MAX_PHOTO_EDGE, height: MAX_PHOTO_EDGE, fit: "inside", withoutEnlargement: true });
            if (extension === ".png") image = image.png();
            else if (extension === ".webp") image = image.webp({ quality: PHOTO_QUALITY });
            else image = image.jpeg({ quality: PHOTO_QUALITY, chromaSubsampling: "4:4:4" });
            const info = await image.toFile(temp);

            const filename = `${base}${extension}`;
            const target = path.join(path.dirname(file.path), filename);
            if (target !== file.path) await fs.promises.unlink(file.path);
            await fs.promises.rename(temp, target);
            file.filename = filename;
            file.path = target;
            file.size = info.size;
        } catch {
            // has the right first bytes but can't be decoded
            await fs.promises.unlink(temp).catch(() => {});
            removeFiles(files);
            throw new UploadValidationError(INVALID_IMAGE_MESSAGE);
        }
    }
}

// express 4 doesn't catch a rejected async handler
function asyncHandler(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createImageUpload({ destination, maxFiles, maxFileSize }) {
    return multer({
        storage: multer.diskStorage({
            destination(req, file, cb) {
                try {
                    const dir = destination(req);
                    fs.mkdirSync(dir, { recursive: true });
                    cb(null, dir);
                } catch (error) {
                    cb(error);
                }
            },
            filename(req, file, cb) {
                const extension = imageExtensionFor(file);
                cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`);
            },
        }),
        limits: { files: maxFiles, fileSize: maxFileSize, fields: 30 },
        fileFilter(req, file, cb) {
            if (imageExtensionFor(file)) {
                cb(null, true);
            } else {
                cb(new UploadValidationError(INVALID_IMAGE_MESSAGE));
            }
        },
    });
}

function createPdfUpload({ destination, maxFileSize }) {
    return multer({
        storage: multer.diskStorage({
            destination(req, file, cb) {
                try {
                    const dir = destination(req);
                    fs.mkdirSync(dir, { recursive: true });
                    cb(null, dir);
                } catch (error) {
                    cb(error);
                }
            },
            filename(req, file, cb) {
                cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.pdf`);
            },
        }),
        limits: { files: 1, fileSize: maxFileSize, fields: 10 },
        fileFilter(req, file, cb) {
            if (file.mimetype === "application/pdf") {
                cb(null, true);
            } else {
                cb(new UploadValidationError("Dozwolone są tylko pliki PDF."));
            }
        },
    });
}

function verifyUploadedPdf(file) {
    if (readFileHead(file.path, 5).toString("ascii") !== "%PDF-") {
        removeFiles([file]);
        throw new UploadValidationError("Plik nie jest prawidłowym dokumentem PDF.");
    }
}

function createProofUpload({ destination, maxFileSize }) {
    return multer({
        storage: multer.diskStorage({
            destination(req, file, cb) {
                try {
                    const dir = destination(req);
                    fs.mkdirSync(dir, { recursive: true });
                    cb(null, dir);
                } catch (error) {
                    cb(error);
                }
            },
            filename(req, file, cb) {
                const extension =
                    file.mimetype === "application/pdf" ? ".pdf" : imageExtensionFor(file);
                cb(null, `proof-${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`);
            },
        }),
        limits: { files: 1, fileSize: maxFileSize, fields: 5 },
        fileFilter(req, file, cb) {
            if (file.mimetype === "application/pdf" || imageExtensionFor(file)) {
                cb(null, true);
            } else {
                cb(new UploadValidationError("Dodaj zdjęcie (JPG, PNG, WEBP) albo plik PDF."));
            }
        },
    });
}

function verifyUploadedProof(file) {
    if (path.extname(file.filename) === ".pdf") verifyUploadedPdf(file);
    else verifyUploadedImages([file]);
}

function isAllowedProofFilename(filename) {
    return (
        isAllowedImageFilename(filename) ||
        (/^[a-zA-Z0-9._-]+$/.test(filename) && path.extname(filename).toLowerCase() === ".pdf")
    );
}

function isAllowedImageFilename(filename) {
    return (
        /^[a-zA-Z0-9._-]+$/.test(filename) &&
        ALLOWED_EXTENSIONS.has(path.extname(filename).toLowerCase())
    );
}

function uploadErrorHandler({ maxFiles, totalSizeLabel }) {
    return (error, req, res, next) => {
        removeFiles(req.files || (req.file ? [req.file] : []));

        if (error instanceof multer.MulterError) {
            if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
                return res
                    .status(400)
                    .json({ message: `Można przesłać maksymalnie ${maxFiles} zdjęć.` });
            }
            if (error.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                    message: `Łączny rozmiar plików nie może przekraczać ${totalSizeLabel}.`,
                });
            }
            return res.status(400).json({ message: "Nieprawidłowe dane formularza." });
        }

        if (error instanceof UploadValidationError) {
            return res.status(400).json({ message: error.message });
        }

        next(error);
    };
}

module.exports = {
    createImageUpload,
    verifyUploadedImages,
    processUploadedImages,
    asyncHandler,
    createPdfUpload,
    verifyUploadedPdf,
    createProofUpload,
    verifyUploadedProof,
    isAllowedProofFilename,
    removeFiles,
    isAllowedImageFilename,
    uploadErrorHandler,
    UploadValidationError,
};
