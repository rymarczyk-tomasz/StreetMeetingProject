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
    const query = listAllStmt.source.replace("ORDER BY", `${where} ORDER BY`);
    return db.prepare(query).all(...parameters);
}

function updateSubmissionStatus(id, status, adminNote) {
    updateStatusStmt.run(status, adminNote || null, id);
    return findByIdStmt.get(id);
}

function updateSubmissionPaymentStatus(id, paymentStatus) {
    updatePaymentStatusStmt.run(paymentStatus, id);
    return findByIdStmt.get(id);
}

function countPendingForUser(userId) {
    return countPendingForUserStmt.get(userId).count;
}

function getSubmissionStats() {
    return db
        .prepare(
            `
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
            FROM submissions
        `,
        )
        .get();
}

module.exports = {
    createSubmission,
    findSubmissionById,
    listSubmissionsByUser,
    listAllSubmissions,
    updateSubmissionStatus,
    updateSubmissionPaymentStatus,
    countPendingForUser,
    getSubmissionStats,
};
