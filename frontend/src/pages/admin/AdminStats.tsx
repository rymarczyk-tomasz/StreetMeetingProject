import { useEffect, useState } from "react";
import api from "../../api/client";
import { errorMessage } from "./shared";

function BarList({ title, rows, emptyText }) {
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

export default function AdminStats({ refreshKey }) {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        api.get("/admin/stats")
            .then(({ data }) => setStats(data))
            .catch((err) =>
                setError(errorMessage(err, "Nie udało się pobrać statystyk.")),
            );
    }, [refreshKey]);

    if (error) return <p className="form-error">{error}</p>;
    if (!stats) return <p className="page-status">Ładowanie statystyk...</p>;

    const { submissions, users, capacity, availability } = stats;
    const capacityPercent = capacity
        ? Math.min(100, Math.round((submissions.approved / capacity) * 100))
        : 0;

    return (
        <>
            <p className="admin-hint">
                Statystyki zgłoszeń dla edycji <strong>{stats.edition}</strong>{" "}
                (zmiana roku: Ustawienia → Edycja wydarzenia).
            </p>
            {!availability.open && (
                <p className="payment-alert">{availability.reason}</p>
            )}
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
