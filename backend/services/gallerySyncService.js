import { syncGalleryFromDrive } from "../scripts/sync-gallery-from-drive.js";

const GALLERY_DRIVE_FOLDER_INPUT =
    process.env.DRIVE_GALLERY_FOLDER_ID ||
    process.env.GALLERY_DRIVE_FOLDER_ID ||
    process.env.GALLERY_DRIVE_FOLDER_URL;

const parsedDailyHour = Number(process.env.GALLERY_SYNC_DAILY_HOUR ?? "3");
const GALLERY_SYNC_DAILY_HOUR = Number.isFinite(parsedDailyHour)
    ? Math.min(23, Math.max(0, Math.trunc(parsedDailyHour)))
    : 3;

const parsedDailyMinute = Number(process.env.GALLERY_SYNC_DAILY_MINUTE ?? "0");
const GALLERY_SYNC_DAILY_MINUTE = Number.isFinite(parsedDailyMinute)
    ? Math.min(59, Math.max(0, Math.trunc(parsedDailyMinute)))
    : 0;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let gallerySyncInProgress = false;

async function runGallerySync(reason) {
    if (!GALLERY_DRIVE_FOLDER_INPUT) {
        console.log(
            "[gallery-sync] Pominięto: brak DRIVE_GALLERY_FOLDER_ID lub GALLERY_DRIVE_FOLDER_ID.",
        );
        return;
    }

    if (gallerySyncInProgress) {
        console.log(
            `[gallery-sync] Pominięto (${reason}): poprzednia synchronizacja nadal trwa.`,
        );
        return;
    }

    gallerySyncInProgress = true;
    console.log(`[gallery-sync] Start (${reason})...`);

    try {
        const result = await syncGalleryFromDrive(GALLERY_DRIVE_FOLDER_INPUT);
        console.log(
            `[gallery-sync] Zakończono (${reason}): ${result.filesCount} zdjęć, pobrano/zaktualizowano ${result.downloadedCount}, bez zmian ${result.skippedCount}, usunięto ${result.removedCount}, folder ${result.folderId}.`,
        );
    } catch (error) {
        console.error(`[gallery-sync] Błąd (${reason}):`, error.message);
    } finally {
        gallerySyncInProgress = false;
    }
}

function getNextDailySyncDate(now = new Date()) {
    const nextRun = new Date(now);
    nextRun.setHours(GALLERY_SYNC_DAILY_HOUR, GALLERY_SYNC_DAILY_MINUTE, 0, 0);

    if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun;
}

function scheduleDailyGallerySync() {
    if (!GALLERY_DRIVE_FOLDER_INPUT) {
        console.log(
            "[gallery-sync] Harmonogram wyłączony: brak konfiguracji folderu galerii.",
        );
        return;
    }

    const now = new Date();
    const nextRun = getNextDailySyncDate(now);
    const delay = Math.max(1000, nextRun.getTime() - now.getTime());

    console.log(
        `[gallery-sync] Zaplanowano codziennie o ${String(GALLERY_SYNC_DAILY_HOUR).padStart(2, "0")}:${String(GALLERY_SYNC_DAILY_MINUTE).padStart(2, "0")}. Najbliższa synchronizacja: ${nextRun.toISOString()}.`,
    );

    setTimeout(async () => {
        await runGallerySync("daily-schedule");

        setInterval(() => {
            runGallerySync("daily-interval").catch(() => {});
        }, ONE_DAY_MS);
    }, delay);
}

function isGallerySyncInProgress() {
    return gallerySyncInProgress;
}

export { runGallerySync, scheduleDailyGallerySync, isGallerySyncInProgress };
