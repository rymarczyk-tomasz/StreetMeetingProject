const db = require("./database");

const insertStmt = db.prepare(`
    INSERT INTO submissions (
        user_id, first_name, last_name, phone, license_plate,
        car_brand, car_description, photos
    ) VALUES (
        @userId, @firstName, @lastName, @phone, @licensePlate,
        @carBrand, @carDescription, @photos
    )
`);

const findByIdStmt = db.prepare(`SELECT * FROM submissions WHERE id = ?`);
const listByUserStmt = db.prepare(
    `SELECT * FROM submissions WHERE user_id = ? ORDER BY created_at DESC`,
);
const listAllStmt = db.prepare(`
    SELECT submissions.*, users.email AS user_email
    FROM submissions
    JOIN users ON users.id = submissions.user_id
    ORDER BY submissions.created_at DESC
`);
const updateStatusStmt = db.prepare(`
    UPDATE submissions
    SET status = ?, admin_note = ?, updated_at = datetime('now')
    WHERE id = ?
`);
const countPendingForUserStmt = db.prepare(
    `SELECT COUNT(*) AS count FROM submissions WHERE user_id = ? AND status = 'pending'`,
);

function createSubmission(data) {
    const result = insertStmt.run({
        ...data,
        photos: JSON.stringify(data.photos || []),
    });
    return findByIdStmt.get(result.lastInsertRowid);
}

function findSubmissionById(id) {
    return findByIdStmt.get(id);
}

function listSubmissionsByUser(userId) {
    return listByUserStmt.all(userId);
}

function listAllSubmissions() {
    return listAllStmt.all();
}

function updateSubmissionStatus(id, status, adminNote) {
    updateStatusStmt.run(status, adminNote || null, id);
    return findByIdStmt.get(id);
}

function countPendingForUser(userId) {
    return countPendingForUserStmt.get(userId).count;
}

module.exports = {
    createSubmission,
    findSubmissionById,
    listSubmissionsByUser,
    listAllSubmissions,
    updateSubmissionStatus,
    countPendingForUser,
};
