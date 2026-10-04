const path = require("path");

// Resolved from process.cwd() (always backend/ via npm scripts / PM2), like the database.
const SUBMISSIONS_UPLOAD_ROOT = path.join(process.cwd(), "uploads/submissions");
const VEHICLES_UPLOAD_ROOT = path.join(process.cwd(), "uploads/vehicles");
const CONTENT_UPLOAD_ROOT = path.join(process.cwd(), "uploads/content");
const GALLERY_UPLOAD_ROOT = path.join(process.cwd(), "uploads/gallery");

function getUserSubmissionsDir(userId) {
    return path.join(SUBMISSIONS_UPLOAD_ROOT, String(Number(userId)));
}

function getUserVehiclesDir(userId) {
    return path.join(VEHICLES_UPLOAD_ROOT, String(Number(userId)));
}

function getAlbumDir(albumId) {
    return path.join(GALLERY_UPLOAD_ROOT, String(Number(albumId)));
}

module.exports = {
    SUBMISSIONS_UPLOAD_ROOT,
    VEHICLES_UPLOAD_ROOT,
    CONTENT_UPLOAD_ROOT,
    GALLERY_UPLOAD_ROOT,
    getUserSubmissionsDir,
    getUserVehiclesDir,
    getAlbumDir,
};
