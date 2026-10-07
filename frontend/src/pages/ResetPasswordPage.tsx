import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";
import { SimpleAuthLayout } from "../components/AuthLayout";
import PasswordInput from "../components/PasswordInput";

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
            <SimpleAuthLayout>
                <h1>Reset hasła</h1>
                <div className="form-stack">
                    <p className="form-error">
                        Brak tokenu resetu. Użyj linku z wiadomości e-mail.
                    </p>
                    <p className="auth-split-switch">
                        <Link to="/nie-pamietam-hasla">Wyślij nowy link</Link>
                    </p>
                </div>
            </SimpleAuthLayout>
        );
    }

    return (
        <SimpleAuthLayout>
            <h1>Ustaw nowe hasło</h1>
            {message ? (
                <div className="form-stack">
                    <p className="form-success" role="status">
                        {message}
                    </p>
                    <Link className="btn-street btn-street-primary btn-street-block" to="/logowanie">
                        Przejdź do logowania
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="form-stack">
                    <div className="form-field">
                        <label htmlFor="reset-password" className="field-label">
                            Nowe hasło
                        </label>
                        <PasswordInput
                            id="reset-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                            minLength={8}
                            maxLength={128}
                            required
                        />
                    </div>
                    <div className="form-field">
                        <label htmlFor="reset-password-confirm" className="field-label">
                            Powtórz nowe hasło
                        </label>
                        <PasswordInput
                            id="reset-password-confirm"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                            minLength={8}
                            maxLength={128}
                            required
                        />
                    </div>
                    {error && (
                        <p className="form-error" role="alert">
                            {error}
                        </p>
                    )}
                    <button
                        type="submit"
                        className="btn-street btn-street-primary btn-street-block"
                        aria-busy={isSubmitting}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Zapisywanie..." : "Ustaw hasło"}
                    </button>
                    {error && (
                        <p className="auth-split-switch">
                            <Link to="/nie-pamietam-hasla">Wyślij nowy link</Link>
                        </p>
                    )}
                </form>
            )}
        </SimpleAuthLayout>
    );
}
