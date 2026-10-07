const db = require("./database");

const insertMessageStmt = db.prepare(
    `INSERT INTO messages (admin_id, subject, body) VALUES (?, ?, ?)`,
);
const insertRecipientStmt = db.prepare(
    `INSERT OR IGNORE INTO message_recipients (message_id, user_id) VALUES (?, ?)`,
);
const listForUserStmt = db.prepare(`
    SELECT messages.id, messages.subject, messages.body, messages.created_at,
           message_recipients.read_at
    FROM message_recipients
    JOIN messages ON messages.id = message_recipients.message_id
    WHERE message_recipients.user_id = ?
    ORDER BY messages.id DESC
    LIMIT 50
`);
const markReadStmt = db.prepare(`
    UPDATE message_recipients SET read_at = datetime('now')
    WHERE message_id = ? AND user_id = ? AND read_at IS NULL
`);
const markAllReadStmt = db.prepare(`
    UPDATE message_recipients SET read_at = datetime('now')
    WHERE user_id = ? AND read_at IS NULL
`);

const createMessage = db.transaction((adminId, subject, body, userIds) => {
    const result = insertMessageStmt.run(adminId, subject, body);
    for (const userId of userIds) {
        insertRecipientStmt.run(result.lastInsertRowid, userId);
    }
    return result.lastInsertRowid;
});

function listMessagesForUser(userId) {
    return listForUserStmt.all(userId);
}

function markMessageRead(messageId, userId) {
    markReadStmt.run(messageId, userId);
}

function markAllMessagesRead(userId) {
    markAllReadStmt.run(userId);
}

module.exports = {
    createMessage,
    listMessagesForUser,
    markMessageRead,
    markAllMessagesRead,
};
