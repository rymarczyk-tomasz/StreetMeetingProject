import { useEffect, useState } from "react";
import api from "../../api/client";
import { plural } from "../../utils/plural";
import { errorMessage, formatDate } from "./shared";

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

function describeTarget(entry) {
    if (entry.details?.email) return entry.details.email;
    if (entry.targetType === "submission" && entry.targetId) {
        return `zgłoszenie #${entry.targetId}`;
    }
    return "";
}

export default function AuditLog({ refreshKey }) {
    const [entries, setEntries] = useState([]);
    const [limit, setLimit] = useState(100);
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

    const visibleEntries = actionFilter
        ? entries.filter((entry) => entry.action.startsWith(actionFilter))
        : entries;

    return (
        <section className="audit-section">
            <h2>Dziennik działań</h2>
            <div className="admin-filters">
                <label>
                    Rodzaj działań
                    <select
                        value={actionFilter}
                        onChange={(event) => setActionFilter(event.target.value)}
                    >
                        <option value="">Wszystkie</option>
                        <option value="submission.">Zgłoszenia</option>
                        <option value="user.">Użytkownicy</option>
                        <option value="settings.">Ustawienia</option>
                        <option value="templates.">Szablony wiadomości</option>
                        <option value="edition.">Edycja wydarzenia</option>
                        <option value="gallery.">Galeria</option>
                        <option value="email.">E-maile</option>
                        <option value="event.">Event</option>
                        <option value="home.">Home</option>
                        <option value="contact.">Kontakt</option>
                        <option value="faq.">FAQ</option>
                        <option value="regulamin.">Regulamin</option>
                        <option value="announcement.">Ogłoszenie</option>
                        <option value="partners.">Partnerzy</option>
                    </select>
                </label>
                <label>
                    Liczba wpisów
                    <select
                        value={limit}
                        onChange={(event) =>
                            setLimit(Number(event.target.value))
                        }
                    >
                        {LIMIT_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            {error && <p className="form-error">{error}</p>}
            {visibleEntries.length === 0 ? (
                <p>Brak zarejestrowanych działań.</p>
            ) : (
                <div className="audit-list">
                    {visibleEntries.map((entry) => (
                        <article className="audit-entry" key={entry.id}>
                            <strong>{entry.adminEmail || "System"}</strong>{" "}
                            {describeAction(entry)} {describeTarget(entry)}
                            <span>
                                {formatDate(entry.createdAt)}
                                {describeDetails(entry)}
                            </span>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
