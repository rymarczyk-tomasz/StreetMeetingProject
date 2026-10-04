import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

const STATUS_LABELS = {
    pending: "Oczekuje na rozpatrzenie",
    approved: "Zaakceptowane",
    rejected: "Odrzucone",
};

const PAYMENT_STATUS_LABELS = {
    unpaid: "Do opłacenia",
    verification: "Opłata w weryfikacji",
    paid: "Opłacone",
};

const EDITABLE_FIELDS = [
    ["firstName", "Imię", { maxLength: 100 }],
    ["lastName", "Nazwisko", { maxLength: 100 }],
    ["phone", "Telefon", { type: "tel" }],
    ["licensePlate", "Numer rejestracyjny", { maxLength: 20 }],
    ["carBrand", "Marka pojazdu", { maxLength: 100 }],
] as const;

export default function DashboardPage() {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState([]);
    const [expandedSubmissionId, setExpandedSubmissionId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

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

    function clearFeedback() {
        setError("");
        setMessage("");
    }

    async function reportPayment(submissionId) {
        clearFeedback();
        try {
            await api.patch(`/submissions/${submissionId}/payment-status`);
            await loadSubmissions();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    (err.response
                        ? `Błąd serwera (${err.response.status}).`
                        : "Brak połączenia z serwerem.") ||
                    "Nie udało się zgłosić opłaty do weryfikacji.",
            );
        }
    }

    function startEditing(submission) {
        clearFeedback();
        setEditingId(submission.id);
        setEditForm({
            firstName: submission.firstName,
            lastName: submission.lastName,
            phone: submission.phone,
            licensePlate: submission.licensePlate,
            carBrand: submission.carBrand,
            carDescription: submission.carDescription,
        });
    }

    async function saveEdit(event) {
        event.preventDefault();
        clearFeedback();
        setIsSaving(true);
        try {
            await api.patch(`/submissions/${editingId}`, editForm);
            setEditingId(null);
            setMessage("Zgłoszenie zostało zaktualizowane.");
            await loadSubmissions();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się zapisać zmian zgłoszenia.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    async function withdrawSubmission(submission) {
        const confirmed = window.confirm(
            `Czy na pewno wycofać zgłoszenie ${submission.carBrand} (${submission.licensePlate})? Zdjęcia zostaną usunięte.`,
        );
        if (!confirmed) return;

        clearFeedback();
        try {
            const { data } = await api.delete(`/submissions/${submission.id}`);
            setMessage(data.message);
            await loadSubmissions();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się wycofać zgłoszenia.",
            );
        }
    }

    return (
        <section className="page">
            <div className="page-heading-row">
                <div>
                    <p className="page-eyebrow">Panel użytkownika</p>
                    <h1>Witaj, {user.firstName || user.email}!</h1>
                </div>
                <Link
                    className="account-settings-button"
                    to="/ustawienia-konta"
                >
                    Ustawienia konta
                </Link>
            </div>

            <h2>Twoje zgłoszenia do strefy Select</h2>
            <p>
                <Link className="account-settings-button" to="/formularz">
                    Złóż zgłoszenie
                </Link>
            </p>
            {isLoading && <p className="page-status">Ładowanie...</p>}
            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}
            {!isLoading && submissions.length === 0 && (
                <p>Nie masz jeszcze żadnych zgłoszeń.</p>
            )}
            {submissions.length > 0 && (
                <ul className="submission-list">
                    {submissions.map((s) => {
                        const isExpanded = expandedSubmissionId === s.id;
                        const isEditing = editingId === s.id;
                        const canManagePayment = s.status === "approved";
                        const isPending = s.status === "pending";

                        return (
                            <li className="submission-card" key={s.id}>
                                <div className="submission-summary">
                                    <div>
                                        <strong>
                                            {s.carBrand} — {s.licensePlate}
                                        </strong>
                                        <span
                                            className={`status-badge status-${s.status}`}
                                        >
                                            {STATUS_LABELS[s.status] ||
                                                s.status}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        className="submission-details-button"
                                        onClick={() =>
                                            setExpandedSubmissionId(
                                                isExpanded ? null : s.id,
                                            )
                                        }
                                        aria-expanded={isExpanded}
                                    >
                                        {isExpanded
                                            ? "Ukryj szczegóły"
                                            : "Zobacz szczegóły"}
                                    </button>
                                </div>
                                {isExpanded && isEditing && (
                                    <form
                                        className="auth-form submission-edit-form"
                                        onSubmit={saveEdit}
                                    >
                                        {EDITABLE_FIELDS.map(
                                            ([field, label, props]) => (
                                                <label key={field}>
                                                    {label}
                                                    <input
                                                        {...props}
                                                        value={editForm[field]}
                                                        onChange={(event) =>
                                                            setEditForm({
                                                                ...editForm,
                                                                [field]:
                                                                    event.target
                                                                        .value,
                                                            })
                                                        }
                                                        required
                                                    />
                                                </label>
                                            ),
                                        )}
                                        <label>
                                            Opis pojazdu
                                            <textarea
                                                rows={4}
                                                maxLength={3000}
                                                value={editForm.carDescription}
                                                onChange={(event) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        carDescription:
                                                            event.target.value,
                                                    })
                                                }
                                                required
                                            />
                                        </label>
                                        <div className="submission-actions">
                                            <button
                                                type="submit"
                                                disabled={isSaving}
                                            >
                                                {isSaving
                                                    ? "Zapisywanie..."
                                                    : "Zapisz zmiany"}
                                            </button>
                                            <button
                                                type="button"
                                                className="button-secondary"
                                                onClick={() =>
                                                    setEditingId(null)
                                                }
                                            >
                                                Anuluj
                                            </button>
                                        </div>
                                    </form>
                                )}
                                {isExpanded && !isEditing && (
                                    <div className="submission-details">
                                        <dl className="submission-meta">
                                            <div>
                                                <dt>Dodano</dt>
                                                <dd>
                                                    {formatDate(s.createdAt)}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt>Ostatnia zmiana</dt>
                                                <dd>
                                                    {formatDate(s.updatedAt)}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt>Uczestnik</dt>
                                                <dd>
                                                    {s.firstName} {s.lastName}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt>Telefon</dt>
                                                <dd>{s.phone}</dd>
                                            </div>
                                        </dl>
                                        <p>
                                            <strong>Opis pojazdu:</strong>{" "}
                                            {s.carDescription}
                                        </p>
                                        {isPending && (
                                            <div className="submission-actions">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        startEditing(s)
                                                    }
                                                >
                                                    Edytuj zgłoszenie
                                                </button>
                                                <button
                                                    type="button"
                                                    className="button-danger"
                                                    onClick={() =>
                                                        withdrawSubmission(s)
                                                    }
                                                >
                                                    Wycofaj zgłoszenie
                                                </button>
                                            </div>
                                        )}
                                        {canManagePayment && (
                                            <p>
                                                <strong>Status opłaty:</strong>{" "}
                                                <span
                                                    className={`status-badge payment-status-${s.paymentStatus || "unpaid"}`}
                                                >
                                                    {
                                                        PAYMENT_STATUS_LABELS[
                                                            s.paymentStatus ||
                                                                "unpaid"
                                                        ]
                                                    }
                                                </span>
                                            </p>
                                        )}
                                        {canManagePayment &&
                                            (!s.paymentStatus ||
                                                s.paymentStatus ===
                                                    "unpaid") && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        reportPayment(s.id)
                                                    }
                                                >
                                                    Zgłoś opłacenie
                                                </button>
                                            )}
                                        {s.adminNote && (
                                            <p className="submission-note">
                                                <strong>
                                                    Komentarz administratora:
                                                </strong>{" "}
                                                {s.adminNote}
                                            </p>
                                        )}
                                        {s.photos?.length > 0 && (
                                            <div className="submission-photos">
                                                {s.photos.map((photo) => (
                                                    <a
                                                        href={photo}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        key={photo}
                                                    >
                                                        <img
                                                            src={photo}
                                                            alt={`Zdjęcie ${s.carBrand}`}
                                                            loading="lazy"
                                                        />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

function formatDate(value) {
    if (!value) return "Brak danych";

    return new Intl.DateTimeFormat("pl-PL", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(`${value.replace(" ", "T")}Z`));
}
