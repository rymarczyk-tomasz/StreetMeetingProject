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

    -- the edition section holds only the current year; retention needs past dates too
    CREATE TABLE IF NOT EXISTS edition_dates (
        year INTEGER PRIMARY KEY,
        event_date TEXT NOT NULL
    );
`);

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
const upsertEditionDateStmt = db.prepare(`
    INSERT INTO edition_dates (year, event_date) VALUES (?, ?)
    ON CONFLICT(year) DO UPDATE SET event_date = excluded.event_date
`);
const deleteEditionDateStmt = db.prepare("DELETE FROM edition_dates WHERE year = ?");
const getEditionDateStmt = db.prepare("SELECT event_date FROM edition_dates WHERE year = ?");

// a cleared date (postponed event) must not leave the old one behind
function rememberEditionDate(content) {
    const year = Number(content?.year);
    if (!Number.isInteger(year)) return;
    const date = String(content?.date || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) upsertEditionDateStmt.run(year, date);
    else deleteEditionDateStmt.run(year);
}

function getEditionDate(year) {
    const row = getEditionDateStmt.get(Number(year));
    return row ? row.event_date : null;
}

function assertKnownKey(key) {
    if (!DEFAULTS[key]) {
        throw new Error(`Nieznana sekcja treści: ${key}`);
    }
}

function isKnownContentKey(key) {
    return Object.prototype.hasOwnProperty.call(DEFAULTS, key);
}

// settings saved when every place had its own amount and link: the first ones filled in
// become the common ones until the next save drops the old field
function withoutZonePayments(key, content) {
    if (key !== "settings" || !content.zonePayments) return content;
    const { zonePayments, ...settings } = content;
    const first = (field) =>
        (Object.values(zonePayments) as any[]).map((entry) => String(entry?.[field] || "").trim()).find(Boolean) || "";
    return {
        ...settings,
        selectFeeAmount: settings.selectFeeAmount || first("amount"),
        paymentUrl: settings.paymentUrl || first("url"),
    };
}

function getContent(key) {
    assertKnownKey(key);

    const defaults = JSON.parse(JSON.stringify(DEFAULTS[key]));
    const row = getRowStmt.get(key);
    if (!row) return withEnvOverrides(key, defaults);

    // Merge over defaults so fields added after a section was first saved don't come back undefined.
    try {
        return withEnvOverrides(key, withoutZonePayments(key, { ...defaults, ...JSON.parse(row.content) }));
    } catch {
        return withEnvOverrides(key, defaults);
    }
}

// MAINTENANCE_MODE=on in config/.env keeps the site closed from the very first start
// (before an admin can log in); the panel can't switch it off, the variable has to go.
function withEnvOverrides(key, content) {
    if (key === "maintenance" && /^(1|true|on)$/i.test(String(process.env.MAINTENANCE_MODE || "").trim())) {
        return { ...content, enabled: true, forcedByEnv: true };
    }
    return content;
}

function isMaintenanceOn() {
    return Boolean(getContent("maintenance").enabled);
}

const saveContent = db.transaction((key, content, adminId = null) => {
    assertKnownKey(key);
    const serialized = JSON.stringify(content);
    upsertStmt.run(key, serialized);
    insertRevisionStmt.run(key, serialized, adminId);
    pruneRevisionsStmt.run(key, key, MAX_REVISIONS_PER_KEY);
    if (key === "edition") rememberEditionDate(content);
    return content;
});

function listRevisions(key) {
    assertKnownKey(key);
    return listRevisionsStmt.all(key);
}

// Identifies the regulamin a user agreed to: "rev-<id>" of the latest saved
// version, or "default" while the built-in text has never been edited.
const latestRevisionStmt = db.prepare(
    "SELECT id FROM content_revisions WHERE content_key = ? ORDER BY id DESC LIMIT 1",
);

function getContentVersion(key) {
    const row = latestRevisionStmt.get(key);
    return row ? `rev-${row.id}` : "default";
}

function getRevisionContent(key, revisionId) {
    const row = getRevisionStmt.get(revisionId, key);
    return row ? withoutZonePayments(key, JSON.parse(row.content)) : null;
}

function getSettings() {
    return getContent("settings");
}

function getCurrentEdition() {
    const year = Number(getContent("edition").year);
    return Number.isInteger(year) ? year : new Date().getFullYear();
}

// a date saved before this table existed
rememberEditionDate(getContent("edition"));

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

// The 2027 regulamin, regulamin Select/Expo and privacy policy arrive as built-in defaults,
// but a section saved earlier in the panel wins over them. Once per LEGAL_DEFAULTS_VERSION
// the saved ones are replaced by the new defaults; the old text stays in the revision history.
const LEGAL_DEFAULTS_VERSION = "2027-5";
const LEGAL_KEYS = ["regulamin", "regulaminSelect", "privacy"];

db.exec("CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");

function applyLegalDefaults() {
    const done = db.prepare("SELECT value FROM app_meta WHERE key = 'legal_defaults_version'").get();
    if (done && done.value === LEGAL_DEFAULTS_VERSION) return [];

    const replaced = [];
    for (const key of LEGAL_KEYS) {
        if (!getRowStmt.get(key)) continue;
        saveContent(key, JSON.parse(JSON.stringify(DEFAULTS[key])), null);
        replaced.push(key);
    }
    db.prepare(
        "INSERT INTO app_meta (key, value) VALUES ('legal_defaults_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ).run(LEGAL_DEFAULTS_VERSION);
    if (replaced.length) console.log(`Dokumenty prawne 2027: podmieniono zapisane teksty (${replaced.join(", ")}), stare wersje są w historii zmian.`);
    return replaced;
}

applyLegalDefaults();

module.exports = {
    isKnownContentKey,
    getContent,
    saveContent,
    listRevisions,
    getRevisionContent,
    getContentVersion,
    getSettings,
    isMaintenanceOn,
    getCurrentEdition,
    getEditionDate,
    getSubmissionsAvailability,
    applyLegalDefaults,
};
