import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import { plural } from "../../utils/plural";
import AdminHeading from "./AdminHeading";
import { errorMessage } from "./shared";

const ACTION_LABELS = {
    "submission.pending": "ustawił zgłoszenie jako oczekujące",
    "submission.approved": "zaakceptował zgłoszenie",
    "submission.rejected": "odrzucił zgłoszenie",
    "submission.waitlist": "dodał zgłoszenie do listy rezerwowej",
    "submission.withdrawn": "oznaczył rezygnację uczestnika",
    "submission.withdrawn_by_user": "zrezygnował z udziału (uczestnik)",
    "submission.payment_reminder_sent": "wysłano przypomnienie o opłacie",
    "submission.report_viewed": "otworzył raport po wydarzeniu",
    "submission.message_sent": "napisał do uczestnika",
    "submission.showcase_hidden": "ukrył auto na stronie Auta strefy Select",
    "submission.showcase_shown": "przywrócił auto na stronie Auta strefy Select",
    "submission.deleted": "usunął zgłoszenie",
    "submission.checked_in": "zarejestrował wjazd",
    "submission.checkin_undone": "cofnął wjazd",
    "submission.payment_unpaid": "cofnął potwierdzenie opłaty",
    "submission.payment_verification": "zgłosił opłatę do weryfikacji",
    "submission.payment_paid": "potwierdził opłacenie zgłoszenia",
    "submission.exported": "wyeksportował zgłoszenia do Excela",
    "submission.gate_list_printed": "wydrukował listę na bramę",
    "submission.list_viewed": "przeglądał listę zgłoszeń",
    "submission.gate_list_viewed": "otworzył listę aut przy wjeździe",
    "user.list_viewed": "przeglądał listę użytkowników",
    "user.role_changed": "zmienił rolę użytkownika",
    "user.blocked": "zablokował użytkownika",
    "user.unblocked": "odblokował użytkownika",
    "user.sessions_revoked": "wylogował użytkownika ze wszystkich urządzeń",
    "user.gate_staff_granted": "nadał obsługę wjazdu",
    "user.gate_staff_revoked": "odebrał obsługę wjazdu",
    "event.content_updated": "zaktualizował treść Eventu",
    "home.content_updated": "zaktualizował treść Home",
    "gallery.content_updated": "zaktualizował podgląd galerii",
    "gallery.synced": "uruchomił synchronizację galerii z Dyskiem Google",
    "gallery.album_created": "dodał album galerii",
    "gallery.album_updated": "zmienił album galerii",
    "gallery.album_deleted": "usunął album galerii",
    "contact.content_updated": "zaktualizował treść Kontaktu",
    "faq.content_updated": "zaktualizował FAQ",
    "regulamin.content_updated": "zaktualizował regulamin",
    "privacy.content_updated": "zaktualizował politykę prywatności",
    "submission.internal_note_updated": "zmienił notatkę wewnętrzną zgłoszenia",
    "select.content_updated": "zaktualizował sekcję Strefa Select",
    "announcement.content_updated": "zmienił ogłoszenie na stronie",
    "partners.content_updated": "zaktualizował partnerów",
    "edition.content_updated": "zmienił edycję wydarzenia",
    "settings.updated": "zmienił ustawienia zgłoszeń",
    "templates.content_updated": "zmienił szablony wiadomości",
    "email.group_sent": "wysłał wiadomość do uczestników",
    "date_subscribers.notified": "wysłał powiadomienie o dacie do listy zapisanych",
    "date_subscribers.exported": "pobrał listę zapisanych na powiadomienie o dacie",
    "system.test_email_sent": "wysłał testowy e-mail",
};

function describeAction(entry) {
    if (ACTION_LABELS[entry.action]) return ACTION_LABELS[entry.action];
    if (entry.action.endsWith(".content_restored")) {
        return "przywrócił poprzednią wersję treści";
    }
    return entry.action;
}

function describeDetails(entry) {
    const details = entry.details || {};
    if (details.adminNote) return ` — „${details.adminNote}”`;
    if (details.title) return ` — „${details.title}”`;
    if (entry.action === "edition.content_updated" && details.year) {
        return ` — rok ${details.previousYear} → ${details.year}`;
    }
    if (entry.action === "email.group_sent") {
        return details.panelOnly
            ? ` — „${details.subject}”: w panelu ${details.recipients} osób (bez e-maili)`
            : ` — „${details.subject}”: wysłano ${details.sent}, błędy ${details.failed}`;
    }
    if (details.licensePlate) return ` — ${details.licensePlate}`;
    if (typeof details.count === "number") {
        return ` — ${plural(details.count, "rekord", "rekordy", "rekordów")}`;
    }
    if (entry.action.endsWith(".content_restored")) {
        return ` (${entry.targetType})`;
    }
    return "";
}

const LIMIT_OPTIONS = [50, 100, 250, 500];

function Target({ entry }) {
    if (entry.details?.email) return <>{entry.details.email}</>;
    if (entry.targetType === "submission" && entry.targetId) {
        return <Link to={`/admin/zgloszenia?id=${entry.targetId}`}>zgłoszenie #{entry.targetId}</Link>;
    }
    return null;
}

// Opening lists and reports is logged too; by default only real changes are shown.
function isView(action) {
    return /(_viewed|\.viewed|\.listed)$/.test(action);
}

const DECISIONS = /^submission\.(pending|approved|rejected|waitlist|withdrawn|withdrawn_by_user|payment_\w+)$/;

function entryIcon(action) {
    if (isView(action)) return "bi-eye";
    if (action === "submission.checked_in" || action === "submission.checkin_undone") return "bi-box-arrow-in-right";
    if (DECISIONS.test(action)) return "bi-check2";
    return "bi-pencil";
}

function entryDate(value) {
    return new Date(`${value.replace(" ", "T")}Z`);
}

// "Dziś", "Wczoraj" or "7 października 2026" (local time).
function dayLabel(date) {
    const day = date.toLocaleDateString("sv-SE");
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86400000);
    if (day === today.toLocaleDateString("sv-SE")) return "Dziś";
    if (day === yesterday.toLocaleDateString("sv-SE")) return "Wczoraj";
    return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

const CATEGORY_OPTIONS = [
    ["submission.", "Zgłoszenia"],
    ["user.", "Użytkownicy"],
    ["settings.", "Ustawienia"],
    ["templates.", "Szablony wiadomości"],
    ["edition.", "Edycja wydarzenia"],
    ["gallery.", "Galeria"],
    ["email.", "E-maile"],
    ["event.", "Event"],
    ["home.", "Home"],
    ["contact.", "Kontakt"],
    ["faq.", "FAQ"],
    ["regulamin.", "Regulamin"],
    ["announcement.", "Ogłoszenie"],
    ["partners.", "Partnerzy"],
];

export default function AuditLog({ refreshKey }) {
    const [entries, setEntries] = useState([]);
    const [limit, setLimit] = useState(100);
    // "" = changes only, "*" = everything incl. viewing, "prefix." = changes in one area.
    const [actionFilter, setActionFilter] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        api.get("/admin/audit-log", { params: { limit } })
            .then(({ data }) => setEntries(data.entries))
            .catch((err) =>
                setError(
                    errorMessage(err, "Nie udało się pobrać dziennika działań."),
                ),
            );
    }, [refreshKey, limit]);

    const visibleEntries = entries.filter((entry) => {
        if (actionFilter === "*") return true;
        if (isView(entry.action)) return false;
        return !actionFilter || entry.action.startsWith(actionFilter);
    });

    const days = [];
    for (const entry of visibleEntries) {
        const date = entryDate(entry.createdAt);
        const label = dayLabel(date);
        if (days.at(-1)?.label !== label) days.push({ label, entries: [] });
        days.at(-1).entries.push({ entry, date });
    }

    return (
        <section className="admin-section audit-section">
            <AdminHeading title="Dziennik działań" description="Kto i kiedy zmienił coś w panelu." />
            <div className="admin-filters audit-filters">
                <label>
                    <span className="field-label">Rodzaj działań</span>
                    <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
                        <option value="">Zmiany</option>
                        <option value="*">Wszystko, łącznie z przeglądaniem</option>
                        {CATEGORY_OPTIONS.map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    <span className="field-label">Wpisów</span>
                    <select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
                        {LIMIT_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            {error && <p className="form-error">{error}</p>}
            {days.length === 0 ? (
                <p className="admin-hint">Brak zarejestrowanych działań.</p>
            ) : (
                days.map((day) => (
                    <div className="audit-day" key={day.label}>
                        <h3 className="audit-day-title">{day.label}</h3>
                        <ul className="audit-list">
                            {day.entries.map(({ entry, date }) => (
                                <li className="audit-entry" key={entry.id}>
                                    <i className={`bi ${entryIcon(entry.action)}`} aria-hidden="true" />
                                    <div>
                                        <p>
                                            <strong>{entry.adminEmail || "System"}</strong> {describeAction(entry)}{" "}
                                            <Target entry={entry} />
                                        </p>
                                        <p className="audit-meta">
                                            {date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                                            {describeDetails(entry)}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))
            )}
        </section>
    );
}
