const nodemailer = require("nodemailer");

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

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
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

    const mailTransporter = getTransporter();
    if (!mailTransporter) {
        return { sent: false, reason: "smtp_not_configured" };
    }

    const approved = status === "approved";
    const firstName = user.first_name || submission.first_name || "Użytkowniku";
    const carBrand = submission.car_brand || "Twój pojazd";
    const statusLabel = approved ? "zaakceptowane" : "odrzucone";
    const subject = `Street Show: zgłoszenie ${statusLabel}`;
    const note = adminNote ? String(adminNote) : "";
    const feeAmount = String(
        process.env.SELECT_FEE_AMOUNT || "kwoty wskazanej przez organizatora",
    ).trim();
    const approvedText = [
        `Cześć ${firstName},`,
        "",
        `Chcielibyśmy Cię poinformować, że Twój samochód ${carBrand} został zaakceptowany do strefy Select.`,
        `Prosimy o opłacenie składki w wysokości ${feeAmount}.`,
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

    await mailTransporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject,
        text: (approved ? approvedText : defaultText).join("\n"),
        html: approved
            ? `
                <p>Cześć ${escapeHtml(firstName)},</p>
                <p>Chcielibyśmy Cię poinformować, że Twój samochód <strong>${escapeHtml(carBrand)}</strong> został zaakceptowany do strefy Select.</p>
                <p>Prosimy o opłacenie składki w wysokości <strong>${escapeHtml(feeAmount)}</strong>.</p>
                <p>Pozdrawiamy<br>Street Show Crew</p>
            `
            : `
                <p>Cześć ${escapeHtml(firstName)},</p>
                <p>Twoje zgłoszenie pojazdu do strefy Select zostało <strong>${statusLabel}</strong>.</p>
                ${note ? `<p><strong>Wiadomość od organizatora:</strong><br>${escapeHtml(note).replace(/\n/g, "<br>")}</p>` : ""}
                <p>Street Show</p>
            `,
    });

    return { sent: true };
}

module.exports = { sendSubmissionStatusEmail };
