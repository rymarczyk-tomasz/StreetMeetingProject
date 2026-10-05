const nodemailer = require("nodemailer");
const { getPaymentDetails } = require("../payments");
const { getAppUrl } = require("../utils/appUrl");

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

function formatDeadline(date) {
    if (!date) return "";
    return new Intl.DateTimeFormat("pl-PL", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(`${date}T12:00:00`));
}

// Lines describing how to pay (amount, account, title, deadline) for the approval e-mail.
function paymentLines(submission) {
    const payment = getPaymentDetails(submission);
    const lines = [
        `Prosimy o opłacenie składki w wysokości ${payment.amount || "wskazanej przez organizatora"}${payment.deadline ? ` do ${formatDeadline(payment.deadline)}` : ""}.`,
    ];
    if (payment.complete) {
        if (payment.recipient) lines.push(`Odbiorca: ${payment.recipient}`);
        lines.push(`Numer konta: ${payment.account}`);
        lines.push(`Tytuł przelewu: ${payment.title}`);
    }
    lines.push("Po wykonaniu przelewu zgłoś opłatę w panelu (możesz dołączyć potwierdzenie).");
    return lines;
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
    const payment = approved ? paymentLines(submission) : [];
    const panelUrl = `${getAppUrl()}/panel`;
    const approvedText = [
        `Cześć ${firstName},`,
        "",
        `Chcielibyśmy Cię poinformować, że Twój samochód ${carBrand} został zaakceptowany do strefy Select.`,
        "",
        ...payment,
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
                <p>${payment.map((line) => escapeHtml(line)).join("<br>")}</p>
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

async function sendVerificationEmail({ user, token, ttlHours }) {
    const url = `${getAppUrl()}/potwierdz-email?token=${encodeURIComponent(token)}`;
    const firstName = user.first_name || "Użytkowniku";

    return sendMail({
        to: user.email,
        subject: "Street Show: potwierdź adres e-mail",
        text: [
            `Cześć ${firstName},`,
            "",
            "Twoje konto w serwisie Street Show jest gotowe. Potwierdź jeszcze, że ten adres należy do Ciebie — dzięki temu dostaniesz decyzję w sprawie zgłoszenia i ważne informacje o wydarzeniu:",
            url,
            `(link ważny ${ttlHours} godzin)`,
            "",
            "Jeśli to nie Ty zakładałeś konto, zignoruj tę wiadomość.",
            "",
            "Street Show",
        ].join("\n"),
        html: `
            <p>Cześć ${escapeHtml(firstName)},</p>
            <p>Twoje konto w serwisie Street Show jest gotowe. Potwierdź jeszcze, że ten adres należy do Ciebie — dzięki temu dostaniesz decyzję w sprawie zgłoszenia i ważne informacje o wydarzeniu.</p>
            <p><a href="${escapeHtml(url)}">Potwierdź adres e-mail</a> (link ważny ${ttlHours} godzin)</p>
            <p>Jeśli to nie Ty zakładałeś konto, zignoruj tę wiadomość.</p>
            <p>Street Show</p>
        `,
    });
}

async function sendEmailChangeEmail({ user, newEmail, token, ttlHours }) {
    const url = `${getAppUrl()}/zmiana-emaila?token=${encodeURIComponent(token)}`;
    const firstName = user.first_name || "Użytkowniku";

    return sendMail({
        to: newEmail,
        subject: "Street Show: potwierdź nowy adres e-mail",
        text: [
            `Cześć ${firstName},`,
            "",
            `Ktoś (mamy nadzieję, że Ty) chce zmienić adres e-mail konta Street Show na ${newEmail}.`,
            `Potwierdź zmianę (link ważny ${ttlHours} godzin):`,
            url,
            "",
            "Jeśli to nie Ty, zignoruj tę wiadomość — adres się nie zmieni.",
            "",
            "Street Show",
        ].join("\n"),
        html: `
            <p>Cześć ${escapeHtml(firstName)},</p>
            <p>Ktoś (mamy nadzieję, że Ty) chce zmienić adres e-mail konta Street Show na <strong>${escapeHtml(newEmail)}</strong>.</p>
            <p><a href="${escapeHtml(url)}">Potwierdź zmianę adresu</a> (link ważny ${ttlHours} godzin)</p>
            <p>Jeśli to nie Ty, zignoruj tę wiadomość — adres się nie zmieni.</p>
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

function plainTextToHtml(text) {
    return String(text)
        .split(/\n{2,}/)
        .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
        .join("\n");
}

const GROUP_EMAIL_DELAY_MS = 400;

// Sends one personal message per recipient (no shared To/CC lists, so addresses
// stay private), slowly enough not to trip SMTP provider rate limits.
async function sendGroupEmail({ recipients, subject, message }) {
    const results = { sent: 0, failed: 0 };

    for (const recipient of recipients) {
        const greeting = `Cześć ${recipient.first_name || ""}`.trim() + ",";
        const body = `${greeting}\n\n${message}\n\nStreet Show Crew`;
        try {
            await sendMail({
                to: recipient.email,
                subject,
                text: body,
                html: plainTextToHtml(body),
            });
            results.sent += 1;
        } catch (error) {
            results.failed += 1;
            console.error(`[email] Wiadomość grupowa do ${recipient.email}:`, error.message);
        }
        await new Promise((resolve) => setTimeout(resolve, GROUP_EMAIL_DELAY_MS));
    }

    return results;
}

module.exports = {
    isEmailConfigured,
    sendGroupEmail,
    sendVerificationEmail,
    sendEmailChangeEmail,
    sendSubmissionStatusEmail,
    sendPasswordResetEmail,
    sendNewSubmissionAdminEmail,
};
