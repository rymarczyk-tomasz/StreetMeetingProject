import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";
import AuthLayout from "../components/AuthLayout";
import PasswordInput from "../components/PasswordInput";

const BENEFITS = [
    "Status zgłoszenia na bieżąco",
    "Auta z garażu zgłaszasz jednym kliknięciem",
    "Wejściówka QR na telefonie",
];

export default function LoginPage() {
    const { login, loginWithCode } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [challenge, setChallenge] = useState("");
    const [code, setCode] = useState("");

    function goOn(user) {
        // Keep the query string: a scanned pass link is /wjazd?kod=….
        const from = location.state?.from;
        const redirectTo = from
            ? `${from.pathname}${from.search || ""}`
            : user.role === "admin"
              ? "/admin"
              : user.canCheckIn
                ? "/wjazd"
                : "/panel";
        navigate(redirectTo, { replace: true });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const result = await login(email, password);
            if (result.challenge) {
                setChallenge(result.challenge);
                setCode("");
            } else {
                goOn(result.user);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Nie udało się zalogować.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleCode(event) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);
        try {
            goOn(await loginWithCode(challenge, code.trim()));
        } catch (err) {
            if (err.response?.data?.code === "challenge_expired") setChallenge("");
            setError(err.response?.data?.message || "Nie udało się zalogować.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <AuthLayout
            image="/img/optimized/photos/6-1200.webp"
            eyebrow="Konto Street Show"
            headline={
                <>
                    Zgłoszenia, garaż
                    <br />i wejściówki w jednym miejscu
                </>
            }
            aside={
                <ul className="auth-split-benefits">
                    {BENEFITS.map((benefit) => (
                        <li key={benefit}>
                            <i className="bi bi-check2" aria-hidden="true" />
                            {benefit}
                        </li>
                    ))}
                </ul>
            }
        >
            <h1>Logowanie</h1>
            {challenge ? (
                <form onSubmit={handleCode} className="form-stack">
                    <p>
                        Otwórz aplikację uwierzytelniającą w telefonie i wpisz 6-cyfrowy kod dla
                        Street Show. Bez telefonu wpisz jeden z kodów zapasowych.
                    </p>
                    <label className="form-field">
                        <span className="field-label">Kod z aplikacji</span>
                        <input
                            className="field-input"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="123456"
                            autoFocus
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
                    >
                        {isSubmitting ? "Sprawdzanie..." : "Potwierdź"}
                    </button>
                    <button
                        type="button"
                        className="text-action"
                        onClick={() => {
                            setChallenge("");
                            setError("");
                        }}
                    >
                        Wróć
                    </button>
                </form>
            ) : (
            <form onSubmit={handleSubmit} className="form-stack">
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
                <div className="form-field">
                    <div className="field-label-row">
                        <label htmlFor="login-password" className="field-label">
                            Hasło
                        </label>
                        <Link to="/nie-pamietam-hasla">Nie pamiętasz hasła?</Link>
                    </div>
                    <PasswordInput
                        id="login-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
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
                >
                    {isSubmitting ? "Logowanie..." : "Zaloguj się"}
                </button>
            </form>
            )}
            <p className="auth-split-switch">
                Nie masz jeszcze konta? <Link to="/rejestracja">Zarejestruj się</Link>
            </p>
        </AuthLayout>
    );
}
