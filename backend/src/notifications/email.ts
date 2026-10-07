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

async function sendMail({ to, subject, text, html, headers = undefined }) {
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
        headers,
    });

    return { sent: true };
}

// Optional e-mails say where to switch them off.
function preferencesFooter() {
    const url = `${getAppUrl()}/ustawienia-konta`;
    return {
        text: `\n—\nNie chcesz takich e-maili? Wyłącz je w ustawieniach konta: ${url}`,
        html: `<p style="color:#777;font-size:12px">Nie chcesz takich e-maili? <a href="${escapeHtml(url)}">Wyłącz je w ustawieniach konta</a>.</p>`,
    };
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

const STATUS_EMAILS = ["approved", "rejected", "waitlist"];

async function sendSubmissionStatusEmail({
    submission,
    user,
    status,
    adminNote,
    previousStatus = "",
}) {
    if (!user?.email || !STATUS_EMAILS.includes(status)) {
        return { sent: false, reason: "not_applicable" };
    }

    const firstName = user.first_name || submission.first_name || "Użytkowniku";
    const carBrand = submission.car_brand || "Twój pojazd";
    const note = adminNote ? String(adminNote) : "";
    const panelUrl = `${getAppUrl()}/panel`;
    const noteText = note ? `\nWiadomość od organizatora:\n${note}` : "";
    const noteHtml = note
        ? `<p><strong>Wiadomość od organizatora:</strong><br>${escapeHtml(note).replace(/\n/g, "<br>")}</p>`
        : "";

    if (status === "approved") {
        const payment = paymentLines(submission);
        const intro =
            previousStatus === "waitlist"
                ? `Zwolniło się miejsce w strefie Select — Twój samochód ${carBrand} przechodzi z listy rezerwowej i został zaakceptowany.`
                : `Chcielibyśmy Cię poinformować, że Twój samochód ${carBrand} został zaakceptowany do strefy Select.`;
        return sendMail({
            to: user.email,
            subject: "Street Show: zgłoszenie zaakceptowane",
            text: [
                `Cześć ${firstName},`,
                "",
                intro,
                "",
                ...payment,
                noteText,
                "",
                `Szczegóły znajdziesz w swoim panelu: ${panelUrl}`,
                "",
                "Pozdrawiamy",
                "Street Show Crew",
            ].join("\n"),
            html: `
                <p>Cześć ${escapeHtml(firstName)},</p>
                <p>${escapeHtml(intro)}</p>
                <p>${payment.map((line) => escapeHtml(line)).join("<br>")}</p>
                ${noteHtml}
                <p>Szczegóły znajdziesz w <a href="${escapeHtml(panelUrl)}">swoim panelu</a>.</p>
                <p>Pozdrawiamy<br>Street Show Crew</p>
            `,
        });
    }

    if (status === "waitlist") {
        const lines = [
            `Twój samochód ${carBrand} trafił na listę rezerwową strefy Select.`,
            "Gdy zwolnią się miejsca, organizator wybierze z listy rezerwowej auta do akceptacji — wtedy dostaniesz e-mail z danymi do opłaty. Do tego czasu nic nie płacisz.",
        ];
        return sendMail({
            to: user.email,
            subject: "Street Show: zgłoszenie na liście rezerwowej",
            text: [
                `Cześć ${firstName},`,
                "",
                ...lines,
                noteText,
                "",
                `Status zgłoszenia zobaczysz w panelu: ${panelUrl}`,
                "",
                "Street Show Crew",
            ].join("\n"),
            html: `
                <p>Cześć ${escapeHtml(firstName)},</p>
                ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
                ${noteHtml}
                <p>Status zgłoszenia zobaczysz w <a href="${escapeHtml(panelUrl)}">swoim panelu</a>.</p>
                <p>Street Show Crew</p>
            `,
        });
    }

    return sendMail({
        to: user.email,
        subject: "Street Show: zgłoszenie odrzucone",
        text: [
            `Cześć ${firstName},`,
            "",
            "Twoje zgłoszenie pojazdu do strefy Select zostało odrzucone.",
            noteText,
            "",
            "Street Show",
        ].join("\n"),
        html: `
            <p>Cześć ${escapeHtml(firstName)},</p>
            <p>Twoje zgłoszenie pojazdu do strefy Select zostało <strong>odrzucone</strong>.</p>
            ${noteHtml}
            <p>Street Show</p>
        `,
    });
}

async function sendPaymentReminderEmail({ submission, email, firstName }) {
    const payment = getPaymentDetails(submission);
    const panelUrl = `${getAppUrl()}/panel`;
    const name = firstName || submission.first_name || "Uczestniku";
    const summary = `${submission.car_brand} (${submission.license_plate})`;
    const lines = [
        `Przypominamy o opłacie za miejsce w strefie Select dla auta ${summary} — termin mija ${formatDeadline(payment.deadline)}.`,
        "Jeśli opłata nie wpłynie w terminie, miejsce może zostać przekazane osobie z listy rezerwowej.",
    ];
    const details = payment.complete
        ? [
              `Kwota: ${payment.amount}`,
              payment.recipient ? `Odbiorca: ${payment.recipient}` : "",
              `Numer konta: ${payment.account}`,
              `Tytuł przelewu: ${payment.title}`,
          ].filter(Boolean)
        : [];
    const closing =
        "Jeśli opłata jest już wykonana, zgłoś ją w panelu (najlepiej z potwierdzeniem przelewu). Jeśli nie możesz przyjechać, kliknij w panelu „Rezygnuję” — miejsce dostanie ktoś z listy rezerwowej.";

    return sendMail({
        to: email,
        subject: "Street Show: przypomnienie o opłacie",
        text: [
            `Cześć ${name},`,
            "",
            ...lines,
            "",
            ...(details.length ? [...details, ""] : []),
            closing,
            panelUrl,
            "",
            "Street Show Crew",
            preferencesFooter().text,
        ].join("\n"),
        html: `
            <p>Cześć ${escapeHtml(name)},</p>
            ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
            ${details.length ? `<p>${details.map((line) => escapeHtml(line)).join("<br>")}</p>` : ""}
            <p>${escapeHtml(closing)}</p>
            <p><a href="${escapeHtml(panelUrl)}">Przejdź do panelu</a></p>
            <p>Street Show Crew</p>
            ${preferencesFooter().html}
        `,
    });
}

// Organizer confirmed the payment, so the QR entry pass is now in the participant's panel.
// Transactional like the status e-mails, so it is not tied to the optional notification settings.
async function sendPaymentConfirmedEmail({ submission, user }) {
    const email = user?.email;
    if (!email) return { sent: false, reason: "not_applicable" };
    const panelUrl = `${getAppUrl()}/panel`;
    const name = user.first_name || submission.first_name || "Uczestniku";
    const summary = `${submission.car_brand} (${submission.license_plate})`;
    const lines = [
        `Potwierdziliśmy opłatę za miejsce w strefie Select dla auta ${summary}. Dzięki!`,
        "Twoja wejściówka z kodem QR czeka w panelu. Pokaż ją na bramie przy wjeździe — z telefonu albo wydrukowaną. W panelu pobierzesz ją też jako PDF lub PNG.",
    ];

    return sendMail({
        to: email,
        subject: "Street Show: opłata potwierdzona — Twoja wejściówka",
        text: [`Cześć ${name},`, "", ...lines, "", `Wejściówka: ${panelUrl}`, "", "Street Show Crew"].join("\n"),
        html: `
            <p>Cześć ${escapeHtml(name)},</p>
            ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
            <p><a href="${escapeHtml(panelUrl)}">Otwórz wejściówkę w panelu</a></p>
            <p>Street Show Crew</p>
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

function adminNotifyRecipients() {
    return String(process.env.ADMIN_NOTIFY_EMAIL || "").trim();
}

// Optional heads-up for organizers; set ADMIN_NOTIFY_EMAIL (comma-separated) to enable.
async function sendNewSubmissionAdminEmail({ submission, userEmail }) {
    const recipients = adminNotifyRecipients();
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

// A participant gave up an approved (or reserve-list) place.
async function sendWithdrawalAdminEmail({ submission, userEmail, previousStatus, waitlistCount }) {
    const recipients = adminNotifyRecipients();
    if (!recipients) return { sent: false, reason: "not_configured" };

    const adminUrl = `${getAppUrl()}/admin`;
    const summary = `${submission.car_brand} — ${submission.license_plate}`;
    const lines = [
        `Uczestnik zrezygnował z udziału w strefie Select: ${summary}`,
        `${submission.first_name} ${submission.last_name} (${userEmail})`,
        previousStatus === "approved"
            ? `Zwolniło się miejsce. Na liście rezerwowej: ${waitlistCount}.`
            : "Zgłoszenie było na liście rezerwowej.",
        submission.payment_status === "paid"
            ? "Opłata była już potwierdzona — sprawdź, czy należy się zwrot."
            : "",
    ].filter(Boolean);

    return sendMail({
        to: recipients,
        subject: `Street Show: rezygnacja (${summary})`,
        text: [...lines, "", `Panel administratora: ${adminUrl}`].join("\n"),
        html: `
            ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
            <p><a href="${escapeHtml(adminUrl)}">Otwórz panel administratora</a></p>
        `,
    });
}

// Organizer replied in a submission's thread.
async function sendThreadReplyEmail({ user, submission, body }) {
    if (!user?.email) return { sent: false, reason: "not_applicable" };
    const panelUrl = `${getAppUrl()}/panel`;
    const firstName = user.first_name || submission.first_name || "Uczestniku";
    const summary = `${submission.car_brand} (${submission.license_plate})`;

    return sendMail({
        to: user.email,
        subject: `Street Show: nowa wiadomość w sprawie ${summary}`,
        text: [
            `Cześć ${firstName},`,
            "",
            `Organizator napisał w sprawie zgłoszenia ${summary}:`,
            "",
            body,
            "",
            `Odpowiedz w swoim panelu: ${panelUrl}`,
            "",
            "Street Show Crew",
            preferencesFooter().text,
        ].join("\n"),
        html: `
            <p>Cześć ${escapeHtml(firstName)},</p>
            <p>Organizator napisał w sprawie zgłoszenia <strong>${escapeHtml(summary)}</strong>:</p>
            <blockquote>${escapeHtml(body).replace(/\n/g, "<br>")}</blockquote>
            <p><a href="${escapeHtml(panelUrl)}">Odpowiedz w swoim panelu</a> — odpowiedzi na ten e-mail nie trafią do organizatora.</p>
            <p>Street Show Crew</p>
            ${preferencesFooter().html}
        `,
    });
}

// Participant wrote in a submission's thread (ADMIN_NOTIFY_EMAIL).
async function sendThreadAdminEmail({ submission, userEmail, body }) {
    const recipients = adminNotifyRecipients();
    if (!recipients) return { sent: false, reason: "not_configured" };
    const adminUrl = `${getAppUrl()}/admin`;
    const summary = `${submission.car_brand} — ${submission.license_plate}`;

    return sendMail({
        to: recipients,
        subject: `Street Show: wiadomość od uczestnika (${summary})`,
        text: [`${userEmail} napisał w sprawie zgłoszenia #${submission.id} (${summary}):`, "", body, "", `Odpowiedz w panelu: ${adminUrl}`].join("\n"),
        html: `
            <p>${escapeHtml(userEmail)} napisał w sprawie zgłoszenia #${submission.id} (<strong>${escapeHtml(summary)}</strong>):</p>
            <blockquote>${escapeHtml(body).replace(/\n/g, "<br>")}</blockquote>
            <p><a href="${escapeHtml(adminUrl)}">Odpowiedz w panelu administratora</a></p>
        `,
    });
}

// Admin → System: proves SMTP works end to end. Throws the provider's error.
async function sendTestEmail(to) {
    const result = await sendMail({
        to,
        subject: "Street Show: testowy e-mail",
        text: `To jest testowa wiadomość z panelu administratora (${getAppUrl()}). Skoro ją widzisz, wysyłka e-maili działa.`,
        html: `<p>To jest testowa wiadomość z panelu administratora (${escapeHtml(getAppUrl())}).</p><p>Skoro ją widzisz, wysyłka e-maili działa.</p>`,
    });
    if (!result.sent) throw new Error("SMTP nie jest skonfigurowany.");
    return result;
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
        const footer = preferencesFooter();
        try {
            await sendMail({
                to: recipient.email,
                subject,
                text: `${body}\n${footer.text}`,
                html: `${plainTextToHtml(body)}\n${footer.html}`,
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

// "Daj mi znać o dacie" list: no account behind these addresses, so every
// e-mail carries its own one-click unsubscribe link instead of the settings page.
async function sendDateSubscribersEmail({ subscribers, subject, message, onSent }) {
    const results = { sent: 0, failed: 0 };

    for (const subscriber of subscribers) {
        const url = `${getAppUrl()}/wypisz?token=${subscriber.unsubscribe_token}`;
        const privacyUrl = `${getAppUrl()}/polityka-prywatnosci`;
        const body = `Cześć,\n\n${message}\n\nStreet Show Crew`;
        const note = "Ten adres zapisano na stronie Street Show na powiadomienie o dacie wydarzenia.";
        try {
            await sendMail({
                to: subscriber.email,
                subject,
                text: `${body}\n\n—\n${note} Wypisz się: ${url}\nPolityka prywatności: ${privacyUrl}`,
                html: `${plainTextToHtml(body)}\n<p style="color:#777;font-size:12px">${note} <a href="${escapeHtml(url)}">Wypisz się</a> · <a href="${escapeHtml(privacyUrl)}">Polityka prywatności</a>.</p>`,
                headers: { "List-Unsubscribe": `<${url}>` },
            });
            results.sent += 1;
            onSent?.(subscriber);
        } catch (error) {
            results.failed += 1;
            console.error(`[email] Powiadomienie o dacie do ${subscriber.email}:`, error.message);
        }
        await new Promise((resolve) => setTimeout(resolve, GROUP_EMAIL_DELAY_MS));
    }

    return results;
}

module.exports = {
    isEmailConfigured,
    sendGroupEmail,
    sendDateSubscribersEmail,
    sendVerificationEmail,
    sendEmailChangeEmail,
    sendSubmissionStatusEmail,
    sendPasswordResetEmail,
    sendNewSubmissionAdminEmail,
    sendWithdrawalAdminEmail,
    sendPaymentReminderEmail,
    sendPaymentConfirmedEmail,
    sendThreadReplyEmail,
    sendThreadAdminEmail,
    sendTestEmail,
};
