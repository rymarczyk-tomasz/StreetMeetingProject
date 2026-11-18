import { useState } from "react";
import Plate from "../../components/Plate";
import SubmissionThread from "../../components/SubmissionThread";
import { TemplatePicker } from "./templates";
import { fillTemplate } from "./templateData";
import { ZONES, ZONE_LABELS } from "../../utils/zones";
import { DETAIL_TABS, PAYMENT_STATUS_LABELS, STATUS_LABELS, formatDate, formatDay } from "./shared";


function ratingLabel(rating) {
    if (!rating?.count) return "brak ocen";
    const word = rating.count === 1 ? "ocena" : rating.count < 5 ? "oceny" : "ocen";
    return `średnia ${String(rating.average).replace(".", ",")} (${rating.count} ${word})`;
}

function RatingStars({ rating, disabled, onRate }) {
    const mine = rating?.mine || 0;
    const others = (rating?.scores || []).map((item) => `${item.adminEmail}: ${item.score}`).join("\n");
    return (
        <div className="rating-row">
            <span className="rating-stars" role="group" aria-label="Twoja ocena">
                {[1, 2, 3, 4, 5].map((score) => (
                    <button
                        key={score}
                        type="button"
                        className={score <= mine ? "is-on" : ""}
                        disabled={disabled}
                        aria-pressed={score === mine}
                        aria-label={`Oceń na ${score}`}
                        onClick={() => onRate(score === mine ? 0 : score)}
                    >
                        ★
                    </button>
                ))}
            </span>
            <span className="admin-hint" title={others || undefined}>
                {ratingLabel(rating)}
                {mine ? "" : " · bez Twojej oceny"}
            </span>
        </div>
    );
}

function PhotoMosaic({ submission, onOpen }) {
    const photos = submission.photos;
    if (!photos.length) {
        return (
            <div className="detail-photos is-empty">
                {submission.filesPurgedAt ? "Zdjęcia usunięte po wydarzeniu" : "Brak zdjęć"}
            </div>
        );
    }
    const shown = photos.slice(0, 3);
    return (
        <div className={`detail-photos count-${shown.length}`}>
            {shown.map((src, index) => (
                <button
                    key={src}
                    type="button"
                    className="detail-photo"
                    aria-label={`Powiększ zdjęcie ${index + 1}`}
                    onClick={() => onOpen(index)}
                >
                    <img src={src} alt="" loading="lazy" />
                    {index === 2 && photos.length > 3 && <span className="detail-photo-more">+{photos.length - 3}</span>}
                </button>
            ))}
        </div>
    );
}

function MoreMenu({ submission, isBusy, actions }) {
    const items = [];
    if (submission.status !== "pending") {
        items.push(["Przywróć do oczekujących", () => actions.setStatus(submission, "pending")]);
    }
    if (submission.status === "approved" && submission.photoPublishConsent) {
        items.push([
            submission.showcaseHidden ? "Pokaż na stronie „Auta Select”" : "Ukryj na stronie „Auta Select”",
            () => actions.setShowcaseHidden(submission, !submission.showcaseHidden),
        ]);
    }
    if (!items.length) return <span />;

    return (
        <details className="detail-more">
            <summary>
                <i className="bi bi-three-dots" aria-hidden="true" />
                Więcej
            </summary>
            <div className="detail-more-menu">
                {items.map(([label, run]) => (
                    <button
                        key={label}
                        type="button"
                        disabled={isBusy}
                        onClick={(event) => {
                            (event.currentTarget.closest("details") as HTMLDetailsElement).open = false;
                            run();
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </details>
    );
}

function DecisionTab({ submission, isBusy, actions, noteTemplates, zoneTemplates, queue }) {
    // Starts empty after every decision, so an old comment can't ride along with the next one.
    const [note, setNote] = useState("");
    // where the car will stand; needed to approve, changeable afterwards
    const [zone, setZone] = useState(submission.zone || "");
    // message sent with a change of place; {miejsce} is filled on saving, so it follows the final choice
    const [zoneNote, setZoneNote] = useState("");
    const approved = submission.status === "approved";
    const zoneChanged = approved && zone && zone !== submission.zone;
    const submissionValues = {
        rok: submission.edition,
        marka: submission.carBrand,
        rejestracja: submission.licensePlate,
    };

    async function saveZone() {
        const message = fillTemplate(zoneNote, { ...submissionValues, miejsce: ZONE_LABELS[zone] }).trim();
        if (await actions.setZone(submission, zone, message)) setZoneNote("");
    }

    return (
        <div className="detail-tab">
            {submission.status === "pending" && submission.changesSubmittedAt && (
                <p className="detail-note">
                    <i className="bi bi-check2-circle" aria-hidden="true" /> Uczestnik wysłał poprawki{" "}
                    {formatDate(submission.changesSubmittedAt)} — zgłoszenie czeka na ponowne rozpatrzenie.
                </p>
            )}
            {submission.status === "pending" && submission.changesRequestedAt && (
                <p className="detail-muted">
                    Poproszono o poprawki {formatDate(submission.changesRequestedAt)} — czekamy na uczestnika.
                </p>
            )}
            <div className="detail-field-head">
                <label htmlFor={`note-${submission.id}`} className="field-label">
                    Komentarz dla uczestnika
                </label>
                <TemplatePicker
                    templates={noteTemplates}
                    label="Szablon"
                    onPick={(template) =>
                        setNote(
                            fillTemplate(template.body, {
                                rok: submission.edition,
                                marka: submission.carBrand,
                                rejestracja: submission.licensePlate,
                            }),
                        )
                    }
                />
            </div>
            <textarea
                id={`note-${submission.id}`}
                className="field-input field-textarea"
                rows={3}
                maxLength={2000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Widoczny w panelu i w e-mailu z decyzją…"
            />
            {submission.adminNote && (
                <p className="detail-muted">
                    Poprzedni komentarz (nowa decyzja go zastąpi): „{submission.adminNote}”{" "}
                    <button type="button" className="text-action" onClick={() => setNote(submission.adminNote)}>
                        Użyj ponownie
                    </button>
                </p>
            )}
            <div className="zone-choice" role="group" aria-label="Miejsce na wydarzeniu">
                <span className="field-label">Miejsce na wydarzeniu</span>
                <div className="zone-choice-options">
                    {ZONES.map(([id, label]) => (
                        <button
                            key={id}
                            type="button"
                            className={zone === id ? "is-on" : ""}
                            aria-pressed={zone === id}
                            disabled={isBusy}
                            onClick={() => setZone(id)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                {zoneChanged && (
                    <div className="zone-change">
                        <div className="detail-field-head">
                            <label htmlFor={`zone-note-${submission.id}`} className="field-label">
                                Wiadomość o {submission.zone ? "zmianie miejsca" : "miejscu"} (opcjonalna)
                            </label>
                            <TemplatePicker
                                templates={zoneTemplates}
                                label="Szablon"
                                onPick={(template) => setZoneNote(fillTemplate(template.body, submissionValues))}
                            />
                        </div>
                        <textarea
                            id={`zone-note-${submission.id}`}
                            className="field-input field-textarea"
                            rows={4}
                            maxLength={2000}
                            value={zoneNote}
                            onChange={(event) => setZoneNote(event.target.value)}
                            placeholder="Np. powód zmiany, brama i godzina wjazdu…"
                        />
                        <p className="detail-muted">
                            Uczestnik dostanie e-mail
                            {submission.zone
                                ? ` z poprzednim (${ZONE_LABELS[submission.zone]}) i nowym miejscem (${ZONE_LABELS[zone]})`
                                : ` z miejscem: ${ZONE_LABELS[zone]}`}
                            {zoneNote.trim() ? " i tą wiadomością" : ""}. {"{miejsce}"} zostanie zastąpione nowym
                            miejscem.
                        </p>
                        <div className="zone-change-actions">
                            <button
                                type="button"
                                className="btn-street btn-street-dark"
                                disabled={isBusy}
                                onClick={saveZone}
                            >
                                Zapisz miejsce i wyślij e-mail
                            </button>
                            <button
                                type="button"
                                className="text-action"
                                disabled={isBusy}
                                onClick={() => {
                                    setZone(submission.zone || "");
                                    setZoneNote("");
                                }}
                            >
                                Anuluj
                            </button>
                        </div>
                    </div>
                )}
                {approved && !submission.zone && !zone && (
                    <p className="detail-muted">To zgłoszenie nie ma jeszcze przypisanego miejsca.</p>
                )}
            </div>
            <div className="detail-decision">
                <button
                    type="button"
                    className="btn-street btn-street-primary"
                    disabled={isBusy || approved || !zone}
                    title={approved || zone ? "" : "Najpierw wybierz miejsce"}
                    onClick={() => actions.setStatus(submission, "approved", note, zone)}
                >
                    Zaakceptuj
                </button>
                <button
                    type="button"
                    className="btn-street btn-street-outline"
                    disabled={isBusy || submission.status === "waitlist"}
                    onClick={() => actions.setStatus(submission, "waitlist", note)}
                >
                    Rezerwowa
                </button>
                <button
                    type="button"
                    className="btn-street btn-street-danger"
                    disabled={isBusy || submission.status === "rejected"}
                    onClick={() => actions.setStatus(submission, "rejected", note)}
                >
                    Odrzuć
                </button>
                <button
                    type="button"
                    className="btn-street btn-street-outline detail-decision-wide"
                    disabled={isBusy || !note.trim()}
                    title={note.trim() ? "" : "Najpierw wpisz, co uczestnik ma poprawić"}
                    onClick={() => actions.requestChanges(submission, note.trim())}
                >
                    Poproś o poprawki
                </button>
            </div>
            <p className="detail-note">
                Uczestnik dostanie e-mail. „Poproś o poprawki” zostawia zgłoszenie jako oczekujące, więc uczestnik może zmienić dane i zdjęcia.
                {queue?.capacity ? ` Wolne miejsca: ${queue.freePlaces} z ${queue.capacity}.` : ""}
            </p>
            <div className="detail-footer">
                <MoreMenu submission={submission} isBusy={isBusy} actions={actions} />
                <button
                    type="button"
                    className="text-action is-danger"
                    disabled={isBusy}
                    onClick={() => actions.deleteSubmission(submission)}
                >
                    <i className="bi bi-trash3" aria-hidden="true" />
                    Usuń
                </button>
            </div>
        </div>
    );
}

function PaymentTab({ submission, isBusy, actions }) {
    if (submission.status !== "approved") {
        return (
            <div className="detail-tab">
                {submission.status === "withdrawn" && submission.paymentStatus === "paid" ? (
                    <p className="admin-info">
                        <i className="bi bi-info-circle" aria-hidden="true" />
                        <span>Uczestnik zrezygnował po opłaceniu — sprawdź, czy należy się zwrot.</span>
                    </p>
                ) : (
                    <p className="admin-hint">Opłata dotyczy zaakceptowanych zgłoszeń.</p>
                )}
            </div>
        );
    }

    const payment = submission.payment || {};
    const status = submission.paymentStatus || "unpaid";
    return (
        <div className="detail-tab">
            <div className="detail-payment-head">
                <span className={`status-badge payment-status-${status}`}>{PAYMENT_STATUS_LABELS[status]}</span>
                {submission.paymentOverdue && <span className="status-badge payment-overdue">Po terminie</span>}
                {status !== "paid" && payment.deadline && (
                    <span className="detail-muted">termin: {formatDay(payment.deadline)}</span>
                )}
            </div>
            {submission.paymentReminderSentAt && status !== "paid" && (
                <p className="detail-muted">Przypomnienie wysłane {formatDate(submission.paymentReminderSentAt)}.</p>
            )}
            <div className="detail-tiles">
                <div>
                    <span>Kwota</span>
                    <strong>{payment.amount || "—"}</strong>
                </div>
                <div>
                    <span>Tytuł</span>
                    <strong>{payment.title || "—"}</strong>
                </div>
            </div>
            {status !== "paid" ? (
                <>
                    <button
                        type="button"
                        className="btn-street btn-street-primary btn-street-block btn-street-lg"
                        disabled={isBusy}
                        onClick={() => actions.setPaymentStatus(submission, "paid")}
                    >
                        <i className="bi bi-check2-circle" aria-hidden="true" />
                        Potwierdź opłatę i wyślij wejściówkę
                    </button>
                    <p className="detail-note">Uczestnik dostanie e-mail z linkiem do wejściówki QR.</p>
                </>
            ) : (
                <>
                    {submission.checkedInAt && (
                        <p className="detail-note">Wjazd zarejestrowany: {formatDate(submission.checkedInAt)}.</p>
                    )}
                    <div className="detail-footer">
                        <button
                            type="button"
                            className="text-action"
                            disabled={isBusy}
                            onClick={() => actions.setPaymentStatus(submission, "unpaid")}
                        >
                            Oznacz jako nieopłacone
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

function NoteTab({ submission, isBusy, actions }) {
    const [note, setNote] = useState(submission.internalNote || "");
    const changed = note !== (submission.internalNote || "");
    return (
        <div className="detail-tab">
            <label htmlFor={`internal-${submission.id}`} className="field-label">
                Notatka wewnętrzna
            </label>
            <textarea
                id={`internal-${submission.id}`}
                className="field-input field-textarea"
                rows={5}
                maxLength={2000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="np. ocena auta, ustalenia telefoniczne… Widzą ją tylko administratorzy."
            />
            <button
                type="button"
                className="btn-street btn-street-dark"
                disabled={isBusy || !changed}
                onClick={() => actions.saveInternalNote(submission, note)}
            >
                Zapisz notatkę
            </button>
            <p className="detail-note">Zmiana trafia do dziennika działań.</p>
        </div>
    );
}

export default function SubmissionDetails({
    submission: s,
    tab,
    onTab,
    onBack,
    isBusy,
    actions,
    noteTemplates,
    zoneTemplates,
    queue,
}) {
    return (
        <div className="detail" aria-label={`Zgłoszenie ${s.carBrand} ${s.licensePlate}`}>
            <button type="button" className="detail-back" onClick={onBack}>
                <i className="bi bi-chevron-left" aria-hidden="true" />
                Wróć do listy
            </button>
            <PhotoMosaic submission={s} onOpen={(index) => actions.openLightbox(s, index)} />
            <div className="detail-summary">
                <div className="detail-title-row">
                    <div className="detail-title">
                        <span className="detail-muted">
                            #{s.id} · Edycja {s.edition}
                        </span>
                        <h3>{s.carBrand}</h3>
                        <Plate value={s.licensePlate} />
                    </div>
                    <span className={`status-badge status-${s.status}`}>{STATUS_LABELS[s.status] || s.status}</span>
                </div>
                <RatingStars rating={s.rating} disabled={isBusy} onRate={(score) => actions.rate(s, score)} />
                <dl className="detail-data">
                    <div>
                        <dt>Zgłaszający</dt>
                        <dd>
                            {s.firstName} {s.lastName}
                        </dd>
                    </div>
                    <div>
                        <dt>Telefon</dt>
                        <dd>
                            <a href={`tel:${s.phone}`}>{s.phone}</a>
                        </dd>
                    </div>
                    <div className="is-wide">
                        <dt>E-mail</dt>
                        <dd>
                            <a href={`mailto:${s.userEmail}`}>{s.userEmail}</a>
                        </dd>
                    </div>
                </dl>
                {s.carDescription && <p className="detail-description">{s.carDescription}</p>}
                <p className="detail-consents">
                    {s.consentAt ? (
                        <span>
                            <i className="bi bi-check2" aria-hidden="true" /> regulamin {formatDate(s.consentAt)}
                        </span>
                    ) : (
                        <span>brak zapisanej zgody (zgłoszenie sprzed zmian)</span>
                    )}
                    {s.photoPublishConsent && (
                        <span>
                            <i className="bi bi-camera" aria-hidden="true" /> zgoda na publikację
                            {s.showcaseHidden ? " (ukryte na stronie)" : ""}
                        </span>
                    )}
                    {s.withdrawnAt && <span>rezygnacja {formatDate(s.withdrawnAt)}</span>}
                    {s.checkedInAt && (
                        <span>
                            <i className="bi bi-box-arrow-in-right" aria-hidden="true" /> wjazd {formatDate(s.checkedInAt)}
                        </span>
                    )}
                </p>
            </div>
            <div className="detail-tabs" role="tablist" aria-label="Szczegóły zgłoszenia">
                {DETAIL_TABS.map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={tab === id}
                        className={tab === id ? "is-active" : ""}
                        onClick={() => onTab(id)}
                    >
                        {label}
                        {id === "wiadomosci" && s.messages?.unread > 0 && (
                            <span className="admin-nav-count is-yellow">{s.messages.unread}</span>
                        )}
                    </button>
                ))}
            </div>
            {tab === "decyzja" && (
                <DecisionTab
                    key={`d-${s.id}-${s.status}-${s.updatedAt}`}
                    submission={s}
                    isBusy={isBusy}
                    actions={actions}
                    noteTemplates={noteTemplates}
                    zoneTemplates={zoneTemplates}
                    queue={queue}
                />
            )}
            {tab === "oplata" && <PaymentTab submission={s} isBusy={isBusy} actions={actions} />}
            {tab === "wiadomosci" && (
                <div className="detail-tab">
                    <SubmissionThread
                        key={s.id}
                        basePath={`/admin/submissions/${s.id}`}
                        viewer="admin"
                        onRead={actions.onThreadRead}
                    />
                </div>
            )}
            {tab === "notatka" && (
                <NoteTab key={`n-${s.id}-${s.internalNote}`} submission={s} isBusy={isBusy} actions={actions} />
            )}
        </div>
    );
}
