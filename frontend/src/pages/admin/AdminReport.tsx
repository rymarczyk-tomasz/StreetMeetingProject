import { useEffect, useState } from "react";
import api from "../../api/client";
import { BarList } from "./AdminStats";
import { errorMessage } from "./shared";

function percent(part, whole) {
    return whole ? `${Math.round((part / whole) * 100)}%` : "—";
}

function formatMoney(value) {
    return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(value);
}

export default function AdminReport({ edition = "" }) {
    const [report, setReport] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        api.get("/admin/report", { params: { edition: edition || undefined } })
            .then(({ data }) => {
                setReport(data);
                setError("");
            })
            .catch((err) => setError(errorMessage(err, "Nie udało się przygotować raportu.")));
    }, [edition]);

    if (error) return <p className="form-error">{error}</p>;
    if (!report) return <p className="page-status">Ładowanie raportu...</p>;

    const s = report.summary;
    const cards = [
        ["Zgłoszenia", s.total || 0, `${s.participants || 0} uczestników`],
        ["Zaakceptowane", s.approved || 0, `${percent(s.approved, s.total)} zgłoszeń`],
        ["Opłacone", s.paid || 0, `${s.unpaid || 0} bez opłaty`],
        ["Wjechało", s.checkedIn || 0, `${percent(s.checkedIn, s.paid)} opłaconych`],
        ["Nie przyjechało", s.noShow || 0, "opłacone, bez wjazdu"],
        ["Rezygnacje", s.withdrawn || 0, s.withdrawnPaid ? `${s.withdrawnPaid} po opłacie` : "przed opłatą"],
        ["Odrzucone", s.rejected || 0, `lista rezerwowa: ${s.waitlist || 0}`],
    ];

    return (
        <div className="admin-report">
            <div className="admin-report-actions">
                <button type="button" className="button-secondary" onClick={() => window.print()}>
                    Drukuj / zapisz jako PDF
                </button>
            </div>

            <h3>Street Show {report.edition} — podsumowanie strefy Select</h3>
            <div className="admin-stats-grid">
                {cards.map(([label, value, hint]) => (
                    <div className="admin-stat-card" key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                        <small>{hint}</small>
                    </div>
                ))}
                <div className="admin-stat-card">
                    <span>Przychód z opłat</span>
                    <strong>{report.revenue !== null ? formatMoney(report.revenue) : "—"}</strong>
                    <small>
                        {report.fee.amount !== null
                            ? `szacunkowo: ${s.paid || 0} × ${report.fee.label} (obecna kwota)`
                            : "ustaw kwotę opłaty w Ustawieniach"}
                    </small>
                </div>
            </div>

            <BarList
                title="Przyjazdy według godziny"
                emptyText="Brak zarejestrowanych wjazdów w tej edycji."
                rows={report.arrivals.map((row) => ({ label: row.hour, count: row.count }))}
            />
            <BarList
                title="Marki aut"
                emptyText="Brak zgłoszeń."
                rows={report.topBrands.map((row) => ({ label: row.brand, count: row.count }))}
            />

            {report.noShows.length > 0 && (
                <details className="gallery-howto">
                    <summary>Opłacone, ale bez zarejestrowanego wjazdu ({report.noShows.length})</summary>
                    <ul>
                        {report.noShows.map((car) => (
                            <li key={car.id}>
                                <strong>{car.licensePlate}</strong> — {car.carBrand} · {car.name}
                            </li>
                        ))}
                    </ul>
                </details>
            )}

            {report.editions.length > 1 && (
                <>
                    <h3>Porównanie edycji</h3>
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Edycja</th>
                                    <th>Zgłoszenia</th>
                                    <th>Zaakceptowane</th>
                                    <th>Opłacone</th>
                                    <th>Wjechało</th>
                                    <th>Rezygnacje</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.editions.map((row) => (
                                    <tr key={row.edition} className={row.edition === report.edition ? "is-current" : ""}>
                                        <td>
                                            <strong>{row.edition}</strong>
                                        </td>
                                        <td>{row.total}</td>
                                        <td>{row.approved}</td>
                                        <td>{row.paid}</td>
                                        <td>{row.checkedIn}</td>
                                        <td>{row.withdrawn}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
