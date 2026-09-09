import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const user = await login(email, password);
            const redirectTo =
                location.state?.from?.pathname ||
                (user.role === "admin" ? "/admin" : "/panel");
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || "Nie udało się zalogować.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="page auth-page">
            <h1>Logowanie</h1>
            <form onSubmit={handleSubmit} className="auth-form">
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
                <label>
                    Hasło
                    <span className="password-field">
                        <input
                            type={isPasswordVisible ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() =>
                                setIsPasswordVisible((value) => !value)
                            }
                            aria-pressed={isPasswordVisible}
                        >
                            {isPasswordVisible ? "Ukryj" : "Pokaż"}
                        </button>
                    </span>
                </label>
                {error && (
                    <p className="form-error" role="alert">
                        {error}
                    </p>
                )}
                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Logowanie..." : "Zaloguj się"}
                </button>

                <p className="auth-switch-text">
                    Nie masz jeszcze konta?{" "}
                    <button
                        type="button"
                        className="text-button"
                        onClick={() => navigate("/rejestracja")}
                    >
                        Zarejestruj się
                    </button>
                </p>
            </form>
        </section>
    );
}
