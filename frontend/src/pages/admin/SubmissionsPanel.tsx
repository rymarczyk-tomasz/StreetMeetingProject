import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/client";
import Lightbox from "../../components/Lightbox";
import AdminDialog from "./AdminDialog";
import GroupEmailForm from "./GroupEmailForm";
import SubmissionDetails, { DETAIL_TABS } from "./SubmissionDetails";
import { TemplatePicker, fillTemplate, useTemplates } from "./templates";
import { printGateList } from "./gateList";
import { PAYMENT_STATUS_LABELS, STATUS_LABELS, errorMessage, formatDay } from "./shared";

// fetched again so the backend logs the export
async function exportToExcel(filters) {
    const { data } = await api.get("/admin/submissions", {
        params: { ...filters, purpose: "export" },
    });
    const submissions = data.submissions;

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
        "Status opłaty": PAYMENT_STATUS_LABELS[submission.paymentStatus || "unpaid"],
        "Termin opłaty": submission.status === "approved" ? submission.payment?.deadline || "" : "",
        "Komentarz administratora": submission.adminNote || "",
        "Notatka wewnętrzna": submission.internalNote || "",
        "Średnia ocena": submission.rating?.average ?? "",
        "Liczba ocen": submission.rating?.count ?? 0,
        "Liczba zdjęć": submission.photos.length,
        Edycja: submission.edition,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [14, 22, 18, 18, 30, 18, 18, 16, 45, 18, 18, 14, 40, 40, 12, 12, 12, 10].map((wch) => ({ wch }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Zgłoszenia");
    XLSX.writeFile(workbook, `zgloszenia-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

const SORTS = {
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
    rating: (a, b) => (b.rating?.average ?? -1) - (a.rating?.average ?? -1) || b.rating?.count - a.rating?.count,
    unrated: (a, b) => b.createdAt.localeCompare(a.createdAt),
};

const STATUS_CHIPS = [
    ["", "Wszystkie", "all"],
    ["pending", "Oczekujące", "pending"],
    ["approved", "Zaakceptowane", "approved"],
    ["waitlist", "Rezerwowa", "waitlist"],
    ["rejected", "Odrzucone", "rejected"],
    ["withdrawn", "Rezygnacje", "withdrawn"],
];

const BULK_LABELS = {
    approved: "Zaakceptuj",
    waitlist: "Przenieś na listę rezerwową",
    rejected: "Odrzuć",
};

const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 992px)").matches;

function relativeDay(value) {
    const created = new Date(`${value.replace(" ", "T")}Z`);
    const days = Math.floor((Date.now() - created.getTime()) / 86400000);
    if (days <= 0) return "dziś";
    if (days === 1) return "wczoraj";
    if (days < 7) return `${days} dni`;
    if (days < 35) return `${Math.floor(days / 7)} tyg.`;
    return formatDay(value.slice(0, 10));
}

function RatingCell({ rating }) {
    if (!rating?.count) return <span className="subs-no-rating" aria-label="brak ocen">—</span>;
    const filled = Math.round(rating.average || 0);
    return (
        <span className="subs-stars" aria-label={`średnia ${rating.average}`}>
            {"★".repeat(filled)}
            <span>{"★".repeat(5 - filled)}</span>
        </span>
    );
}

function useListParams() {
    const [searchParams, setSearchParams] = useSearchParams();
    const params = useMemo(
        () => ({
            status: searchParams.get("status") || "",
            paymentStatus: searchParams.get("platnosc") || "",
            search: searchParams.get("q") || "",
            unread: searchParams.get("nieprzeczytane") || "",
            sort: searchParams.get("sort") || "newest",
            id: Number(searchParams.get("id")) || null,
            tab: DETAIL_TABS.some(([tab]) => tab === searchParams.get("tab")) ? searchParams.get("tab") : "decyzja",
        }),
        [searchParams],
    );

    const update = useCallback(
        (patch: Record<string, string | number | null>, push = false) => {
            setSearchParams(
                (current) => {
                    const next = new URLSearchParams(current);
                    const names = { paymentStatus: "platnosc", search: "q", unread: "nieprzeczytane" };
                    for (const [key, value] of Object.entries(patch)) {
                        const name = names[key] || key;
                        if (value === null || value === "" || value === undefined) next.delete(name);
                        else next.set(name, String(value));
                    }
                    return next;
                },
                { replace: !push },
            );
        },
        [setSearchParams],
    );

    return [params, update] as const;
}

export default function SubmissionsPanel({ edition = "", onAction }) {
    const [params, setParams] = useListParams();
    const [submissions, setSubmissions] = useState([]);
    const [counts, setCounts] = useState(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isBusy, setIsBusy] = useState(false);
    const [lightbox, setLightbox] = useState({ photos: [], index: null, title: "" });
    const [dialog, setDialog] = useState(null);
    const [bulkNote, setBulkNote] = useState("");
    const [queue, setQueue] = useState(null);
    const { templates: noteTemplates } = useTemplates("note");

    const filters = useMemo(
        () => ({
            edition,
            status: params.status,
            paymentStatus: params.paymentStatus,
            search: params.search,
            unread: params.unread,
        }),
        [edition, params.status, params.paymentStatus, params.search, params.unread],
    );

    const loadQueue = useCallback(() => {
        api.get("/admin/stats")
            .then(({ data }) => setQueue({ freePlaces: data.freePlaces, capacity: data.capacity }))
            .catch(() => setQueue(null));
    }, []);

    useEffect(() => {
        loadQueue();
    }, [loadQueue]);

    const loadSubmissions = useCallback(async () => {
        try {
            const { data } = await api.get("/admin/submissions", { params: filters });
            setSubmissions(data.submissions);
            setCounts(data.counts);
            setError("");
            setSelectedIds((current) => current.filter((id) => data.submissions.some((s) => s.id === id)));
        } catch (err) {
            setError(errorMessage(err, "Nie udało się pobrać zgłoszeń."));
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const timeout = setTimeout(loadSubmissions, 250);
        return () => clearTimeout(timeout);
    }, [loadSubmissions]);

    const visible = useMemo(
        () =>
            submissions
                .filter((s) => params.sort !== "unrated" || !s.rating?.mine)
                .sort(SORTS[params.sort] || SORTS.newest),
        [submissions, params.sort],
    );
    const current = visible.find((s) => s.id === params.id) || submissions.find((s) => s.id === params.id) || null;

    // desktop: open the first one, phones show details full screen
    useEffect(() => {
        if (!isLoading && !params.id && visible.length && isDesktop()) setParams({ id: visible[0].id });
    }, [isLoading, params.id, visible, setParams]);

    function open(id: number, tab = params.tab) {
        setParams({ id, tab: tab === "decyzja" ? null : tab }, !isDesktop());
    }

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

    const actions = {
        setStatus: (submission, status, note = undefined) =>
            runAction(
                () =>
                    withCapacityCheck((force) =>
                        api.patch(`/admin/submissions/${submission.id}/status`, {
                            status,
                            force,
                            adminNote: note ?? submission.adminNote ?? "",
                        }),
                    ),
                "Nie udało się zmienić statusu zgłoszenia.",
            ),
        setPaymentStatus: (submission, paymentStatus) =>
            runAction(
                () => api.patch(`/admin/submissions/${submission.id}/payment-status`, { paymentStatus }),
                "Nie udało się zmienić statusu opłaty.",
            ),
        saveInternalNote: (submission, internalNote) =>
            runAction(
                () => api.patch(`/admin/submissions/${submission.id}/internal-note`, { internalNote }),
                "Nie udało się zapisać notatki.",
            ),
        // update in place instead of reloading the list
        rate: async (submission, score) => {
            try {
                const { data } = await api.put(`/admin/submissions/${submission.id}/rating`, { score });
                setSubmissions((list) =>
                    list.map((item) => (item.id === submission.id ? { ...item, rating: data.rating } : item)),
                );
            } catch (err) {
                setError(errorMessage(err, "Nie udało się zapisać oceny."));
            }
        },
        setShowcaseHidden: (submission, hidden) =>
            runAction(
                () => api.patch(`/admin/submissions/${submission.id}/showcase`, { hidden }),
                "Nie udało się zmienić widoczności auta na stronie.",
            ),
        deleteSubmission: async (submission) => {
            if (
                !window.confirm(
                    `Trwale usunąć zgłoszenie ${submission.carBrand} (${submission.licensePlate}) razem ze zdjęciami?`,
                )
            ) {
                return;
            }
            const response = await runAction(
                () => api.delete(`/admin/submissions/${submission.id}`),
                "Nie udało się usunąć zgłoszenia.",
            );
            if (response) {
                setMessage(response.data.message);
                setParams({ id: null, tab: null });
            }
        },
        openLightbox: (submission, index) =>
            setLightbox({
                photos: submission.photos.map((src) => ({ src, alt: `${submission.carBrand} ${submission.licensePlate}` })),
                index,
                title: `${submission.carBrand} · ${submission.licensePlate}`,
            }),
        onThreadRead: () => {
            loadSubmissions();
            onAction();
        },
    };

    async function bulkSetStatus(status) {
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
            setDialog(null);
        }
    }

    useEffect(() => {
        function onKey(event: KeyboardEvent) {
            if (dialog || lightbox.index !== null || event.ctrlKey || event.metaKey || event.altKey) return;
            const target = event.target as HTMLElement;
            if (target.closest("input, textarea, select, [contenteditable], details[open]")) return;
            if (!visible.length) return;
            const index = visible.findIndex((s) => s.id === params.id);
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const next = event.key === "ArrowDown" ? Math.min(visible.length - 1, index + 1) : Math.max(0, index - 1);
                open(visible[next].id);
                document.getElementById(`subs-row-${visible[next].id}`)?.scrollIntoView({ block: "nearest" });
            } else if (current && !isBusy && (event.key === "a" || event.key === "A") && current.status !== "approved") {
                actions.setStatus(current, "approved");
            } else if (current && !isBusy && (event.key === "r" || event.key === "R") && current.status !== "waitlist") {
                actions.setStatus(current, "waitlist");
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    if (isLoading) return <p className="page-status">Ładowanie...</p>;

    const allSelected = visible.length > 0 && visible.every((s) => selectedIds.includes(s.id));
    const listEdition = edition === "all" ? "" : edition;

    return (
        <div className={`subs${current ? " has-detail" : ""}`}>
            <div className="subs-list">
                <div className="admin-heading">
                    <div>
                        <h2>Zgłoszenia</h2>
                    </div>
                    <div className="admin-heading-actions">
                        <button
                            type="button"
                            className="btn-street btn-street-outline"
                            onClick={() => setDialog({ kind: "group" })}
                        >
                            <i className="bi bi-envelope" aria-hidden="true" />
                            Wiadomość do grupy
                        </button>
                        <button
                            type="button"
                            className="btn-street btn-street-outline"
                            onClick={() =>
                                printGateList(listEdition).catch((err) =>
                                    setError(err.message || "Nie udało się przygotować listy."),
                                )
                            }
                        >
                            <i className="bi bi-printer" aria-hidden="true" />
                            Lista na bramę
                        </button>
                        <button
                            type="button"
                            className="btn-street btn-street-outline btn-street-icon"
                            aria-label="Eksportuj do Excela"
                            title="Eksportuj do Excela"
                            disabled={submissions.length === 0}
                            onClick={() =>
                                exportToExcel(filters).catch(() => setError("Nie udało się wygenerować pliku Excel."))
                            }
                        >
                            <i className="bi bi-file-earmark-spreadsheet" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {error && <p className="form-error">{error}</p>}
                {message && <p className="form-success">{message}</p>}

                <div className="subs-chips">
                    <div className="subs-chip-group" role="group" aria-label="Status zgłoszeń">
                        {STATUS_CHIPS.map(([status, label, countKey]) => (
                            <button
                                key={label}
                                type="button"
                                className={`subs-chip${params.status === status && params.paymentStatus !== "overdue" ? " is-active" : ""}`}
                                aria-pressed={params.status === status}
                                onClick={() =>
                                    setParams({
                                        status,
                                        paymentStatus: params.paymentStatus === "overdue" ? "" : params.paymentStatus,
                                        id: null,
                                    })
                                }
                            >
                                {label} <span>{counts?.[countKey] ?? ""}</span>
                            </button>
                        ))}
                    </div>
                    <div className="subs-chip-group is-special" role="group" aria-label="Filtry specjalne">
                        <button
                            type="button"
                            className={`subs-chip${params.paymentStatus === "overdue" ? " is-active" : ""}`}
                            aria-pressed={params.paymentStatus === "overdue"}
                            onClick={() =>
                                setParams({
                                    paymentStatus: params.paymentStatus === "overdue" ? "" : "overdue",
                                    status: "",
                                    id: null,
                                })
                            }
                        >
                            <span className="subs-dot" aria-hidden="true" />
                            Po terminie <span>{counts?.overdue ?? ""}</span>
                        </button>
                        <button
                            type="button"
                            className={`subs-chip${params.unread ? " is-active" : ""}`}
                            aria-pressed={Boolean(params.unread)}
                            onClick={() => setParams({ unread: params.unread ? "" : "1", id: null })}
                        >
                            <i className="bi bi-chat-dots" aria-hidden="true" />
                            Nowe wiadomości <span>{counts?.unread ?? ""}</span>
                        </button>
                    </div>
                </div>

                <div className="subs-filters">
                    <label className="subs-search">
                        <i className="bi bi-search" aria-hidden="true" />
                        <span className="visually-hidden">Szukaj zgłoszenia</span>
                        <input
                            type="search"
                            value={params.search}
                            onChange={(event) => setParams({ search: event.target.value })}
                            placeholder="E-mail, nazwisko, rejestracja…"
                        />
                    </label>
                    <label>
                        <span className="visually-hidden">Opłata</span>
                        <select
                            value={params.paymentStatus}
                            onChange={(event) => setParams({ paymentStatus: event.target.value, id: null })}
                        >
                            <option value="">Opłata: wszystkie</option>
                            <option value="unpaid">Do opłacenia</option>
                            <option value="verification">Do weryfikacji</option>
                            <option value="paid">Opłacone</option>
                            <option value="overdue">Po terminie płatności</option>
                        </select>
                    </label>
                    <label>
                        <span className="visually-hidden">Sortowanie</span>
                        <select value={params.sort} onChange={(event) => setParams({ sort: event.target.value === "newest" ? "" : event.target.value })}>
                            <option value="newest">Najnowsze</option>
                            <option value="oldest">Najstarsze</option>
                            <option value="rating">Najwyżej oceniane</option>
                            <option value="unrated">Do oceny</option>
                        </select>
                    </label>
                </div>

                {selectedIds.length > 0 && (
                    <div className="subs-bulk" role="region" aria-label="Akcje dla zaznaczonych">
                        <span>Zaznaczone: {selectedIds.length}</span>
                        <button
                            type="button"
                            className="btn-street btn-street-primary"
                            disabled={isBusy}
                            onClick={() => setDialog({ kind: "bulk", status: "approved" })}
                        >
                            Zaakceptuj
                        </button>
                        <button
                            type="button"
                            className="btn-street btn-street-light"
                            disabled={isBusy}
                            onClick={() => setDialog({ kind: "bulk", status: "waitlist" })}
                        >
                            Na rezerwową
                        </button>
                        <button
                            type="button"
                            className="btn-street subs-bulk-reject"
                            disabled={isBusy}
                            onClick={() => setDialog({ kind: "bulk", status: "rejected" })}
                        >
                            Odrzuć
                        </button>
                        <button
                            type="button"
                            className="subs-bulk-clear"
                            aria-label="Odznacz wszystkie"
                            onClick={() => setSelectedIds([])}
                        >
                            <i className="bi bi-x-lg" aria-hidden="true" />
                        </button>
                    </div>
                )}

                {visible.length === 0 ? (
                    <div className="admin-card">
                        <p className="admin-hint">
                            {submissions.length
                                ? "Wszystkie widoczne zgłoszenia masz już ocenione."
                                : "Brak zgłoszeń dla wybranych filtrów."}
                        </p>
                    </div>
                ) : (
                    <div className="subs-table" role="table" aria-label="Zgłoszenia">
                        <div className="subs-row subs-row-head" role="row">
                            <span role="columnheader">
                                <input
                                    type="checkbox"
                                    aria-label="Zaznacz wszystkie"
                                    checked={allSelected}
                                    onChange={() => setSelectedIds(allSelected ? [] : visible.map((s) => s.id))}
                                />
                            </span>
                            <span role="columnheader" aria-label="Zdjęcie" />
                            <span role="columnheader">Pojazd</span>
                            <span role="columnheader">Zgłaszający</span>
                            <span role="columnheader">Status</span>
                            <span role="columnheader">Ocena</span>
                            <span role="columnheader" className="is-right">
                                Dodano
                            </span>
                        </div>
                        {visible.map((s) => {
                            const isSelected = selectedIds.includes(s.id);
                            return (
                                <div
                                    key={s.id}
                                    id={`subs-row-${s.id}`}
                                    role="row"
                                    className={`subs-row${s.id === params.id ? " is-open" : ""}${isSelected ? " is-selected" : ""}`}
                                    onClick={() => open(s.id)}
                                >
                                    <span role="cell" onClick={(event) => event.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            aria-label={`Zaznacz ${s.carBrand} ${s.licensePlate}`}
                                            checked={isSelected}
                                            onChange={() =>
                                                setSelectedIds((list) =>
                                                    list.includes(s.id) ? list.filter((id) => id !== s.id) : [...list, s.id],
                                                )
                                            }
                                        />
                                    </span>
                                    <span role="cell" className="subs-thumb">
                                        {s.photos[0] ? <img src={s.photos[0]} alt="" loading="lazy" /> : null}
                                    </span>
                                    <span role="cell" className="subs-car">
                                        <button
                                            type="button"
                                            className="subs-open"
                                            aria-current={s.id === params.id ? "true" : undefined}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                open(s.id);
                                            }}
                                        >
                                            {s.carBrand}
                                        </button>
                                        <span>{s.licensePlate}</span>
                                    </span>
                                    <span role="cell" className="subs-person">
                                        {s.firstName} {s.lastName}
                                        {s.messages?.unread > 0 && (
                                            <i className="bi bi-chat-dots-fill" title="Nowa wiadomość" aria-label="Nowa wiadomość" />
                                        )}
                                    </span>
                                    <span role="cell" className="subs-status">
                                        <span className={`status-badge status-${s.status}`}>{STATUS_LABELS[s.status]}</span>
                                        {s.status === "approved" && (
                                            <span
                                                className={`status-badge ${s.paymentOverdue ? "payment-overdue" : `payment-status-${s.paymentStatus}`}`}
                                            >
                                                {s.paymentOverdue ? "Po terminie" : PAYMENT_STATUS_LABELS[s.paymentStatus]}
                                            </span>
                                        )}
                                    </span>
                                    <span role="cell">
                                        <RatingCell rating={s.rating} />
                                    </span>
                                    <span role="cell" className="subs-date is-right">
                                        {relativeDay(s.createdAt)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
                <p className="subs-hint">
                    {visible.length} z {counts?.all ?? submissions.length} zgłoszeń
                    <span className="subs-hint-keys"> · ↑↓ zmienia zgłoszenie, A akceptuje, R rezerwowa</span>
                </p>
            </div>

            <aside className="subs-detail">
                {current ? (
                    <SubmissionDetails
                        submission={current}
                        tab={params.tab}
                        onTab={(tab) => setParams({ tab: tab === "decyzja" ? null : tab })}
                        onBack={() => setParams({ id: null, tab: null })}
                        isBusy={isBusy}
                        actions={actions}
                        noteTemplates={noteTemplates}
                        queue={queue}
                    />
                ) : (
                    <p className="subs-detail-empty">Wybierz zgłoszenie z listy.</p>
                )}
            </aside>

            {dialog?.kind === "group" && (
                <AdminDialog title="Wiadomość do grupy" wide onClose={() => setDialog(null)}>
                    <GroupEmailForm edition={listEdition} onSent={onAction} />
                </AdminDialog>
            )}
            {dialog?.kind === "bulk" && (
                <AdminDialog
                    title={`${BULK_LABELS[dialog.status]}: ${selectedIds.length} zgłosz.`}
                    onClose={() => setDialog(null)}
                >
                    <div className="event-editor">
                        <p className="admin-hint">
                            Uczestnicy dostaną e-mail o decyzji. Pusty komentarz = zostaje dotychczasowy.
                        </p>
                        <TemplatePicker
                            templates={noteTemplates}
                            label="Szablon komentarza"
                            onPick={(template) => setBulkNote(fillTemplate(template.body, {}))}
                        />
                        <label>
                            <span className="field-label">Komentarz dla uczestników (opcjonalny)</span>
                            <textarea
                                rows={4}
                                maxLength={2000}
                                value={bulkNote}
                                onChange={(event) => setBulkNote(event.target.value)}
                            />
                        </label>
                        <div className="admin-form-footer">
                            <button
                                type="button"
                                className={`btn-street ${dialog.status === "rejected" ? "btn-street-danger" : "btn-street-primary"}`}
                                disabled={isBusy}
                                onClick={() => bulkSetStatus(dialog.status)}
                            >
                                {BULK_LABELS[dialog.status]} ({selectedIds.length})
                            </button>
                            <button type="button" className="text-action" onClick={() => setDialog(null)}>
                                Anuluj
                            </button>
                        </div>
                    </div>
                </AdminDialog>
            )}
            <Lightbox
                photos={lightbox.photos}
                index={lightbox.index}
                title={lightbox.title}
                onIndexChange={(index) => setLightbox((value) => ({ ...value, index }))}
                label="Zdjęcia zgłoszenia"
            />
        </div>
    );
}
