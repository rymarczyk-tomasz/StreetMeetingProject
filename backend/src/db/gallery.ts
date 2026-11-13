const db = require("./database");

// The gallery is the photos of one Google Drive folder (Admin → Galeria). The folder
// is stored as the single row of gallery_albums (the table predates this: it used to
// hold one album per folder). Photos are downloaded once and stored locally as WEBP
// thumbnails; the Drive file id + signature tells the sync whether a photo changed.
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
const findAlbumByFolderStmt = db.prepare(
    `SELECT * FROM gallery_albums WHERE drive_folder_id = ?`,
);
const insertAlbumStmt = db.prepare(`
    INSERT INTO gallery_albums (title, year, drive_folder_id) VALUES (@title, NULL, @driveFolderId)
`);
const renameAlbumStmt = db.prepare(`UPDATE gallery_albums SET title = ? WHERE id = ?`);
const setAlbumSyncResultStmt = db.prepare(`
    UPDATE gallery_albums
    SET last_synced_at = datetime('now'), last_sync_error = ?
    WHERE id = ?
`);
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

// Databases from the time of albums: keep the newest one (the first), drop the rest.
// Their local files are cleaned up by the next sync (sync.ts, pruneStrayAlbumDirs).
function keepOnlyNewestAlbum() {
    const newest = listAlbumsStmt.get();
    if (!newest) return;
    db.prepare("DELETE FROM gallery_photos WHERE album_id != ?").run(newest.id);
    db.prepare("DELETE FROM gallery_albums WHERE id != ?").run(newest.id);
}
keepOnlyNewestAlbum();

// the folder the gallery shows, or undefined when none was chosen yet
function getGalleryFolder() {
    return listAlbumsStmt.get();
}

function listAlbums() {
    return listAlbumsStmt.all();
}

function findAlbumByFolder(driveFolderId) {
    return findAlbumByFolderStmt.get(driveFolderId);
}

function createGalleryFolder({ title, driveFolderId }) {
    const result = insertAlbumStmt.run({ title, driveFolderId });
    return db
        .prepare(`SELECT ${ALBUM_COLUMNS} FROM gallery_albums WHERE id = ?`)
        .get(result.lastInsertRowid);
}

function renameGalleryFolder(id, title) {
    renameAlbumStmt.run(title, id);
}

function setAlbumSyncResult(id, error = null) {
    setAlbumSyncResultStmt.run(error, id);
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
    keepOnlyNewestAlbum,
    getGalleryFolder,
    listAlbums,
    findAlbumByFolder,
    createGalleryFolder,
    renameGalleryFolder,
    setAlbumSyncResult,
    deleteAlbum,
    listPhotos,
    findPhoto,
    upsertPhoto,
    setPhotoOrder,
    setPhotoHidden,
    deletePhoto,
};
