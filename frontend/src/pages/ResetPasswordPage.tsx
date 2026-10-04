import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Hasła muszą być takie same.");
            return;
        }

        setIsSubmitting(true);
        try {
            const { data } = await api.post("/auth/reset-password", {
                token,
                password,
            });
            setMessage(data.message);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się zmienić hasła. Spróbuj ponownie.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!token) {
        return (
            <section className="page auth-page">
                <h1>Reset hasła</h1>
                <div className="auth-form">
                    <p className="form-error">
                        Brak tokenu resetu. Użyj linku z wiadomości e-mail.
                    </p>
                    <Link to="/nie-pamietam-hasla">Wyślij nowy link</Link>
                </div>
            </section>
        );
    }

    return (
        <section className="page auth-page">
            <h1>Ustaw nowe hasło</h1>
            {message ? (
                <div className="auth-form">
                    <p className="form-success" role="status">
                        {message}
                    </p>
                    <Link to="/logowanie">Przejdź do logowania</Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="auth-form">
                    <label>
                        Nowe hasło
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                            minLength={8}
                            maxLength={128}
                            required
                        />
                    </label>
                    <label>
                        Powtórz nowe hasło
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                            minLength={8}
                            maxLength={128}
                            required
                        />
                    </label>
                    {error && (
                        <p className="form-error" role="alert">
                            {error}
                        </p>
                    )}
                    <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Zapisywanie..." : "Ustaw hasło"}
                    </button>
                    {error && (
                        <p className="auth-switch-text">
                            <Link to="/nie-pamietam-hasla">
                                Wyślij nowy link
                            </Link>
                        </p>
                    )}
                </form>
            )}
        </section>
    );
}
