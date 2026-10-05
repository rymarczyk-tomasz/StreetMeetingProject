const db = require("./database");

const insertStmt = db.prepare(`
    INSERT INTO submissions (
        user_id, first_name, last_name, phone, license_plate,
        car_brand, car_description, photos, edition,
        consent_at, consent_version, photo_publish_consent
    ) VALUES (
        @userId, @firstName, @lastName, @phone, @licensePlate,
        @carBrand, @carDescription, @photos, @edition,
        datetime('now'), @consentVersion, @photoPublishConsent
    )
`);
const updatePhotosStmt = db.prepare(`
    UPDATE submissions SET photos = ?, updated_at = datetime('now') WHERE id = ?
`);
const setPaymentProofStmt = db.prepare(`
    UPDATE submissions
    SET payment_proof = ?, payment_status = 'verification', updated_at = datetime('now')
    WHERE id = ?
`);
const setPassTokenStmt = db.prepare(
    `UPDATE submissions SET pass_token = ? WHERE id = ? AND pass_token IS NULL`,
);
const findByPassTokenStmt = db.prepare(`
    SELECT submissions.*, users.email AS user_email
    FROM submissions JOIN users ON users.id = submissions.user_id
    WHERE pass_token = ?
`);
const setCheckedInStmt = db.prepare(
    `UPDATE submissions SET checked_in_at = ? WHERE id = ?`,
);

const findByIdStmt = db.prepare(`SELECT * FROM submissions WHERE id = ?`);
const listByUserStmt = db.prepare(
    `SELECT * FROM submissions WHERE user_id = ? ORDER BY edition DESC, created_at DESC`,
);
const updatePaymentStatusStmt = db.prepare(`
    UPDATE submissions
    SET payment_status = ?, updated_at = datetime('now')
    WHERE id = ?
`);
// Entering "approved" starts a new payment period (and a new reminder).
const updateStatusStmt = db.prepare(`
    UPDATE submissions
    SET admin_note = @adminNote,
        approved_at = CASE WHEN @status = 'approved' AND status != 'approved'
            THEN datetime('now') ELSE approved_at END,
        payment_reminder_sent_at = CASE WHEN @status = 'approved' AND status != 'approved'
            THEN NULL ELSE payment_reminder_sent_at END,
        withdrawn_at = CASE WHEN @status = 'withdrawn' AND status != 'withdrawn'
            THEN datetime('now') ELSE withdrawn_at END,
        status = @status,
        updated_at = datetime('now')
    WHERE id = @id
`);
const countByStatusStmt = db.prepare(
    `SELECT COUNT(*) AS count FROM submissions WHERE edition = ? AND status = ?`,
);
const listAwaitingPaymentStmt = db.prepare(`
    SELECT submissions.*, users.email AS user_email
    FROM submissions JOIN users ON users.id = submissions.user_id
    WHERE submissions.edition = ? AND submissions.status = 'approved'
      AND submissions.payment_status = 'unpaid' AND users.is_active = 1
`);
const markReminderSentStmt = db.prepare(
    `UPDATE submissions SET payment_reminder_sent_at = datetime('now') WHERE id = ?`,
);
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
const countActiveForUserStmt = db.prepare(`
    SELECT COUNT(*) AS count FROM submissions
    WHERE user_id = ? AND edition = ? AND status NOT IN ('rejected', 'withdrawn')
`);
const findActiveByPlateStmt = db.prepare(`
    SELECT id FROM submissions
    WHERE user_id = ? AND edition = ? AND status NOT IN ('rejected', 'withdrawn')
      AND replace(upper(license_plate), ' ', '') = replace(upper(?), ' ', '')
    LIMIT 1
`);
const listEditionsStmt = db.prepare(`
    SELECT edition, COUNT(*) AS count FROM submissions
    GROUP BY edition ORDER BY edition DESC
`);

function createSubmission(data) {
    const result = insertStmt.run({
        ...data,
        photos: JSON.stringify(data.photos || []),
        consentVersion: data.consentVersion || null,
        photoPublishConsent: data.photoPublishConsent ? 1 : 0,
    });
    return findByIdStmt.get(result.lastInsertRowid);
}

function updateSubmissionPhotos(id, photos) {
    updatePhotosStmt.run(JSON.stringify(photos), id);
    return findByIdStmt.get(id);
}

function setPaymentProof(id, storedPath) {
    setPaymentProofStmt.run(storedPath, id);
    return findByIdStmt.get(id);
}

// The QR entry pass token is created once, on first request.
function ensurePassToken(id, token) {
    setPassTokenStmt.run(token, id);
    return findByIdStmt.get(id).pass_token;
}

function findSubmissionByPassToken(token) {
    return findByPassTokenStmt.get(String(token || ""));
}

function setCheckedIn(id, checkedIn) {
    setCheckedInStmt.run(checkedIn ? new Date().toISOString().slice(0, 19).replace("T", " ") : null, id);
    return findByIdStmt.get(id);
}

function findSubmissionById(id) {
    return findByIdStmt.get(id);
}

function listSubmissionsByUser(userId) {
    return listByUserStmt.all(userId);
}

function buildFilters({ edition, status, paymentStatus, search }: SubmissionFilters) {
    const conditions = [];
    const parameters = [];

    if (edition) {
        conditions.push("submissions.edition = ?");
        parameters.push(edition);
    }

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
    return { where, parameters };
}

type SubmissionFilters = {
    edition?: number;
    status?: string;
    paymentStatus?: string;
    search?: string;
};

function listAllSubmissions(filters: SubmissionFilters = {}) {
    const { where, parameters } = buildFilters(filters);
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

// Distinct account e-mails (and first names) for group messages.
function listRecipients(filters: SubmissionFilters = {}) {
    const { where, parameters } = buildFilters(filters);
    return db
        .prepare(
            `
            SELECT users.id AS user_id, users.email AS email, MIN(users.first_name) AS first_name
            FROM submissions
            JOIN users ON users.id = submissions.user_id
            ${where}${where ? " AND" : " WHERE"} users.is_active = 1
            GROUP BY users.email
            ORDER BY users.email
        `,
        )
        .all(...parameters);
}

function updateSubmissionStatus(id, status, adminNote) {
    updateStatusStmt.run({ id, status, adminNote: adminNote || null });
    return findByIdStmt.get(id);
}

function countApproved(edition) {
    return countByStatusStmt.get(edition, "approved").count;
}

// Approved but not paid (nor reported as paid) — candidates for reminders.
function listAwaitingPayment(edition) {
    return listAwaitingPaymentStmt.all(edition);
}

function markPaymentReminderSent(id) {
    markReminderSentStmt.run(id);
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

// Only the given edition counts, and rejected submissions don't, so a participant
// can re-apply with another car and starts fresh every year.
function countActiveForUser(userId, edition) {
    return countActiveForUserStmt.get(userId, edition).count;
}

// Same car (plate, ignoring spaces/case) already submitted by this user in the edition.
function hasActiveSubmissionForPlate(userId, edition, licensePlate) {
    return Boolean(findActiveByPlateStmt.get(userId, edition, licensePlate));
}

function listEditions() {
    return listEditionsStmt.all();
}

function getSubmissionStats(edition) {
    return db
        .prepare(
            `
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
                SUM(CASE WHEN status = 'waitlist' THEN 1 ELSE 0 END) AS waitlist,
                SUM(CASE WHEN status = 'withdrawn' THEN 1 ELSE 0 END) AS withdrawn,
                SUM(CASE WHEN status = 'approved' AND payment_status = 'unpaid' THEN 1 ELSE 0 END) AS unpaid,
                SUM(CASE WHEN status = 'approved' AND payment_status = 'verification' THEN 1 ELSE 0 END) AS paymentVerification,
                SUM(CASE WHEN status = 'approved' AND payment_status = 'paid' THEN 1 ELSE 0 END) AS paid
            FROM submissions
            WHERE edition = ?
        `,
        )
        .get(edition);
}

function getSubmissionsPerDay(edition, days = 30) {
    return db
        .prepare(
            `
            SELECT date(created_at) AS day, COUNT(*) AS count
            FROM submissions
            WHERE edition = ? AND created_at >= datetime('now', ?)
            GROUP BY day
            ORDER BY day
        `,
        )
        .all(edition, `-${days} days`);
}

function getTopCarBrands(edition, limit = 8) {
    return db
        .prepare(
            `
            SELECT car_brand AS brand, COUNT(*) AS count
            FROM submissions
            WHERE edition = ?
            GROUP BY lower(trim(car_brand))
            ORDER BY count DESC
            LIMIT ?
        `,
        )
        .all(edition, limit);
}

module.exports = {
    createSubmission,
    updateSubmissionPhotos,
    setPaymentProof,
    ensurePassToken,
    findSubmissionByPassToken,
    setCheckedIn,
    findSubmissionById,
    listSubmissionsByUser,
    listAllSubmissions,
    listRecipients,
    updateSubmissionStatus,
    countApproved,
    listAwaitingPayment,
    markPaymentReminderSent,
    updateSubmissionPaymentStatus,
    updateSubmissionInternalNote,
    updateSubmissionDetails,
    deleteSubmission,
    countActiveForUser,
    hasActiveSubmissionForPlate,
    listEditions,
    getSubmissionStats,
    getSubmissionsPerDay,
    getTopCarBrands,
};
