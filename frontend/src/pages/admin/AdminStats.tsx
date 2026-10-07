import { plural } from "../../utils/plural";

export function BarList({ title, rows, emptyText }) {
    const max = Math.max(1, ...rows.map((row) => row.count));

    return (
        <div className="admin-chart">
            <h3>{title}</h3>
            {rows.length === 0 ? (
                <p className="admin-hint">{emptyText}</p>
            ) : (
                rows.map((row) => (
                    <div className="admin-bar-row" key={row.label}>
                        <span>{row.label}</span>
                        <span className="admin-bar-track">
                            <span
                                className="admin-bar-fill"
                                style={{
                                    display: "block",
                                    width: `${(row.count / max) * 100}%`,
                                }}
                            />
                        </span>
                        <strong>{row.count}</strong>
                    </div>
                ))
            )}
        </div>
    );
}

function formatDay(day) {
    return new Intl.DateTimeFormat("pl-PL", {
        day: "numeric",
        month: "short",
    }).format(new Date(`${day}T12:00:00`));
}

// Rows link to the filtered submissions list (or the date list); empty when nothing waits.
function buildTodos(stats) {
    const { submissions } = stats;
    const todos = [];
    if (submissions.pending) {
        todos.push({
            icon: "hourglass-split",
            text: `${plural(submissions.pending, "zgłoszenie czeka", "zgłoszenia czekają", "zgłoszeń czeka")} na decyzję`,
            open: ["zgloszenia", { status: "pending" }],
        });
    }
    if (submissions.paymentVerification) {
        todos.push({
            icon: "receipt",
            text: `${plural(submissions.paymentVerification, "opłata", "opłaty", "opłat")} do weryfikacji`,
            open: ["zgloszenia", { platnosc: "verification" }],
        });
    }
    if (submissions.overdue) {
        todos.push({
            icon: "exclamation-triangle",
            text: `${plural(submissions.overdue, "zgłoszenie", "zgłoszenia", "zgłoszeń")} po terminie płatności`,
            open: ["zgloszenia", { platnosc: "overdue" }],
            tone: "danger",
        });
    }
    if (stats.unreadMessages) {
        todos.push({
            icon: "chat-dots",
            text: `${plural(stats.unreadMessages, "nieprzeczytana wiadomość", "nieprzeczytane wiadomości", "nieprzeczytanych wiadomości")} od uczestników`,
            open: ["zgloszenia", { edycja: "all", nieprzeczytane: "1" }],
        });
    }
    if (stats.freePlaces > 0 && submissions.waitlist) {
        todos.push({
            icon: "list-ol",
            text: `Wolne miejsca: ${stats.freePlaces}, na liście rezerwowej: ${submissions.waitlist}`,
            open: ["zgloszenia", { status: "waitlist" }],
        });
    }
    if (stats.dateSubscribers?.pending && stats.dateSubscribers.editionHasDate) {
        todos.push({
            icon: "envelope",
            text: `${plural(stats.dateSubscribers.pending, "osoba czeka", "osoby czekają", "osób czeka")} na datę – wyślij powiadomienie`,
            open: ["ustawienia", { zakladka: "powiadomienia" }],
        });
    }
    return todos;
}

function TodoList({ stats, onOpen }) {
    const todos = buildTodos(stats);

    return (
        <section className="admin-todo" aria-labelledby="admin-todo-title">
            <h3 id="admin-todo-title">Do zrobienia</h3>
            {todos.length === 0 ? (
                <p className="admin-todo-empty">
                    <i className="bi bi-check-circle" aria-hidden="true" /> Nic nie czeka — wszystko
                    ogarnięte.
                </p>
            ) : (
                <ul>
                    {todos.map((todo) => (
                        <li key={todo.text}>
                            <button
                                type="button"
                                className={`admin-todo-item${todo.tone ? ` is-${todo.tone}` : ""}`}
                                onClick={() => onOpen(...todo.open)}
                            >
                                <i className={`bi bi-${todo.icon}`} aria-hidden="true" />
                                <span>{todo.text}</span>
                                <i className="bi bi-chevron-right" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export default function AdminStats({ stats, error, onOpen }) {
    if (error && !stats) return <p className="form-error">{error}</p>;
    if (!stats) return <p className="page-status">Ładowanie statystyk...</p>;

    const { submissions, users, capacity, availability } = stats;
    const capacityPercent = capacity
        ? Math.min(100, Math.round((submissions.approved / capacity) * 100))
        : 0;

    return (
        <>
            {!availability.open && (
                <p className="payment-alert">{availability.reason}</p>
            )}
            <TodoList stats={stats} onOpen={onOpen} />
            <p className="admin-hint">
                Statystyki zgłoszeń dla edycji <strong>{stats.edition}</strong>{" "}
                (zmiana roku: Ustawienia → Edycja wydarzenia).
            </p>
            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <span>Wszystkie zgłoszenia</span>
                    <strong>{submissions.total}</strong>
                    <small>{submissions.rejected} odrzuconych</small>
                </div>
                <div className="admin-stat-card admin-stat-pending">
                    <span>Oczekujące</span>
                    <strong>{submissions.pending}</strong>
                </div>
                <div className="admin-stat-card">
                    <span>Lista rezerwowa</span>
                    <strong>{submissions.waitlist}</strong>
                    <small>
                        {submissions.withdrawn} rezygnacji
                        {stats.freePlaces ? ` · wolne miejsca: ${stats.freePlaces}` : ""}
                    </small>
                </div>
                <div className="admin-stat-card admin-stat-approved">
                    <span>Zaakceptowane</span>
                    <strong>
                        {submissions.approved}
                        {capacity ? ` / ${capacity}` : ""}
                    </strong>
                    {capacity > 0 && (
                        <div
                            className={`admin-capacity-meter${capacityPercent >= 100 ? " is-full" : ""}`}
                            title={`${capacityPercent}% miejsc w strefie Select`}
                        >
                            <span style={{ width: `${capacityPercent}%` }} />
                        </div>
                    )}
                </div>
                <div className="admin-stat-card">
                    <span>Opłaty (zaakceptowane)</span>
                    <strong>{submissions.paid}</strong>
                    <small>
                        {submissions.paymentVerification} do weryfikacji,{" "}
                        {submissions.unpaid} nieopłaconych
                        {submissions.overdue ? `, ${submissions.overdue} po terminie` : ""}
                    </small>
                </div>
                <div className="admin-stat-card">
                    <span>Użytkownicy</span>
                    <strong>{users.total}</strong>
                    <small>{users.active} aktywnych</small>
                </div>
            </div>
            <BarList
                title="Zgłoszenia w ostatnich 30 dniach"
                emptyText="Brak zgłoszeń w ostatnich 30 dniach."
                rows={stats.perDay.map((row) => ({
                    label: formatDay(row.day),
                    count: row.count,
                }))}
            />
            <BarList
                title="Najczęściej zgłaszane marki"
                emptyText="Brak zgłoszeń."
                rows={stats.topBrands.map((row) => ({
                    label: row.brand,
                    count: row.count,
                }))}
            />
        </>
    );
}
