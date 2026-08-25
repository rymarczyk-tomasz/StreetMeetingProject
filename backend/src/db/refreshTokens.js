const crypto = require("crypto");
const db = require("./database");

const insertTokenStmt = db.prepare(`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
`);
const findTokenStmt = db.prepare(
    `SELECT * FROM refresh_tokens WHERE token_hash = ?`,
);
const deleteTokenStmt = db.prepare(
    `DELETE FROM refresh_tokens WHERE token_hash = ?`,
);
const deleteAllForUserStmt = db.prepare(
    `DELETE FROM refresh_tokens WHERE user_id = ?`,
);
const deleteExpiredStmt = db.prepare(
    `DELETE FROM refresh_tokens WHERE expires_at < datetime('now')`,
);

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function storeRefreshToken(userId, token, expiresAt) {
    insertTokenStmt.run(userId, hashToken(token), expiresAt.toISOString());
}

function findRefreshToken(token) {
    return findTokenStmt.get(hashToken(token));
}

function revokeRefreshToken(token) {
    deleteTokenStmt.run(hashToken(token));
}

function revokeAllUserTokens(userId) {
    deleteAllForUserStmt.run(userId);
}

function pruneExpiredTokens() {
    deleteExpiredStmt.run();
}

module.exports = {
    storeRefreshToken,
    findRefreshToken,
    revokeRefreshToken,
    revokeAllUserTokens,
    pruneExpiredTokens,
};
