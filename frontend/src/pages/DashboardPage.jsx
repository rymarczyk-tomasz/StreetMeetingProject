import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

const STATUS_LABELS = {
    pending: "Oczekuje na rozpatrzenie",
    approved: "Zaakceptowane",
    rejected: "Odrzucone",
};

function SubmissionForm({ user, onCreated }) {
    const [form, setForm] = useState({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: "",
        licensePlate: "",
        carBrand: "",
        carDescription: "",
    });
    const [photos, setPhotos] = useState(null);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    function updateField(field) {
        return (event) =>
            setForm((prev) => ({ ...prev, [field]: event.target.value }));
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

            const { data } = await api.post("/submissions", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            onCreated(data.submission);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się wysłać zgłoszenia.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
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
                    onChange={(e) => setPhotos(e.target.files)}
                />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Wysyłanie..." : "Wyślij zgłoszenie"}
            </button>
        </form>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const loadSubmissions = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get("/submissions");
            setSubmissions(data.submissions);
        } catch (err) {
            setError(
                err.response?.data?.message || "Nie udało się pobrać zgłoszeń.",
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSubmissions();
    }, [loadSubmissions]);

    const hasPendingOrApproved = submissions.some((s) =>
        ["pending", "approved"].includes(s.status),
    );

    return (
        <section className="page">
            <h1>Panel użytkownika</h1>
            <p>Witaj, {user.firstName || user.email}!</p>

            <h2>Twoje zgłoszenia do strefy Select</h2>
            {isLoading && <p className="page-status">Ładowanie...</p>}
            {error && <p className="form-error">{error}</p>}
            {!isLoading && submissions.length === 0 && (
                <p>Nie masz jeszcze żadnych zgłoszeń.</p>
            )}
            {submissions.length > 0 && (
                <ul className="submission-list">
                    {submissions.map((s) => (
                        <li key={s.id}>
                            <strong>
                                {s.carBrand} — {s.licensePlate}
                            </strong>{" "}
                            <span className={`status-badge status-${s.status}`}>
                                {STATUS_LABELS[s.status] || s.status}
                            </span>
                            {s.adminNote && <p>Komentarz: {s.adminNote}</p>}
                        </li>
                    ))}
                </ul>
            )}

            {!isLoading && !hasPendingOrApproved && (
                <>
                    <h2>Zgłoś swój pojazd</h2>
                    <SubmissionForm
                        user={user}
                        onCreated={(submission) =>
                            setSubmissions((prev) => [submission, ...prev])
                        }
                    />
                </>
            )}
        </section>
    );
}
