const crypto = require("crypto");
const db = require("./database");

// "daj mi znać o dacie" list, no account needed
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

// double opt-in; rows from before it existed count as confirmed
const subscriberColumns = new Set(
    db
        .prepare("PRAGMA table_info(date_subscribers)")
        .all()
        .map((column) => column.name),
);
if (!subscriberColumns.has("confirmed_at")) {
    db.exec("ALTER TABLE date_subscribers ADD COLUMN confirmed_at TEXT");
    db.exec("UPDATE date_subscribers SET confirmed_at = created_at");
}
if (!subscriberColumns.has("confirm_token")) {
    db.exec("ALTER TABLE date_subscribers ADD COLUMN confirm_token TEXT");
}
if (!subscriberColumns.has("confirm_sent_at")) {
    db.exec("ALTER TABLE date_subscribers ADD COLUMN confirm_sent_at TEXT");
}
db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS date_subscribers_confirm_token ON date_subscribers(confirm_token)",
);

const RESEND_MINUTES = 10;
const TOKEN_PATTERN = /^[a-f0-9]{48}$/;

const findByEmailStmt = db.prepare("SELECT * FROM date_subscribers WHERE email = ?");
const insertStmt = db.prepare(`
    INSERT INTO date_subscribers (email, unsubscribe_token, edition, confirm_token, confirm_sent_at)
    VALUES (?, ?, ?, ?, datetime('now'))
`);
const renewTokenStmt = db.prepare(`
    UPDATE date_subscribers
    SET confirm_token = ?, confirm_sent_at = datetime('now'), edition = COALESCE(?, edition)
    WHERE id = ?
`);
// token is kept so a second click still works
const confirmStmt = db.prepare(`
    UPDATE date_subscribers SET confirmed_at = COALESCE(confirmed_at, datetime('now'))
    WHERE confirm_token = ?
`);
const deleteByTokenStmt = db.prepare(
    "DELETE FROM date_subscribers WHERE unsubscribe_token = ?",
);
const listStmt = db.prepare(`
    SELECT id, email, unsubscribe_token, edition, created_at, notified_at, confirmed_at
    FROM date_subscribers WHERE confirmed_at IS NOT NULL ORDER BY id
`);
const countStmt = db.prepare(`
    SELECT
        COALESCE(SUM(confirmed_at IS NOT NULL), 0) AS total,
        COALESCE(SUM(confirmed_at IS NOT NULL AND notified_at IS NULL), 0) AS pending,
        COALESCE(SUM(confirmed_at IS NULL), 0) AS unconfirmed
    FROM date_subscribers
`);
const markNotifiedStmt = db.prepare(
    "UPDATE date_subscribers SET notified_at = datetime('now') WHERE id = ?",
);
const pruneUnconfirmedStmt = db.prepare(`
    DELETE FROM date_subscribers
    WHERE confirmed_at IS NULL AND created_at < datetime('now', '-7 days')
`);

function newToken() {
    return crypto.randomBytes(24).toString("hex");
}

function minutesSince(sqliteDate) {
    if (!sqliteDate) return Infinity;
    return (Date.now() - new Date(`${sqliteDate.replace(" ", "T")}Z`).getTime()) / 60000;
}

// null = don't send (already confirmed or sent < 10 min ago)
function addSubscriber(email, edition) {
    const normalized = String(email).trim().toLowerCase();
    const existing = findByEmailStmt.get(normalized);

    if (!existing) {
        const token = newToken();
        insertStmt.run(normalized, newToken(), edition || null, token);
        return token;
    }
    if (existing.confirmed_at || minutesSince(existing.confirm_sent_at) < RESEND_MINUTES) {
        return null;
    }
    const token = newToken();
    renewTokenStmt.run(token, edition || null, existing.id);
    return token;
}

function confirmByToken(token) {
    if (!TOKEN_PATTERN.test(String(token || ""))) return false;
    return confirmStmt.run(token).changes > 0;
}

function removeByToken(token) {
    if (!TOKEN_PATTERN.test(String(token || ""))) return false;
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

function pruneUnconfirmed() {
    return pruneUnconfirmedStmt.run().changes;
}

module.exports = {
    addSubscriber,
    confirmByToken,
    removeByToken,
    listSubscribers,
    countSubscribers,
    markNotified,
    pruneUnconfirmed,
};
