const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const galleryDb = require("../db/gallery");
const drive = require("./drive");
const { getAlbumDir, GALLERY_UPLOAD_ROOT } = require("../utils/paths");
const { getSharp } = require("../utils/sharp");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THUMB_WIDTH = 480;
const FULL_WIDTH = 1600;

function readClampedInt(value, fallback, min, max) {
    const parsed = Number(value ?? fallback);
    return Number.isFinite(parsed)
        ? Math.min(max, Math.max(min, Math.trunc(parsed)))
        : fallback;
}

const GALLERY_SYNC_DAILY_HOUR = readClampedInt(process.env.GALLERY_SYNC_DAILY_HOUR, 3, 0, 23);
const GALLERY_SYNC_DAILY_MINUTE = readClampedInt(process.env.GALLERY_SYNC_DAILY_MINUTE, 0, 0, 59);

const status = {
    inProgress: false,
    reason: "",
    folderName: "",
    processed: 0,
    total: 0,
    startedAt: null,
    finishedAt: null,
    lastMessage: "",
    lastError: "",
};

function getSyncStatus() {
    return { ...status };
}

function photoFileBase(albumId, driveFileId) {
    return path.join(getAlbumDir(albumId), driveFileId.replace(/[^a-zA-Z0-9_-]/g, ""));
}

function photoUrls(photo) {
    const base = `/uploads/gallery/${photo.album_id}/${photo.drive_file_id}`;
    return {
        thumb: `${base}-${THUMB_WIDTH}.webp?v=${photo.version}`,
        full: `${base}-${FULL_WIDTH}.webp?v=${photo.version}`,
    };
}

function signatureOf(file) {
    return `${file.modifiedTime || ""}|${file.md5Checksum || ""}|${file.size || ""}`;
}

async function removePhotoFiles(albumId, driveFileId) {
    const base = photoFileBase(albumId, driveFileId);
    await Promise.all(
        [THUMB_WIDTH, FULL_WIDTH].map((width) =>
            fs.promises.unlink(`${base}-${width}.webp`).catch(() => {}),
        ),
    );
}

async function renderPhoto(albumId, file) {
    const original = await drive.downloadFile(file.id);
    const base = photoFileBase(albumId, file.id);
    const sharp = getSharp();
    // rotate() applies EXIF orientation so phone photos aren't sideways.
    const full = await sharp(original)
        .rotate()
        .resize({ width: FULL_WIDTH, height: FULL_WIDTH, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(`${base}-${FULL_WIDTH}.webp`);
    await sharp(original)
        .rotate()
        .resize({ width: THUMB_WIDTH, height: THUMB_WIDTH, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 72 })
        .toFile(`${base}-${THUMB_WIDTH}.webp`);
    return { width: full.width, height: full.height };
}

async function syncAlbum(album) {
    status.folderName = album.title;
    const files = await drive.listImages(album.drive_folder_id);
    const existing = new Map<string, any>(
        galleryDb.listPhotos(album.id).map((photo) => [photo.drive_file_id, photo]),
    );
    await fs.promises.mkdir(getAlbumDir(album.id), { recursive: true });

    status.total += files.length;
    let added = 0;
    let updated = 0;
    let failed = 0;

    for (const [index, file] of files.entries()) {
        const previous = existing.get(file.id);
        existing.delete(file.id);
        const signature = signatureOf(file);
        const filesPresent =
            previous && fs.existsSync(`${photoFileBase(album.id, file.id)}-${THUMB_WIDTH}.webp`);

        try {
            if (previous && previous.signature === signature && filesPresent) {
                galleryDb.setPhotoOrder(previous.id, index, file.name);
            } else {
                const { width, height } = await renderPhoto(album.id, file);
                galleryDb.upsertPhoto({
                    albumId: album.id,
                    driveFileId: file.id,
                    name: file.name,
                    signature,
                    version: crypto.createHash("sha1").update(signature).digest("hex").slice(0, 8),
                    width,
                    height,
                    sortOrder: index,
                });
                if (previous) updated += 1;
                else added += 1;
            }
        } catch (error) {
            failed += 1;
            console.error(
                `[gallery-sync] ${album.title}: nie udało się przetworzyć ${file.name}:`,
                error.message,
            );
        }
        status.processed += 1;
    }

    // Whatever is left was deleted (or moved) on Drive.
    for (const photo of existing.values()) {
        galleryDb.deletePhoto(photo.id);
        await removePhotoFiles(album.id, photo.drive_file_id);
    }

    galleryDb.setAlbumSyncResult(
        album.id,
        failed ? `${failed} zdjęć nie udało się przetworzyć (np. format HEIC).` : null,
    );

    return { added, updated, removed: existing.size, failed, total: files.length };
}

async function deleteAlbumWithFiles(albumId) {
    galleryDb.deleteAlbum(albumId);
    await fs.promises.rm(getAlbumDir(albumId), { recursive: true, force: true });
}

// Local copies of albums that no longer exist (databases from before the single-folder
// gallery, interrupted deletes).
async function pruneStrayAlbumDirs() {
    const keep = String(galleryDb.getGalleryFolder()?.id ?? "");
    let entries = [];
    try {
        entries = await fs.promises.readdir(GALLERY_UPLOAD_ROOT);
    } catch {
        return;
    }
    for (const name of entries) {
        if (name !== keep) {
            await fs.promises.rm(path.join(GALLERY_UPLOAD_ROOT, name), { recursive: true, force: true });
        }
    }
}

// Points the gallery at a Drive folder (link or id). Another folder replaces the
// current photos; the same one only refreshes its name.
async function setGalleryFolder(link) {
    const folderId = drive.parseFolderId(link);
    if (!folderId) throw new Error("Nieprawidłowy link do folderu Dysku Google.");

    const folder = await drive.getFolder(folderId);
    const current = galleryDb.getGalleryFolder();
    if (current && current.drive_folder_id === folderId) {
        galleryDb.renameGalleryFolder(current.id, folder.name);
        return galleryDb.getGalleryFolder();
    }

    for (const album of galleryDb.listAlbums()) await deleteAlbumWithFiles(album.id);
    return galleryDb.createGalleryFolder({ title: folder.name, driveFolderId: folderId });
}

async function runGallerySync(reason) {
    if (status.inProgress) throw new Error("Synchronizacja galerii już trwa.");

    Object.assign(status, {
        inProgress: true,
        reason,
        folderName: "",
        processed: 0,
        total: 0,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        lastError: "",
    });
    console.log(`[gallery-sync] Start (${reason})...`);

    try {
        const album = galleryDb.getGalleryFolder();
        if (!album) {
            status.lastMessage = "Nie wskazano jeszcze folderu galerii";
            return { added: 0, updated: 0, removed: 0, failed: 0 };
        }

        const totals = { added: 0, updated: 0, removed: 0, failed: 0 };
        try {
            const result = await syncAlbum(album);
            for (const key of Object.keys(totals)) totals[key] += result[key];
        } catch (error) {
            galleryDb.setAlbumSyncResult(album.id, error.message);
            totals.failed += 1;
            status.lastError = error.message;
            console.error(`[gallery-sync] Folder „${album.title}”:`, error.message);
        }
        await pruneStrayAlbumDirs();

        status.lastMessage = [
            `nowe zdjęcia: ${totals.added}`,
            `zaktualizowane: ${totals.updated}`,
            `usunięte: ${totals.removed}`,
            totals.failed ? `błędy: ${totals.failed}` : "",
        ]
            .filter(Boolean)
            .join(", ");
        console.log(`[gallery-sync] Zakończono (${reason}): ${status.lastMessage}.`);
        return totals;
    } catch (error) {
        status.lastError = error.message;
        throw error;
    } finally {
        status.inProgress = false;
        status.folderName = "";
        status.finishedAt = new Date().toISOString();
    }
}

function startGallerySync(reason) {
    return runGallerySync(reason).catch((error) =>
        console.error(`[gallery-sync] Błąd (${reason}):`, error.message),
    );
}

function scheduleDailyGallerySync() {
    if (!drive.hasDriveCredentials()) {
        console.log("[gallery-sync] Harmonogram wyłączony: brak danych konta Google.");
        return;
    }

    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(GALLERY_SYNC_DAILY_HOUR, GALLERY_SYNC_DAILY_MINUTE, 0, 0);
    if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);
    const delay = Math.max(1000, nextRun.getTime() - now.getTime());

    console.log(
        `[gallery-sync] Zaplanowano codziennie o ${String(GALLERY_SYNC_DAILY_HOUR).padStart(2, "0")}:${String(GALLERY_SYNC_DAILY_MINUTE).padStart(2, "0")}. Najbliższa synchronizacja: ${nextRun.toISOString()}.`,
    );

    setTimeout(() => {
        startGallerySync("daily-schedule");
        setInterval(() => startGallerySync("daily-interval"), ONE_DAY_MS);
    }, delay);
}

module.exports = {
    getSyncStatus,
    photoUrls,
    setGalleryFolder,
    runGallerySync,
    startGallerySync,
    scheduleDailyGallerySync,
};
