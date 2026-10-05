const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { getUserSubmissionsDir, getUserVehiclesDir } = require("./paths");
const { isAllowedImageFilename } = require("./imageUpload");

// Private photos of submissions and garage vehicles. In the database they are
// stored as "/uploads/<kind>/<userId>/<file>"; browsers get them only through the
// authenticated endpoints /api/<kind>/photos/<userId>/<file> (owner or admin).
const KINDS = {
    submissions: getUserSubmissionsDir,
    vehicles: getUserVehiclesDir,
};

const MAX_PHOTOS = 5;
const MAX_TOTAL_PHOTOS_SIZE = 50 * 1024 * 1024;
const STORED_PATTERN = /^\/uploads\/(submissions|vehicles)\/(\d+)\/([^/]+)$/;

function parseStored(storedPath) {
    const match = STORED_PATTERN.exec(String(storedPath || ""));
    if (!match || !isAllowedImageFilename(match[3])) return null;
    return { kind: match[1], userId: match[2], filename: match[3] };
}

function toPhotoUrl(storedPath) {
    const parsed = parseStored(storedPath);
    return parsed
        ? `/api/${parsed.kind}/photos/${parsed.userId}/${parsed.filename}`
        : storedPath;
}

function diskPathOf(storedPath) {
    const parsed = parseStored(storedPath);
    return parsed ? path.join(KINDS[parsed.kind](parsed.userId), parsed.filename) : null;
}

function storedPathFor(kind, userId, filename) {
    return `/uploads/${kind}/${Number(userId)}/${filename}`;
}

function removeStoredPhotos(storedPaths) {
    for (const storedPath of storedPaths || []) {
        const diskPath = diskPathOf(storedPath);
        if (diskPath) fs.promises.unlink(diskPath).catch(() => {});
    }
}

function totalSizeOf(storedPaths) {
    return storedPaths.reduce((sum, storedPath) => {
        try {
            return sum + fs.statSync(diskPathOf(storedPath)).size;
        } catch {
            return sum;
        }
    }, 0);
}

// Independent copies (e.g. garage → new submission), so deleting one never breaks the other.
function copyStoredPhotos(storedPaths, kind, userId) {
    const dir = KINDS[kind](userId);
    fs.mkdirSync(dir, { recursive: true });
    const copies = [];
    for (const storedPath of storedPaths || []) {
        const source = diskPathOf(storedPath);
        if (!source || !fs.existsSync(source)) continue;
        const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${path.extname(source)}`;
        fs.copyFileSync(source, path.join(dir, filename));
        copies.push(storedPathFor(kind, userId, filename));
    }
    return copies;
}

// New photo set = kept photos (identified by the URLs the client has) + uploads.
// Returns { photos, removed } or { error } — the caller deletes uploads on error.
function applyPhotoChanges({ currentPhotos, keepUrls, uploadedFiles, kind, userId }) {
    const keep = new Set((Array.isArray(keepUrls) ? keepUrls : [keepUrls]).filter(Boolean));
    const kept = currentPhotos.filter((stored) => keep.has(toPhotoUrl(stored)));
    const added = uploadedFiles.map((file) => storedPathFor(kind, userId, file.filename));
    const photos = [...kept, ...added];

    if (!photos.length) return { error: "Zostaw lub dodaj przynajmniej jedno zdjęcie." };
    if (photos.length > MAX_PHOTOS) {
        return { error: `Można mieć maksymalnie ${MAX_PHOTOS} zdjęć.` };
    }
    if (totalSizeOf(photos) > MAX_TOTAL_PHOTOS_SIZE) {
        return { error: "Łączny rozmiar zdjęć nie może przekraczać 50 MB." };
    }

    return { photos, removed: currentPhotos.filter((stored) => !kept.includes(stored)) };
}

// Express handler serving one private photo to its owner or an admin.
function servePhoto(kind) {
    return (req, res) => {
        const ownerId = Number(req.params.userId);
        const { filename } = req.params;

        if (req.user.role !== "admin" && Number(req.user.sub) !== ownerId) {
            return res.status(404).end();
        }
        if (!Number.isInteger(ownerId) || !isAllowedImageFilename(filename)) {
            return res.status(404).end();
        }

        res.set("Cache-Control", "private, max-age=3600");
        res.sendFile(path.join(KINDS[kind](ownerId), filename), { dotfiles: "deny" }, (error) => {
            if (error && !res.headersSent) res.status(404).end();
        });
    };
}

module.exports = {
    MAX_PHOTOS,
    MAX_TOTAL_PHOTOS_SIZE,
    toPhotoUrl,
    diskPathOf,
    storedPathFor,
    removeStoredPhotos,
    copyStoredPhotos,
    applyPhotoChanges,
    servePhoto,
};
