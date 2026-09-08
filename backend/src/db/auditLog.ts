const db = require("./database");

const insertAuditStmt = db.prepare(`
    INSERT INTO audit_log (admin_id, action, target_type, target_id, details)
    VALUES (?, ?, ?, ?, ?)
`);
const listAuditStmt = db.prepare(`
    SELECT audit_log.*, users.email AS admin_email
    FROM audit_log
    JOIN users ON users.id = audit_log.admin_id
    ORDER BY audit_log.created_at DESC
    LIMIT ?
`);

function createAuditEntry({ adminId, action, targetType, targetId, details }) {
    insertAuditStmt.run(
        adminId,
        action,
        targetType,
        targetId || null,
        JSON.stringify(details || {}),
    );
}

function listAuditEntries(limit = 100) {
    return listAuditStmt.all(Math.min(Math.max(Number(limit) || 100, 1), 500));
}

module.exports = { createAuditEntry, listAuditEntries };
