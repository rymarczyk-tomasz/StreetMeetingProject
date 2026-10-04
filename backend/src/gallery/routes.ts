const express = require("express");

const galleryDb = require("../db/gallery");
const auditLogDb = require("../db/auditLog");
const drive = require("./drive");
const gallerySync = require("./sync");
const { normalizeText } = require("../utils/validation");

function toPublicPhoto(photo) {
    return {
        id: photo.id,
        name: photo.name,
        width: photo.width,
        height: photo.height,
        ...gallerySync.photoUrls(photo),
    };
}

function coverUrl(album) {
    if (!album.cover_photo_id) return null;
    const cover = galleryDb.findPhoto(album.id, album.cover_photo_id);
    return cover ? gallerySync.photoUrls(cover).thumb : null;
}

function toPublicAlbum(album) {
    return {
        id: album.id,
        title: album.title,
        year: album.year,
        description: album.description,
        photoCount: album.visible_photo_count,
        coverUrl: coverUrl(album),
    };
}

function toAdminAlbum(album) {
    return {
        ...toPublicAlbum(album),
        isVisible: !!album.is_visible,
        totalPhotoCount: album.photo_count,
        coverPhotoId: album.cover_photo_id,
        driveFolderId: album.drive_folder_id,
        driveUrl: `https://drive.google.com/drive/folders/${album.drive_folder_id}`,
        lastSyncedAt: album.last_synced_at,
        lastSyncError: album.last_sync_error,
    };
}

// ---- Public -------------------------------------------------------------

const publicRouter = express.Router();

publicRouter.get("/albums", (req, res) => {
    const albums = galleryDb
        .listAlbums()
        .filter((album) => album.is_visible && album.visible_photo_count > 0)
        .map(toPublicAlbum);
    res.set("Cache-Control", "public, max-age=300");
    res.json({ albums });
});

publicRouter.get("/albums/:id", (req, res) => {
    const album = galleryDb.findAlbum(Number(req.params.id));
    if (!album || !album.is_visible) {
        return res.status(404).json({ message: "Nie znaleziono albumu." });
    }

    const photos = galleryDb
        .listPhotos(album.id)
        .filter((photo) => !photo.is_hidden)
        .map(toPublicPhoto);
    res.set("Cache-Control", "public, max-age=300");
    res.json({ album: toPublicAlbum(album), photos });
});

// ---- Admin (mounted behind authenticate + requireRole("admin")) ----------

const adminRouter = express.Router();

function audit(req, action, targetId, details = {}) {
    auditLogDb.createAuditEntry({
        adminId: req.user.sub,
        action,
        targetType: "gallery",
        targetId,
        details,
    });
}

function findAlbumOr404(req, res) {
    const album = galleryDb.findAlbum(Number(req.params.id));
    if (!album) res.status(404).json({ message: "Nie znaleziono albumu." });
    return album;
}

adminRouter.get("/", (req, res) => {
    res.json({
        albums: galleryDb.listAlbums().map(toAdminAlbum),
        rootFolderConfigured: Boolean(drive.getRootFolderId()),
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
    if (gallerySync.getSyncStatus().inProgress) {
        return res.status(409).json({ message: "Synchronizacja galerii już trwa." });
    }

    const albumId = req.body?.albumId ? Number(req.body.albumId) : null;
    if (albumId && !galleryDb.findAlbum(albumId)) {
        return res.status(404).json({ message: "Nie znaleziono albumu." });
    }

    gallerySync.startGallerySync("admin-panel", { albumId });
    audit(req, "gallery.synced", albumId);
    res.status(202).json({
        message: "Synchronizacja wystartowała. Postęp widać poniżej.",
        sync: gallerySync.getSyncStatus(),
    });
});

adminRouter.post("/", async (req, res) => {
    try {
        const album = await gallerySync.createAlbumFromLink(req.body?.driveUrl, {
            title: normalizeText(req.body?.title).slice(0, 120),
            year: Number(req.body?.year) || null,
        });
        audit(req, "gallery.album_created", album.id, { title: album.title });
        res.status(201).json({
            album: toAdminAlbum(album),
            message: "Album dodany. Uruchom synchronizację, aby pobrać zdjęcia.",
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

adminRouter.post("/reorder", (req, res) => {
    const ids = Array.isArray(req.body?.ids)
        ? req.body.ids.map(Number).filter(Number.isInteger)
        : [];
    if (!ids.length) return res.status(400).json({ message: "Brak kolejności albumów." });

    galleryDb.reorderAlbums(ids);
    res.json({ albums: galleryDb.listAlbums().map(toAdminAlbum) });
});

adminRouter.patch("/:id", (req, res) => {
    const album = findAlbumOr404(req, res);
    if (!album) return;

    const title = normalizeText(req.body?.title).slice(0, 120);
    const year = req.body?.year ? Number(req.body.year) : null;
    const coverPhotoId = req.body?.coverPhotoId ? Number(req.body.coverPhotoId) : null;

    if (!title) return res.status(400).json({ message: "Podaj nazwę albumu." });
    if (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
        return res.status(400).json({ message: "Rok albumu musi być liczbą, np. 2025." });
    }
    if (coverPhotoId && !galleryDb.findPhoto(album.id, coverPhotoId)) {
        return res.status(400).json({ message: "Okładka musi być zdjęciem z tego albumu." });
    }

    const updated = galleryDb.updateAlbum(album.id, {
        title,
        year,
        description: normalizeText(req.body?.description).slice(0, 1000),
        isVisible: Boolean(req.body?.isVisible),
        coverPhotoId: coverPhotoId || album.cover_photo_id,
    });
    audit(req, "gallery.album_updated", album.id, { title });
    res.json({ album: toAdminAlbum(updated) });
});

adminRouter.delete("/:id", async (req, res) => {
    const album = findAlbumOr404(req, res);
    if (!album) return;
    if (gallerySync.getSyncStatus().inProgress) {
        return res.status(409).json({ message: "Poczekaj na koniec synchronizacji." });
    }

    await gallerySync.deleteAlbumWithFiles(album.id);
    audit(req, "gallery.album_deleted", album.id, { title: album.title });
    res.json({
        message: drive.getRootFolderId()
            ? "Album usunięty ze strony. Jeśli jego folder nadal jest w folderze głównym galerii, wróci przy następnej synchronizacji — wtedy po prostu go ukryj."
            : "Album usunięty ze strony (zdjęcia na Dysku Google zostały nietknięte).",
    });
});

adminRouter.get("/:id/photos", (req, res) => {
    const album = findAlbumOr404(req, res);
    if (!album) return;

    res.json({
        album: toAdminAlbum(album),
        photos: galleryDb.listPhotos(album.id).map((photo) => ({
            ...toPublicPhoto(photo),
            isHidden: !!photo.is_hidden,
        })),
    });
});

adminRouter.patch("/:id/photos/:photoId", (req, res) => {
    const album = findAlbumOr404(req, res);
    if (!album) return;

    const photo = galleryDb.findPhoto(album.id, Number(req.params.photoId));
    if (!photo) return res.status(404).json({ message: "Nie znaleziono zdjęcia." });

    galleryDb.setPhotoHidden(photo.id, Boolean(req.body?.isHidden));
    if (req.body?.isHidden && album.cover_photo_id === photo.id) {
        const nextCover = galleryDb
            .listPhotos(album.id)
            .find((candidate) => !candidate.is_hidden);
        galleryDb.setAlbumCover(album.id, nextCover?.id || null);
    }
    res.json({ ok: true });
});

module.exports = { publicRouter, adminRouter };
