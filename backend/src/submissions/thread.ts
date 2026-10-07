const threadsDb = require("../db/threads");
const usersDb = require("../db/users");
const { sendThreadReplyEmail, sendThreadAdminEmail } = require("../notifications/email");

// Shared by the participant (/api/submissions/:id/messages) and admin
// (/api/admin/submissions/:id/messages) endpoints of a submission's thread.

const MAX_MESSAGE_LENGTH = 2000;

function toThreadMessage(row, viewerIsAdmin) {
    return {
        id: row.id,
        fromAdmin: Boolean(row.from_admin),
        author: row.from_admin
            ? viewerIsAdmin
                ? row.author_email || "Organizator"
                : "Organizator"
            : viewerIsAdmin
              ? row.author_email || "Uczestnik"
              : "Ty",
        body: row.body,
        createdAt: row.created_at,
        read: Boolean(row.read_at),
    };
}

function readMessageBody(body) {
    const text = String(body?.message || "").replace(/\r\n/g, "\n").trim();
    if (!text) return { error: "Wpisz treść wiadomości." };
    if (text.length > MAX_MESSAGE_LENGTH) {
        return { error: `Wiadomość może mieć maksymalnie ${MAX_MESSAGE_LENGTH} znaków.` };
    }
    return { text };
}

function getThread(submission, viewerIsAdmin) {
    threadsDb.markThreadRead(submission.id, viewerIsAdmin);
    return threadsDb.listThread(submission.id).map((row) => toThreadMessage(row, viewerIsAdmin));
}

function postToThread({ submission, author, fromAdmin, text, userEmail }) {
    threadsDb.addMessage({
        submissionId: submission.id,
        authorId: author,
        fromAdmin,
        body: text,
    });

    const participant = fromAdmin ? usersDb.findUserById(submission.user_id) : null;
    const notify = !fromAdmin
        ? sendThreadAdminEmail({ submission, userEmail, body: text })
        : usersDb.notificationPrefs(participant).threadReplies
          ? sendThreadReplyEmail({ user: participant, submission, body: text })
          : Promise.resolve();
    void notify.catch((error) =>
        console.error(`[email] Wiadomość w zgłoszeniu ${submission.id}:`, error.message),
    );

    return getThreadWithoutMarking(submission.id, fromAdmin);
}

function getThreadWithoutMarking(submissionId, viewerIsAdmin) {
    return threadsDb.listThread(submissionId).map((row) => toThreadMessage(row, viewerIsAdmin));
}

module.exports = { getThread, postToThread, readMessageBody };
