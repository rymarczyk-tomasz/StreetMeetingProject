const db = require("./database");

// actor_email is a snapshot taken when the entry is written, so the entry still
// says who did it after that account is deleted (admin_id then becomes NULL).
const insertAuditStmt = db.prepare(`
    INSERT INTO audit_log (admin_id, actor_email, action, target_type, target_id, details)
    VALUES (?, (SELECT email FROM users WHERE id = ?), ?, ?, ?, ?)
`);
const listAuditStmt = db.prepare(`
    SELECT audit_log.*, COALESCE(users.email, audit_log.actor_email) AS admin_email
    FROM audit_log
    LEFT JOIN users ON users.id = audit_log.admin_id
    ORDER BY audit_log.created_at DESC, audit_log.id DESC
    LIMIT ?
`);

function createAuditEntry({ adminId, action, targetType, targetId, details }) {
    insertAuditStmt.run(
        adminId,
        adminId,
        action,
        targetType,
        targetId || null,
        JSON.stringify(details || {}),
    );
}

// For reads of personal data (lists of participants): one entry per admin and
// action every THROTTLE_MS, so the panel's frequent reloads don't flood the log
// but it still shows who looked at the data and when.
const THROTTLE_MS = 30 * 60 * 1000;
const lastLoggedAt = new Map();

function createThrottledAuditEntry(entry) {
    const key = `${entry.adminId}:${entry.action}`;
    const now = Date.now();
    if (now - (lastLoggedAt.get(key) || 0) < THROTTLE_MS) return;
    lastLoggedAt.set(key, now);
    createAuditEntry(entry);
}

setInterval(() => {
    const now = Date.now();
    for (const [key, time] of lastLoggedAt) {
        if (now - time >= THROTTLE_MS) lastLoggedAt.delete(key);
    }
}, THROTTLE_MS).unref();

function listAuditEntries(limit = 100) {
    return listAuditStmt.all(Math.min(Math.max(Number(limit) || 100, 1), 500));
}

module.exports = { createAuditEntry, createThrottledAuditEntry, listAuditEntries };
