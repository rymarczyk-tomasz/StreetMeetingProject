const path = require("path");

// Resolved from process.cwd() (always backend/ via npm scripts / PM2), like the database.
const SUBMISSIONS_UPLOAD_ROOT = path.join(process.cwd(), "uploads/submissions");
const VEHICLES_UPLOAD_ROOT = path.join(process.cwd(), "uploads/vehicles");
const CONTENT_UPLOAD_ROOT = path.join(process.cwd(), "uploads/content");
const GALLERY_UPLOAD_ROOT = path.join(process.cwd(), "uploads/gallery");
// Resized public copies of submission photos for the "Auta strefy Select" page.
// Served only through /api/showcase (which re-checks consent), never statically.
const SHOWCASE_UPLOAD_ROOT = path.join(process.cwd(), "uploads/showcase");

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
    SHOWCASE_UPLOAD_ROOT,
    getUserSubmissionsDir,
    getUserVehiclesDir,
    getAlbumDir,
};
