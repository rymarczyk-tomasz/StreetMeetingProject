const nodemailer = require("nodemailer");
const siteContentDb = require("../db/siteContent");

let transporter;

function getTransporter() {
    if (transporter) return transporter;

    const host = String(process.env.SMTP_HOST || "").trim();
    const user = String(process.env.SMTP_USER || "").trim();
    const password = String(process.env.SMTP_PASSWORD || "");

    if (!host || !user || !password) return null;

    const port = Number(process.env.SMTP_PORT || 587);
    const secure =
        String(process.env.SMTP_SECURE || "").toLowerCase() === "true";

    transporter = nodemailer.createTransport({
        host,
        port: Number.isFinite(port) ? port : 587,
        secure,
        auth: { user, pass: password },
    });

    return transporter;
}

function isEmailConfigured() {
    return Boolean(getTransporter());
}

function getAppUrl() {
    return String(process.env.APP_URL || "https://www.streetshow.pl").replace(
        /\/+$/,
        "",
    );
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function sendMail({ to, subject, text, html }) {
    const mailTransporter = getTransporter();
    if (!mailTransporter) {
        console.warn(
            `[email] SMTP nie jest skonfigurowany — pominięto wiadomość "${subject}".`,
        );
        return { sent: false, reason: "smtp_not_configured" };
    }

    await mailTransporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
        html,
    });

    return { sent: true };
}

function getFeeAmount() {
    const fromSettings = String(
        siteContentDb.getSettings().selectFeeAmount || "",
    ).trim();
    return (
        fromSettings ||
        String(
            process.env.SELECT_FEE_AMOUNT ||
                "kwoty wskazanej przez organizatora",
        ).trim()
    );
}

async function sendSubmissionStatusEmail({
    submission,
    user,
    status,
    adminNote,
}) {
    if (!user?.email || !["approved", "rejected"].includes(status)) {
        return { sent: false, reason: "not_applicable" };
    }

    const approved = status === "approved";
    const firstName = user.first_name || submission.first_name || "Użytkowniku";
    const carBrand = submission.car_brand || "Twój pojazd";
    const statusLabel = approved ? "zaakceptowane" : "odrzucone";
    const subject = `Street Show: zgłoszenie ${statusLabel}`;
    const note = adminNote ? String(adminNote) : "";
    const feeAmount = getFeeAmount();
    const panelUrl = `${getAppUrl()}/panel`;
    const approvedText = [
        `Cześć ${firstName},`,
        "",
        `Chcielibyśmy Cię poinformować, że Twój samochód ${carBrand} został zaakceptowany do strefy Select.`,
        `Prosimy o opłacenie składki w wysokości ${feeAmount}.`,
        note ? `\nWiadomość od organizatora:\n${note}` : "",
        "",
        `Szczegóły znajdziesz w swoim panelu: ${panelUrl}`,
        "",
        "Pozdrawiamy",
        "Street Show Crew",
    ];
    const defaultText = [
        `Cześć ${firstName},`,
        "",
        `Twoje zgłoszenie pojazdu do strefy Select zostało ${statusLabel}.`,
        note ? `\nWiadomość od organizatora:\n${note}` : "",
        "",
        "Street Show",
    ];
    const noteHtml = note
        ? `<p><strong>Wiadomość od organizatora:</strong><br>${escapeHtml(note).replace(/\n/g, "<br>")}</p>`
        : "";

    return sendMail({
        to: user.email,
        subject,
        text: (approved ? approvedText : defaultText).join("\n"),
        html: approved
            ? `
                <p>Cześć ${escapeHtml(firstName)},</p>
                <p>Chcielibyśmy Cię poinformować, że Twój samochód <strong>${escapeHtml(carBrand)}</strong> został zaakceptowany do strefy Select.</p>
                <p>Prosimy o opłacenie składki w wysokości <strong>${escapeHtml(feeAmount)}</strong>.</p>
                ${noteHtml}
                <p>Szczegóły znajdziesz w <a href="${escapeHtml(panelUrl)}">swoim panelu</a>.</p>
                <p>Pozdrawiamy<br>Street Show Crew</p>
            `
            : `
                <p>Cześć ${escapeHtml(firstName)},</p>
                <p>Twoje zgłoszenie pojazdu do strefy Select zostało <strong>${statusLabel}</strong>.</p>
                ${noteHtml}
                <p>Street Show</p>
            `,
    });
}

async function sendPasswordResetEmail({ user, token, ttlMinutes }) {
    const resetUrl = `${getAppUrl()}/reset-hasla?token=${encodeURIComponent(token)}`;
    const firstName = user.first_name || "Użytkowniku";

    return sendMail({
        to: user.email,
        subject: "Street Show: reset hasła",
        text: [
            `Cześć ${firstName},`,
            "",
            "Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta.",
            `Ustaw nowe hasło, korzystając z linku (ważny ${ttlMinutes} minut):`,
            resetUrl,
            "",
            "Jeśli to nie Ty, zignoruj tę wiadomość — hasło pozostanie bez zmian.",
            "",
            "Street Show",
        ].join("\n"),
        html: `
            <p>Cześć ${escapeHtml(firstName)},</p>
            <p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta.</p>
            <p><a href="${escapeHtml(resetUrl)}">Ustaw nowe hasło</a> (link ważny ${ttlMinutes} minut).</p>
            <p>Jeśli to nie Ty, zignoruj tę wiadomość — hasło pozostanie bez zmian.</p>
            <p>Street Show</p>
        `,
    });
}

async function sendWelcomeEmail({ user }) {
    const firstName = user.first_name || "Użytkowniku";
    const panelUrl = `${getAppUrl()}/panel`;

    return sendMail({
        to: user.email,
        subject: "Street Show: konto zostało utworzone",
        text: [
            `Cześć ${firstName},`,
            "",
            "Twoje konto w serwisie Street Show zostało utworzone.",
            `W panelu możesz zgłosić swój pojazd do strefy Select: ${panelUrl}`,
            "",
            "Jeśli to nie Ty zakładałeś konto, napisz do nas, odpowiadając na tę wiadomość.",
            "",
            "Street Show",
        ].join("\n"),
        html: `
            <p>Cześć ${escapeHtml(firstName)},</p>
            <p>Twoje konto w serwisie Street Show zostało utworzone.</p>
            <p>W <a href="${escapeHtml(panelUrl)}">panelu</a> możesz zgłosić swój pojazd do strefy Select.</p>
            <p>Jeśli to nie Ty zakładałeś konto, napisz do nas, odpowiadając na tę wiadomość.</p>
            <p>Street Show</p>
        `,
    });
}

// Optional heads-up for organizers; set ADMIN_NOTIFY_EMAIL (comma-separated) to enable.
async function sendNewSubmissionAdminEmail({ submission, userEmail }) {
    const recipients = String(process.env.ADMIN_NOTIFY_EMAIL || "").trim();
    if (!recipients) return { sent: false, reason: "not_configured" };

    const adminUrl = `${getAppUrl()}/admin`;
    const summary = `${submission.car_brand} — ${submission.license_plate}`;

    return sendMail({
        to: recipients,
        subject: `Street Show: nowe zgłoszenie (${summary})`,
        text: [
            "Nowe zgłoszenie do strefy Select:",
            "",
            `Pojazd: ${summary}`,
            `Zgłaszający: ${submission.first_name} ${submission.last_name} (${userEmail})`,
            `Telefon: ${submission.phone}`,
            "",
            `Panel administratora: ${adminUrl}`,
        ].join("\n"),
        html: `
            <p>Nowe zgłoszenie do strefy Select:</p>
            <p><strong>${escapeHtml(summary)}</strong><br>
            ${escapeHtml(submission.first_name)} ${escapeHtml(submission.last_name)} (${escapeHtml(userEmail)})<br>
            tel. ${escapeHtml(submission.phone)}</p>
            <p><a href="${escapeHtml(adminUrl)}">Otwórz panel administratora</a></p>
        `,
    });
}

module.exports = {
    isEmailConfigured,
    sendSubmissionStatusEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendNewSubmissionAdminEmail,
};
