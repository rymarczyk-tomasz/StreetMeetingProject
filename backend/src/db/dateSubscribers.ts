const crypto = require("crypto");
const db = require("./database");

// "Daj mi znać o dacie" list on the home page: visitors (no account needed) who
// want one e-mail when the next edition's date is announced. Each row has its own
// unsubscribe token, put into every e-mail sent to the list.
db.exec(`
    CREATE TABLE IF NOT EXISTS date_subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        unsubscribe_token TEXT NOT NULL UNIQUE,
        edition INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        notified_at TEXT
    );
`);

const insertStmt = db.prepare(`
    INSERT INTO date_subscribers (email, unsubscribe_token, edition)
    VALUES (?, ?, ?)
    ON CONFLICT(email) DO NOTHING
`);
const deleteByTokenStmt = db.prepare(
    "DELETE FROM date_subscribers WHERE unsubscribe_token = ?",
);
const listStmt = db.prepare(
    "SELECT id, email, unsubscribe_token, edition, created_at, notified_at FROM date_subscribers ORDER BY id",
);
const countStmt = db.prepare(`
    SELECT COUNT(*) AS total, COALESCE(SUM(notified_at IS NULL), 0) AS pending
    FROM date_subscribers
`);
const markNotifiedStmt = db.prepare(
    "UPDATE date_subscribers SET notified_at = datetime('now') WHERE id = ?",
);

// Re-subscribing an address that is already on the list is a no-op.
function addSubscriber(email, edition) {
    const token = crypto.randomBytes(24).toString("hex");
    insertStmt.run(String(email).trim().toLowerCase(), token, edition || null);
}

function removeByToken(token) {
    if (!/^[a-f0-9]{48}$/.test(String(token || ""))) return false;
    return deleteByTokenStmt.run(token).changes > 0;
}

function listSubscribers() {
    return listStmt.all();
}

function countSubscribers() {
    return countStmt.get();
}

function markNotified(id) {
    markNotifiedStmt.run(id);
}

module.exports = {
    addSubscriber,
    removeByToken,
    listSubscribers,
    countSubscribers,
    markNotified,
};
