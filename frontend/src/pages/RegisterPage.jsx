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
                    />
                </label>
                <label>
                    Nazwisko
                    <input
                        value={form.lastName}
                        onChange={updateField("lastName")}
                    />
                </label>
                <label>
                    E-mail
                    <input
                        type="email"
                        value={form.email}
                        onChange={updateField("email")}
                        required
                    />
                </label>
                <label>
                    Hasło (min. 8 znaków)
                    <input
                        type="password"
                        value={form.password}
                        onChange={updateField("password")}
                        minLength={8}
                        required
                    />
                </label>
                {error && <p className="form-error">{error}</p>}
                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Tworzenie konta..." : "Zarejestruj się"}
                </button>
            </form>
        </section>
    );
}
