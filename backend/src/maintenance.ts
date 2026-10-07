const fs = require("fs");
const path = require("path");

const db = require("./db/database");
const refreshTokensDb = require("./db/refreshTokens");
const passwordResetTokensDb = require("./db/passwordResetTokens");
const emailTokensDb = require("./db/emailTokens");
const dateSubscribersDb = require("./db/dateSubscribers");
const { sendDuePaymentReminders } = require("./submissions/paymentReminders");

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

const BACKUP_DIR = process.env.BACKUP_DIR
    ? path.resolve(process.env.BACKUP_DIR)
    : path.join(process.cwd(), "backups");
const parsedKeep = Number(process.env.BACKUP_KEEP || 14);
const BACKUP_KEEP =
    Number.isInteger(parsedKeep) && parsedKeep > 0 ? parsedKeep : 14;

function pruneExpiredTokens() {
    try {
        refreshTokensDb.pruneExpiredTokens();
        passwordResetTokensDb.pruneExpiredResetTokens();
        emailTokensDb.pruneExpiredEmailTokens();
        // "Daj mi znać o dacie" sign-ups nobody confirmed within 7 days.
        dateSubscribersDb.pruneUnconfirmed();
    } catch (error) {
        console.error("[maintenance] Czyszczenie tokenów:", error.message);
    }
}

// Online, consistent SQLite snapshot (safe while the app keeps writing).
// Copies to another machine are still needed — this only protects against
// bad writes / accidental deletes, not against losing the server.
async function backupDatabase() {
    await fs.promises.mkdir(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 10);
    const target = path.join(BACKUP_DIR, `app-${stamp}.sqlite`);

    await db.backup(target);

    const backups = (await fs.promises.readdir(BACKUP_DIR))
        .filter((name) => /^app-\d{4}-\d{2}-\d{2}\.sqlite$/.test(name))
        .sort();
    for (const name of backups.slice(0, -BACKUP_KEEP)) {
        await fs.promises.unlink(path.join(BACKUP_DIR, name));
    }

    return target;
}

function runBackup() {
    backupDatabase()
        .then((target) => console.log(`[backup] Zapisano kopię bazy: ${target}`))
        .catch((error) => console.error("[backup] Błąd kopii bazy:", error.message));
}

function runPaymentReminders() {
    sendDuePaymentReminders()
        .then(({ sent }) => {
            if (sent) console.log(`[email] Wysłano przypomnienia o opłacie: ${sent}`);
        })
        .catch((error) => console.error("[email] Przypomnienia o opłacie:", error.message));
}

function startMaintenance() {
    pruneExpiredTokens();
    setInterval(pruneExpiredTokens, SIX_HOURS_MS).unref();

    // Checked hourly; the reminder module itself waits for daytime in Poland.
    setTimeout(runPaymentReminders, 2 * 60 * 1000).unref();
    setInterval(runPaymentReminders, ONE_HOUR_MS).unref();

    if (String(process.env.BACKUP_DISABLED || "").toLowerCase() === "true") {
        return;
    }

    // Shortly after start (deploys/restarts) and then once a day.
    setTimeout(runBackup, 60 * 1000).unref();
    setInterval(runBackup, ONE_DAY_MS).unref();
}

module.exports = { startMaintenance, backupDatabase, BACKUP_DIR };
