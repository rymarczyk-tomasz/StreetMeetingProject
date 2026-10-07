import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { SimpleAuthLayout } from "../components/AuthLayout";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setMessage("");
        setIsSubmitting(true);

        try {
            const { data } = await api.post("/auth/forgot-password", { email });
            setMessage(data.message);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się wysłać linku. Spróbuj ponownie.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <SimpleAuthLayout>
            <h1>Nie pamiętasz hasła?</h1>
            {message ? (
                <div className="form-stack">
                    <p className="form-success" role="status">
                        {message}
                    </p>
                    <p>
                        Nie widzisz wiadomości? Sprawdź folder spam. Link jest
                        ważny przez 60 minut.
                    </p>
                    <p className="auth-split-switch">
                        <Link to="/logowanie">Wróć do logowania</Link>
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="form-stack">
                    <p>
                        Podaj adres e-mail konta, a wyślemy Ci link do ustawienia
                        nowego hasła.
                    </p>
                    <label className="form-field">
                        <span className="field-label">E-mail</span>
                        <input
                            type="email"
                            className="field-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                        />
                    </label>
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
                        {isSubmitting ? "Wysyłanie..." : "Wyślij link"}
                    </button>
                    <p className="auth-split-switch">
                        <Link to="/logowanie">Wróć do logowania</Link>
                    </p>
                </form>
            )}
        </SimpleAuthLayout>
    );
}
