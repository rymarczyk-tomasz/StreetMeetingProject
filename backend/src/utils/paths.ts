const path = require("path");

// Resolved from process.cwd() (always backend/ via npm scripts / PM2), like the database.
const SUBMISSIONS_UPLOAD_ROOT = path.join(process.cwd(), "uploads/submissions");
const CONTENT_UPLOAD_ROOT = path.join(process.cwd(), "uploads/content");

function getUserSubmissionsDir(userId) {
    return path.join(SUBMISSIONS_UPLOAD_ROOT, String(Number(userId)));
}

module.exports = {
    SUBMISSIONS_UPLOAD_ROOT,
    CONTENT_UPLOAD_ROOT,
    getUserSubmissionsDir,
};
