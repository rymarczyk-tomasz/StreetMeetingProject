const { syncGalleryFromDrive } = require("../../scripts/sync-gallery-from-drive");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const GALLERY_DRIVE_FOLDER_INPUT =
    process.env.DRIVE_GALLERY_FOLDER_ID ||
    process.env.GALLERY_DRIVE_FOLDER_ID ||
    process.env.GALLERY_DRIVE_FOLDER_URL;

function readClampedInt(value, fallback, min, max) {
    const parsed = Number(value ?? fallback);
    return Number.isFinite(parsed)
        ? Math.min(max, Math.max(min, Math.trunc(parsed)))
        : fallback;
}

const GALLERY_SYNC_DAILY_HOUR = readClampedInt(
    process.env.GALLERY_SYNC_DAILY_HOUR,
    3,
    0,
    23,
);
const GALLERY_SYNC_DAILY_MINUTE = readClampedInt(
    process.env.GALLERY_SYNC_DAILY_MINUTE,
    0,
    0,
    59,
);

let gallerySyncInProgress = false;

function isGallerySyncConfigured() {
    return Boolean(GALLERY_DRIVE_FOLDER_INPUT);
}

function isGallerySyncInProgress() {
    return gallerySyncInProgress;
}

// Returns the sync result, or throws. Callers check isGallerySyncInProgress() first.
async function runGallerySync(reason) {
    if (!GALLERY_DRIVE_FOLDER_INPUT) {
        throw new Error(
            "Brak konfiguracji folderu galerii (DRIVE_GALLERY_FOLDER_ID/GALLERY_DRIVE_FOLDER_ID).",
        );
    }

    if (gallerySyncInProgress) {
        throw new Error("Synchronizacja galerii już trwa.");
    }

    gallerySyncInProgress = true;
    console.log(`[gallery-sync] Start (${reason})...`);

    try {
        const result = await syncGalleryFromDrive(GALLERY_DRIVE_FOLDER_INPUT);
        console.log(
            `[gallery-sync] Zakończono (${reason}): ${result.filesCount} zdjęć, pobrano/zaktualizowano ${result.downloadedCount}, bez zmian ${result.skippedCount}, usunięto ${result.removedCount}, folder ${result.folderId}.`,
        );
        return result;
    } finally {
        gallerySyncInProgress = false;
    }
}

function runScheduledSync(reason) {
    runGallerySync(reason).catch((error) =>
        console.error(`[gallery-sync] Błąd (${reason}):`, error.message),
    );
}

function scheduleDailyGallerySync() {
    if (!GALLERY_DRIVE_FOLDER_INPUT) {
        console.log(
            "[gallery-sync] Harmonogram wyłączony: brak konfiguracji folderu galerii.",
        );
        return;
    }

    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(GALLERY_SYNC_DAILY_HOUR, GALLERY_SYNC_DAILY_MINUTE, 0, 0);
    if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
    }
    const delay = Math.max(1000, nextRun.getTime() - now.getTime());

    console.log(
        `[gallery-sync] Zaplanowano codziennie o ${String(GALLERY_SYNC_DAILY_HOUR).padStart(2, "0")}:${String(GALLERY_SYNC_DAILY_MINUTE).padStart(2, "0")}. Najbliższa synchronizacja: ${nextRun.toISOString()}.`,
    );

    setTimeout(() => {
        runScheduledSync("daily-schedule");
        setInterval(() => runScheduledSync("daily-interval"), ONE_DAY_MS);
    }, delay);
}

module.exports = {
    isGallerySyncConfigured,
    isGallerySyncInProgress,
    runGallerySync,
    scheduleDailyGallerySync,
};
