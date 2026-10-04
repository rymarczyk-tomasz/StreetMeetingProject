const crypto = require("crypto");
const db = require("./database");

const RESET_TOKEN_TTL_MINUTES = 60;

const insertStmt = db.prepare(`
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (?, ?, datetime('now', ?))
`);
const findValidStmt = db.prepare(`
    SELECT * FROM password_reset_tokens
    WHERE token_hash = ? AND expires_at > datetime('now')
`);
const deleteForUserStmt = db.prepare(
    `DELETE FROM password_reset_tokens WHERE user_id = ?`,
);
const deleteExpiredStmt = db.prepare(
    `DELETE FROM password_reset_tokens WHERE expires_at <= datetime('now')`,
);

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

// Only the hash is stored, so a leaked database cannot be used to reset passwords.
function createResetToken(userId) {
    const token = crypto.randomBytes(32).toString("hex");
    deleteForUserStmt.run(userId);
    insertStmt.run(userId, hashToken(token), `+${RESET_TOKEN_TTL_MINUTES} minutes`);
    return token;
}

function findValidResetToken(token) {
    return findValidStmt.get(hashToken(String(token || "")));
}

function deleteResetTokensForUser(userId) {
    deleteForUserStmt.run(userId);
}

function pruneExpiredResetTokens() {
    deleteExpiredStmt.run();
}

module.exports = {
    RESET_TOKEN_TTL_MINUTES,
    createResetToken,
    findValidResetToken,
    deleteResetTokensForUser,
    pruneExpiredResetTokens,
};
