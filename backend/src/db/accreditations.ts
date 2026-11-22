const db = require("./database");

// media accreditation requests, no account needed; one per address and edition
db.exec(`
    CREATE TABLE IF NOT EXISTS accreditations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        edition INTEGER NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL COLLATE NOCASE,
        phone TEXT NOT NULL,
        instagram_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        consent_version TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        decided_at TEXT,
        UNIQUE (edition, email)
    );
`);

const insertStmt = db.prepare(`
    INSERT INTO accreditations (edition, name, email, phone, instagram_url, consent_version)
    VALUES (@edition, @name, @email, @phone, @instagramUrl, @consentVersion)
    ON CONFLICT (edition, email) DO NOTHING
`);
const findStmt = db.prepare("SELECT * FROM accreditations WHERE id = ?");
const listStmt = db.prepare(`
    SELECT * FROM accreditations
    WHERE @edition IS NULL OR edition = @edition
    ORDER BY status = 'pending' DESC, id DESC
`);
const setStatusStmt = db.prepare(
    "UPDATE accreditations SET status = ?, decided_at = datetime('now') WHERE id = ?",
);
const countPendingStmt = db.prepare(
    "SELECT COUNT(*) AS n FROM accreditations WHERE edition = ? AND status = 'pending'",
);
const listDatesStmt = db.prepare("SELECT id, edition, created_at FROM accreditations");
const deleteStmt = db.prepare("DELETE FROM accreditations WHERE id = ?");

// null = this address already asked in this edition
function createAccreditation(fields) {
    const result = insertStmt.run(fields);
    return result.changes ? findStmt.get(result.lastInsertRowid) : null;
}

function findAccreditation(id) {
    return findStmt.get(id);
}

// edition null = all years
function listAccreditations(edition = null) {
    return listStmt.all({ edition });
}

function setAccreditationStatus(id, status) {
    setStatusStmt.run(status, id);
    return findStmt.get(id);
}

function countPendingAccreditations(edition) {
    return countPendingStmt.get(edition).n;
}

function listAccreditationDates() {
    return listDatesStmt.all();
}

function deleteAccreditation(id) {
    return deleteStmt.run(id).changes > 0;
}

module.exports = {
    createAccreditation,
    findAccreditation,
    listAccreditations,
    listAccreditationDates,
    countPendingAccreditations,
    setAccreditationStatus,
    deleteAccreditation,
};
