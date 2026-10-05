import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import Lightbox from "../../components/Lightbox";
import GroupEmailForm from "./GroupEmailForm";
import { printGateList } from "./gateList";
import {
    PAYMENT_STATUS_LABELS,
    STATUS_LABELS,
    errorMessage,
    formatDate,
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
        "Komentarz administratora": submission.adminNote || "",
        "Notatka wewnętrzna": submission.internalNote || "",
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
        { wch: 40 },
        { wch: 40 },
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
    });
    const [editions, setEditions] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isBusy, setIsBusy] = useState(false);
    const [lightbox, setLightbox] = useState({ photos: [], index: null });

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
            onAction();
            return result;
        } catch (err) {
            setError(errorMessage(err, fallbackError));
        } finally {
            setIsBusy(false);
        }
    }

    function setStatus(submission, status) {
        return runAction(
            () =>
                api.patch(`/admin/submissions/${submission.id}/status`, {
                    status,
                    adminNote:
                        adminNotes[submission.id] ?? submission.adminNote ?? "",
                }),
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
                api.post("/admin/submissions/bulk-status", {
                    ids: selectedIds,
                    status,
                    adminNote: bulkNote,
                }),
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

    const allSelected =
        submissions.length > 0 && selectedIds.length === submissions.length;

    if (isLoading) {
        return <p className="page-status">Ładowanie...</p>;
    }

    return (
        <>
            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}
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
                    </select>
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
                            <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => bulkSetStatus("approved")}
                            >
                                Zaakceptuj zaznaczone
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

            {submissions.length === 0 && <p>Brak zgłoszeń.</p>}
            {submissions.map((s) => {
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
                        {s.checkedInAt && (
                            <p>
                                <span className="status-badge status-approved">
                                    Wjazd: {formatDate(s.checkedInAt)}
                                </span>
                            </p>
                        )}
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
                                onClick={() => setStatus(s, "rejected")}
                                disabled={isBusy || s.status === "rejected"}
                            >
                                Odrzuć
                            </button>
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
