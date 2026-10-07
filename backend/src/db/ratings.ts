const db = require("./database");

// Admins' 1–5 scores of submissions, one per admin, to pick cars together when
// there are more submissions than places.
db.exec(`
    CREATE TABLE IF NOT EXISTS submission_ratings (
        submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (submission_id, admin_id)
    );
`);

const upsertStmt = db.prepare(`
    INSERT INTO submission_ratings (submission_id, admin_id, score)
    VALUES (?, ?, ?)
    ON CONFLICT(submission_id, admin_id)
    DO UPDATE SET score = excluded.score, updated_at = datetime('now')
`);
const deleteStmt = db.prepare(
    `DELETE FROM submission_ratings WHERE submission_id = ? AND admin_id = ?`,
);
const listAllStmt = db.prepare(`
    SELECT submission_ratings.submission_id, submission_ratings.admin_id,
           submission_ratings.score, users.email AS admin_email
    FROM submission_ratings
    LEFT JOIN users ON users.id = submission_ratings.admin_id
    ORDER BY submission_ratings.updated_at
`);

function setRating(submissionId, adminId, score) {
    if (Number.isInteger(score) && score >= 1 && score <= 5) {
        upsertStmt.run(submissionId, adminId, score);
    } else {
        deleteStmt.run(submissionId, adminId);
    }
}

function ratingSummaries(viewerAdminId) {
    const summaries = new Map();
    for (const row of listAllStmt.all()) {
        const summary = summaries.get(row.submission_id) || { total: 0, count: 0, mine: null, scores: [] };
        summary.total += row.score;
        summary.count += 1;
        if (row.admin_id === Number(viewerAdminId)) summary.mine = row.score;
        summary.scores.push({ adminEmail: row.admin_email, score: row.score });
        summaries.set(row.submission_id, summary);
    }
    for (const summary of summaries.values()) {
        summary.average = Math.round((summary.total / summary.count) * 10) / 10;
        delete summary.total;
    }
    return summaries;
}

module.exports = { setRating, ratingSummaries };
