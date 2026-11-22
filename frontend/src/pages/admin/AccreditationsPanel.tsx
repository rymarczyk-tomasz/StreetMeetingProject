import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import { askConfirm } from "../../api/confirm";
import AdminDialog from "./AdminDialog";
import AdminHeading from "./AdminHeading";
import { errorMessage, formatDate } from "./shared";

const STATUS = { pending: "Oczekuje", approved: "Zaakceptowana", rejected: "Odrzucona" };

const FILTERS = [
    ["", "Wszystkie"],
    ["pending", "Oczekujące"],
    ["approved", "Zaakceptowane"],
    ["rejected", "Odrzucone"],
];

function DecisionDialog({ decision, onClose, onSent }) {
    const { row, status, signature } = decision;
    const [subject, setSubject] = useState(decision.subject);
    const [message, setMessage] = useState(decision.message);
    const [error, setError] = useState("");
    const [isSending, setIsSending] = useState(false);
    const approve = status === "approved";

    async function send(event) {
        event.preventDefault();
        setIsSending(true);
        setError("");
        try {
            await api.patch(`/admin/accreditations/${row.id}/status`, { status, subject, message });
            onSent();
        } catch (err) {
            setError(errorMessage(err, "Nie udało się wysłać. Spróbuj ponownie."));
            setIsSending(false);
        }
    }

    return (
        <AdminDialog wide title={approve ? "Przyznanie akredytacji" : "Odrzucenie wniosku"} onClose={onClose}>
            <form className="event-editor" onSubmit={send}>
                <p className="admin-hint">
                    Do: <strong>{row.name}</strong> ({row.email}). Sprawdź i w razie potrzeby popraw wiadomość. Zmiany
                    dotyczą tylko tego e-maila, szablon zostaje bez zmian.
                </p>
                <label>
                    <span className="field-label">Temat</span>
                    <input value={subject} maxLength={200} onChange={(event) => setSubject(event.target.value)} required />
                </label>
                <label>
                    <span className="field-label">Treść</span>
                    <textarea rows={11} value={message} maxLength={5000} onChange={(event) => setMessage(event.target.value)} required />
                </label>
                <p className="admin-hint accreditation-signature">
                    Podpis doda się sam:{"\n"}
                    <strong>{signature}</strong>
                </p>
                {error && (
                    <p className="form-error" role="alert">
                        {error}
                    </p>
                )}
                <div className="submission-actions">
                    <button type="submit" disabled={isSending}>
                        {isSending ? "Wysyłanie..." : approve ? "Akceptuj i wyślij" : "Odrzuć i wyślij"}
                    </button>
                    <button type="button" className="text-action" onClick={onClose}>
                        Anuluj
                    </button>
                </div>
            </form>
        </AdminDialog>
    );
}

export default function AccreditationsPanel({ edition, onAction }) {
    const [rows, setRows] = useState(null);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(null);
    const [decision, setDecision] = useState(null);
    const [filter, setFilter] = useState("");

    const load = useCallback(() => {
        api.get("/admin/accreditations", { params: { edition: edition || undefined } })
            .then(({ data }) => setRows(data.accreditations))
            .catch((err) => setError(errorMessage(err, "Nie udało się pobrać akredytacji.")));
    }, [edition]);

    useEffect(load, [load]);

    async function run(row, confirmation, request) {
        if (!(await askConfirm(confirmation))) return;
        setBusyId(row.id);
        setError("");
        try {
            await request();
            onAction?.();
        } catch (err) {
            setError(errorMessage(err, "Nie udało się. Spróbuj ponownie."));
        } finally {
            setBusyId(null);
            load();
        }
    }

    async function decide(row, status) {
        setBusyId(row.id);
        setError("");
        try {
            const { data } = await api.get(`/admin/accreditations/${row.id}/draft`, { params: { status } });
            setDecision({ row, status, ...data });
        } catch (err) {
            setError(errorMessage(err, "Nie udało się przygotować wiadomości."));
        } finally {
            setBusyId(null);
        }
    }

    function onSent() {
        setDecision(null);
        onAction?.();
        load();
    }

    function remove(row) {
        return run(
            row,
            {
                title: "Usunąć wniosek?",
                message: `Dane z wniosku (${row.name}) zostaną trwale usunięte. E-mail nie zostanie wysłany.`,
                confirmLabel: "Usuń",
                danger: true,
            },
            () => api.delete(`/admin/accreditations/${row.id}`),
        );
    }

    const visible = rows?.filter((row) => !filter || row.status === filter) ?? [];

    return (
        <div className="admin-section">
            <AdminHeading
                title="Akredytacje"
                description="Wnioski mediów ze strony /akredytacje. Przed wysłaniem decyzji zobaczysz e-mail i możesz go poprawić. Akredytacja nie daje wejściówki QR."
            />
            {error && (
                <p className="form-error" role="alert">
                    {error}
                </p>
            )}
            {decision && <DecisionDialog decision={decision} onClose={() => setDecision(null)} onSent={onSent} />}
            {!rows && !error && <p className="admin-hint">Ładowanie...</p>}
            {rows?.length === 0 && <p className="admin-hint">Brak wniosków o akredytację.</p>}
            {rows?.length > 0 && (
                <div className="subs-chip-group accreditation-filters" role="group" aria-label="Status wniosków">
                    {FILTERS.map(([status, label]) => (
                        <button
                            key={label}
                            type="button"
                            className={`subs-chip${filter === status ? " is-active" : ""}`}
                            aria-pressed={filter === status}
                            onClick={() => setFilter(status)}
                        >
                            {label}{" "}
                            <span>{status ? rows.filter((row) => row.status === status).length : rows.length}</span>
                        </button>
                    ))}
                </div>
            )}
            {rows?.length > 0 && visible.length === 0 && <p className="admin-hint">Brak wniosków z tym statusem.</p>}
            {visible.length > 0 && (
                <div className="admin-table-wrapper">
                    <table className="admin-table accreditation-table">
                        <thead>
                            <tr>
                                <th>Osoba</th>
                                <th>Kontakt</th>
                                <th>Instagram</th>
                                <th>Status</th>
                                <th>Działania</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((row) => (
                                <tr key={row.id}>
                                    <td>
                                        <strong>{row.name}</strong>
                                        <small>
                                            {formatDate(row.createdAt)}
                                            {edition === "all" ? ` · edycja ${row.edition}` : ""}
                                        </small>
                                    </td>
                                    <td>
                                        <a href={`mailto:${row.email}`}>{row.email}</a>
                                        <small>
                                            <a href={`tel:${row.phone}`}>{row.phone}</a>
                                        </small>
                                    </td>
                                    <td>
                                        <a href={row.instagramUrl} target="_blank" rel="noopener noreferrer">
                                            @{row.instagramUrl.split("/")[3]}
                                        </a>
                                    </td>
                                    <td>
                                        <span className={`status-badge status-${row.status}`}>{STATUS[row.status]}</span>
                                    </td>
                                    <td>
                                        <div className="submission-actions">
                                            {row.status !== "approved" && (
                                                <button type="button" disabled={busyId === row.id} onClick={() => decide(row, "approved")}>
                                                    Akceptuj
                                                </button>
                                            )}
                                            {row.status !== "rejected" && (
                                                <button type="button" disabled={busyId === row.id} onClick={() => decide(row, "rejected")}>
                                                    Odrzuć
                                                </button>
                                            )}
                                            <button type="button" disabled={busyId === row.id} onClick={() => remove(row)}>
                                                Usuń
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
