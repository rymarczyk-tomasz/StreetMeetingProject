import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function SubmissionPage() {
    const { user } = useAuth();
    const [form, setForm] = useState({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        licensePlate: user.licensePlate || "",
        carBrand: user.carBrand || "",
        carDescription: "",
    });
    const [photos, setPhotos] = useState(null);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasPendingOrApproved, setHasPendingOrApproved] = useState(false);

    useEffect(() => {
        async function loadSubmissions() {
            try {
                const { data } = await api.get("/submissions");
                setHasPendingOrApproved(
                    data.submissions.some((submission) =>
                        ["pending", "approved"].includes(submission.status),
                    ),
                );
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                        "Nie udało się pobrać zgłoszeń.",
                );
            } finally {
                setIsLoading(false);
            }
        }

        loadSubmissions();
    }, []);

    function updateField(field) {
        return (event) =>
            setForm((previous) => ({
                ...previous,
                [field]: event.target.value,
            }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        if (!photos || photos.length === 0) {
            setError("Proszę dodać przynajmniej jedno zdjęcie.");
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) =>
                formData.append(key, value),
            );
            Array.from(photos).forEach((file) =>
                formData.append("photos", file),
            );

            await api.post("/submissions", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setIsSubmitted(true);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się wysłać zgłoszenia.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    function startAnotherSubmission() {
        setForm({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            phone: user.phone || "",
            licensePlate: "",
            carBrand: "",
            carDescription: "",
        });
        setPhotos(null);
        setError("");
        setIsSubmitted(false);
    }

    return (
        <section className="page auth-page">
            <h1>Formularz Strefa Select</h1>
            {isLoading ? (
                <p className="page-status">Ładowanie...</p>
            ) : isSubmitted ? (
                <div className="submission-success">
                    <p>Twoje zgłoszenie zostało wysłane.</p>
                    <button type="button" onClick={startAnotherSubmission}>
                        Dodaj kolejne zgłoszenie
                    </button>
                </div>
            ) : (
                <>
                    {hasPendingOrApproved && (
                        <p className="submission-info">
                            Masz już zgłoszenie oczekujące na rozpatrzenie lub
                            zaakceptowane. Możesz mimo to dodać kolejne auto.
                        </p>
                    )}
                    <form onSubmit={handleSubmit} className="auth-form">
                        <label>
                            Imię
                            <input
                                value={form.firstName}
                                onChange={updateField("firstName")}
                                required
                                minLength={2}
                            />
                        </label>
                        <label>
                            Nazwisko
                            <input
                                value={form.lastName}
                                onChange={updateField("lastName")}
                                required
                                minLength={2}
                            />
                        </label>
                        <label>
                            Numer telefonu
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={updateField("phone")}
                                placeholder="np. +48 123 456 789"
                                required
                            />
                        </label>
                        <label>
                            Numer tablic rejestracyjnych
                            <input
                                value={form.licensePlate}
                                onChange={updateField("licensePlate")}
                                placeholder="np. GD 12345"
                                required
                            />
                        </label>
                        <label>
                            Marka pojazdu
                            <input
                                value={form.carBrand}
                                onChange={updateField("carBrand")}
                                required
                                minLength={2}
                            />
                        </label>
                        <label>
                            Opis pojazdu
                            <textarea
                                value={form.carDescription}
                                onChange={updateField("carDescription")}
                                rows={3}
                                required
                                minLength={10}
                            />
                        </label>
                        <label>
                            Zdjęcia (maksymalnie 5, łącznie do 50MB)
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                required
                                onChange={(event) =>
                                    setPhotos(event.target.files)
                                }
                            />
                        </label>
                        {error && <p className="form-error">{error}</p>}
                        <button type="submit" disabled={isSubmitting}>
                            {isSubmitting
                                ? "Wysyłanie..."
                                : "Wyślij zgłoszenie"}
                        </button>
                    </form>
                </>
            )}
        </section>
    );
}
