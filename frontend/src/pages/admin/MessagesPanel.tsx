import { useEffect, useState } from "react";
import api from "../../api/client";
import Plate from "../../components/Plate";
import { errorMessage, formatDate } from "./shared";

// Every conversation with participants (GET /admin/threads), unread first.
// A row opens the submission in Zgłoszenia on the "Wiadomości" tab.
export default function MessagesPanel({ refreshKey, onOpen }) {
    const [threads, setThreads] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        api.get("/admin/threads")
            .then(({ data }) => {
                setThreads(data.threads);
                setError("");
            })
            .catch((err) => setError(errorMessage(err, "Nie udało się pobrać wiadomości.")));
    }, [refreshKey]);

    if (error) return <p className="form-error">{error}</p>;
    if (!threads) return <p className="page-status">Ładowanie...</p>;
    if (!threads.length) {
        return (
            <div className="admin-card">
                <p className="admin-hint">
                    Nie ma jeszcze żadnych wiadomości. Uczestnicy piszą z panelu przy swoim
                    zgłoszeniu, a Ty odpowiadasz w Zgłoszeniach → zakładka „Wiadomości”.
                </p>
            </div>
        );
    }

    return (
        <ul className="admin-threads">
            {threads.map((thread) => (
                <li key={thread.submissionId}>
                    <button
                        type="button"
                        className={`admin-thread${thread.unread ? " is-unread" : ""}`}
                        onClick={() =>
                            onOpen("zgloszenia", {
                                edycja: "all",
                                id: String(thread.submissionId),
                                tab: "wiadomosci",
                            })
                        }
                    >
                        <span className="admin-thread-car">
                            <strong>{thread.carBrand}</strong>
                            <Plate value={thread.licensePlate} size="sm" />
                        </span>
                        <span className="admin-thread-body">
                            <span className="admin-thread-meta">
                                {thread.name} · edycja {thread.edition}
                            </span>
                            <span className="admin-thread-last">
                                {thread.lastFromAdmin ? "Ty: " : ""}
                                {thread.lastBody}
                            </span>
                        </span>
                        <span className="admin-thread-side">
                            <span className="admin-thread-time">{formatDate(thread.lastAt)}</span>
                            {thread.unread > 0 && (
                                <span className="admin-nav-count is-yellow">{thread.unread}</span>
                            )}
                        </span>
                        <i className="bi bi-chevron-right" aria-hidden="true" />
                    </button>
                </li>
            ))}
        </ul>
    );
}
