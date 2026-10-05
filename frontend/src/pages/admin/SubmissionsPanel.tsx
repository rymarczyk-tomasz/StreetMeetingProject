import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import Lightbox from "../../components/Lightbox";
import SubmissionThread from "../../components/SubmissionThread";
import GroupEmailForm from "./GroupEmailForm";
import { TemplatePicker, fillTemplate, useTemplates } from "./templates";
import { printGateList } from "./gateList";
import {
    PAYMENT_STATUS_LABELS,
    STATUS_LABELS,
    errorMessage,
    formatDate,
    formatDay,
} from "./shared";

// Fetched again (not taken from the table) so the backend logs the export.
async function exportToExcel(filters) {
    const { data } = await api.get("/admin/submissions", {
        params: { ...filters, purpose: "export" },
    });
    const submissions = data.submissions;
    // SheetJS is large; load it only when someone actually exports.
    const XLSX = await import("xlsx");
    const rows = submissions.map((submission) => ({
        "ID zgłoszenia": submission.id,
        "Data zgłoszenia": submission.createdAt,
        Imię: submission.firstName,
        Nazwisko: submission.lastName,
        "E-mail": submission.userEmail,
        Telefon: submission.phone,
        Marka: submission.carBrand,
        Rejestracja: submission.licensePlate,
        Opis: submission.carDescription,
        Status: STATUS_LABELS[submission.status] || submission.status,
        "Status opłaty":
            PAYMENT_STATUS_LABELS[submission.paymentStatus || "unpaid"],
        "Termin opłaty":
            submission.status === "approved" ? submission.payment?.deadline || "" : "",
        "Komentarz administratora": submission.adminNote || "",
        "Notatka wewnętrzna": submission.internalNote || "",
        "Średnia ocena": submission.rating?.average ?? "",
        "Liczba ocen": submission.rating?.count ?? 0,
        "Liczba zdjęć": submission.photos.length,
        Edycja: submission.edition,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
        { wch: 14 },
        { wch: 22 },
        { wch: 18 },
        { wch: 18 },
        { wch: 30 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 45 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
        { wch: 40 },
        { wch: 40 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 10 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Zgłoszenia");
    XLSX.writeFile(
        workbook,
        `zgloszenia-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
}

const SORTS = {
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
    rating: (a, b) => (b.rating?.average ?? -1) - (a.rating?.average ?? -1) || b.rating?.count - a.rating?.count,
};

// 1–5 stars for the signed-in admin; clicking the current score clears it.
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
                {rating?.count
                    ? `średnia ${rating.average} (${rating.count} ${rating.count === 1 ? "ocena" : rating.count < 5 ? "oceny" : "ocen"})`
                    : "brak ocen"}
                {mine ? "" : " · bez Twojej oceny"}
            </span>
        </div>
    );
}

export default function SubmissionsPanel({ onAction }) {
    const [submissions, setSubmissions] = useState([]);
    const [adminNotes, setAdminNotes] = useState({});
    const [internalNotes, setInternalNotes] = useState({});
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkNote, setBulkNote] = useState("");
    // edition "" = the current edition (server default), "all" = every year.
    const [filters, setFilters] = useState({
        edition: "",
        status: "",
        paymentStatus: "",
        search: "",
        unread: "",
    });
    const [openThreads, setOpenThreads] = useState<number[]>([]);
    const [sort, setSort] = useState("newest");
    const [onlyUnrated, setOnlyUnrated] = useState(false);
    const [editions, setEditions] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isBusy, setIsBusy] = useState(false);
    const [lightbox, setLightbox] = useState({ photos: [], index: null });
    const { templates: noteTemplates } = useTemplates("note");
    // Free places / reserve list / overdue payments of the current edition.
    const [queue, setQueue] = useState(null);

    const loadQueue = useCallback(() => {
        api.get("/admin/stats")
            .then(({ data }) =>
                setQueue({
                    freePlaces: data.freePlaces,
                    waitlist: data.submissions.waitlist,
                    unreadMessages: data.unreadMessages,
                    overdue: data.submissions.overdue,
                }),
            )
            .catch(() => setQueue(null));
    }, []);

    useEffect(() => {
        loadQueue();
    }, [loadQueue]);

    useEffect(() => {
        api.get("/admin/editions")
            .then(({ data }) => setEditions(data))
            .catch(() => setEditions(null));
    }, []);

    const loadSubmissions = useCallback(async () => {
        try {
            const { data } = await api.get("/admin/submissions", {
                params: filters,
            });
            setSubmissions(data.submissions);
            // Drop selections that are no longer visible after filtering.
            setSelectedIds((current) =>
                current.filter((id) =>
                    data.submissions.some((s) => s.id === id),
                ),
            );
        } catch (err) {
            setError(errorMessage(err, "Nie udało się pobrać zgłoszeń."));
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        // Debounce typing in the search box.
        const timeout = setTimeout(loadSubmissions, 250);
        return () => clearTimeout(timeout);
    }, [loadSubmissions]);

    async function runAction(action, fallbackError) {
        setError("");
        setMessage("");
        setIsBusy(true);
        try {
            const result = await action();
            await loadSubmissions();
            loadQueue();
            onAction();
            return result;
        } catch (err) {
            setError(errorMessage(err, fallbackError));
        } finally {
            setIsBusy(false);
        }
    }

    // Approving over the Select zone limit needs a second, explicit confirmation.
    async function withCapacityCheck(send) {
        try {
            return await send(false);
        } catch (err) {
            const data = err.response?.data;
            if (
                err.response?.status === 409 &&
                data?.code === "capacity_full" &&
                window.confirm(`${data.message}\n\nZaakceptować mimo to?`)
            ) {
                return send(true);
            }
            throw err;
        }
    }

    function setStatus(submission, status) {
        return runAction(
            () =>
                withCapacityCheck((force) =>
                    api.patch(`/admin/submissions/${submission.id}/status`, {
                        status,
                        force,
                        adminNote:
                            adminNotes[submission.id] ?? submission.adminNote ?? "",
                    }),
                ),
            "Nie udało się zmienić statusu zgłoszenia.",
        );
    }



    function setPaymentStatus(submission, paymentStatus) {
        return runAction(
            () =>
                api.patch(
                    `/admin/submissions/${submission.id}/payment-status`,
                    { paymentStatus },
                ),
            "Nie udało się zmienić statusu opłaty.",
        );
    }

    async function saveInternalNote(submission) {
        await runAction(
            () =>
                api.patch(
                    `/admin/submissions/${submission.id}/internal-note`,
                    { internalNote: internalNotes[submission.id] ?? "" },
                ),
            "Nie udało się zapisać notatki.",
        );
        setInternalNotes((current) => {
            const next = { ...current };
            delete next[submission.id];
            return next;
        });
    }

    // Updated in place: reloading the whole list after every star would be slow.
    async function rate(submission, score) {
        try {
            const { data } = await api.put(`/admin/submissions/${submission.id}/rating`, { score });
            setSubmissions((current) =>
                current.map((item) => (item.id === submission.id ? { ...item, rating: data.rating } : item)),
            );
        } catch (err) {
            setError(errorMessage(err, "Nie udało się zapisać oceny."));
        }
    }

    function setShowcaseHidden(submission, hidden) {
        return runAction(
            () => api.patch(`/admin/submissions/${submission.id}/showcase`, { hidden }),
            "Nie udało się zmienić widoczności auta na stronie.",
        );
    }

    async function deleteSubmission(submission) {
        const confirmed = window.confirm(
            `Trwale usunąć zgłoszenie ${submission.carBrand} (${submission.licensePlate}) razem ze zdjęciami?`,
        );
        if (!confirmed) return;

        const response = await runAction(
            () => api.delete(`/admin/submissions/${submission.id}`),
            "Nie udało się usunąć zgłoszenia.",
        );
        if (response) setMessage(response.data.message);
    }

    async function bulkSetStatus(status) {
        const label = STATUS_LABELS[status].toLowerCase();
        const confirmed = window.confirm(
            `Zmienić status ${selectedIds.length} zgłoszeń na „${label}”? Uczestnicy dostaną e-mail o decyzji.`,
        );
        if (!confirmed) return;

        const response = await runAction(
            () =>
                withCapacityCheck((force) =>
                    api.post("/admin/submissions/bulk-status", {
                        ids: selectedIds,
                        status,
                        force,
                        adminNote: bulkNote,
                    }),
                ),
            "Nie udało się zmienić statusu zaznaczonych zgłoszeń.",
        );
        if (response) {
            setMessage(response.data.message);
            setSelectedIds([]);
            setBulkNote("");
        }
    }

    function toggleSelected(id) {
        setSelectedIds((current) =>
            current.includes(id)
                ? current.filter((selectedId) => selectedId !== id)
                : [...current, id],
        );
    }

    const visibleSubmissions = submissions
        .filter((s) => !onlyUnrated || !s.rating?.mine)
        .sort(SORTS[sort]);
    const allSelected =
        submissions.length > 0 && selectedIds.length === submissions.length;

    if (isLoading) {
        return <p className="page-status">Ładowanie...</p>;
    }

    return (
        <>
            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}
            {queue?.freePlaces > 0 && queue.waitlist > 0 && filters.status !== "waitlist" && (
                <div className="payment-alert admin-queue-alert">
                    <p>
                        Wolne miejsca w strefie Select: <strong>{queue.freePlaces}</strong>. Na liście
                        rezerwowej: <strong>{queue.waitlist}</strong> — wybierz auta do akceptacji.
                    </p>
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={() =>
                            setFilters({ ...filters, edition: "", status: "waitlist", paymentStatus: "" })
                        }
                    >
                        Pokaż listę rezerwową
                    </button>
                </div>
            )}
            {queue?.unreadMessages > 0 && !filters.unread && (
                <div className="payment-alert admin-queue-alert">
                    <p>
                        Nowe wiadomości od uczestników: <strong>{queue.unreadMessages}</strong>.
                    </p>
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={() => setFilters({ ...filters, edition: "all", status: "", paymentStatus: "", unread: "1" })}
                    >
                        Pokaż
                    </button>
                </div>
            )}
            {queue?.overdue > 0 && filters.paymentStatus !== "overdue" && (
                <div className="payment-alert admin-queue-alert">
                    <p>
                        Po terminie płatności: <strong>{queue.overdue}</strong>{" "}
                        {queue.overdue === 1 ? "zaakceptowane zgłoszenie" : "zaakceptowanych zgłoszeń"}.
                        Napisz do nich (Wiadomość do grupy → „po terminie płatności”) albo przenieś auta na listę rezerwową lub je odrzuć.
                    </p>
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={() =>
                            setFilters({ ...filters, edition: "", status: "", paymentStatus: "overdue" })
                        }
                    >
                        Pokaż
                    </button>
                </div>
            )}
            <div className="admin-filters submission-filters">
                <label>
                    Edycja
                    <select
                        value={filters.edition}
                        onChange={(event) =>
                            setFilters({
                                ...filters,
                                edition: event.target.value,
                            })
                        }
                    >
                        <option value="">
                            Bieżąca
                            {editions ? ` (${editions.currentEdition})` : ""}
                        </option>
                        {editions?.editions
                            .filter(
                                (row) =>
                                    row.edition !== editions.currentEdition,
                            )
                            .map((row) => (
                                <option key={row.edition} value={row.edition}>
                                    {row.edition} ({row.count})
                                </option>
                            ))}
                        <option value="all">Wszystkie lata</option>
                    </select>
                </label>
                <label>
                    Szukaj zgłoszenia
                    <input
                        type="search"
                        value={filters.search}
                        onChange={(event) =>
                            setFilters({
                                ...filters,
                                search: event.target.value,
                            })
                        }
                        placeholder="E-mail, nazwisko, rejestracja..."
                    />
                </label>
                <label>
                    Status
                    <select
                        value={filters.status}
                        onChange={(event) =>
                            setFilters({
                                ...filters,
                                status: event.target.value,
                            })
                        }
                    >
                        <option value="">Wszystkie statusy</option>
                        <option value="pending">Oczekujące</option>
                        <option value="approved">Zaakceptowane</option>
                        <option value="rejected">Odrzucone</option>
                        <option value="waitlist">Lista rezerwowa</option>
                        <option value="withdrawn">Rezygnacje</option>
                    </select>
                </label>
                <label>
                    Status opłaty
                    <select
                        value={filters.paymentStatus}
                        onChange={(event) =>
                            setFilters({
                                ...filters,
                                paymentStatus: event.target.value,
                            })
                        }
                    >
                        <option value="">Wszystkie opłaty</option>
                        <option value="unpaid">Do opłacenia</option>
                        <option value="verification">Do weryfikacji</option>
                        <option value="paid">Opłacone</option>
                        <option value="overdue">Po terminie płatności</option>
                    </select>
                </label>
                <label>
                    Sortuj
                    <select value={sort} onChange={(event) => setSort(event.target.value)}>
                        <option value="newest">Najnowsze</option>
                        <option value="oldest">Najstarsze</option>
                        <option value="rating">Najwyżej oceniane</option>
                    </select>
                </label>
                <label className="admin-checkbox-label">
                    <input
                        type="checkbox"
                        checked={onlyUnrated}
                        onChange={(event) => setOnlyUnrated(event.target.checked)}
                    />
                    Tylko jeszcze nieocenione przeze mnie
                </label>
                <label className="admin-checkbox-label">
                    <input
                        type="checkbox"
                        checked={filters.unread === "1"}
                        onChange={(event) =>
                            setFilters({ ...filters, unread: event.target.checked ? "1" : "" })
                        }
                    />
                    Z nowymi wiadomościami
                </label>
                <button
                    className="admin-export-button"
                    type="button"
                    onClick={() =>
                        exportToExcel(filters).catch(() =>
                            setError("Nie udało się wygenerować pliku Excel."),
                        )
                    }
                    disabled={submissions.length === 0}
                >
                    Eksportuj do Excel
                </button>
                <button
                    className="admin-export-button button-secondary"
                    type="button"
                    onClick={() =>
                        printGateList(
                            filters.edition === "all" ? "" : filters.edition,
                        ).catch((err) =>
                            setError(
                                err.message ||
                                    "Nie udało się przygotować listy.",
                            ),
                        )
                    }
                >
                    Lista na bramę (druk)
                </button>
            </div>

            <GroupEmailForm
                edition={filters.edition === "all" ? "" : filters.edition}
                onSent={onAction}
            />

            {submissions.length > 0 && (
                <div className="admin-bulk-bar">
                    <span className="admin-select-checkbox">
                        <input
                            id="select-all-submissions"
                            type="checkbox"
                            checked={allSelected}
                            onChange={() =>
                                setSelectedIds(
                                    allSelected
                                        ? []
                                        : submissions.map((s) => s.id),
                                )
                            }
                        />
                        <label htmlFor="select-all-submissions">
                            Zaznacz wszystkie ({selectedIds.length}/
                            {submissions.length})
                        </label>
                    </span>
                    {selectedIds.length > 0 && (
                        <>
                            <label>
                                Komentarz dla zaznaczonych (opcjonalny)
                                <input
                                    value={bulkNote}
                                    maxLength={2000}
                                    onChange={(event) =>
                                        setBulkNote(event.target.value)
                                    }
                                    placeholder="Pusty = zostaje dotychczasowy komentarz"
                                />
                            </label>
                            <TemplatePicker
                                templates={noteTemplates}
                                label="Szablon komentarza"
                                onPick={(template) =>
                                    // Bulk: car-specific placeholders can't be filled.
                                    setBulkNote(fillTemplate(template.body, {}))
                                }
                            />
                            <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => bulkSetStatus("approved")}
                            >
                                Zaakceptuj zaznaczone
                            </button>
                            <button
                                type="button"
                                className="button-secondary"
                                disabled={isBusy}
                                onClick={() => bulkSetStatus("waitlist")}
                            >
                                Na listę rezerwową
                            </button>
                            <button
                                type="button"
                                className="button-danger"
                                disabled={isBusy}
                                onClick={() => bulkSetStatus("rejected")}
                            >
                                Odrzuć zaznaczone
                            </button>
                        </>
                    )}
                </div>
            )}

            {visibleSubmissions.length === 0 && (
                <p>{submissions.length ? "Wszystkie widoczne zgłoszenia masz już ocenione." : "Brak zgłoszeń."}</p>
            )}
            {visibleSubmissions.map((s) => {
                const isSelected = selectedIds.includes(s.id);
                const internalNoteValue =
                    internalNotes[s.id] ?? s.internalNote ?? "";
                const internalNoteChanged =
                    internalNotes[s.id] !== undefined &&
                    internalNotes[s.id] !== (s.internalNote ?? "");

                return (
                    <article
                        key={s.id}
                        className={`submission-card${isSelected ? " is-selected" : ""}`}
                    >
                        <label className="admin-select-checkbox">
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelected(s.id)}
                            />
                            #{s.id}
                        </label>
                        <h3>
                            {s.carBrand} — {s.licensePlate}
                        </h3>
                        <p>
                            Zgłaszający: {s.firstName} {s.lastName} (
                            {s.userEmail}), tel. {s.phone}
                        </p>
                        <p className="admin-hint">
                            Edycja {s.edition} · dodano {formatDate(s.createdAt)}
                            {s.consentAt
                                ? ` · zgoda na regulamin: ${formatDate(s.consentAt)}`
                                : " · brak zapisanej zgody (zgłoszenie sprzed zmian)"}
                            {s.photoPublishConsent && " · zgoda na publikację zdjęć"}
                        </p>
                        {s.status === "approved" && s.photoPublishConsent && (
                            <p className="admin-hint">
                                {s.showcaseHidden
                                    ? "Ukryte na stronie „Auta strefy Select”. "
                                    : "Widoczne na stronie „Auta strefy Select” (gdy włączona w Ustawieniach). "}
                                <button
                                    type="button"
                                    className="button-secondary"
                                    disabled={isBusy}
                                    onClick={() => setShowcaseHidden(s, !s.showcaseHidden)}
                                >
                                    {s.showcaseHidden ? "Pokaż na stronie" : "Ukryj na stronie"}
                                </button>
                            </p>
                        )}
                        {s.checkedInAt && (
                            <p>
                                <span className="status-badge status-approved">
                                    Wjazd: {formatDate(s.checkedInAt)}
                                </span>
                            </p>
                        )}
                        <RatingStars rating={s.rating} disabled={isBusy} onRate={(score) => rate(s, score)} />
                        <p>{s.carDescription}</p>
                        <div className="submission-photos">
                            {s.photos.map((photo, photoIndex) => (
                                <button
                                    key={photo}
                                    type="button"
                                    className="photo-thumb-button"
                                    aria-label={`Powiększ zdjęcie ${photoIndex + 1}`}
                                    onClick={() =>
                                        setLightbox({
                                            photos: s.photos.map((src) => ({
                                                src,
                                                alt: `${s.carBrand} ${s.licensePlate}`,
                                            })),
                                            index: photoIndex,
                                        })
                                    }
                                >
                                    <img
                                        src={photo}
                                        alt={`${s.carBrand} ${s.licensePlate}`}
                                        loading="lazy"
                                    />
                                </button>
                            ))}
                        </div>
                        <p>
                            Status:{" "}
                            <span className={`status-badge status-${s.status}`}>
                                {STATUS_LABELS[s.status] || s.status}
                            </span>
                            {s.withdrawnAt && ` — ${formatDate(s.withdrawnAt)}`}
                        </p>
                        <p>
                            Opłata:{" "}
                            <span
                                className={`status-badge payment-status-${s.paymentStatus || "unpaid"}`}
                            >
                                {
                                    PAYMENT_STATUS_LABELS[
                                        s.paymentStatus || "unpaid"
                                    ]
                                }
                            </span>
                        </p>
                        {s.status === "approved" && s.paymentStatus === "unpaid" && s.payment?.deadline && (
                            <p className="admin-hint">
                                Termin opłaty: {formatDay(s.payment.deadline)}
                                {s.paymentOverdue && (
                                    <>
                                        {" "}
                                        <span className="status-badge payment-overdue">Po terminie</span>
                                    </>
                                )}
                                {s.paymentReminderSentAt &&
                                    ` · przypomnienie wysłane ${formatDate(s.paymentReminderSentAt)}`}
                            </p>
                        )}
                        {s.status === "withdrawn" && s.paymentStatus === "paid" && (
                            <p className="payment-alert">
                                Uczestnik zrezygnował po opłaceniu — sprawdź, czy należy się zwrot.
                            </p>
                        )}
                        {s.paymentStatus === "verification" && (
                            <p className="payment-alert">
                                Użytkownik zgłosił opłacenie. Zweryfikuj
                                płatność i potwierdź ją poniżej.
                            </p>
                        )}
                        {s.paymentProofUrl && (
                            <p>
                                <a href={s.paymentProofUrl} target="_blank" rel="noopener noreferrer">
                                    Potwierdzenie przelewu od uczestnika
                                </a>
                            </p>
                        )}
                        {s.status === "approved" &&
                            s.paymentStatus !== "paid" && (
                                <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => setPaymentStatus(s, "paid")}
                                >
                                    Oznacz jako opłacone
                                </button>
                            )}
                        {s.paymentStatus === "paid" && (
                            <button
                                type="button"
                                className="button-secondary"
                                disabled={isBusy}
                                onClick={() => setPaymentStatus(s, "unpaid")}
                            >
                                Cofnij potwierdzenie opłaty
                            </button>
                        )}
                        <div className="submission-thread-toggle">
                            <button
                                type="button"
                                className="button-secondary"
                                aria-expanded={openThreads.includes(s.id)}
                                onClick={() =>
                                    setOpenThreads((current) =>
                                        current.includes(s.id)
                                            ? current.filter((id) => id !== s.id)
                                            : [...current, s.id],
                                    )
                                }
                            >
                                {openThreads.includes(s.id) ? "Ukryj wiadomości" : "Wiadomości z uczestnikiem"}
                                {s.messages?.total > 0 && ` (${s.messages.total})`}
                            </button>
                            {s.messages?.unread > 0 && !openThreads.includes(s.id) && (
                                <span className="unread-badge">nowe: {s.messages.unread}</span>
                            )}
                        </div>
                        {openThreads.includes(s.id) && (
                            <SubmissionThread
                                basePath={`/admin/submissions/${s.id}`}
                                viewer="admin"
                                onRead={() => {
                                    loadQueue();
                                    loadSubmissions();
                                }}
                            />
                        )}
                        <TemplatePicker
                            templates={noteTemplates}
                            label="Wstaw szablon komentarza"
                            onPick={(template) =>
                                setAdminNotes({
                                    ...adminNotes,
                                    [s.id]: fillTemplate(template.body, {
                                        rok: s.edition,
                                        marka: s.carBrand,
                                        rejestracja: s.licensePlate,
                                    }),
                                })
                            }
                        />
                        <label className="admin-note-field">
                            Komentarz dla użytkownika (widoczny w panelu i w
                            e-mailu)
                            <textarea
                                rows={3}
                                maxLength={2000}
                                value={adminNotes[s.id] ?? s.adminNote ?? ""}
                                onChange={(event) =>
                                    setAdminNotes({
                                        ...adminNotes,
                                        [s.id]: event.target.value,
                                    })
                                }
                                placeholder="Dodaj informację dla zgłaszającego..."
                            />
                        </label>
                        <label className="admin-note-field admin-internal-note">
                            Notatka wewnętrzna (widzą ją tylko administratorzy)
                            <textarea
                                rows={2}
                                maxLength={2000}
                                value={internalNoteValue}
                                onChange={(event) =>
                                    setInternalNotes({
                                        ...internalNotes,
                                        [s.id]: event.target.value,
                                    })
                                }
                                placeholder="np. ocena auta, ustalenia telefoniczne..."
                            />
                        </label>
                        <div className="submission-actions">
                            {internalNoteChanged && (
                                <button
                                    type="button"
                                    className="button-secondary"
                                    disabled={isBusy}
                                    onClick={() => saveInternalNote(s)}
                                >
                                    Zapisz notatkę
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setStatus(s, "approved")}
                                disabled={isBusy || s.status === "approved"}
                            >
                                Zaakceptuj
                            </button>
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={() => setStatus(s, "waitlist")}
                                disabled={isBusy || s.status === "waitlist"}
                            >
                                Na listę rezerwową
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatus(s, "rejected")}
                                disabled={isBusy || s.status === "rejected"}
                            >
                                Odrzuć
                            </button>
                            {["approved", "waitlist"].includes(s.status) && (
                                <button
                                    type="button"
                                    className="button-secondary"
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                `Oznaczyć rezygnację ${s.carBrand} (${s.licensePlate})? Użyj, gdy uczestnik zrezygnował np. telefonicznie.`,
                                            )
                                        ) {
                                            setStatus(s, "withdrawn");
                                        }
                                    }}
                                    disabled={isBusy}
                                >
                                    Oznacz rezygnację
                                </button>
                            )}
                            {s.status !== "pending" && (
                                <button
                                    type="button"
                                    className="button-secondary"
                                    onClick={() => setStatus(s, "pending")}
                                    disabled={isBusy}
                                >
                                    Przywróć do oczekujących
                                </button>
                            )}
                            <button
                                type="button"
                                className="button-danger"
                                onClick={() => deleteSubmission(s)}
                                disabled={isBusy}
                            >
                                Usuń
                            </button>
                        </div>
                    </article>
                );
            })}
            <Lightbox
                photos={lightbox.photos}
                index={lightbox.index}
                onIndexChange={(index) =>
                    setLightbox((current) => ({ ...current, index }))
                }
                label="Zdjęcia zgłoszenia"
            />
        </>
    );
}
