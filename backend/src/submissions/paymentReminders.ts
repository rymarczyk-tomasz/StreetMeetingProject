const submissionsDb = require("../db/submissions");
const siteContentDb = require("../db/siteContent");
const auditLogDb = require("../db/auditLog");
const { getPaymentDueDate, todayInPoland, addDays } = require("../payments");
const { isEmailConfigured, sendPaymentReminderEmail } = require("../notifications/email");

// How many days before the payment deadline the single reminder goes out.
const REMINDER_DAYS_BEFORE = 3;

// Reminders go out during the day in Poland, not in the middle of the night.
const SEND_FROM_HOUR = 9;
const SEND_UNTIL_HOUR = 20;

let running = false;

function hourInPoland() {
    return Number(
        new Date().toLocaleString("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", hour12: false }),
    );
}

// One reminder per approval, sent when the deadline is up to REMINDER_DAYS_BEFORE
// days away. Without SMTP nothing is marked as sent, so reminders still go out
// once e-mail is configured.
async function sendDuePaymentReminders() {
    const hour = hourInPoland();
    if (running || !isEmailConfigured() || hour < SEND_FROM_HOUR || hour >= SEND_UNTIL_HOUR) {
        return { sent: 0 };
    }
    running = true;

    let sent = 0;
    try {
        const settings = siteContentDb.getSettings();
        const today = todayInPoland();
        const latestDue = addDays(today, REMINDER_DAYS_BEFORE);

        for (const row of submissionsDb.listAwaitingPayment(siteContentDb.getCurrentEdition())) {
            if (row.payment_reminder_sent_at) continue;
            const due = getPaymentDueDate(row, settings);
            if (!due || due < today || due > latestDue) continue;

            try {
                await sendPaymentReminderEmail({ submission: row, email: row.user_email });
                submissionsDb.markPaymentReminderSent(row.id);
                auditLogDb.createAuditEntry({
                    adminId: null,
                    action: "submission.payment_reminder_sent",
                    targetType: "submission",
                    targetId: row.id,
                    details: { licensePlate: row.license_plate, due },
                });
                sent += 1;
            } catch (error) {
                console.error(`[email] Przypomnienie o opłacie (zgłoszenie ${row.id}):`, error.message);
            }
        }
    } finally {
        running = false;
    }
    return { sent };
}

module.exports = { sendDuePaymentReminders, REMINDER_DAYS_BEFORE };
