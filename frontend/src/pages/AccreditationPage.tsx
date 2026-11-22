import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import PageHeader from "../components/PageHeader";

const EMPTY = { name: "", email: "", phone: "", instagram: "", consent: false };

export default function AccreditationPage() {
    const [form, setForm] = useState(EMPTY);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const update = (patch: Partial<typeof EMPTY>) => setForm((current) => ({ ...current, ...patch }));

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);
        try {
            const { data } = await api.post("/accreditations", form);
            setMessage(data.message);
            setForm(EMPTY);
        } catch (err) {
            setError(err.response?.data?.message || "Nie udało się wysłać wniosku. Spróbuj ponownie.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <PageHeader
                eyebrow="Dla mediów"
                title="Akredytacje medialne"
                lead="Wypełnij wniosek, a decyzję wyślemy e-mailem."
            />
            <section className="page-section">
                <div className="site-container">
                    {message ? (
                        <p className="form-success accreditation-form" role="status">
                            {message}
                        </p>
                    ) : (
                        <form className="form-stack accreditation-form" onSubmit={handleSubmit}>
                            <label className="form-field">
                                <span className="field-label">Imię i nazwisko</span>
                                <input
                                    className="field-input"
                                    value={form.name}
                                    onChange={(event) => update({ name: event.target.value })}
                                    autoComplete="name"
                                    maxLength={100}
                                    required
                                />
                            </label>
                            <label className="form-field">
                                <span className="field-label">E-mail</span>
                                <input
                                    type="email"
                                    className="field-input"
                                    value={form.email}
                                    onChange={(event) => update({ email: event.target.value })}
                                    autoComplete="email"
                                    maxLength={254}
                                    required
                                />
                            </label>
                            <label className="form-field">
                                <span className="field-label">Telefon</span>
                                <input
                                    type="tel"
                                    className="field-input"
                                    value={form.phone}
                                    onChange={(event) => update({ phone: event.target.value })}
                                    autoComplete="tel"
                                    maxLength={30}
                                    required
                                />
                            </label>
                            <label className="form-field">
                                <span className="field-label">Link do Instagrama</span>
                                <input
                                    className="field-input"
                                    value={form.instagram}
                                    onChange={(event) => update({ instagram: event.target.value })}
                                    placeholder="https://www.instagram.com/twojprofil"
                                    autoCapitalize="none"
                                    maxLength={300}
                                    required
                                />
                            </label>
                            <label className="check-label">
                                <input
                                    type="checkbox"
                                    className="check-input"
                                    checked={form.consent}
                                    onChange={(event) => update({ consent: event.target.checked })}
                                    required
                                />
                                <span>
                                    Wyrażam zgodę na przetwarzanie moich danych z tego formularza przez Street Meeting
                                    Poland sp. z o.o. w celu rozpatrzenia i obsługi wniosku o akredytację. Zgodę mogę
                                    wycofać w każdej chwili, pisząc na adres podany w{" "}
                                    <Link to="/polityka-prywatnosci" target="_blank">
                                        polityce prywatności
                                    </Link>
                                    . <em>(wymagane)</em>
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
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Wysyłanie..." : "Wyślij wniosek"}
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </>
    );
}
