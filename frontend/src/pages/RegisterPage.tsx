import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
    });
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    function updateField(field) {
        return (event) =>
            setForm((prev) => ({ ...prev, [field]: event.target.value }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            await register(form);
            navigate("/panel", { replace: true });
        } catch (err) {
            setError(
                err.response?.data?.message || "Nie udało się utworzyć konta.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="page auth-page">
            <h1>Rejestracja</h1>
            <form onSubmit={handleSubmit} className="auth-form">
                <label>
                    Imię
                    <input
                        value={form.firstName}
                        onChange={updateField("firstName")}
                        autoComplete="given-name"
                        required
                        minLength={2}
                    />
                </label>
                <label>
                    Nazwisko
                    <input
                        value={form.lastName}
                        onChange={updateField("lastName")}
                        autoComplete="family-name"
                        required
                        minLength={2}
                    />
                </label>
                <label>
                    E-mail
                    <input
                        type="email"
                        value={form.email}
                        onChange={updateField("email")}
                        autoComplete="email"
                        required
                    />
                </label>
                <label>
                    Hasło (min. 8 znaków)
                    <span className="password-field">
                        <input
                            type={isPasswordVisible ? "text" : "password"}
                            value={form.password}
                            onChange={updateField("password")}
                            autoComplete="new-password"
                            minLength={8}
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
                    {isSubmitting ? "Tworzenie konta..." : "Zarejestruj się"}
                </button>

                <p className="auth-switch-text">
                    Masz już konto?{" "}
                    <button
                        type="button"
                        className="text-button"
                        onClick={() => navigate("/logowanie")}
                    >
                        Zaloguj się
                    </button>
                </p>
            </form>
        </section>
    );
}
