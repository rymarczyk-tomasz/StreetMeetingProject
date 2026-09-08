import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function AccountSettingsPage() {
    const { user, refreshUser } = useAuth();
    const [profile, setProfile] = useState({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        licensePlate: user.licensePlate || "",
        carBrand: user.carBrand || "",
    });
    const [passwords, setPasswords] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

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
                przy zgłoszeniach.
            </p>

            <div className="account-settings-grid">
                <section className="account-card">
                    <h2>Moje dane</h2>
                    <p className="account-email">{user.email}</p>
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
                        <label>
                            Numer tablicy rejestracyjnej (opcjonalnie)
                            <input
                                value={profile.licensePlate}
                                onChange={(event) =>
                                    setProfile({
                                        ...profile,
                                        licensePlate: event.target.value,
                                    })
                                }
                                placeholder="np. GD 12345"
                                maxLength={20}
                            />
                        </label>
                        <label>
                            Marka pojazdu (opcjonalnie)
                            <input
                                value={profile.carBrand}
                                onChange={(event) =>
                                    setProfile({
                                        ...profile,
                                        carBrand: event.target.value,
                                    })
                                }
                                maxLength={100}
                            />
                        </label>
                        <button type="submit" disabled={isSavingProfile}>
                            {isSavingProfile ? "Zapisywanie..." : "Zapisz dane"}
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
                </section>
            </div>

            {message && <p className="form-success">{message}</p>}
            {error && <p className="form-error">{error}</p>}
        </section>
    );
}
