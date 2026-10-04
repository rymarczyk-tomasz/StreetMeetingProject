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
const updatePaymentStatusStmt = db.prepare(`
    UPDATE submissions
    SET payment_status = ?, updated_at = datetime('now')
    WHERE id = ?
`);
const updateStatusStmt = db.prepare(`
    UPDATE submissions
    SET status = ?, admin_note = ?, updated_at = datetime('now')
    WHERE id = ?
`);
const updateInternalNoteStmt = db.prepare(`
    UPDATE submissions SET internal_note = ? WHERE id = ?
`);
const updateDetailsStmt = db.prepare(`
    UPDATE submissions
    SET first_name = @firstName, last_name = @lastName, phone = @phone,
        license_plate = @licensePlate, car_brand = @carBrand,
        car_description = @carDescription, updated_at = datetime('now')
    WHERE id = @id
`);
const deleteStmt = db.prepare(`DELETE FROM submissions WHERE id = ?`);
const countActiveForUserStmt = db.prepare(
    `SELECT COUNT(*) AS count FROM submissions WHERE user_id = ? AND status != 'rejected'`,
);
const countApprovedStmt = db.prepare(
    `SELECT COUNT(*) AS count FROM submissions WHERE status = 'approved'`,
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

function listAllSubmissions({
    status,
    paymentStatus,
    search,
}: { status?: string; paymentStatus?: string; search?: string } = {}) {
    const conditions = [];
    const parameters = [];

    if (status) {
        conditions.push("submissions.status = ?");
        parameters.push(status);
    }

    if (paymentStatus) {
        conditions.push("submissions.payment_status = ?");
        parameters.push(paymentStatus);
    }

    if (search) {
        conditions.push(`(
            submissions.license_plate LIKE ? OR
            submissions.car_brand LIKE ? OR
            submissions.first_name LIKE ? OR
            submissions.last_name LIKE ? OR
            users.email LIKE ?
        )`);
        const pattern = `%${search}%`;
        parameters.push(pattern, pattern, pattern, pattern, pattern);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    return db
        .prepare(
            `
            SELECT submissions.*, users.email AS user_email
            FROM submissions
            JOIN users ON users.id = submissions.user_id
            ${where}
            ORDER BY submissions.created_at DESC
        `,
        )
        .all(...parameters);
}

function updateSubmissionStatus(id, status, adminNote) {
    updateStatusStmt.run(status, adminNote || null, id);
    return findByIdStmt.get(id);
}

function updateSubmissionPaymentStatus(id, paymentStatus) {
    updatePaymentStatusStmt.run(paymentStatus, id);
    return findByIdStmt.get(id);
}

function updateSubmissionInternalNote(id, internalNote) {
    updateInternalNoteStmt.run(internalNote || null, id);
    return findByIdStmt.get(id);
}

function updateSubmissionDetails(id, details) {
    updateDetailsStmt.run({ id, ...details });
    return findByIdStmt.get(id);
}

function deleteSubmission(id) {
    deleteStmt.run(id);
}

// Rejected submissions don't count, so a participant can re-apply with another car.
function countActiveForUser(userId) {
    return countActiveForUserStmt.get(userId).count;
}

function countApproved() {
    return countApprovedStmt.get().count;
}

function getSubmissionStats() {
    return db
        .prepare(
            `
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
                SUM(CASE WHEN status = 'approved' AND payment_status = 'unpaid' THEN 1 ELSE 0 END) AS unpaid,
                SUM(CASE WHEN status = 'approved' AND payment_status = 'verification' THEN 1 ELSE 0 END) AS paymentVerification,
                SUM(CASE WHEN status = 'approved' AND payment_status = 'paid' THEN 1 ELSE 0 END) AS paid
            FROM submissions
        `,
        )
        .get();
}

function getSubmissionsPerDay(days = 30) {
    return db
        .prepare(
            `
            SELECT date(created_at) AS day, COUNT(*) AS count
            FROM submissions
            WHERE created_at >= datetime('now', ?)
            GROUP BY day
            ORDER BY day
        `,
        )
        .all(`-${days} days`);
}

function getTopCarBrands(limit = 8) {
    return db
        .prepare(
            `
            SELECT car_brand AS brand, COUNT(*) AS count
            FROM submissions
            GROUP BY lower(trim(car_brand))
            ORDER BY count DESC
            LIMIT ?
        `,
        )
        .all(limit);
}

module.exports = {
    createSubmission,
    findSubmissionById,
    listSubmissionsByUser,
    listAllSubmissions,
    updateSubmissionStatus,
    updateSubmissionPaymentStatus,
    updateSubmissionInternalNote,
    updateSubmissionDetails,
    deleteSubmission,
    countActiveForUser,
    countApproved,
    getSubmissionStats,
    getSubmissionsPerDay,
    getTopCarBrands,
};
