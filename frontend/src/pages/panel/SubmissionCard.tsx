import { useState } from "react";
import api from "../../api/client";
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

function PaymentBox({ submission, onChanged, notify }) {
    const [isUploading, setIsUploading] = useState(false);
    const { payment, paymentStatus } = submission;

    async function sendProof(file) {
        if (!file) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("proof", file);
            const { data } = await api.post(`/submissions/${submission.id}/payment-proof`, formData);
            notify({ message: data.message });
            await onChanged();
        } catch (err) {
            notify({ error: errorText(err, "Nie udało się przesłać potwierdzenia.") });
        } finally {
            setIsUploading(false);
        }
    }

    async function reportWithoutProof() {
        try {
            await api.patch(`/submissions/${submission.id}/payment-status`);
            notify({ message: "Zgłoszono opłatę — organizator ją sprawdzi." });
            await onChanged();
        } catch (err) {
            notify({ error: errorText(err, "Nie udało się zgłosić opłaty.") });
        }
    }

    return (
        <div className="payment-box">
            <h3>
                Opłata
                <span className={`status-badge payment-status-${paymentStatus}`}>
                    {PAYMENT_STATUS_LABELS[paymentStatus]}
                </span>
            </h3>
            {paymentStatus === "unpaid" && payment?.deadline && (
                <p className={submission.paymentOverdue ? "payment-alert" : "payment-deadline"}>
                    {submission.paymentOverdue ? "Termin opłaty minął " : "Termin opłaty: "}
                    <strong>{formatDay(payment.deadline)}</strong>
                </p>
            )}
            {paymentStatus !== "paid" &&
                (payment?.complete ? (
                    <dl className="payment-details">
                        <CopyField label="Kwota" value={payment.amount} />
                        <CopyField label="Odbiorca" value={payment.recipient} />
                        <CopyField label="Numer konta" value={payment.account} />
                        <CopyField label="Tytuł" value={payment.title} />
                    </dl>
                ) : (
                    <p className="admin-hint">
                        Dane do przelewu{payment?.amount ? ` (kwota: ${payment.amount})` : ""}{" "}
                        organizator poda wkrótce — sprawdź komunikaty lub e-mail.
                    </p>
                ))}
            {submission.paymentProofUrl && (
                <p className="payment-proof-link">
                    <i className="bi bi-file-earmark-check" aria-hidden="true" />{" "}
                    <a href={submission.paymentProofUrl} target="_blank" rel="noopener noreferrer">
                        Twoje potwierdzenie przelewu
                    </a>
                </p>
            )}
            {paymentStatus !== "paid" && (
                <div className="payment-actions">
                    <label className={`btn-street btn-street-dark file-button${isUploading ? " is-busy" : ""}`}>
                        <i className="bi bi-upload" aria-hidden="true" />
                        {isUploading
                            ? "Przesyłanie..."
                            : submission.paymentProofUrl
                              ? "Podmień potwierdzenie przelewu"
                              : "Dodaj potwierdzenie przelewu"}
                        <input
                            type="file"
                            className="visually-hidden"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            disabled={isUploading}
                            onChange={(event) => sendProof(event.target.files?.[0])}
                        />
                    </label>
                    {paymentStatus === "unpaid" && (
                        <button type="button" className="text-action" onClick={reportWithoutProof}>
                            Zgłoś opłatę bez potwierdzenia
                        </button>
                    )}
                    <p className="payment-hint">Zrzut ekranu lub PDF z banku (JPG, PNG, WEBP, PDF).</p>
                </div>
            )}
        </div>
    );
}

function ResubmitForm({ submission, edition, onDone, onCancel, notify }) {
    const [consents, setConsents] = useState({ acceptTerms: false, photoPublishConsent: false });
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

// One submission in the participant panel. `archived` = earlier edition.
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
    const unreadMessages = s.messages?.unread || 0;
    const isPending = s.status === "pending";
    const canResign = !archived && ["approved", "waitlist"].includes(s.status) && !s.checkedInAt;
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
            notify({ message: "Zgłoszenie zostało zaktualizowane." });
            setMode("view");
            await onChanged();
        } catch (err) {
            notify({ error: errorText(err, "Nie udało się zapisać zmian zgłoszenia.") });
        } finally {
            setIsSaving(false);
        }
    }

    async function savePhotos(keepUrls, newFiles) {
        const formData = new FormData();
        keepUrls.forEach((url) => formData.append("keep", url));
        newFiles.forEach((file) => formData.append("photos", file));
        await api.put(`/submissions/${s.id}/photos`, formData);
        notify({ message: "Zdjęcia zostały zaktualizowane." });
        setMode("view");
        await onChanged();
    }

    async function withdraw() {
        if (
            !window.confirm(
                `Czy na pewno wycofać zgłoszenie ${s.carBrand} (${s.licensePlate})? Zdjęcia zostaną usunięte.`,
            )
        ) {
            return;
        }
        try {
            const { data } = await api.delete(`/submissions/${s.id}`);
            notify({ message: data.message });
            await onChanged();
        } catch (err) {
            notify({ error: errorText(err, "Nie udało się wycofać zgłoszenia.") });
        }
    }

    async function resign() {
        const warning =
            s.paymentStatus === "paid"
                ? " Opłata jest już potwierdzona — o zwrocie zdecyduje organizator zgodnie z regulaminem."
                : "";
        const place = s.status === "waitlist" ? "miejsce na liście rezerwowej" : "miejsce w strefie Select";
        if (
            !window.confirm(
                `Zrezygnować z udziału auta ${s.carBrand} (${s.licensePlate})? Twoje ${place} przejdzie na kolejną osobę i nie da się tego cofnąć samodzielnie.${warning}`,
            )
        ) {
            return;
        }
        try {
            const { data } = await api.post(`/submissions/${s.id}/withdraw`);
            notify({ message: data.message });
            await onChanged();
        } catch (err) {
            notify({ error: errorText(err, "Nie udało się zapisać rezygnacji.") });
        }
    }

    async function saveToGarage() {
        try {
            const { data } = await api.post(`/vehicles/from-submission/${s.id}`);
            notify({ message: data.message });
        } catch (err) {
            notify({ error: errorText(err, "Nie udało się zapisać pojazdu w garażu.") });
        }
    }

    // A submission waiting for the decision is shown as one compact row.
    const isCompact = isPending && !archived;
    const coverPhoto = !archived && !isCompact ? s.photos?.[0] : null;

    return (
        <li
            className={`submission-card${archived ? " is-archived" : ""}${isCompact ? " is-compact" : ""}${coverPhoto ? " has-photo" : ""}`}
        >
            {coverPhoto && (
                <button
                    type="button"
                    className="submission-card-photo"
                    onClick={() => onOpenPhotos(s, 0)}
                    aria-label={`Zdjęcia ${s.carBrand}`}
                >
                    <img src={coverPhoto} alt="" loading="lazy" />
                </button>
            )}
            <div className="submission-card-body">
                <div className="submission-card-head">
                    <div className="submission-card-title">
                        <h3>{s.carBrand}</h3>
                        <Plate value={s.licensePlate} size={isCompact || archived ? "sm" : "md"} />
                        {isCompact && (
                            <span className={`status-badge status-${s.status}`}>
                                {STATUS_LABELS[s.status] || s.status}
                            </span>
                        )}
                        {archived && <span className="status-badge status-edition">{s.edition}</span>}
                    </div>
                    {isCompact ? (
                        mode === "view" && (
                            <div className="text-actions">
                                <button type="button" className="text-action" onClick={startEditing}>
                                    Edytuj dane
                                </button>
                                <button type="button" className="text-action" onClick={() => setMode("photos")}>
                                    Zmień zdjęcia
                                </button>
                                <button type="button" className="text-action is-danger" onClick={withdraw}>
                                    Wycofaj
                                </button>
                            </div>
                        )
                    ) : archived ? (
                        <button
                            type="button"
                            className="text-action"
                            onClick={() => setExpanded(!expanded)}
                            aria-expanded={expanded}
                        >
                            {expanded ? "Ukryj szczegóły" : "Zobacz szczegóły"}
                        </button>
                    ) : (
                        <span className={`status-badge status-${s.status}`}>
                            {STATUS_LABELS[s.status] || s.status}
                        </span>
                    )}
                </div>

                {!archived && !isCompact && (
                    <>
                        <Timeline submission={s} />
                        <p className="submission-next-step">{nextStep(s)}</p>
                    </>
                )}

                {!archived && s.status === "approved" && (
                    <PaymentBox submission={s} onChanged={onChanged} notify={notify} />
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
                        notify={notify}
                    />
                )}

                {mode === "view" && expanded && !isCompact && (
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

                {mode === "view" && !isCompact && (
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
                        <button type="button" className="text-action" onClick={saveToGarage}>
                            Zapisz w garażu
                        </button>
                        {canResign && (
                            <button type="button" className="text-action is-danger" onClick={resign}>
                                Rezygnuję
                            </button>
                        )}
                    </div>
                )}
            </div>

            {showPass && <EntryPass submissionId={s.id} onClose={() => setShowPass(false)} />}
        </li>
    );
}
