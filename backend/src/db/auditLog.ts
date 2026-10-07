const db = require("./database");

// actor_email is a snapshot so the entry survives account deletion
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

// personal data reads: one entry per admin/action per 30 min, panel reloads would flood the log
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
