import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../api/client";
import { plural } from "../../utils/plural";
import AdminHeading from "./AdminHeading";
import { errorMessage } from "./shared";

function RowMenu({ label, items }) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        function onPointer(event) {
            if (!ref.current?.contains(event.target)) setIsOpen(false);
        }
        function onKey(event) {
            if (event.key === "Escape") setIsOpen(false);
        }
        document.addEventListener("pointerdown", onPointer);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onPointer);
            document.removeEventListener("keydown", onKey);
        };
    }, [isOpen]);

    return (
        <div className="row-menu" ref={ref}>
            <button
                type="button"
                className="row-menu-toggle"
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={() => setIsOpen(!isOpen)}
            >
                <i className="bi bi-three-dots" aria-hidden="true" />
            </button>
            {isOpen && (
                <div className="row-menu-list" role="menu">
                    {items.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            role="menuitem"
                            className={item.danger ? "is-danger" : ""}
                            title={item.title}
                            onClick={() => {
                                setIsOpen(false);
                                item.run();
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

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
        if (
            targetUser.is_active &&
            !window.confirm(`Zablokować konto ${targetUser.email}? Nie będzie mogło się zalogować.`)
        ) {
            return;
        }
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
        if (!window.confirm(`Wylogować ${targetUser.email} na wszystkich urządzeniach?`)) return;
        const data = await runAction(
            () => api.post(`/admin/users/${targetUser.id}/logout`),
            "Nie udało się wylogować użytkownika.",
        );
        if (data) setMessage(data.message);
    }

    function menuItems(u) {
        return [
            { label: u.role === "admin" ? "Odbierz admina" : "Nadaj admina", run: () => toggleRole(u) },
            u.role !== "admin" && {
                label: u.gate_staff ? "Odbierz obsługę wjazdu" : "Nadaj obsługę wjazdu",
                title: "Dostęp tylko do ekranu wjazdu (/wjazd) — skanowanie wejściówek przy bramie",
                run: () => toggleGateStaff(u),
            },
            { label: u.is_active ? "Zablokuj" : "Odblokuj", danger: u.is_active, run: () => toggleActive(u) },
            {
                label: "Wyloguj wszędzie",
                title: "Unieważnia sesje na wszystkich urządzeniach",
                danger: true,
                run: () => revokeSessions(u),
            },
        ].filter(Boolean);
    }

    return (
        <div className="admin-section">
            <AdminHeading title="Użytkownicy" description="Zarządzaj rolami i dostępem do kont." />
            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}
            <div className="admin-filters user-filters">
                <input
                    type="search"
                    className="user-filters-search"
                    aria-label="Szukaj użytkownika"
                    value={userFilters.search}
                    onChange={(event) =>
                        setUserFilters({
                            ...userFilters,
                            search: event.target.value,
                        })
                    }
                    placeholder="Szukaj: e-mail, imię lub nazwisko…"
                />
                <select
                    aria-label="Rola"
                    value={userFilters.role}
                    onChange={(event) =>
                        setUserFilters({
                            ...userFilters,
                            role: event.target.value,
                        })
                    }
                >
                    <option value="">Rola: wszystkie</option>
                    <option value="user">Rola: użytkownicy</option>
                    <option value="admin">Rola: administratorzy</option>
                </select>
                <select
                    aria-label="Status konta"
                    value={userFilters.active}
                    onChange={(event) =>
                        setUserFilters({
                            ...userFilters,
                            active: event.target.value,
                        })
                    }
                >
                    <option value="">Status: wszystkie</option>
                    <option value="1">Status: aktywne</option>
                    <option value="0">Status: zablokowane</option>
                </select>
            </div>
            {isLoading ? (
                <p className="page-status">Ładowanie...</p>
            ) : (
                <>
                    <p className="admin-result-count">
                        {plural(users.length, "użytkownik", "użytkowników", "użytkowników")}
                    </p>
                    <ul className="user-list">
                        {users.map((u) => (
                            <li key={u.id} className="user-row">
                                <div className="user-row-main">
                                    <p className="user-row-email">
                                        <strong>{u.email}</strong>
                                        {u.role === "admin" && <span className="status-badge user-badge-admin">admin</span>}
                                        {Boolean(u.gate_staff) && u.role !== "admin" && (
                                            <span className="status-badge">wjazd</span>
                                        )}
                                        {!u.is_active && <span className="status-badge status-rejected">zablokowany</span>}
                                    </p>
                                    <p className="user-row-name">
                                        {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
                                    </p>
                                </div>
                                <RowMenu label={`Akcje dla ${u.email}`} items={menuItems(u)} />
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
