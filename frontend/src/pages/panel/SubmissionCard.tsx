import { useState } from "react";
import api from "../../api/client";
import { askConfirm } from "../../api/confirm";
import { ZONE_LABELS } from "../../utils/zones";
import ConsentFields from "../../components/ConsentFields";
import CopyField from "../../components/CopyField";
import EntryPass from "../../components/EntryPass";
import PhotoSetEditor from "../../components/PhotoSetEditor";
import Plate from "../../components/Plate";
import SubmissionThread from "../../components/SubmissionThread";
import { nextStep, submissionSteps } from "../../utils/submissionSteps";

const STATUS_LABELS = {
    pending: "Oczekuje na rozpatrzenie",
    approved: "Zaakceptowane",
    rejected: "Odrzucone",
    waitlist: "Lista rezerwowa",
    withdrawn: "Rezygnacja",
};

const PAYMENT_STATUS_LABELS = {
    unpaid: "Czeka na potwierdzenie",
    paid: "Opłacone",
};

const EDITABLE_FIELDS = [
    ["firstName", "Imię", { maxLength: 100 }],
    ["lastName", "Nazwisko", { maxLength: 100 }],
    ["phone", "Telefon", { type: "tel" }],
    ["licensePlate", "Numer rejestracyjny", { maxLength: 20 }],
    ["carBrand", "Marka pojazdu", { maxLength: 100 }],
] as const;

const CHANGES_SAVED_HINT =
    "Zmiany zapisane. Gdy skończysz, kliknij „Wyślij poprawki”, żeby organizator dostał powiadomienie.";

function formatDate(value) {
    if (!value) return "Brak danych";
    return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(`${value.replace(" ", "T")}Z`),
    );
}

function formatDay(day) {
    return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(`${day}T12:00:00`),
    );
}

function errorText(err, fallback) {
    return err.response?.data?.message || fallback;
}

const STEP_ICONS = {
    done: "bi-check-circle-fill",
    current: "bi-circle-half",
    todo: "bi-circle",
    failed: "bi-x-circle-fill",
};

function Timeline({ submission }) {
    return (
        <ol className="submission-timeline" aria-label="Postęp zgłoszenia">
            {submissionSteps(submission).map((step) => (
                <li key={step.label} className={`is-${step.state}`}>
                    <span className="submission-timeline-bar" aria-hidden="true" />
                    <span className="submission-timeline-label">
                        <i className={`bi ${STEP_ICONS[step.state]}`} aria-hidden="true" />
                        {step.label}
                    </span>
                </li>
            ))}
        </ol>
    );
}

// The participant only pays (link or transfer); the organizer sees the money in
// Przelewy24 / on the account and confirms it in the admin panel, which sends the pass.
function PaymentBox({ submission }) {
    const { payment, paymentStatus } = submission;
    const waiting = paymentStatus !== "paid";

    return (
        <div className="payment-box">
            <h3>
                Opłata
                <span className={`status-badge payment-status-${paymentStatus}`}>
                    {PAYMENT_STATUS_LABELS[paymentStatus]}
                </span>
            </h3>
            {waiting && payment?.deadline && (
                <p className={submission.paymentOverdue ? "payment-alert" : "payment-deadline"}>
                    {submission.paymentOverdue ? "Termin opłaty minął " : "Termin opłaty: "}
                    <strong>{formatDay(payment.deadline)}</strong>
                </p>
            )}
            {waiting &&
                (payment?.complete ? (
                    <>
                        {payment.url && (
                            <a
                                className="btn-street btn-street-primary payment-online"
                                href={payment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <i className="bi bi-credit-card" aria-hidden="true" />
                                Zapłać online ({payment.amount})
                            </a>
                        )}
                        <dl className="payment-details">
                            <CopyField label="Kwota" value={payment.amount} />
                            {payment.account && (
                                <>
                                    <CopyField label="Odbiorca" value={payment.recipient} />
                                    <CopyField label="Numer konta" value={payment.account} />
                                    {payment.title && <CopyField label="Tytuł" value={payment.title} />}
                                </>
                            )}
                        </dl>
                        <p className="payment-pending" role="status">
                            <i className="bi bi-hourglass-split" aria-hidden="true" />
                            Opłata czeka na potwierdzenie przez organizatora. Po zaksięgowaniu wpłaty dostaniesz
                            e-mail z wejściówką — nic więcej nie musisz klikać.
                        </p>
                    </>
                ) : (
                    <p className="payment-pending">
                        <i className="bi bi-hourglass-split" aria-hidden="true" />
                        Dane do opłaty poda organizator – dostaniesz e-mail.
                    </p>
                ))}
        </div>
    );
}

function ResubmitForm({ submission, edition, onDone, onCancel, notify }) {
    const [consents, setConsents] = useState({ acceptTerms: false });
    const [isSending, setIsSending] = useState(false);

    async function send(event) {
        event.preventDefault();
        setIsSending(true);
        try {
            const { data } = await api.post(`/submissions/${submission.id}/resubmit`, consents);
            notify({ message: data.message });
            await onDone();
        } catch (err) {
            notify({ error: errorText(err, "Nie udało się wysłać zgłoszenia.") });
            setIsSending(false);
        }
    }

    return (
        <form className="auth-form resubmit-form" onSubmit={send}>
            <p>
                Wyślemy nowe zgłoszenie na edycję <strong>{edition}</strong> z tymi samymi
                danymi i zdjęciami. Do czasu decyzji możesz je jeszcze poprawić.
            </p>
            <ConsentFields value={consents} onChange={setConsents} />
            <div className="submission-actions">
                <button type="submit" disabled={isSending || !consents.acceptTerms}>
                    {isSending ? "Wysyłanie..." : `Zgłoś na ${edition}`}
                </button>
                <button type="button" className="button-secondary" onClick={onCancel}>
                    Anuluj
                </button>
            </div>
        </form>
    );
}

export default function SubmissionCard({
    submission: s,
    archived = false,
    availability,
    onChanged,
    notify,
    onOpenPhotos,
}) {
    const [mode, setMode] = useState<"view" | "edit" | "photos" | "resubmit">("view");
    const [expanded, setExpanded] = useState(!archived);
    const [editForm, setEditForm] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [showThread, setShowThread] = useState(false);
    const [feedback, setFeedback] = useState({ message: "", error: "" });
    const [isSendingChanges, setIsSendingChanges] = useState(false);
    const unreadMessages = s.messages?.unread || 0;
    const isPending = s.status === "pending";
    const needsChanges = isPending && !archived && Boolean(s.changesRequestedAt);

    // Shown inside the card, next to what the participant just did.
    function say({ message = "", error = "" }) {
        setFeedback({ message, error });
        notify({});
    }

    async function sendChanges() {
        setIsSendingChanges(true);
        try {
            const { data } = await api.post(`/submissions/${s.id}/changes-done`);
            say({ message: data.message });
            await onChanged();
        } catch (err) {
            say({ error: errorText(err, "Nie udało się wysłać poprawek.") });
        } finally {
            setIsSendingChanges(false);
        }
    }
    const canResubmit =
        archived && availability?.open && availability.remaining > 0 && s.edition < availability.edition;

    function startEditing() {
        setEditForm({
            firstName: s.firstName,
            lastName: s.lastName,
            phone: s.phone,
            licensePlate: s.licensePlate,
            carBrand: s.carBrand,
            carDescription: s.carDescription,
        });
        setMode("edit");
    }

    async function saveEdit(event) {
        event.preventDefault();
        setIsSaving(true);
        try {
            await api.patch(`/submissions/${s.id}`, editForm);
            say({ message: needsChanges ? CHANGES_SAVED_HINT : "Zgłoszenie zostało zaktualizowane." });
            setMode("view");
            await onChanged();
        } catch (err) {
            say({ error: errorText(err, "Nie udało się zapisać zmian zgłoszenia.") });
        } finally {
            setIsSaving(false);
        }
    }

    async function savePhotos(keepUrls, newFiles) {
        const formData = new FormData();
        keepUrls.forEach((url) => formData.append("keep", url));
        newFiles.forEach((file) => formData.append("photos", file));
        await api.put(`/submissions/${s.id}/photos`, formData);
        say({ message: needsChanges ? CHANGES_SAVED_HINT : "Zdjęcia zostały zaktualizowane." });
        setMode("view");
        await onChanged();
    }

    async function withdraw() {
        const confirmed = await askConfirm({
            title: "Wycofać zgłoszenie?",
            message: `Zgłoszenie ${s.carBrand} (${s.licensePlate}) zostanie wycofane, a zdjęcia usunięte.`,
            confirmLabel: "Wycofaj",
            danger: true,
        });
        if (!confirmed) return;
        try {
            const { data } = await api.delete(`/submissions/${s.id}`);
            notify({ message: data.message });
            await onChanged();
        } catch (err) {
            notify({ error: errorText(err, "Nie udało się wycofać zgłoszenia.") });
        }
    }

    async function saveToGarage() {
        try {
            const { data } = await api.post(`/vehicles/from-submission/${s.id}`);
            say({ message: data.message });
            await onChanged();
        } catch (err) {
            say({ error: errorText(err, "Nie udało się zapisać pojazdu w garażu.") });
        }
    }

    const canEdit = isPending && !archived;
    const coverPhoto = !archived ? s.photos?.[0] : null;

    return (
        <li className={`submission-card${archived ? " is-archived" : ""}${coverPhoto ? " has-photo" : ""}`}>
            {coverPhoto && (
                <button
                    type="button"
                    className="submission-card-photo"
                    onClick={() => onOpenPhotos(s, 0)}
                    aria-label={`Zdjęcia ${s.carBrand}`}
                >
                    <img src={coverPhoto} alt="" loading="lazy" />
                    {s.photos.length > 1 && (
                        <span className="submission-card-photo-count">1/{s.photos.length}</span>
                    )}
                </button>
            )}
            <div className="submission-card-body">
                <div className="submission-card-head">
                    <div className="submission-card-title">
                        <h3>{s.carBrand}</h3>
                        <Plate value={s.licensePlate} size={archived ? "sm" : "md"} />
                        {archived && <span className="status-badge status-edition">{s.edition}</span>}
                        {!archived && s.zone && (
                            <span className="status-badge status-zone">Miejsce: {ZONE_LABELS[s.zone] || s.zone}</span>
                        )}
                    </div>
                    {archived ? (
                        <button
                            type="button"
                            className="text-action"
                            onClick={() => setExpanded(!expanded)}
                            aria-expanded={expanded}
                        >
                            {expanded ? "Ukryj szczegóły" : "Zobacz szczegóły"}
                        </button>
                    ) : needsChanges ? (
                        <span className="status-badge status-changes">Do poprawy</span>
                    ) : (
                        <span className={`status-badge status-${s.status}`}>
                            {STATUS_LABELS[s.status] || s.status}
                        </span>
                    )}
                </div>

                {feedback.error && (
                    <p className="form-error" role="alert">
                        {feedback.error}
                    </p>
                )}
                {feedback.message && (
                    <p className="form-success" role="status">
                        {feedback.message}
                    </p>
                )}

                {!archived && (
                    <>
                        <Timeline submission={s} />
                        <p className="submission-next-step">{nextStep(s)}</p>
                    </>
                )}

                {!archived && s.status === "approved" && (
                    <PaymentBox submission={s} />
                )}

                {s.hasPass && !archived && (
                    <div className="submission-actions">
                        <button
                            type="button"
                            className="btn-street btn-street-primary"
                            onClick={() => setShowPass(true)}
                        >
                            <i className="bi bi-qr-code" aria-hidden="true" />
                            Pokaż wejściówkę
                        </button>
                    </div>
                )}

                {s.adminNote && (
                    <p className="submission-note">
                        <strong>Komentarz organizatora:</strong> {s.adminNote}
                    </p>
                )}

                {needsChanges && mode === "view" && (
                    <div className="submission-actions">
                        <button
                            type="button"
                            className="btn-street btn-street-primary"
                            disabled={isSendingChanges}
                            onClick={sendChanges}
                        >
                            <i className="bi bi-send" aria-hidden="true" />
                            {isSendingChanges ? "Wysyłanie..." : "Wyślij poprawki"}
                        </button>
                    </div>
                )}

                {(!archived || s.messages?.total > 0) && (
                    <div className="submission-thread-toggle">
                        <button
                            type="button"
                            className="text-action"
                            onClick={() => setShowThread(!showThread)}
                            aria-expanded={showThread}
                        >
                            <i className="bi bi-chat-left-text" aria-hidden="true" />
                            {showThread ? "Ukryj wiadomości" : "Wiadomości z organizatorem"}
                            {s.messages?.total > 0 && ` (${s.messages.total})`}
                        </button>
                        {unreadMessages > 0 && !showThread && (
                            <span className="unread-badge">nowe: {unreadMessages}</span>
                        )}
                    </div>
                )}
                {showThread && (
                    <SubmissionThread basePath={`/submissions/${s.id}`} viewer="user" onRead={onChanged} />
                )}

                {mode === "edit" && (
                    <form className="auth-form submission-edit-form" onSubmit={saveEdit}>
                        {EDITABLE_FIELDS.map(([field, label, props]) => (
                            <label key={field}>
                                {label}
                                <input
                                    {...props}
                                    value={editForm[field]}
                                    onChange={(event) =>
                                        setEditForm({ ...editForm, [field]: event.target.value })
                                    }
                                    required
                                />
                            </label>
                        ))}
                        <label>
                            Opis pojazdu
                            <textarea
                                rows={4}
                                maxLength={3000}
                                value={editForm.carDescription}
                                onChange={(event) =>
                                    setEditForm({ ...editForm, carDescription: event.target.value })
                                }
                                required
                            />
                        </label>
                        <div className="submission-actions">
                            <button type="submit" disabled={isSaving}>
                                {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
                            </button>
                            <button type="button" className="button-secondary" onClick={() => setMode("view")}>
                                Anuluj
                            </button>
                        </div>
                    </form>
                )}

                {mode === "photos" && (
                    <PhotoSetEditor photos={s.photos} onSave={savePhotos} onCancel={() => setMode("view")} />
                )}

                {mode === "resubmit" && (
                    <ResubmitForm
                        submission={s}
                        edition={availability.edition}
                        onDone={async () => {
                            setMode("view");
                            await onChanged();
                        }}
                        onCancel={() => setMode("view")}
                        notify={say}
                    />
                )}

                {mode === "view" && expanded && (
                    <details className="submission-details" open={archived}>
                        <summary>Szczegóły zgłoszenia</summary>
                        <dl className="submission-meta">
                            <div>
                                <dt>Dodano</dt>
                                <dd>{formatDate(s.createdAt)}</dd>
                            </div>
                            <div>
                                <dt>Ostatnia zmiana</dt>
                                <dd>{formatDate(s.updatedAt)}</dd>
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
                            <strong>Opis pojazdu:</strong> {s.carDescription}
                        </p>
                        {s.filesPurgedAt && !s.photos?.length && (
                            <p className="submission-note">
                                Zdjęcia i potwierdzenie przelewu zostały usunięte po wydarzeniu, zgodnie z polityką
                                prywatności.
                            </p>
                        )}
                        {s.photos?.length > 0 && (
                            <div className="submission-photos">
                                {s.photos.map((photo, index) => (
                                    <button
                                        type="button"
                                        className="photo-thumb-button"
                                        key={photo}
                                        aria-label={`Powiększ zdjęcie ${index + 1}`}
                                        onClick={() => onOpenPhotos(s, index)}
                                    >
                                        <img src={photo} alt={`Zdjęcie ${s.carBrand}`} loading="lazy" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </details>
                )}

                {mode === "view" && (
                    <div className="text-actions submission-footer-actions">
                        {canResubmit && (
                            <button
                                type="button"
                                className="btn-street btn-street-primary"
                                onClick={() => setMode("resubmit")}
                            >
                                Zgłoś ponownie na edycję {availability.edition}
                            </button>
                        )}
                        {canEdit && (
                            <>
                                <button type="button" className="text-action" onClick={startEditing}>
                                    Edytuj dane
                                </button>
                                <button type="button" className="text-action" onClick={() => setMode("photos")}>
                                    Zmień zdjęcia
                                </button>
                            </>
                        )}
                        {!s.inGarage && (
                            <button type="button" className="text-action" onClick={saveToGarage}>
                                Zapisz w garażu
                            </button>
                        )}
                        {canEdit && (
                            <button type="button" className="text-action is-danger" onClick={withdraw}>
                                Wycofaj
                            </button>
                        )}
                    </div>
                )}
            </div>

            {showPass && <EntryPass submissionId={s.id} onClose={() => setShowPass(false)} />}
        </li>
    );
}
