import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

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
        <section className="page auth-page">
            <h1>Nie pamiętasz hasła?</h1>
            {message ? (
                <div className="auth-form">
                    <p className="form-success" role="status">
                        {message}
                    </p>
                    <p>
                        Nie widzisz wiadomości? Sprawdź folder spam. Link jest
                        ważny przez 60 minut.
                    </p>
                    <Link to="/logowanie">Wróć do logowania</Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="auth-form">
                    <p>
                        Podaj adres e-mail konta, a wyślemy Ci link do ustawienia
                        nowego hasła.
                    </p>
                    <label>
                        E-mail
                        <input
                            type="email"
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
                    <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Wysyłanie..." : "Wyślij link"}
                    </button>
                    <p className="auth-switch-text">
                        <Link to="/logowanie">Wróć do logowania</Link>
                    </p>
                </form>
            )}
        </section>
    );
}
