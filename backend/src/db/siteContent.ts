const db = require("./database");
const { DEFAULTS } = require("../content/defaults");

const MAX_REVISIONS_PER_KEY = 30;

db.exec(`
    CREATE TABLE IF NOT EXISTS site_content (
        content_key TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS content_revisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_key TEXT NOT NULL,
        content TEXT NOT NULL,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_content_revisions_key ON content_revisions(content_key, id);
`);

// Event cards used to live in their own table; copy them into site_content once.
// The old table is left in place (unused) rather than dropped.
const legacyEventTable = db
    .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'event_content'",
    )
    .get();
if (legacyEventTable) {
    const legacyRow = db
        .prepare("SELECT content FROM event_content WHERE id = 1")
        .get();
    if (legacyRow) {
        db.prepare(
            "INSERT OR IGNORE INTO site_content (content_key, content) VALUES ('event', ?)",
        ).run(legacyRow.content);
    }
}

const getRowStmt = db.prepare(
    "SELECT content, updated_at FROM site_content WHERE content_key = ?",
);
const upsertStmt = db.prepare(`
    INSERT INTO site_content (content_key, content, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(content_key) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at
`);
const insertRevisionStmt = db.prepare(
    "INSERT INTO content_revisions (content_key, content, admin_id) VALUES (?, ?, ?)",
);
const pruneRevisionsStmt = db.prepare(`
    DELETE FROM content_revisions
    WHERE content_key = ? AND id NOT IN (
        SELECT id FROM content_revisions WHERE content_key = ? ORDER BY id DESC LIMIT ?
    )
`);
const listRevisionsStmt = db.prepare(`
    SELECT content_revisions.id, content_revisions.created_at, users.email AS admin_email
    FROM content_revisions
    LEFT JOIN users ON users.id = content_revisions.admin_id
    WHERE content_key = ?
    ORDER BY content_revisions.id DESC
`);
const getRevisionStmt = db.prepare(
    "SELECT * FROM content_revisions WHERE id = ? AND content_key = ?",
);

function assertKnownKey(key) {
    if (!DEFAULTS[key]) {
        throw new Error(`Nieznana sekcja treści: ${key}`);
    }
}

function isKnownContentKey(key) {
    return Object.prototype.hasOwnProperty.call(DEFAULTS, key);
}

function getContent(key) {
    assertKnownKey(key);

    const defaults = JSON.parse(JSON.stringify(DEFAULTS[key]));
    const row = getRowStmt.get(key);
    if (!row) return defaults;

    // Merge over defaults so fields added after a section was first saved don't come back undefined.
    try {
        return { ...defaults, ...JSON.parse(row.content) };
    } catch {
        return defaults;
    }
}

// Every save is also kept as a revision so an admin can roll back a bad edit.
const saveContent = db.transaction((key, content, adminId = null) => {
    assertKnownKey(key);
    const serialized = JSON.stringify(content);
    upsertStmt.run(key, serialized);
    insertRevisionStmt.run(key, serialized, adminId);
    pruneRevisionsStmt.run(key, key, MAX_REVISIONS_PER_KEY);
    return content;
});

function listRevisions(key) {
    assertKnownKey(key);
    return listRevisionsStmt.all(key);
}

function getRevisionContent(key, revisionId) {
    const row = getRevisionStmt.get(revisionId, key);
    return row ? JSON.parse(row.content) : null;
}

function getSettings() {
    return getContent("settings");
}

function getCurrentEdition() {
    const year = Number(getContent("edition").year);
    return Number.isInteger(year) ? year : new Date().getFullYear();
}

// Deadline is a YYYY-MM-DD date; submissions stay open until the end of that day.
function getSubmissionsAvailability(settings = getSettings()) {
    if (!settings.submissionsOpen) {
        return { open: false, reason: "Zgłoszenia do strefy Select są zamknięte." };
    }

    if (settings.submissionsDeadline) {
        const deadline = new Date(`${settings.submissionsDeadline}T23:59:59`);
        if (!Number.isNaN(deadline.getTime()) && Date.now() > deadline.getTime()) {
            return {
                open: false,
                reason: "Termin przyjmowania zgłoszeń do strefy Select minął.",
            };
        }
    }

    return { open: true, reason: "" };
}

module.exports = {
    isKnownContentKey,
    getContent,
    saveContent,
    listRevisions,
    getRevisionContent,
    getSettings,
    getCurrentEdition,
    getSubmissionsAvailability,
};
