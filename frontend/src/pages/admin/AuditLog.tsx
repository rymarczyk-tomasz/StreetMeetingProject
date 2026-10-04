import { useEffect, useState } from "react";
import api from "../../api/client";
import { errorMessage, formatDate } from "./shared";

const ACTION_LABELS = {
    "submission.pending": "ustawił zgłoszenie jako oczekujące",
    "submission.approved": "zaakceptował zgłoszenie",
    "submission.rejected": "odrzucił zgłoszenie",
    "submission.deleted": "usunął zgłoszenie",
    "submission.payment_unpaid": "cofnął potwierdzenie opłaty",
    "submission.payment_verification": "zgłosił opłatę do weryfikacji",
    "submission.payment_paid": "potwierdził opłacenie zgłoszenia",
    "user.role_changed": "zmienił rolę użytkownika",
    "user.blocked": "zablokował użytkownika",
    "user.unblocked": "odblokował użytkownika",
    "user.sessions_revoked": "wylogował użytkownika ze wszystkich urządzeń",
    "event.content_updated": "zaktualizował treść Eventu",
    "home.content_updated": "zaktualizował treść Home",
    "gallery.content_updated": "zaktualizował treść Galerii",
    "gallery.synced": "zsynchronizował galerię z Dyskiem Google",
    "contact.content_updated": "zaktualizował treść Kontaktu",
    "settings.updated": "zmienił ustawienia zgłoszeń",
};

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
                        <option value="event.">Event</option>
                        <option value="home.">Home</option>
                        <option value="gallery.">Galeria</option>
                        <option value="contact.">Kontakt</option>
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
                            <strong>{entry.adminEmail}</strong>{" "}
                            {ACTION_LABELS[entry.action] || entry.action}{" "}
                            {describeTarget(entry)}
                            <span>
                                {formatDate(entry.createdAt)}
                                {entry.details?.adminNote &&
                                    ` — „${entry.details.adminNote}”`}
                            </span>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
