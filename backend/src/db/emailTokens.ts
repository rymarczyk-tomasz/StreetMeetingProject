const crypto = require("crypto");
const db = require("./database");

// One-time links: "verify" confirms the account's e-mail, "change" confirms a new
// address before it replaces the old one. Only a hash of the token is stored.
const TTL_HOURS = { verify: 72, change: 24 };

const insertStmt = db.prepare(`
    INSERT INTO email_tokens (user_id, kind, token_hash, new_email, expires_at)
    VALUES (?, ?, ?, ?, datetime('now', ?))
`);
const findValidStmt = db.prepare(`
    SELECT * FROM email_tokens
    WHERE token_hash = ? AND kind = ? AND expires_at > datetime('now')
`);
const deleteForUserStmt = db.prepare(
    `DELETE FROM email_tokens WHERE user_id = ? AND kind = ?`,
);
const deleteExpiredStmt = db.prepare(
    `DELETE FROM email_tokens WHERE expires_at <= datetime('now')`,
);

function hashToken(token) {
    return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function createEmailToken(userId, kind, newEmail = null) {
    const token = crypto.randomBytes(32).toString("hex");
    deleteForUserStmt.run(userId, kind);
    insertStmt.run(userId, kind, hashToken(token), newEmail, `+${TTL_HOURS[kind]} hours`);
    return { token, ttlHours: TTL_HOURS[kind] };
}

// Returns the token row and invalidates it, or null when unknown/expired.
function consumeEmailToken(token, kind) {
    const row = findValidStmt.get(hashToken(token), kind);
    if (row) deleteForUserStmt.run(row.user_id, kind);
    return row || null;
}

function pruneExpiredEmailTokens() {
    deleteExpiredStmt.run();
}

module.exports = { createEmailToken, consumeEmailToken, pruneExpiredEmailTokens };
