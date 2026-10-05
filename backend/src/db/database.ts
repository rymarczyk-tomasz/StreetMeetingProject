const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// SQLite keeps the whole backend self-contained in one file, so moving between
// mikrus (VPS) and hostinger.pl later only requires copying this data folder.
// Resolved from process.cwd() (always backend/ via npm scripts) so it stays correct
// whether running compiled dist/ output or the TS source directly.
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "app.sqlite");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        license_plate TEXT,
        car_brand TEXT,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

    CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        license_plate TEXT NOT NULL,
        car_brand TEXT NOT NULL,
        car_description TEXT NOT NULL,
        photos TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlist', 'withdrawn')),
        payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'verification', 'paid')),
        admin_note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);

    CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        actor_email TEXT,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id INTEGER,
        details TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
`);

// The audit log used to be deleted together with the admin's account (ON DELETE
// CASCADE), so deleting an account erased the trace of what it did. Entries now
// outlive the account and keep the e-mail it had. SQLite can't alter a foreign
// key in place, so older databases get the table rebuilt once.
const auditColumns = new Set(
    db
        .prepare("PRAGMA table_info(audit_log)")
        .all()
        .map((column) => column.name),
);
if (!auditColumns.has("actor_email")) {
    db.transaction(() => {
        db.exec(`
            CREATE TABLE audit_log_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                actor_email TEXT,
                action TEXT NOT NULL,
                target_type TEXT NOT NULL,
                target_id INTEGER,
                details TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            INSERT INTO audit_log_new
                (id, admin_id, actor_email, action, target_type, target_id, details, created_at)
            SELECT audit_log.id, audit_log.admin_id, users.email, audit_log.action,
                   audit_log.target_type, audit_log.target_id, audit_log.details, audit_log.created_at
            FROM audit_log LEFT JOIN users ON users.id = audit_log.admin_id;
            DROP TABLE audit_log;
            ALTER TABLE audit_log_new RENAME TO audit_log;
        `);
    })();
}
db.exec("CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at)");

const userColumns = new Set(
    db
        .prepare("PRAGMA table_info(users)")
        .all()
        .map((column) => column.name),
);

// terms_*: when the user accepted the regulamin/RODO at registration and which
// regulamin version (revision id) it was; email_verified_at: confirmed address.
for (const column of [
    "phone",
    "license_plate",
    "car_brand",
    "terms_accepted_at",
    "terms_version",
    "email_verified_at",
]) {
    if (!userColumns.has(column)) {
        db.exec(`ALTER TABLE users ADD COLUMN ${column} TEXT`);
    }
}

// Gate staff ("Obsługa wjazdu"): may only use the check-in screen. A flag rather
// than a new role, because the role CHECK constraint can't be altered in SQLite
// without rebuilding the users table. Admins always have gate access.
if (!userColumns.has("gate_staff")) {
    db.exec("ALTER TABLE users ADD COLUMN gate_staff INTEGER NOT NULL DEFAULT 0");
}

const submissionColumns = new Set(
    db
        .prepare("PRAGMA table_info(submissions)")
        .all()
        .map((column) => column.name),
);

if (!submissionColumns.has("payment_status")) {
    db.exec(
        "ALTER TABLE submissions ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'",
    );
}

// Note visible only to admins (admin_note is shown to the participant).
if (!submissionColumns.has("internal_note")) {
    db.exec("ALTER TABLE submissions ADD COLUMN internal_note TEXT");
}

// Submissions belong to an event edition (year). Everything sent before editions
// existed was for Street Show 2026.
if (!submissionColumns.has("edition")) {
    db.exec("ALTER TABLE submissions ADD COLUMN edition INTEGER");
    db.exec("UPDATE submissions SET edition = 2026 WHERE edition IS NULL");
}

// consent_*: regulamin/RODO acceptance recorded with each submission;
// photo_publish_consent: optional OK to publish photos of the car;
// payment_proof: uploaded transfer confirmation; pass_token / checked_in_at:
// QR entry pass for approved + paid cars and the gate check-in time.
const newSubmissionColumns = {
    consent_at: "TEXT",
    consent_version: "TEXT",
    photo_publish_consent: "INTEGER NOT NULL DEFAULT 0",
    payment_proof: "TEXT",
    pass_token: "TEXT",
    checked_in_at: "TEXT",
    // approved_at: start of the payment period; withdrawn_at: participant gave
    // up the place; payment_reminder_sent_at: the "payment due soon" e-mail went out.
    approved_at: "TEXT",
    withdrawn_at: "TEXT",
    payment_reminder_sent_at: "TEXT",
};
for (const [column, type] of Object.entries(newSubmissionColumns)) {
    if (!submissionColumns.has(column)) {
        db.exec(`ALTER TABLE submissions ADD COLUMN ${column} ${type}`);
    }
}
if (!submissionColumns.has("approved_at")) {
    db.exec("UPDATE submissions SET approved_at = updated_at WHERE status = 'approved'");
}

// The status CHECK constraint gained 'waitlist' (reserve list) and 'withdrawn'
// (participant resigned after approval). SQLite can't alter a constraint, so
// older databases get the table rebuilt once from its own stored definition.
const submissionsSql = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'submissions'")
    .get().sql;
if (!submissionsSql.includes("'waitlist'")) {
    const newSql = submissionsSql
        .replace(/CHECK\s*\(\s*status IN \([^)]*\)\s*\)/, "CHECK (status IN ('pending', 'approved', 'rejected', 'waitlist', 'withdrawn'))")
        .replace(/^CREATE TABLE\s+"?submissions"?/, "CREATE TABLE submissions_new");
    if (!newSql.includes("'waitlist'") || !newSql.includes("submissions_new")) {
        throw new Error("Migracja submissions: nie rozpoznano definicji tabeli.");
    }
    db.pragma("foreign_keys = OFF");
    try {
        db.transaction(() => {
            db.exec(newSql);
            db.exec(`
                INSERT INTO submissions_new SELECT * FROM submissions;
                DROP TABLE submissions;
                ALTER TABLE submissions_new RENAME TO submissions;
                CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
            `);
        })();
    } finally {
        db.pragma("foreign_keys = ON");
    }
}

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
    CREATE INDEX IF NOT EXISTS idx_submissions_edition ON submissions(edition, user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_pass_token ON submissions(pass_token);

    -- "Garage": cars a user keeps for quick submissions in later editions.
    CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        car_brand TEXT NOT NULL,
        license_plate TEXT NOT NULL,
        car_description TEXT NOT NULL DEFAULT '',
        photos TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);

    -- Messages from organizers shown in the participant panel (and e-mailed).
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS message_recipients (
        message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        read_at TEXT,
        PRIMARY KEY (message_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_message_recipients_user ON message_recipients(user_id);

    -- One-time links for confirming an e-mail address or an e-mail change.
    CREATE TABLE IF NOT EXISTS email_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('verify', 'change')),
        token_hash TEXT NOT NULL UNIQUE,
        new_email TEXT,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
`);

module.exports = db;
