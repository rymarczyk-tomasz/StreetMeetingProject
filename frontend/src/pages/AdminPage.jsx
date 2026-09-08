import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import api from "../api/client";

const STATUS_LABELS = {
    pending: "Oczekuje",
    approved: "Zaakceptowane",
    rejected: "Odrzucone",
};

const PAYMENT_STATUS_LABELS = {
    unpaid: "Do opłacenia",
    verification: "Do weryfikacji",
    paid: "Opłacone",
};

function SubmissionsPanel({ onAction }) {
    const [submissions, setSubmissions] = useState([]);
    const [adminNotes, setAdminNotes] = useState({});
    const [filters, setFilters] = useState({
        status: "",
        paymentStatus: "",
        search: "",
    });
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const loadSubmissions = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get("/admin/submissions", {
                params: filters,
            });
            setSubmissions(data.submissions);
        } catch (err) {
            setError(
                err.response?.data?.message || "Nie udało się pobrać zgłoszeń.",
            );
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadSubmissions();
    }, [loadSubmissions]);

    async function setStatus(submission, status) {
        try {
            await api.patch(`/admin/submissions/${submission.id}/status`, {
                status,
                adminNote: adminNotes[submission.id] || "",
            });
            await loadSubmissions();
            onAction();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się zmienić statusu zgłoszenia.",
            );
        }
    }

    async function setPaymentStatus(submission, paymentStatus) {
        try {
            await api.patch(
                `/admin/submissions/${submission.id}/payment-status`,
                { paymentStatus },
            );
            await loadSubmissions();
            onAction();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się zmienić statusu opłaty.",
            );
        }
    }

    function exportSubmissions() {
        const rows = submissions.map((submission) => ({
            "ID zgłoszenia": submission.id,
            "Data zgłoszenia": submission.createdAt,
            Imię: submission.firstName,
            Nazwisko: submission.lastName,
            "E-mail": submission.userEmail,
            Telefon: submission.phone,
            Marka: submission.carBrand,
            Rejestracja: submission.licensePlate,
            Opis: submission.carDescription,
            Status: STATUS_LABELS[submission.status] || submission.status,
            "Status opłaty":
                PAYMENT_STATUS_LABELS[submission.paymentStatus || "unpaid"],
            "Komentarz administratora": submission.adminNote || "",
            Zdjęcia: submission.photos.join("\n"),
        }));
        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet["!cols"] = [
            { wch: 14 },
            { wch: 22 },
            { wch: 18 },
            { wch: 18 },
            { wch: 30 },
            { wch: 18 },
            { wch: 18 },
            { wch: 16 },
            { wch: 45 },
            { wch: 18 },
            { wch: 40 },
            { wch: 55 },
        ];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Zgłoszenia");
        XLSX.writeFile(
            workbook,
            `zgloszenia-${new Date().toISOString().slice(0, 10)}.xlsx`,
        );
    }

    if (isLoading) {
        return <p className="page-status">Ładowanie...</p>;
    }

    return (
        <>
            {error && <p className="form-error">{error}</p>}
            <div className="admin-filters submission-filters">
                <label>
                    Szukaj zgłoszenia
                    <input
                        type="search"
                        value={filters.search}
                        onChange={(event) =>
                            setFilters({
                                ...filters,
                                search: event.target.value,
                            })
                        }
                        placeholder="E-mail, nazwisko, rejestracja..."
                    />
                </label>
                <label>
                    Status
                    <select
                        value={filters.status}
                        onChange={(event) =>
                            setFilters({
                                ...filters,
                                status: event.target.value,
                            })
                        }
                    >
                        <option value="">Wszystkie statusy</option>
                        <option value="pending">Oczekujące</option>
                        <option value="approved">Zaakceptowane</option>
                        <option value="rejected">Odrzucone</option>
                    </select>
                </label>
                <label>
                    Status opłaty
                    <select
                        value={filters.paymentStatus}
                        onChange={(event) =>
                            setFilters({
                                ...filters,
                                paymentStatus: event.target.value,
                            })
                        }
                    >
                        <option value="">Wszystkie opłaty</option>
                        <option value="unpaid">Do opłacenia</option>
                        <option value="verification">Do weryfikacji</option>
                        <option value="paid">Opłacone</option>
                    </select>
                </label>
                <button
                    className="admin-export-button"
                    type="button"
                    onClick={exportSubmissions}
                    disabled={submissions.length === 0}
                >
                    Eksportuj do Excel
                </button>
            </div>
            {submissions.length === 0 && <p>Brak zgłoszeń.</p>}
            {submissions.map((s) => (
                <article key={s.id} className="submission-card">
                    <h3>
                        {s.carBrand} — {s.licensePlate}
                    </h3>
                    <p>
                        Zgłaszający: {s.firstName} {s.lastName} ({s.userEmail}
                        ), tel. {s.phone}
                    </p>
                    <p>{s.carDescription}</p>
                    <div className="submission-photos">
                        {s.photos.map((photo) => (
                            <a
                                key={photo}
                                href={photo}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <img
                                    src={photo}
                                    alt={`${s.carBrand} ${s.licensePlate}`}
                                />
                            </a>
                        ))}
                    </div>
                    <p>
                        Status:{" "}
                        <span className={`status-badge status-${s.status}`}>
                            {STATUS_LABELS[s.status] || s.status}
                        </span>
                    </p>
                    <p>
                        Opłata:{" "}
                        <span
                            className={`status-badge payment-status-${s.paymentStatus || "unpaid"}`}
                        >
                            {PAYMENT_STATUS_LABELS[s.paymentStatus || "unpaid"]}
                        </span>
                    </p>
                    {s.paymentStatus === "verification" && (
                        <p className="payment-alert">
                            Użytkownik zgłosił opłacenie. Zweryfikuj płatność i
                            potwierdź ją poniżej.
                        </p>
                    )}
                    {s.paymentStatus === "verification" && (
                        <button
                            type="button"
                            onClick={() => setPaymentStatus(s, "paid")}
                        >
                            Oznacz jako opłacone
                        </button>
                    )}
                    <label className="admin-note-field">
                        Komentarz dla użytkownika
                        <textarea
                            rows={3}
                            maxLength={2000}
                            value={adminNotes[s.id] ?? s.adminNote ?? ""}
                            onChange={(event) =>
                                setAdminNotes({
                                    ...adminNotes,
                                    [s.id]: event.target.value,
                                })
                            }
                            placeholder="Dodaj informację dla zgłaszającego..."
                        />
                    </label>
                    <button
                        type="button"
                        onClick={() => setStatus(s, "approved")}
                        disabled={s.status === "approved"}
                    >
                        Zaakceptuj
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatus(s, "rejected")}
                        disabled={s.status === "rejected"}
                    >
                        Odrzuć
                    </button>
                </article>
            ))}
        </>
    );
}

const ACTION_LABELS = {
    "submission.pending": "ustawił zgłoszenie jako oczekujące",
    "submission.approved": "zaakceptował zgłoszenie",
    "submission.rejected": "odrzucił zgłoszenie",
    "submission.payment_verification": "zgłosił opłatę do weryfikacji",
    "submission.payment_paid": "potwierdził opłacenie zgłoszenia",
    "user.role_changed": "zmienił rolę użytkownika",
    "user.blocked": "zablokował użytkownika",
    "user.unblocked": "odblokował użytkownika",
};

function AuditLog({ refreshKey }) {
    const [entries, setEntries] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadAuditLog() {
            try {
                const { data } = await api.get("/admin/audit-log");
                setEntries(data.entries);
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                        "Nie udało się pobrać dziennika działań.",
                );
            }
        }

        loadAuditLog();
    }, [refreshKey]);

    return (
        <section className="audit-section">
            <h2>Dziennik działań</h2>
            {error && <p className="form-error">{error}</p>}
            {entries.length === 0 ? (
                <p>Brak zarejestrowanych działań.</p>
            ) : (
                <div className="audit-list">
                    {entries.map((entry) => (
                        <article className="audit-entry" key={entry.id}>
                            <strong>{entry.adminEmail}</strong>{" "}
                            {ACTION_LABELS[entry.action] || entry.action}
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

function AdminStats({ refreshKey }) {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadStats() {
            try {
                const { data } = await api.get("/admin/stats");
                setStats(data);
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                        "Nie udało się pobrać statystyk.",
                );
            }
        }

        loadStats();
    }, [refreshKey]);

    if (error) return <p className="form-error">{error}</p>;
    if (!stats) return <p className="page-status">Ładowanie statystyk...</p>;

    return (
        <div className="admin-stats-grid">
            <div className="admin-stat-card">
                <span>Wszystkie zgłoszenia</span>
                <strong>{stats.submissions.total}</strong>
            </div>
            <div className="admin-stat-card admin-stat-pending">
                <span>Oczekujące</span>
                <strong>{stats.submissions.pending}</strong>
            </div>
            <div className="admin-stat-card admin-stat-approved">
                <span>Zaakceptowane</span>
                <strong>{stats.submissions.approved}</strong>
            </div>
            <div className="admin-stat-card">
                <span>Użytkownicy</span>
                <strong>{stats.users.total}</strong>
                <small>{stats.users.active} aktywnych</small>
            </div>
        </div>
    );
}

export default function AdminPage() {
    const [activeSection, setActiveSection] = useState("dashboard");
    const [users, setUsers] = useState([]);
    const [userFilters, setUserFilters] = useState({
        search: "",
        role: "",
        active: "",
    });
    const [auditRefreshKey, setAuditRefreshKey] = useState(0);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const loadUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get("/admin/users", {
                params: userFilters,
            });
            setUsers(data.users);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się pobrać listy użytkowników.",
            );
        } finally {
            setIsLoading(false);
        }
    }, [userFilters]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    async function toggleRole(targetUser) {
        const nextRole = targetUser.role === "admin" ? "user" : "admin";
        try {
            await api.patch(`/admin/users/${targetUser.id}/role`, {
                role: nextRole,
            });
            await loadUsers();
            setAuditRefreshKey((value) => value + 1);
        } catch (err) {
            setError(
                err.response?.data?.message || "Nie udało się zmienić roli.",
            );
        }
    }

    async function toggleActive(targetUser) {
        try {
            await api.patch(`/admin/users/${targetUser.id}/active`, {
                isActive: !targetUser.is_active,
            });
            await loadUsers();
            setAuditRefreshKey((value) => value + 1);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się zmienić statusu konta.",
            );
        }
    }

    if (isLoading && activeSection === "users") {
        return <p className="page-status">Ładowanie...</p>;
    }

    return (
        <section className="page admin-page">
            <div className="admin-page-header">
                <div>
                    <p className="page-eyebrow">Strefa zarządzania</p>
                    <h1>Panel administratora</h1>
                </div>
                <span className="admin-page-status">Konto administratora</span>
            </div>
            {error && <p className="form-error">{error}</p>}
            <nav
                className="admin-navigation"
                aria-label="Sekcje panelu administratora"
            >
                {[
                    ["dashboard", "Dashboard"],
                    ["users", "Użytkownicy"],
                    ["submissions", "Zgłoszenia"],
                    ["audit", "Dziennik działań"],
                ].map(([section, label]) => (
                    <button
                        className={activeSection === section ? "is-active" : ""}
                        key={section}
                        type="button"
                        onClick={() => setActiveSection(section)}
                        aria-current={
                            activeSection === section ? "page" : undefined
                        }
                    >
                        {label}
                    </button>
                ))}
            </nav>

            {activeSection === "dashboard" && (
                <div className="admin-section">
                    <div className="admin-section-heading">
                        <div>
                            <h2>Dashboard</h2>
                            <p>
                                Najważniejsze informacje o aktywności w panelu.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActiveSection("submissions")}
                        >
                            Przejdź do zgłoszeń
                        </button>
                    </div>
                    <AdminStats refreshKey={auditRefreshKey} />
                </div>
            )}

            {activeSection === "users" && (
                <div className="admin-section">
                    <div className="admin-section-heading">
                        <div>
                            <h2>Użytkownicy</h2>
                            <p>Zarządzaj rolami i dostępem do kont.</p>
                        </div>
                        <span className="admin-result-count">
                            {users.length} wyników
                        </span>
                    </div>
                    <div className="admin-filters user-filters">
                        <label>
                            Szukaj użytkownika
                            <input
                                type="search"
                                value={userFilters.search}
                                onChange={(event) =>
                                    setUserFilters({
                                        ...userFilters,
                                        search: event.target.value,
                                    })
                                }
                                placeholder="E-mail, imię lub nazwisko..."
                            />
                        </label>
                        <label>
                            Rola
                            <select
                                value={userFilters.role}
                                onChange={(event) =>
                                    setUserFilters({
                                        ...userFilters,
                                        role: event.target.value,
                                    })
                                }
                            >
                                <option value="">Wszystkie role</option>
                                <option value="user">Użytkownicy</option>
                                <option value="admin">Administratorzy</option>
                            </select>
                        </label>
                        <label>
                            Status konta
                            <select
                                value={userFilters.active}
                                onChange={(event) =>
                                    setUserFilters({
                                        ...userFilters,
                                        active: event.target.value,
                                    })
                                }
                            >
                                <option value="">Wszystkie</option>
                                <option value="1">Aktywne</option>
                                <option value="0">Zablokowane</option>
                            </select>
                        </label>
                    </div>
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>E-mail</th>
                                    <th>Imię i nazwisko</th>
                                    <th>Rola</th>
                                    <th>Status</th>
                                    <th>Akcje</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id}>
                                        <td>{u.email}</td>
                                        <td>
                                            {[u.first_name, u.last_name]
                                                .filter(Boolean)
                                                .join(" ") || "—"}
                                        </td>
                                        <td>{u.role}</td>
                                        <td>
                                            {u.is_active
                                                ? "aktywny"
                                                : "zablokowany"}
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                onClick={() => toggleRole(u)}
                                            >
                                                {u.role === "admin"
                                                    ? "Odbierz admina"
                                                    : "Nadaj admina"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => toggleActive(u)}
                                            >
                                                {u.is_active
                                                    ? "Zablokuj"
                                                    : "Odblokuj"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeSection === "submissions" && (
                <div className="admin-section">
                    <div className="admin-section-heading">
                        <div>
                            <h2>Zgłoszenia do strefy Select</h2>
                            <p>Przeglądaj, filtruj i rozpatruj zgłoszenia.</p>
                        </div>
                    </div>
                    <SubmissionsPanel
                        onAction={() =>
                            setAuditRefreshKey((value) => value + 1)
                        }
                    />
                </div>
            )}

            {activeSection === "audit" && (
                <AuditLog refreshKey={auditRefreshKey} />
            )}
        </section>
    );
}

function formatDate(value) {
    if (!value) return "Brak daty";

    return new Intl.DateTimeFormat("pl-PL", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(`${value.replace(" ", "T")}Z`));
}
