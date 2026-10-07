import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import PasswordInput from "../components/PasswordInput";
import { plural } from "../utils/plural";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const VALIDATORS = {
    firstName: (value) => (value.trim().length < 2 ? "Podaj imię (min. 2 znaki)." : ""),
    lastName: (value) => (value.trim().length < 2 ? "Podaj nazwisko (min. 2 znaki)." : ""),
    email: (value) => (EMAIL_PATTERN.test(value.trim()) ? "" : "Podaj poprawny adres e-mail."),
    password: (value) => (value.length < 8 ? "Hasło musi mieć min. 8 znaków." : ""),
};

function FieldError({ id, message }) {
    if (!message) return null;
    return (
        <p className="field-error" id={id}>
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
            {message}
        </p>
    );
}

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        acceptTerms: false,
    });
    // Fields are checked when left (blur) and on submit, never while typing.
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectStatus, setSelectStatus] = useState(null);

    useEffect(() => {
        api.get("/select-status")
            .then(({ data }) => setSelectStatus(data))
            .catch(() => setSelectStatus(null));
    }, []);

    function updateField(field) {
        return (event) => {
            setForm((prev) => ({ ...prev, [field]: event.target.value }));
            // A fixed field stops showing its old error right away.
            if (fieldErrors[field] && !VALIDATORS[field](event.target.value)) {
                setFieldErrors((prev) => ({ ...prev, [field]: "" }));
            }
        };
    }

    function validateField(field) {
        return () => setFieldErrors((prev) => ({ ...prev, [field]: VALIDATORS[field](form[field]) }));
    }

    function fieldProps(field) {
        const message = fieldErrors[field];
        return {
            value: form[field],
            onChange: updateField(field),
            onBlur: validateField(field),
            "aria-invalid": message ? true : undefined,
            "aria-describedby": message ? `register-${field}-error` : undefined,
        };
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        const errors = Object.fromEntries(
            Object.entries(VALIDATORS).map(([field, validate]) => [field, validate(form[field])]),
        );
        setFieldErrors(errors);
        if (Object.values(errors).some(Boolean)) return;
        if (!form.acceptTerms) {
            setError("Zaakceptuj regulamin, aby założyć konto.");
            return;
        }

        setIsSubmitting(true);
        try {
            await register(form);
            navigate("/panel", { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || "Nie udało się utworzyć konta.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const edition = selectStatus?.edition;
    const maxVehicles = selectStatus?.maxVehicles || 5;

    return (
        <AuthLayout
            image="/img/optimized/photos/10-1200.webp"
            eyebrow={edition ? `Strefa Select ${edition}` : "Strefa Select"}
            headline={
                <>
                    Załóż konto,
                    <br />
                    zgłoś swoje auto
                </>
            }
            aside={
                <p className="auth-split-text">
                    Do {plural(maxVehicles, "pojazdu", "pojazdów", "pojazdów")} na konto. Decyzję
                    organizatora dostaniesz e-mailem.
                </p>
            }
        >
            <h1>Rejestracja</h1>
            <form onSubmit={handleSubmit} className="form-stack" noValidate>
                <div className="form-row-2">
                    <label className="form-field">
                        <span className="field-label">Imię</span>
                        <input
                            className="field-input"
                            autoComplete="given-name"
                            required
                            {...fieldProps("firstName")}
                        />
                        <FieldError id="register-firstName-error" message={fieldErrors.firstName} />
                    </label>
                    <label className="form-field">
                        <span className="field-label">Nazwisko</span>
                        <input
                            className="field-input"
                            autoComplete="family-name"
                            required
                            {...fieldProps("lastName")}
                        />
                        <FieldError id="register-lastName-error" message={fieldErrors.lastName} />
                    </label>
                </div>
                <label className="form-field">
                    <span className="field-label">E-mail</span>
                    <input
                        type="email"
                        className="field-input"
                        autoComplete="email"
                        required
                        {...fieldProps("email")}
                    />
                    <FieldError id="register-email-error" message={fieldErrors.email} />
                </label>
                <div className="form-field">
                    <label htmlFor="register-password" className="field-label">
                        Hasło
                    </label>
                    <PasswordInput
                        id="register-password"
                        autoComplete="new-password"
                        required
                        invalid={Boolean(fieldErrors.password)}
                        {...fieldProps("password")}
                    />
                    <FieldError id="register-password-error" message={fieldErrors.password} />
                </div>
                <label className="check-label">
                    <input
                        type="checkbox"
                        className="check-input"
                        checked={form.acceptTerms}
                        onChange={(event) =>
                            setForm((prev) => ({ ...prev, acceptTerms: event.target.checked }))
                        }
                        required
                    />
                    <span>
                        Akceptuję{" "}
                        <Link to="/regulamin" target="_blank">
                            regulamin
                        </Link>{" "}
                        i wyrażam zgodę na przetwarzanie moich danych w celu prowadzenia konta
                        i obsługi zgłoszeń.
                    </span>
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
                >
                    {isSubmitting ? "Tworzenie konta..." : "Zarejestruj się"}
                </button>
            </form>
            <p className="auth-split-switch">
                Masz już konto? <Link to="/logowanie">Zaloguj się</Link>
            </p>
        </AuthLayout>
    );
}
