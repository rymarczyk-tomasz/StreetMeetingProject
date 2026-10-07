import { useContent } from "../../api/content";
import { formatEditionDate } from "../../utils/edition";
import { plural } from "../../utils/plural";
import AdminHeading from "./AdminHeading";
import { formatDay } from "./shared";

const EDITION_KEYS = ["edition"];

// "3 zgłoszenia czekają" → "Zgłoszenia czekają" (the number is shown separately).
function words(count, one, few, many) {
    const text = plural(count, one, few, many).replace(/^\d+ /, "");
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function shortDay(day) {
    return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" }).format(
        new Date(`${day}T12:00:00`),
    );
}

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
                                style={{ display: "block", width: `${(row.count / max) * 100}%` }}
                            />
                        </span>
                        <strong>{row.count}</strong>
                    </div>
                ))
            )}
        </div>
    );
}

// Last 30 days as columns; the busiest day is yellow, today black.
function DailyChart({ perDay }) {
    const byDay = new Map<string, number>(perDay.map((row) => [row.day, Number(row.count)]));
    const days = Array.from({ length: 30 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - index));
        const day = date.toLocaleDateString("sv-SE");
        return { day, count: byDay.get(day) || 0 };
    });
    const total = days.reduce((sum, row) => sum + row.count, 0);
    const max = Math.max(0, ...days.map((row) => row.count));
    const busiest = days.find((row) => row.count === max && max > 0);

    return (
        <div className="admin-chart">
            <div className="admin-chart-head">
                <h3>Zgłoszenia – 30 dni</h3>
                <span>razem {total}</span>
            </div>
            <div className="admin-columns" role="img" aria-label={`Zgłoszenia z 30 dni: razem ${total}`}>
                {days.map((row, index) => (
                    <span
                        key={row.day}
                        title={`${shortDay(row.day)}: ${row.count}`}
                        className={
                            index === days.length - 1 ? "is-today" : row === busiest ? "is-max" : ""
                        }
                        style={{ height: `${max ? (row.count / max) * 100 : 0}%` }}
                    />
                ))}
            </div>
            <div className="admin-chart-foot">
                <span>{shortDay(days[0].day)}</span>
                <span>{busiest ? `najwięcej: ${shortDay(busiest.day)} (${busiest.count})` : "brak zgłoszeń"}</span>
                <span>dziś</span>
            </div>
        </div>
    );
}

// Rows link to the filtered lists; rows with nothing to do are left out.
function buildTodos(stats, system) {
    const { submissions } = stats;
    const todos = [];
    if (submissions.approved > 0 && stats.paymentDetailsMissing) {
        todos.push({
            alert: true,
            title: "Brak danych do przelewu",
            text: "Zaakceptowani uczestnicy nie widzą, ile i gdzie zapłacić",
            action: "Uzupełnij",
            open: ["ustawienia", { zakladka: "oplaty" }],
        });
    }
    if (submissions.pending) {
        todos.push({
            count: submissions.pending,
            title: `${words(submissions.pending, "zgłoszenie czeka", "zgłoszenia czekają", "zgłoszeń czeka")} na decyzję`,
            text: stats.oldestPendingAt ? `najstarsze z ${formatDay(stats.oldestPendingAt.slice(0, 10))}` : "",
            action: "Rozpatrz",
            open: ["zgloszenia", { status: "pending" }],
        });
    }
    if (submissions.paymentVerification) {
        todos.push({
            count: submissions.paymentVerification,
            title: words(submissions.paymentVerification, "opłata do weryfikacji", "opłaty do weryfikacji", "opłat do weryfikacji"),
            text: "uczestnicy zgłosili opłatę lub dodali potwierdzenie przelewu",
            action: "Sprawdź",
            open: ["zgloszenia", { platnosc: "verification" }],
        });
    }
    if (submissions.overdue) {
        todos.push({
            count: submissions.overdue,
            tone: "danger",
            title: "Po terminie płatności",
            text: "przypomnienie wysłane · rozważ listę rezerwową",
            action: "Pokaż",
            open: ["zgloszenia", { platnosc: "overdue" }],
        });
    }
    if (stats.unreadMessages) {
        todos.push({
            count: stats.unreadMessages,
            plain: true,
            title: words(stats.unreadMessages, "nowa wiadomość od uczestnika", "nowe wiadomości od uczestników", "nowych wiadomości od uczestników"),
            text: "w wątkach zgłoszeń",
            action: "Odpowiedz",
            open: ["wiadomosci", {}],
        });
    }
    if (stats.freePlaces > 0 && submissions.waitlist) {
        todos.push({
            count: stats.freePlaces,
            title: words(stats.freePlaces, "wolne miejsce w strefie", "wolne miejsca w strefie", "wolnych miejsc w strefie"),
            text: `na liście rezerwowej: ${submissions.waitlist}`,
            action: "Wybierz auta",
            open: ["zgloszenia", { status: "waitlist" }],
        });
    }
    if (stats.dateSubscribers?.pending && stats.dateSubscribers.editionHasDate) {
        todos.push({
            count: stats.dateSubscribers.pending,
            title: `${words(stats.dateSubscribers.pending, "osoba czeka", "osoby czekają", "osób czeka")} na datę`,
            text: "data jest już ustawiona — wyślij jedną wiadomość z terminem",
            action: "Napisz",
            open: ["ustawienia", { zakladka: "powiadomienia" }],
        });
    }
    for (const check of system?.checks || []) {
        if (check.level !== "error") continue;
        todos.push({
            alert: true,
            title: check.label,
            text: check.detail,
            action: "Zobacz",
            open: ["system", {}],
        });
    }
    return todos;
}

function TodoList({ stats, system, onOpen }) {
    const todos = buildTodos(stats, system);

    return (
        <section className="admin-todo" aria-labelledby="admin-todo-title">
            <div className="admin-todo-head">
                <h3 id="admin-todo-title">Do zrobienia</h3>
                <span>{todos.length ? plural(todos.length, "sprawa", "sprawy", "spraw") : ""}</span>
            </div>
            {todos.length === 0 ? (
                <p className="admin-todo-empty">
                    <i className="bi bi-check-circle" aria-hidden="true" /> Wszystko załatwione.
                </p>
            ) : (
                <ul>
                    {todos.map((todo) => (
                        <li key={todo.title}>
                            <button
                                type="button"
                                className={`admin-todo-item${todo.alert ? " is-alert" : ""}${todo.tone ? ` is-${todo.tone}` : ""}`}
                                onClick={() => onOpen(...todo.open)}
                            >
                                <span className={`admin-todo-count${todo.plain ? " is-plain" : ""}`}>
                                    {todo.alert ? (
                                        <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
                                    ) : (
                                        todo.count
                                    )}
                                </span>
                                <span className="admin-todo-text">
                                    <strong>{todo.title}</strong>
                                    {todo.text && <span>{todo.text}</span>}
                                </span>
                                <span className="admin-todo-action">{todo.action}</span>
                                <i className="bi bi-chevron-right" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function Tile({ label, value, note = "", children = null }) {
    return (
        <div className="admin-stat-card">
            <span>{label}</span>
            <strong>{value}</strong>
            {children}
            {note && <small>{note}</small>}
        </div>
    );
}

export default function AdminStats({ stats, error, system, onOpen }) {
    const { content } = useContent(EDITION_KEYS);
    const edition = content?.edition;

    if (error && !stats) return <p className="form-error">{error}</p>;
    if (!stats) return <p className="page-status">Ładowanie statystyk...</p>;

    const { submissions, capacity, availability } = stats;
    const capacityPercent = capacity ? Math.min(100, Math.round((submissions.approved / capacity) * 100)) : 0;
    const lastWeek = stats.perDay
        .filter((row) => Date.now() - new Date(`${row.day}T12:00:00`).getTime() < 7 * 86400000)
        .reduce((sum, row) => sum + row.count, 0);
    const editionName = edition?.name || `Street Show ${stats.edition}`;
    const dateLabel = edition?.date ? formatEditionDate(edition) : "termin wkrótce";
    const isCurrent = stats.edition === stats.currentEdition;

    return (
        <div className="admin-section">
            <AdminHeading
                eyebrow={isCurrent ? `${editionName} · ${dateLabel}` : `Edycja ${stats.edition} (archiwum)`}
                title="Dashboard"
            >
                <p className="admin-availability">
                    <span className={`status-dot${availability.open ? "" : " is-closed"}`} aria-hidden="true" />
                    {availability.open ? (
                        <span>
                            Zapisy do Select <strong>otwarte</strong>
                            {availability.deadline ? ` do ${formatDay(availability.deadline)}` : ""}
                        </span>
                    ) : (
                        <span>{availability.reason}</span>
                    )}
                </p>
            </AdminHeading>

            <TodoList stats={stats} system={system} onOpen={onOpen} />

            <div className="admin-stats-grid">
                <Tile label="Zgłoszenia" value={submissions.total} note={`+${lastWeek} w tym tygodniu`} />
                <Tile
                    label="Zaakceptowane"
                    value={
                        <>
                            {submissions.approved}
                            {capacity > 0 && <span className="admin-stat-of"> / {capacity}</span>}
                        </>
                    }
                    note={capacity ? plural(stats.freePlaces, "wolne miejsce", "wolne miejsca", "wolnych miejsc") : "bez limitu miejsc"}
                >
                    {capacity > 0 && (
                        <div
                            className={`admin-capacity-meter${capacityPercent >= 100 ? " is-full" : ""}`}
                            title={`${capacityPercent}% miejsc w strefie Select`}
                        >
                            <span style={{ width: `${capacityPercent}%` }} />
                        </div>
                    )}
                </Tile>
                <Tile
                    label="Opłacone"
                    value={submissions.paid}
                    note={`${submissions.paymentVerification} do weryfikacji · ${submissions.unpaid} do opłaty`}
                />
                <Tile
                    label="Lista rezerwowa"
                    value={submissions.waitlist}
                    note={plural(submissions.withdrawn, "rezygnacja", "rezygnacje", "rezygnacji")}
                />
                <Tile
                    label="Czeka na datę"
                    value={stats.dateSubscribers?.pending ?? 0}
                    note="lista „Daj mi znać”"
                />
            </div>

            <div className="admin-charts">
                <DailyChart perDay={stats.perDay} />
                <BarList
                    title="Najczęstsze marki"
                    emptyText="Brak zgłoszeń."
                    rows={stats.topBrands.map((row) => ({ label: row.brand, count: row.count }))}
                />
            </div>
        </div>
    );
}
