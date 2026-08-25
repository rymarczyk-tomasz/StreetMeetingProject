import { useCallback, useEffect, useState } from "react";
import api from "../api/client";

const STATUS_LABELS = {
    pending: "Oczekuje",
    approved: "Zaakceptowane",
    rejected: "Odrzucone",
};

function SubmissionsPanel() {
    const [submissions, setSubmissions] = useState([]);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const loadSubmissions = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get("/admin/submissions");
            setSubmissions(data.submissions);
        } catch (err) {
            setError(
                err.response?.data?.message || "Nie udało się pobrać zgłoszeń.",
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSubmissions();
    }, [loadSubmissions]);

    async function setStatus(submission, status) {
        try {
            await api.patch(`/admin/submissions/${submission.id}/status`, {
                status,
            });
            loadSubmissions();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się zmienić statusu zgłoszenia.",
            );
        }
    }

    if (isLoading) {
        return <p className="page-status">Ładowanie...</p>;
    }

    return (
        <>
            {error && <p className="form-error">{error}</p>}
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

export default function AdminPage() {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const loadUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get("/admin/users");
            setUsers(data.users);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się pobrać listy użytkowników.",
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    async function toggleRole(targetUser) {
        const nextRole = targetUser.role === "admin" ? "user" : "admin";
        try {
            await api.patch(`/admin/users/${targetUser.id}/role`, {
                role: nextRole,
            });
            loadUsers();
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
            loadUsers();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się zmienić statusu konta.",
            );
        }
    }

    if (isLoading) {
        return <p className="page-status">Ładowanie...</p>;
    }

    return (
        <section className="page">
            <h1>Panel administratora</h1>
            {error && <p className="form-error">{error}</p>}
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
                            <td>{u.is_active ? "aktywny" : "zablokowany"}</td>
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
                                    {u.is_active ? "Zablokuj" : "Odblokuj"}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h2>Zgłoszenia do strefy Select</h2>
            <SubmissionsPanel />
        </section>
    );
}
