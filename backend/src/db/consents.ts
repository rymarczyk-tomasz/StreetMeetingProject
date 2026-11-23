const db = require("./database");

// anonymous log of cookie banner choices (proof that consent was asked for): the banner's
// random id, the accepted categories and the banner revision; no IP, no account
db.exec(`
    CREATE TABLE IF NOT EXISTS cookie_consents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        consent_id TEXT NOT NULL,
        categories TEXT NOT NULL,
        revision INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS cookie_consents_consent_id ON cookie_consents(consent_id);
`);

const KEEP_MONTHS = 24;

const insertStmt = db.prepare(
    "INSERT INTO cookie_consents (consent_id, categories, revision) VALUES (?, ?, ?)",
);
const pruneStmt = db.prepare(
    `DELETE FROM cookie_consents WHERE created_at < datetime('now', '-${KEEP_MONTHS} months')`,
);

function logConsent({ consentId, categories, revision }) {
    insertStmt.run(consentId, categories.join(","), revision);
}

function pruneOldConsents() {
    return pruneStmt.run().changes;
}

module.exports = { logConsent, pruneOldConsents, KEEP_MONTHS };
