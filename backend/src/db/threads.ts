const db = require("./database");

// Conversation between a participant and the organizers about one submission
// (replaces e-mail back-and-forth). read_at = read by the other side.
db.exec(`
    CREATE TABLE IF NOT EXISTS submission_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        from_admin INTEGER NOT NULL DEFAULT 0,
        body TEXT NOT NULL,
        read_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_submission_messages_submission
        ON submission_messages(submission_id, id);
`);

const insertStmt = db.prepare(`
    INSERT INTO submission_messages (submission_id, author_id, from_admin, body)
    VALUES (?, ?, ?, ?)
`);
const listStmt = db.prepare(`
    SELECT submission_messages.*, users.email AS author_email
    FROM submission_messages
    LEFT JOIN users ON users.id = submission_messages.author_id
    WHERE submission_id = ?
    ORDER BY submission_messages.id
`);
const markReadStmt = db.prepare(`
    UPDATE submission_messages SET read_at = datetime('now')
    WHERE submission_id = ? AND from_admin = ? AND read_at IS NULL
`);
const countsStmt = db.prepare(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN from_admin = ? AND read_at IS NULL THEN 1 ELSE 0 END) AS unread
    FROM submission_messages WHERE submission_id = ?
`);
// Unread participant messages per submission, for the admin list.
const unreadForAdminStmt = db.prepare(`
    SELECT submission_id, COUNT(*) AS unread
    FROM submission_messages
    WHERE from_admin = 0 AND read_at IS NULL
    GROUP BY submission_id
`);

function addMessage({ submissionId, authorId, fromAdmin, body }) {
    const result = insertStmt.run(submissionId, authorId, fromAdmin ? 1 : 0, body);
    return result.lastInsertRowid;
}

function listThread(submissionId) {
    return listStmt.all(submissionId);
}

// The viewer opened the thread: messages from the other side become read.
function markThreadRead(submissionId, viewerIsAdmin) {
    markReadStmt.run(submissionId, viewerIsAdmin ? 0 : 1);
}

// { total, unread } where unread counts messages from the other side.
function threadCounts(submissionId, viewerIsAdmin) {
    const row = countsStmt.get(viewerIsAdmin ? 0 : 1, submissionId);
    return { total: row.total || 0, unread: row.unread || 0 };
}

function unreadCountsForAdmin() {
    return new Map(unreadForAdminStmt.all().map((row) => [row.submission_id, row.unread]));
}

module.exports = {
    addMessage,
    listThread,
    markThreadRead,
    threadCounts,
    unreadCountsForAdmin,
};
