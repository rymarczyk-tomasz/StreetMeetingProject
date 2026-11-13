const express = require("express");

const galleryDb = require("../db/gallery");
const auditLogDb = require("../db/auditLog");
const drive = require("./drive");
const gallerySync = require("./sync");

// The gallery is the photos of one Google Drive folder, chosen in Admin → Galeria.

function toPublicPhoto(photo) {
    return {
        id: photo.id,
        name: photo.name,
        width: photo.width,
        height: photo.height,
        ...gallerySync.photoUrls(photo),
    };
}

function toAdminFolder(folder) {
    return {
        id: folder.id,
        name: folder.title,
        driveUrl: `https://drive.google.com/drive/folders/${folder.drive_folder_id}`,
        photoCount: folder.visible_photo_count,
        totalPhotoCount: folder.photo_count,
        lastSyncedAt: folder.last_synced_at,
        lastSyncError: folder.last_sync_error,
    };
}

// ---- Public -------------------------------------------------------------

const publicRouter = express.Router();

publicRouter.get("/", (req, res) => {
    const folder = galleryDb.getGalleryFolder();
    const photos = folder
        ? galleryDb
              .listPhotos(folder.id)
              .filter((photo) => !photo.is_hidden)
              .map(toPublicPhoto)
        : [];
    res.set("Cache-Control", "public, max-age=300");
    res.json({ photos });
});

// ---- Admin (mounted behind authenticate + requireRole("admin")) ----------

const adminRouter = express.Router();

function audit(req, action, details = {}) {
    auditLogDb.createAuditEntry({
        adminId: req.user.sub,
        action,
        targetType: "gallery",
        targetId: null,
        details,
    });
}

adminRouter.get("/", (req, res) => {
    const folder = galleryDb.getGalleryFolder();
    res.json({
        folder: folder ? toAdminFolder(folder) : null,
        photos: folder
            ? galleryDb.listPhotos(folder.id).map((photo) => ({
                  ...toPublicPhoto(photo),
                  isHidden: !!photo.is_hidden,
              }))
            : [],
        credentialsConfigured: drive.hasDriveCredentials(),
        serviceAccountEmail: process.env.GOOGLE_CLIENT_EMAIL || "",
        sync: gallerySync.getSyncStatus(),
    });
});

adminRouter.get("/sync-status", (req, res) => {
    res.json({ sync: gallerySync.getSyncStatus() });
});

adminRouter.post("/sync", (req, res) => {
    if (!drive.hasDriveCredentials()) {
        return res.status(400).json({
            message: "Brak danych konta serwisowego Google w backend/config/.env.",
        });
    }
    if (!galleryDb.getGalleryFolder()) {
        return res.status(400).json({ message: "Najpierw wskaż folder ze zdjęciami." });
    }
    if (gallerySync.getSyncStatus().inProgress) {
        return res.status(409).json({ message: "Synchronizacja galerii już trwa." });
    }

    gallerySync.startGallerySync("admin-panel");
    audit(req, "gallery.synced");
    res.status(202).json({
        message: "Synchronizacja wystartowała. Postęp widać poniżej.",
        sync: gallerySync.getSyncStatus(),
    });
});

// Choosing another folder replaces the photos; the download starts right away.
adminRouter.put("/folder", async (req, res) => {
    if (!drive.hasDriveCredentials()) {
        return res.status(400).json({
            message: "Brak danych konta serwisowego Google w backend/config/.env.",
        });
    }
    if (gallerySync.getSyncStatus().inProgress) {
        return res.status(409).json({ message: "Poczekaj na koniec synchronizacji." });
    }

    try {
        const previous = galleryDb.getGalleryFolder();
        const folder = await gallerySync.setGalleryFolder(req.body?.driveUrl);
        const changed = !previous || previous.id !== folder.id;
        audit(req, "gallery.folder_set", { folder: folder.title });
        gallerySync.startGallerySync(changed ? "folder-changed" : "admin-panel");
        res.json({
            folder: toAdminFolder(folder),
            message: changed
                ? `Folder „${folder.title}” zapisany. Zdjęcia są pobierane — postęp widać poniżej.`
                : `Folder „${folder.title}” jest już ustawiony. Odświeżam zdjęcia.`,
            sync: gallerySync.getSyncStatus(),
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

adminRouter.patch("/photos/:photoId", (req, res) => {
    const folder = galleryDb.getGalleryFolder();
    const photo = folder && galleryDb.findPhoto(folder.id, Number(req.params.photoId));
    if (!photo) return res.status(404).json({ message: "Nie znaleziono zdjęcia." });

    galleryDb.setPhotoHidden(photo.id, Boolean(req.body?.isHidden));
    res.json({ ok: true });
});

module.exports = { publicRouter, adminRouter };
