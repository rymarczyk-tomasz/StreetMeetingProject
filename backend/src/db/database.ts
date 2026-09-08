const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// SQLite keeps the whole backend self-contained in one file, so moving between
// mikrus (VPS) and hostinger.pl later only requires copying this data folder.
const dataDir = path.join(__dirname, "../../data");
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
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'verification', 'paid')),
        admin_note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);

    CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id INTEGER,
        details TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
`);

const userColumns = new Set(
    db
        .prepare("PRAGMA table_info(users)")
        .all()
        .map((column) => column.name),
);

for (const column of ["phone", "license_plate", "car_brand"]) {
    if (!userColumns.has(column)) {
        db.exec(`ALTER TABLE users ADD COLUMN ${column} TEXT`);
    }
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

module.exports = db;
