const nodemailer = require("nodemailer");
const { getPaymentDetails } = require("../payments");
const { getAppUrl } = require("../utils/appUrl");
const siteContentDb = require("../db/siteContent");

const DEFAULT_SIGNATURE = "Street Show Crew";

// Closing line of every e-mail; editable in Admin → Ustawienia → Szablony wiadomości.
function signatureText() {
    const saved = String(siteContentDb.getContent("templates")?.signature || "").trim();
    return saved || DEFAULT_SIGNATURE;
}

function signatureHtml() {
    return escapeHtml(signatureText()).replace(/\n/g, "<br>");
}

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
        // nodemailer's defaults wait minutes for a dead server
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
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

function getReplyTo() {
    return String(process.env.SMTP_REPLY_TO || "").trim();
}

async function sendMail({ to, subject, text, html, headers = undefined }) {
    const mailTransporter = getTransporter();
    if (!mailTransporter) {
        console.warn(
            `[email] SMTP nie jest skonfigurowany — pominięto wiadomość "${subject}".`,
        );
        return { sent: false, reason: "smtp_not_configured" };
    }

    const replyTo = getReplyTo();

    await mailTransporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        ...(replyTo ? { replyTo } : {}),
        to,
        subject,
        text,
        html,
        headers,
    });

    return { sent: true };
}

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
                signatureText(),
            ].join("\n"),
            html: `
                <p>Cześć ${escapeHtml(firstName)},</p>
                <p>${escapeHtml(intro)}</p>
                <p>${payment.map((line) => escapeHtml(line)).join("<br>")}</p>
                ${noteHtml}
                <p>Szczegóły znajdziesz w <a href="${escapeHtml(panelUrl)}">swoim panelu</a>.</p>
                <p>Pozdrawiamy<br>${signatureHtml()}</p>
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
                signatureText(),
            ].join("\n"),
            html: `
                <p>Cześć ${escapeHtml(firstName)},</p>
                ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
                ${noteHtml}
                <p>Status zgłoszenia zobaczysz w <a href="${escapeHtml(panelUrl)}">swoim panelu</a>.</p>
                <p>${signatureHtml()}</p>
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
            signatureText(),
        ].join("\n"),
        html: `
            <p>Cześć ${escapeHtml(firstName)},</p>
            <p>Twoje zgłoszenie pojazdu do strefy Select zostało <strong>odrzucone</strong>.</p>
            ${noteHtml}
            <p>${signatureHtml()}</p>
        `,
    });
}

// status back to (or kept) pending with a note: the participant can edit again
async function sendChangesRequestedEmail({ submission, user, adminNote }) {
    if (!user?.email || !adminNote) return { sent: false, reason: "not_applicable" };

    const firstName = user.first_name || submission.first_name || "Użytkowniku";
    const carBrand = submission.car_brand || "Twój pojazd";
    const panelUrl = `${getAppUrl()}/panel`;
    const intro = `Organizator prosi o uzupełnienie zgłoszenia ${carBrand} (${submission.license_plate}) do strefy Select.`;
    const after = "Zaloguj się do panelu, popraw dane lub zdjęcia i kliknij „Wyślij poprawki” — organizator ponownie rozpatrzy zgłoszenie.";

    return sendMail({
        to: user.email,
        subject: "Street Show: prośba o uzupełnienie zgłoszenia",
        text: [
            `Cześć ${firstName},`,
            "",
            intro,
            "",
            "Wiadomość od organizatora:",
            String(adminNote),
            "",
            `${after} ${panelUrl}`,
            "",
            signatureText(),
        ].join("\n"),
        html: `
            <p>Cześć ${escapeHtml(firstName)},</p>
            <p>${escapeHtml(intro)}</p>
            <p><strong>Wiadomość od organizatora:</strong><br>${escapeHtml(adminNote).replace(/\n/g, "<br>")}</p>
            <p>${escapeHtml(after)} <a href="${escapeHtml(panelUrl)}">Przejdź do panelu</a>.</p>
            <p>${signatureHtml()}</p>
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
            signatureText(),
            preferencesFooter().text,
        ].join("\n"),
        html: `
            <p>Cześć ${escapeHtml(name)},</p>
            ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
            ${details.length ? `<p>${details.map((line) => escapeHtml(line)).join("<br>")}</p>` : ""}
            <p>${escapeHtml(closing)}</p>
            <p><a href="${escapeHtml(panelUrl)}">Przejdź do panelu</a></p>
            <p>${signatureHtml()}</p>
            ${preferencesFooter().html}
        `,
    });
}

// transactional - sent regardless of notification settings
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
        text: [`Cześć ${name},`, "", ...lines, "", `Wejściówka: ${panelUrl}`, "", signatureText()].join("\n"),
        html: `
            <p>Cześć ${escapeHtml(name)},</p>
            ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
            <p><a href="${escapeHtml(panelUrl)}">Otwórz wejściówkę w panelu</a></p>
            <p>${signatureHtml()}</p>
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
            signatureText(),
        ].join("\n"),
        html: `
            <p>Cześć ${escapeHtml(firstName)},</p>
            <p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta.</p>
            <p><a href="${escapeHtml(resetUrl)}">Ustaw nowe hasło</a> (link ważny ${ttlMinutes} minut).</p>
            <p>Jeśli to nie Ty, zignoruj tę wiadomość — hasło pozostanie bez zmian.</p>
            <p>${signatureHtml()}</p>
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
            signatureText(),
        ].join("\n"),
        html: `
            <p>Cześć ${escapeHtml(firstName)},</p>
            <p>Twoje konto w serwisie Street Show jest gotowe. Potwierdź jeszcze, że ten adres należy do Ciebie — dzięki temu dostaniesz decyzję w sprawie zgłoszenia i ważne informacje o wydarzeniu.</p>
            <p><a href="${escapeHtml(url)}">Potwierdź adres e-mail</a> (link ważny ${ttlHours} godzin)</p>
            <p>Jeśli to nie Ty zakładałeś konto, zignoruj tę wiadomość.</p>
            <p>${signatureHtml()}</p>
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
            signatureText(),
        ].join("\n"),
        html: `
            <p>Cześć ${escapeHtml(firstName)},</p>
            <p>Ktoś (mamy nadzieję, że Ty) chce zmienić adres e-mail konta Street Show na <strong>${escapeHtml(newEmail)}</strong>.</p>
            <p><a href="${escapeHtml(url)}">Potwierdź zmianę adresu</a> (link ważny ${ttlHours} godzin)</p>
            <p>Jeśli to nie Ty, zignoruj tę wiadomość — adres się nie zmieni.</p>
            <p>${signatureHtml()}</p>
        `,
    });
}

function adminNotifyRecipients() {
    return String(process.env.ADMIN_NOTIFY_EMAIL || "").trim();
}

function formatPolishDateTime(date = new Date()) {
    return date.toLocaleString("pl-PL", {
        timeZone: "Europe/Warsaw",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// after change-password and reset-password; the link lets the real owner take the account back
async function sendPasswordChangedEmail({ user }) {
    const firstName = user.first_name || "Użytkowniku";
    const resetUrl = `${getAppUrl()}/nie-pamietam-hasla`;
    const when = formatPolishDateTime();

    return sendMail({
        to: user.email,
        subject: "Street Show: hasło zostało zmienione",
        text: [
            `Cześć ${firstName},`,
            "",
            `Hasło do Twojego konta Street Show zostało zmienione (${when}).`,
            "Jeśli to Ty — nic nie musisz robić.",
            "",
            "Jeśli to nie Ty, od razu ustaw nowe hasło. Link do zmiany przyjdzie na ten adres e-mail, a wszystkie urządzenia zostaną wylogowane:",
            resetUrl,
            "Odpisz też na tę wiadomość, żebyśmy mogli sprawdzić konto.",
            "",
            signatureText(),
        ].join("\n"),
        html: `
            <p>Cześć ${escapeHtml(firstName)},</p>
            <p>Hasło do Twojego konta Street Show zostało zmienione (${escapeHtml(when)}).<br>Jeśli to Ty — nic nie musisz robić.</p>
            <p><strong>Jeśli to nie Ty</strong>, od razu <a href="${escapeHtml(resetUrl)}">ustaw nowe hasło</a>. Link do zmiany przyjdzie na ten adres e-mail, a wszystkie urządzenia zostaną wylogowane. Odpisz też na tę wiadomość, żebyśmy mogli sprawdzić konto.</p>
            <p>${signatureHtml()}</p>
        `,
    });
}

// the row is already gone, so everything comes from a snapshot taken before deletion
async function sendAccountDeletedEmail({ email, firstName }) {
    const name = firstName || "Użytkowniku";
    return sendMail({
        to: email,
        subject: "Street Show: konto zostało usunięte",
        text: [
            `Cześć ${name},`,
            "",
            `Twoje konto Street Show (${email}) zostało usunięte (${formatPolishDateTime()}).`,
            "Usunęliśmy dane konta, zgłoszenia pojazdów, auta z garażu i wszystkie zdjęcia.",
            "",
            "Jeśli to nie Ty usunąłeś konto, odpisz na tę wiadomość.",
            "W każdej chwili możesz założyć nowe konto.",
            "",
            signatureText(),
        ].join("\n"),
        html: `
            <p>Cześć ${escapeHtml(name)},</p>
            <p>Twoje konto Street Show (${escapeHtml(email)}) zostało usunięte (${escapeHtml(formatPolishDateTime())}).
            Usunęliśmy dane konta, zgłoszenia pojazdów, auta z garażu i wszystkie zdjęcia.</p>
            <p>Jeśli to nie Ty usunąłeś konto, odpisz na tę wiadomość. W każdej chwili możesz założyć nowe konto.</p>
            <p>${signatureHtml()}</p>
        `,
    });
}

const STATUS_NAMES = {
    pending: "oczekuje",
    approved: "zaakceptowane",
    waitlist: "lista rezerwowa",
    rejected: "odrzucone",
    withdrawn: "rezygnacja",
};
const PAYMENT_NAMES = { unpaid: "nieopłacone", verification: "do weryfikacji", paid: "opłacone" };

// to every admin: payment details changed, a new admin, two-step login reset…
async function sendSecurityAlertEmail({ recipients, title, lines, actor = "", ip = "" }) {
    const to = [...new Set((recipients || []).filter(Boolean))].join(", ");
    if (!to) return { sent: false, reason: "no_recipients" };

    const meta = [
        `Kiedy: ${formatPolishDateTime()}`,
        actor ? `Kto: ${actor}` : "",
        ip ? `Adres IP: ${ip}` : "",
    ].filter(Boolean);
    const footer =
        "Jeśli to nie Ty ani nikt z organizatorów, od razu zmień hasło, sprawdź Dziennik działań w panelu administratora i ustawienia opłat.";

    return sendMail({
        to,
        subject: `Street Show — alert bezpieczeństwa: ${title}`,
        text: [title, "", ...lines, "", ...meta, "", footer].join("\n"),
        html: `
            <p><strong>${escapeHtml(title)}</strong></p>
            ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
            <p style="color:#555">${meta.map((line) => escapeHtml(line)).join("<br>")}</p>
            <p>${escapeHtml(footer)}</p>
        `,
    });
}

async function sendAccountDeletedAdminEmail({ email, name, submissions }) {
    const recipients = adminNotifyRecipients();
    if (!recipients || !submissions.length) return { sent: false, reason: "not_applicable" };

    const lines = submissions.map(
        (s) =>
            `${s.car_brand} — ${s.license_plate} (edycja ${s.edition}): ${STATUS_NAMES[s.status] || s.status}, ${PAYMENT_NAMES[s.payment_status] || s.payment_status}, tel. ${s.phone}`,
    );

    return sendMail({
        to: recipients,
        subject: `Street Show: uczestnik usunął konto (${email})`,
        text: [
            `${name || email} (${email}) usunął konto. Te zgłoszenia zniknęły z panelu:`,
            "",
            ...lines,
            "",
            "Wpis zostaje w dzienniku zdarzeń w panelu administratora.",
        ].join("\n"),
        html: `
            <p>${escapeHtml(name || email)} (${escapeHtml(email)}) usunął konto. Te zgłoszenia zniknęły z panelu:</p>
            <ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
            <p>Wpis zostaje w dzienniku zdarzeń w panelu administratora.</p>
        `,
    });
}

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

async function sendChangesSubmittedAdminEmail({ submission, userEmail }) {
    const recipients = adminNotifyRecipients();
    if (!recipients) return { sent: false, reason: "not_configured" };

    const adminUrl = `${getAppUrl()}/admin/zgloszenia?id=${encodeURIComponent(submission.id)}`;
    const name = `${submission.first_name} ${submission.last_name}`;
    const summary = `${submission.car_brand} — ${submission.license_plate}`;

    return sendMail({
        to: recipients,
        subject: `Street Show: poprawki do zgłoszenia (${summary})`,
        text: [
            "Uczestnik poprawił zgłoszenie do strefy Select i prosi o ponowne rozpatrzenie:",
            "",
            `Pojazd: ${summary}`,
            `Zgłaszający: ${name} (${userEmail})`,
            "",
            `Zobacz zgłoszenie w panelu: ${adminUrl}`,
        ].join("\n"),
        html: `
            <p>Uczestnik poprawił zgłoszenie do strefy Select i prosi o ponowne rozpatrzenie:</p>
            <p><strong>${escapeHtml(summary)}</strong><br>
            ${escapeHtml(name)} (${escapeHtml(userEmail)})</p>
            <p><a href="${escapeHtml(adminUrl)}">Zobacz zgłoszenie w panelu administratora</a></p>
        `,
    });
}

// withProof = false: the participant clicked "Zgłoś opłatę bez potwierdzenia"
async function sendPaymentProofAdminEmail({ submission, userEmail, withProof = true }) {
    const recipients = adminNotifyRecipients();
    if (!recipients) return { sent: false, reason: "not_configured" };

    const intro = withProof
        ? "Uczestnik dodał potwierdzenie przelewu za strefę Select:"
        : "Uczestnik zgłosił opłatę za strefę Select (bez potwierdzenia przelewu):";

    const adminUrl = `${getAppUrl()}/admin/zgloszenia?id=${encodeURIComponent(submission.id)}&tab=oplata`;
    const name = `${submission.first_name} ${submission.last_name}`;
    const summary = `${submission.car_brand} — ${submission.license_plate}`;

    return sendMail({
        to: recipients,
        subject: withProof
            ? `Street Show: nowe potwierdzenie przelewu (${submission.car_brand}, ${name})`
            : `Street Show: zgłoszona opłata do sprawdzenia (${submission.car_brand}, ${name})`,
        text: [
            intro,
            "",
            `Pojazd: ${summary}`,
            `Zgłaszający: ${name} (${userEmail})`,
            "",
            `Sprawdź opłatę w panelu: ${adminUrl}`,
        ].join("\n"),
        html: `
            <p>${escapeHtml(intro)}</p>
            <p><strong>${escapeHtml(summary)}</strong><br>
            ${escapeHtml(name)} (${escapeHtml(userEmail)})</p>
            <p><a href="${escapeHtml(adminUrl)}">Sprawdź opłatę w panelu administratora</a></p>
        `,
    });
}

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

async function sendThreadReplyEmail({ user, submission, body }) {
    if (!user?.email) return { sent: false, reason: "not_applicable" };
    const panelUrl = `${getAppUrl()}/panel`;
    const firstName = user.first_name || submission.first_name || "Uczestniku";
    const summary = `${submission.car_brand} (${submission.license_plate})`;
    const canReplyByEmail = Boolean(getReplyTo());
    const replyText = canReplyByEmail
        ? `Możesz odpowiedzieć na ten e-mail albo napisać w panelu przy zgłoszeniu: ${panelUrl}`
        : `Odpowiedz w swoim panelu: ${panelUrl}`;
    const replyHtml = canReplyByEmail
        ? `Możesz odpowiedzieć na ten e-mail albo napisać w <a href="${escapeHtml(panelUrl)}">panelu</a> przy zgłoszeniu.`
        : `<a href="${escapeHtml(panelUrl)}">Odpowiedz w swoim panelu</a> — odpowiedzi na ten e-mail nie trafią do organizatora.`;

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
            replyText,
            "",
            signatureText(),
            preferencesFooter().text,
        ].join("\n"),
        html: `
            <p>Cześć ${escapeHtml(firstName)},</p>
            <p>Organizator napisał w sprawie zgłoszenia <strong>${escapeHtml(summary)}</strong>:</p>
            <blockquote>${escapeHtml(body).replace(/\n/g, "<br>")}</blockquote>
            <p>${replyHtml}</p>
            <p>${signatureHtml()}</p>
            ${preferencesFooter().html}
        `,
    });
}

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

// one mail per recipient (no shared To/CC), throttled for smtp rate limits
async function sendGroupEmail({ recipients, subject, message }) {
    const results = { sent: 0, failed: 0 };

    for (const recipient of recipients) {
        const greeting = `Cześć ${recipient.first_name || ""}`.trim() + ",";
        const body = `${greeting}\n\n${message}\n\n${signatureText()}`;
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

async function sendDateSubscribeConfirmEmail({ email, token, edition }) {
    const url = `${getAppUrl()}/potwierdz-zapis?token=${encodeURIComponent(token)}`;
    const subject = `Potwierdź zapis – Street Show${edition ? ` ${edition}` : ""}`;

    return sendMail({
        to: email,
        subject,
        text: [
            "Cześć,",
            "",
            "Kliknij link, żeby potwierdzić, że chcesz dostać e-mail, gdy ogłosimy termin Street Show:",
            url,
            "",
            "Jeśli to nie Ty, zignoruj tę wiadomość — bez potwierdzenia nie wyślemy nic więcej.",
            "",
            signatureText(),
        ].join("\n"),
        html: `
            <p>Cześć,</p>
            <p>Kliknij przycisk, żeby potwierdzić, że chcesz dostać e-mail, gdy ogłosimy termin Street Show.</p>
            <p><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;background:#f4c542;color:#171717;font-weight:700;text-decoration:none;border-radius:4px">Potwierdzam</a></p>
            <p style="color:#777;font-size:12px">Jeśli to nie Ty, zignoruj tę wiadomość — bez potwierdzenia nie wyślemy nic więcej.</p>
            <p>${signatureHtml()}</p>
        `,
    });
}

// no account behind these addresses, so each mail has its own unsubscribe link
async function sendDateSubscribersEmail({ subscribers, subject, message, onSent }) {
    const results = { sent: 0, failed: 0 };

    for (const subscriber of subscribers) {
        const url = `${getAppUrl()}/wypisz?token=${subscriber.unsubscribe_token}`;
        const privacyUrl = `${getAppUrl()}/polityka-prywatnosci`;
        const body = `Cześć,\n\n${message}\n\n${signatureText()}`;
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
    sendDateSubscribeConfirmEmail,
    sendVerificationEmail,
    sendEmailChangeEmail,
    sendSubmissionStatusEmail,
    sendChangesRequestedEmail,
    sendPasswordResetEmail,
    sendPasswordChangedEmail,
    sendAccountDeletedEmail,
    sendAccountDeletedAdminEmail,
    sendSecurityAlertEmail,
    sendNewSubmissionAdminEmail,
    sendPaymentProofAdminEmail,
    sendChangesSubmittedAdminEmail,
    sendWithdrawalAdminEmail,
    sendPaymentReminderEmail,
    sendPaymentConfirmedEmail,
    sendThreadReplyEmail,
    sendThreadAdminEmail,
    sendTestEmail,
};
