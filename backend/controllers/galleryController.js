import { syncGalleryFromDrive } from "../scripts/sync-gallery-from-drive.js";
import { isGallerySyncInProgress } from "../services/gallerySyncService.js";

const GALLERY_DRIVE_FOLDER_INPUT =
    process.env.DRIVE_GALLERY_FOLDER_ID ||
    process.env.GALLERY_DRIVE_FOLDER_ID ||
    process.env.GALLERY_DRIVE_FOLDER_URL;

async function syncGallery(_req, res) {
    if (!GALLERY_DRIVE_FOLDER_INPUT) {
        return res.status(400).json({
            message:
                "Brak konfiguracji folderu galerii (DRIVE_GALLERY_FOLDER_ID/GALLERY_DRIVE_FOLDER_ID).",
        });
    }

    if (isGallerySyncInProgress()) {
        return res.status(409).json({
            message: "Synchronizacja galerii już trwa.",
        });
    }

    try {
        const result = await syncGalleryFromDrive(GALLERY_DRIVE_FOLDER_INPUT);
        return res.json({
            message: "Synchronizacja galerii zakończona.",
            filesCount: result.filesCount,
            downloadedCount: result.downloadedCount,
            skippedCount: result.skippedCount,
            removedCount: result.removedCount,
            folderId: result.folderId,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Błąd synchronizacji galerii.",
            error: error.message,
        });
    }
}

export { syncGallery };
