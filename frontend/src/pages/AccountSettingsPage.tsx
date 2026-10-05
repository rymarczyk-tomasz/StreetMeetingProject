import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function AccountSettingsPage() {
    const { user, refreshUser } = useAuth();
    const [profile, setProfile] = useState({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
    });
    const [emailChange, setEmailChange] = useState({ newEmail: "", password: "" });
    const [isChangingEmail, setIsChangingEmail] = useState(false);
    const [passwords, setPasswords] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const navigate = useNavigate();

    function clearFeedback() {
        setMessage("");
        setError("");
    }

    async function saveProfile(event) {
        event.preventDefault();
        clearFeedback();
        setIsSavingProfile(true);
        try {
            await api.patch("/auth/me", profile);
            await refreshUser();
            setMessage("Dane konta zostały zapisane.");
        } catch (err) {
            setError(
                err.response?.data?.message || "Nie udało się zapisać danych.",
            );
        } finally {
            setIsSavingProfile(false);
        }
    }

    async function changePassword(event) {
        event.preventDefault();
        clearFeedback();
        if (passwords.newPassword !== passwords.confirmPassword) {
            setError("Nowe hasła muszą być takie same.");
            return;
        }

        setIsChangingPassword(true);
        try {
            const { data } = await api.post("/auth/change-password", passwords);
            setPasswords({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
            setMessage(data.message);
        } catch (err) {
            setError(
                err.response?.data?.message || "Nie udało się zmienić hasła.",
            );
        } finally {
            setIsChangingPassword(false);
        }
    }

    async function runAction(request, fallback) {
        clearFeedback();
        try {
            const { data } = await request();
            setMessage(data.message);
            return true;
        } catch (err) {
            setError(err.response?.data?.message || fallback);
            return false;
        }
    }

    async function changeEmail(event) {
        event.preventDefault();
        setIsChangingEmail(true);
        const ok = await runAction(
            () => api.post("/auth/change-email", emailChange),
            "Nie udało się zmienić adresu e-mail.",
        );
        if (ok) setEmailChange({ newEmail: "", password: "" });
        setIsChangingEmail(false);
    }

    async function exportData() {
        clearFeedback();
        setIsExporting(true);
        try {
            const { data } = await api.get("/auth/me/export");
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "street-show-moje-dane.json";
            link.click();
            // iOS Safari starts the download asynchronously — revoking right away cancels it.
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (err) {
            setError(
                err.response?.data?.message || "Nie udało się pobrać danych.",
            );
        } finally {
            setIsExporting(false);
        }
    }

    async function deleteAccount(event) {
        event.preventDefault();
        clearFeedback();
        const confirmed = window.confirm(
            "Czy na pewno chcesz trwale usunąć konto wraz ze wszystkimi zgłoszeniami?",
        );
        if (!confirmed) return;

        setIsDeleting(true);
        try {
            await api.delete("/auth/me", { data: { password: deletePassword } });
            await refreshUser();
            navigate("/", { replace: true });
        } catch (err) {
            setError(
                err.response?.data?.message || "Nie udało się usunąć konta.",
            );
            setIsDeleting(false);
        }
    }

    return (
        <section className="page account-settings-page">
            <div className="page-heading-row">
                <div>
                    <p className="page-eyebrow">Panel konta</p>
                    <h1>Ustawienia konta</h1>
                </div>
                <Link className="account-back-link" to="/panel">
                    Wróć do panelu
                </Link>
            </div>

            <p className="account-settings-intro">
                Zarządzaj swoimi danymi logowania i informacjami wyświetlanymi
                przy zgłoszeniach. Swoje auta zapisujesz w{" "}
                <Link to="/garaz">garażu</Link>.
            </p>

            {message && (
                <p className="form-success" role="status">
                    {message}
                </p>
            )}
            {error && (
                <p className="form-error" role="alert">
                    {error}
                </p>
            )}

            <div className="account-settings-grid">
                <section className="account-card">
                    <h2>Moje dane</h2>
                    <form className="auth-form" onSubmit={saveProfile}>
                        <label>
                            Imię
                            <input
                                type="text"
                                value={profile.firstName}
                                onChange={(event) =>
                                    setProfile({
                                        ...profile,
                                        firstName: event.target.value,
                                    })
                                }
                            />
                        </label>
                        <label>
                            Nazwisko
                            <input
                                type="text"
                                value={profile.lastName}
                                onChange={(event) =>
                                    setProfile({
                                        ...profile,
                                        lastName: event.target.value,
                                    })
                                }
                            />
                        </label>
                        <label>
                            Numer telefonu (opcjonalnie)
                            <input
                                type="tel"
                                value={profile.phone}
                                onChange={(event) =>
                                    setProfile({
                                        ...profile,
                                        phone: event.target.value,
                                    })
                                }
                                placeholder="np. +48 123 456 789"
                            />
                        </label>
                        <button type="submit" disabled={isSavingProfile}>
                            {isSavingProfile ? "Zapisywanie..." : "Zapisz dane"}
                        </button>
                    </form>
                </section>

                <section className="account-card">
                    <h2>Adres e-mail</h2>
                    <p className="account-email">
                        {user.email}{" "}
                        <span
                            className={`status-badge ${user.emailVerified ? "status-approved" : "payment-status-verification"}`}
                        >
                            {user.emailVerified ? "Potwierdzony" : "Niepotwierdzony"}
                        </span>
                    </p>
                    {!user.emailVerified && (
                        <p>
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={() =>
                                    runAction(
                                        () => api.post("/auth/resend-verification"),
                                        "Nie udało się wysłać linku.",
                                    )
                                }
                            >
                                Wyślij link potwierdzający
                            </button>
                        </p>
                    )}
                    <form className="auth-form" onSubmit={changeEmail}>
                        <label>
                            Nowy adres e-mail
                            <input
                                type="email"
                                value={emailChange.newEmail}
                                onChange={(event) =>
                                    setEmailChange({ ...emailChange, newEmail: event.target.value })
                                }
                                autoComplete="email"
                                required
                            />
                        </label>
                        <label>
                            Aktualne hasło
                            <input
                                type="password"
                                value={emailChange.password}
                                onChange={(event) =>
                                    setEmailChange({ ...emailChange, password: event.target.value })
                                }
                                autoComplete="current-password"
                                required
                            />
                        </label>
                        <p className="admin-hint">
                            Wyślemy link na nowy adres — zmiana nastąpi po jego kliknięciu.
                        </p>
                        <button type="submit" disabled={isChangingEmail}>
                            {isChangingEmail ? "Wysyłanie..." : "Zmień adres"}
                        </button>
                    </form>
                </section>

                <section className="account-card">
                    <h2>Bezpieczeństwo</h2>
                    <p>
                        Hasło musi mieć co najmniej 8 znaków i różnić się od
                        aktualnego.
                    </p>
                    <form className="auth-form" onSubmit={changePassword}>
                        <label>
                            Aktualne hasło
                            <input
                                type="password"
                                value={passwords.currentPassword}
                                onChange={(event) =>
                                    setPasswords({
                                        ...passwords,
                                        currentPassword: event.target.value,
                                    })
                                }
                                required
                            />
                        </label>
                        <label>
                            Nowe hasło
                            <input
                                type="password"
                                minLength={8}
                                value={passwords.newPassword}
                                onChange={(event) =>
                                    setPasswords({
                                        ...passwords,
                                        newPassword: event.target.value,
                                    })
                                }
                                required
                            />
                        </label>
                        <label>
                            Powtórz nowe hasło
                            <input
                                type="password"
                                minLength={8}
                                value={passwords.confirmPassword}
                                onChange={(event) =>
                                    setPasswords({
                                        ...passwords,
                                        confirmPassword: event.target.value,
                                    })
                                }
                                required
                            />
                        </label>
                        <button type="submit" disabled={isChangingPassword}>
                            {isChangingPassword
                                ? "Zmienianie..."
                                : "Zmień hasło"}
                        </button>
                    </form>

                    <h3 className="account-subheading">Sesje</h3>
                    <p>
                        Zgubiłeś telefon albo logowałeś się na cudzym komputerze?
                        Wyloguj wszystkie inne urządzenia.
                    </p>
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={() =>
                            runAction(
                                () => api.post("/auth/logout-all"),
                                "Nie udało się wylogować innych urządzeń.",
                            )
                        }
                    >
                        Wyloguj ze wszystkich innych urządzeń
                    </button>
                </section>

                <section className="account-card">
                    <h2>Twoje dane</h2>
                    <p>
                        Możesz pobrać kopię danych, które przechowujemy o Twoim
                        koncie i zgłoszeniach.
                    </p>
                    <button
                        type="button"
                        onClick={exportData}
                        disabled={isExporting}
                    >
                        {isExporting ? "Przygotowywanie..." : "Pobierz moje dane"}
                    </button>

                    <h3 className="account-danger-heading">Usuń konto</h3>
                    <p>
                        Usunięcie konta jest nieodwracalne — skasujemy Twoje dane,
                        wszystkie zgłoszenia i przesłane zdjęcia.
                    </p>
                    <form className="auth-form" onSubmit={deleteAccount}>
                        <label>
                            Potwierdź hasłem
                            <input
                                type="password"
                                value={deletePassword}
                                onChange={(event) =>
                                    setDeletePassword(event.target.value)
                                }
                                autoComplete="current-password"
                                required
                            />
                        </label>
                        <button
                            type="submit"
                            className="button-danger"
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Usuwanie..." : "Usuń konto"}
                        </button>
                    </form>
                </section>
            </div>
        </section>
    );
}
