import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import { errorMessage } from "./shared";

export default function UsersPanel({ onAction }) {
    const [users, setUsers] = useState([]);
    const [userFilters, setUserFilters] = useState({
        search: "",
        role: "",
        active: "",
    });
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const loadUsers = useCallback(async () => {
        try {
            const { data } = await api.get("/admin/users", {
                params: userFilters,
            });
            setUsers(data.users);
        } catch (err) {
            setError(
                errorMessage(err, "Nie udało się pobrać listy użytkowników."),
            );
        } finally {
            setIsLoading(false);
        }
    }, [userFilters]);

    useEffect(() => {
        const timeout = setTimeout(loadUsers, 250);
        return () => clearTimeout(timeout);
    }, [loadUsers]);

    async function runAction(action, fallbackError) {
        setError("");
        setMessage("");
        try {
            const { data } = await action();
            await loadUsers();
            onAction();
            return data;
        } catch (err) {
            setError(errorMessage(err, fallbackError));
        }
    }

    function toggleRole(targetUser) {
        const nextRole = targetUser.role === "admin" ? "user" : "admin";
        return runAction(
            () =>
                api.patch(`/admin/users/${targetUser.id}/role`, {
                    role: nextRole,
                }),
            "Nie udało się zmienić roli.",
        );
    }

    function toggleActive(targetUser) {
        return runAction(
            () =>
                api.patch(`/admin/users/${targetUser.id}/active`, {
                    isActive: !targetUser.is_active,
                }),
            "Nie udało się zmienić statusu konta.",
        );
    }

    function toggleGateStaff(targetUser) {
        return runAction(
            () =>
                api.patch(`/admin/users/${targetUser.id}/gate-staff`, {
                    gateStaff: !targetUser.gate_staff,
                }),
            "Nie udało się zmienić uprawnienia.",
        );
    }

    async function revokeSessions(targetUser) {
        const data = await runAction(
            () => api.post(`/admin/users/${targetUser.id}/logout`),
            "Nie udało się wylogować użytkownika.",
        );
        if (data) setMessage(data.message);
    }

    return (
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
            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}
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
            {isLoading ? (
                <p className="page-status">Ładowanie...</p>
            ) : (
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
                                    <td>
                                        {u.role}
                                        {u.gate_staff && u.role !== "admin" ? " + wjazd" : ""}
                                    </td>
                                    <td>
                                        {u.is_active ? "aktywny" : "zablokowany"}
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
                                        {u.role !== "admin" && (
                                            <button
                                                type="button"
                                                className="button-secondary"
                                                onClick={() => toggleGateStaff(u)}
                                                title="Dostęp tylko do ekranu wjazdu (/wjazd) — skanowanie wejściówek przy bramie"
                                            >
                                                {u.gate_staff
                                                    ? "Odbierz obsługę wjazdu"
                                                    : "Nadaj obsługę wjazdu"}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="button-secondary"
                                            onClick={() => revokeSessions(u)}
                                            title="Unieważnia sesje na wszystkich urządzeniach"
                                        >
                                            Wyloguj wszędzie
                                        </button>
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
