const db = require("./database");

// Albums mirror Google Drive folders (one folder = one album, e.g. "StreetShow 2025").
// Photos are downloaded once and stored locally as WEBP thumbnails; the Drive file
// id + signature tells the sync whether a photo changed.
db.exec(`
    CREATE TABLE IF NOT EXISTS gallery_albums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        year INTEGER,
        description TEXT NOT NULL DEFAULT '',
        drive_folder_id TEXT NOT NULL UNIQUE,
        cover_photo_id INTEGER,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_visible INTEGER NOT NULL DEFAULT 1,
        last_synced_at TEXT,
        last_sync_error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gallery_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        album_id INTEGER NOT NULL REFERENCES gallery_albums(id) ON DELETE CASCADE,
        drive_file_id TEXT NOT NULL,
        name TEXT NOT NULL,
        signature TEXT NOT NULL,
        version TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_hidden INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (album_id, drive_file_id)
    );

    CREATE INDEX IF NOT EXISTS idx_gallery_photos_album ON gallery_photos(album_id, sort_order);
`);

const ALBUM_COLUMNS = `
    gallery_albums.*,
    (SELECT COUNT(*) FROM gallery_photos WHERE album_id = gallery_albums.id) AS photo_count,
    (SELECT COUNT(*) FROM gallery_photos WHERE album_id = gallery_albums.id AND is_hidden = 0) AS visible_photo_count
`;

const listAlbumsStmt = db.prepare(`
    SELECT ${ALBUM_COLUMNS} FROM gallery_albums
    ORDER BY sort_order, year DESC, id DESC
`);
const findAlbumStmt = db.prepare(
    `SELECT ${ALBUM_COLUMNS} FROM gallery_albums WHERE id = ?`,
);
const findAlbumByFolderStmt = db.prepare(
    `SELECT * FROM gallery_albums WHERE drive_folder_id = ?`,
);
const insertAlbumStmt = db.prepare(`
    INSERT INTO gallery_albums (title, year, drive_folder_id, sort_order)
    VALUES (@title, @year, @driveFolderId,
        (SELECT COALESCE(MIN(sort_order), 0) - 1 FROM gallery_albums))
`);
const updateAlbumStmt = db.prepare(`
    UPDATE gallery_albums
    SET title = @title, year = @year, description = @description,
        is_visible = @isVisible, cover_photo_id = @coverPhotoId
    WHERE id = @id
`);
const setAlbumOrderStmt = db.prepare(
    `UPDATE gallery_albums SET sort_order = ? WHERE id = ?`,
);
const setAlbumSyncResultStmt = db.prepare(`
    UPDATE gallery_albums
    SET last_synced_at = datetime('now'), last_sync_error = ?
    WHERE id = ?
`);
const setAlbumCoverStmt = db.prepare(
    `UPDATE gallery_albums SET cover_photo_id = ? WHERE id = ?`,
);
const deleteAlbumStmt = db.prepare(`DELETE FROM gallery_albums WHERE id = ?`);

const listPhotosStmt = db.prepare(
    `SELECT * FROM gallery_photos WHERE album_id = ? ORDER BY sort_order, id`,
);
const findPhotoStmt = db.prepare(
    `SELECT * FROM gallery_photos WHERE id = ? AND album_id = ?`,
);
const upsertPhotoStmt = db.prepare(`
    INSERT INTO gallery_photos (album_id, drive_file_id, name, signature, version, width, height, sort_order)
    VALUES (@albumId, @driveFileId, @name, @signature, @version, @width, @height, @sortOrder)
    ON CONFLICT(album_id, drive_file_id) DO UPDATE SET
        name = excluded.name, signature = excluded.signature, version = excluded.version,
        width = excluded.width, height = excluded.height, sort_order = excluded.sort_order
`);
const setPhotoOrderStmt = db.prepare(
    `UPDATE gallery_photos SET sort_order = ?, name = ? WHERE id = ?`,
);
const setPhotoHiddenStmt = db.prepare(
    `UPDATE gallery_photos SET is_hidden = ? WHERE id = ?`,
);
const deletePhotoStmt = db.prepare(`DELETE FROM gallery_photos WHERE id = ?`);

function listAlbums() {
    return listAlbumsStmt.all();
}

function findAlbum(id) {
    return findAlbumStmt.get(id);
}

function findAlbumByFolder(driveFolderId) {
    return findAlbumByFolderStmt.get(driveFolderId);
}

function createAlbum({ title, year, driveFolderId }) {
    const result = insertAlbumStmt.run({ title, year: year || null, driveFolderId });
    return findAlbum(result.lastInsertRowid);
}

function updateAlbum(id, { title, year, description, isVisible, coverPhotoId }) {
    updateAlbumStmt.run({
        id,
        title,
        year: year || null,
        description: description || "",
        isVisible: isVisible ? 1 : 0,
        coverPhotoId: coverPhotoId || null,
    });
    return findAlbum(id);
}

const reorderAlbums = db.transaction((ids) => {
    ids.forEach((id, index) => setAlbumOrderStmt.run(index, id));
});

function setAlbumSyncResult(id, error = null) {
    setAlbumSyncResultStmt.run(error, id);
}

function setAlbumCover(id, photoId) {
    setAlbumCoverStmt.run(photoId, id);
}

function deleteAlbum(id) {
    deleteAlbumStmt.run(id);
}

function listPhotos(albumId) {
    return listPhotosStmt.all(albumId);
}

function findPhoto(albumId, photoId) {
    return findPhotoStmt.get(photoId, albumId);
}

function upsertPhoto(photo) {
    upsertPhotoStmt.run(photo);
}

function setPhotoOrder(photoId, sortOrder, name) {
    setPhotoOrderStmt.run(sortOrder, name, photoId);
}

function setPhotoHidden(photoId, isHidden) {
    setPhotoHiddenStmt.run(isHidden ? 1 : 0, photoId);
}

function deletePhoto(photoId) {
    deletePhotoStmt.run(photoId);
}

module.exports = {
    listAlbums,
    findAlbum,
    findAlbumByFolder,
    createAlbum,
    updateAlbum,
    reorderAlbums,
    setAlbumSyncResult,
    setAlbumCover,
    deleteAlbum,
    listPhotos,
    findPhoto,
    upsertPhoto,
    setPhotoOrder,
    setPhotoHidden,
    deletePhoto,
};
