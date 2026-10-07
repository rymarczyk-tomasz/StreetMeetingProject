import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import { errorMessage, formatDate } from "./shared";
import { moveItem } from "./fields";
import { photosLabel } from "../../utils/plural";

const POLL_INTERVAL_MS = 2000;

function SyncProgress({ sync }) {
    if (!sync) return null;

    if (sync.inProgress) {
        const percent = sync.total ? Math.round((sync.processed / sync.total) * 100) : 0;
        return (
            <div className="gallery-sync-progress" role="status">
                <strong>Synchronizacja w toku…</strong>{" "}
                {sync.albumTitle && `Album: ${sync.albumTitle}. `}
                {sync.total > 0 && `${sync.processed} / ${photosLabel(sync.total)}`}
                <div className="admin-capacity-meter">
                    <span style={{ width: `${percent}%` }} />
                </div>
                <small className="admin-hint">
                    Pierwsze pobranie dużego albumu może potrwać kilka minut —
                    możesz w tym czasie korzystać z panelu.
                </small>
            </div>
        );
    }

    if (sync.lastError) {
        return <p className="form-error">Ostatnia synchronizacja: {sync.lastError}</p>;
    }
    if (sync.lastMessage) {
        return (
            <p className="admin-hint">
                Ostatnia synchronizacja ({formatDate(sync.finishedAt?.replace("T", " ").slice(0, 19))}):{" "}
                {sync.lastMessage}.
            </p>
        );
    }
    return null;
}

function AlbumPhotos({ album, onChanged }) {
    const [photos, setPhotos] = useState(null);
    const [error, setError] = useState("");

    const load = useCallback(() => {
        api.get(`/admin/albums/${album.id}/photos`)
            .then(({ data }) => setPhotos(data.photos))
            .catch((err) => setError(errorMessage(err, "Nie udało się pobrać zdjęć.")));
    }, [album.id]);

    useEffect(load, [load]);

    async function toggleHidden(photo) {
        try {
            await api.patch(`/admin/albums/${album.id}/photos/${photo.id}`, {
                isHidden: !photo.isHidden,
            });
            load();
            onChanged();
        } catch (err) {
            setError(errorMessage(err, "Nie udało się zmienić zdjęcia."));
        }
    }

    async function setCover(photo) {
        try {
            await api.patch(`/admin/albums/${album.id}`, {
                title: album.title,
                year: album.year,
                description: album.description,
                isVisible: album.isVisible,
                coverPhotoId: photo.id,
            });
            onChanged();
        } catch (err) {
            setError(errorMessage(err, "Nie udało się ustawić okładki."));
        }
    }

    if (error) return <p className="form-error">{error}</p>;
    if (!photos) return <p className="page-status">Ładowanie zdjęć...</p>;
    if (!photos.length) {
        return <p className="admin-hint">Brak zdjęć — uruchom synchronizację albumu.</p>;
    }

    return (
        <div className="admin-photo-grid">
            {photos.map((photo) => (
                <figure
                    key={photo.id}
                    className={`admin-photo${photo.isHidden ? " is-hidden" : ""}${
                        album.coverPhotoId === photo.id ? " is-cover" : ""
                    }`}
                >
                    <img src={photo.thumb} alt={photo.name} loading="lazy" />
                    <figcaption>
                        <span title={photo.name}>{photo.name}</span>
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() => toggleHidden(photo)}
                        >
                            {photo.isHidden ? "Pokaż" : "Ukryj"}
                        </button>
                        {!photo.isHidden && album.coverPhotoId !== photo.id && (
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={() => setCover(photo)}
                            >
                                Okładka
                            </button>
                        )}
                        {album.coverPhotoId === photo.id && <small>Okładka</small>}
                    </figcaption>
                </figure>
            ))}
        </div>
    );
}

function AlbumEditForm({ album, onSaved, onCancel }) {
    const [form, setForm] = useState({
        title: album.title,
        year: album.year || "",
        description: album.description || "",
        isVisible: album.isVisible,
    });
    const [error, setError] = useState("");

    async function save(event) {
        event.preventDefault();
        setError("");
        try {
            await api.patch(`/admin/albums/${album.id}`, {
                ...form,
                year: form.year ? Number(form.year) : null,
                coverPhotoId: album.coverPhotoId,
            });
            onSaved();
        } catch (err) {
            setError(errorMessage(err, "Nie udało się zapisać albumu."));
        }
    }

    return (
        <form className="event-editor album-edit-form" onSubmit={save}>
            <label>
                <span className="field-label">Nazwa albumu</span>
                <input
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    required
                />
            </label>
            <label>
                <span className="field-label">Rok (opcjonalnie)</span>
                <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={form.year}
                    onChange={(event) => setForm({ ...form, year: event.target.value })}
                />
            </label>
            <label>
                <span className="field-label">Opis (opcjonalny, widoczny nad zdjęciami)</span>
                <textarea
                    rows={2}
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
            </label>
            <label className="admin-checkbox-label">
                <input
                    type="checkbox"
                    checked={form.isVisible}
                    onChange={(event) => setForm({ ...form, isVisible: event.target.checked })}
                />
                Album widoczny na stronie
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="submission-actions">
                <button type="submit">Zapisz album</button>
                <button type="button" className="button-secondary" onClick={onCancel}>
                    Anuluj
                </button>
            </div>
        </form>
    );
}

export default function GalleryAlbumsPanel({ onAction }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [newAlbum, setNewAlbum] = useState({ driveUrl: "", title: "" });
    const [editingId, setEditingId] = useState(null);
    const [openPhotosId, setOpenPhotosId] = useState(null);

    const load = useCallback(async () => {
        try {
            const { data: response } = await api.get("/admin/albums");
            setData(response);
        } catch (err) {
            setError(errorMessage(err, "Nie udało się pobrać albumów."));
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // While a sync runs, poll its progress and refresh the album list at the end.
    const isSyncing = data?.sync?.inProgress;
    useEffect(() => {
        if (!isSyncing) return;
        const timer = setInterval(async () => {
            try {
                const { data: response } = await api.get("/admin/albums/sync-status");
                if (response.sync.inProgress) {
                    setData((current) => ({ ...current, sync: response.sync }));
                } else {
                    load();
                }
            } catch {
                // Try again on the next tick.
            }
        }, POLL_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [isSyncing, load]);

    async function run(action, fallback) {
        setError("");
        setMessage("");
        try {
            const { data: response } = await action();
            if (response?.message) setMessage(response.message);
            await load();
            onAction();
        } catch (err) {
            setError(errorMessage(err, fallback));
        }
    }

    function startSync(albumId = null) {
        return run(
            () => api.post("/admin/albums/sync", albumId ? { albumId } : {}),
            "Nie udało się uruchomić synchronizacji.",
        );
    }

    async function addAlbum(event) {
        event.preventDefault();
        await run(() => api.post("/admin/albums", newAlbum), "Nie udało się dodać albumu.");
        setNewAlbum({ driveUrl: "", title: "" });
    }

    function reorder(from, to) {
        const ids = moveItem(data.albums, from, to).map((album) => album.id);
        return run(() => api.post("/admin/albums/reorder", { ids }), "Nie udało się zmienić kolejności.");
    }

    function removeAlbum(album) {
        if (
            !window.confirm(
                `Usunąć album „${album.title}” ze strony? Zdjęcia na Dysku Google nie zostaną usunięte.`,
            )
        ) {
            return;
        }
        return run(() => api.delete(`/admin/albums/${album.id}`), "Nie udało się usunąć albumu.");
    }

    if (!data) {
        return error ? <p className="form-error">{error}</p> : <p className="page-status">Ładowanie...</p>;
    }

    return (
        <>
            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}

            {!data.credentialsConfigured && (
                <p className="payment-alert">
                    Brak danych konta serwisowego Google w <code>backend/config/.env</code>{" "}
                    (GOOGLE_PRIVATE_KEY, GOOGLE_CLIENT_EMAIL) — synchronizacja nie
                    zadziała, dopóki ich nie uzupełnisz.
                </p>
            )}

            <details className="gallery-howto" open={!data.albums.length}>
                <summary>Jak to działa?</summary>
                <ol>
                    <li>
                        Na Dysku Google trzymaj zdjęcia w folderach — jeden folder
                        = jeden album, np. „StreetShow 2025”, „StreetShow 2026”.
                    </li>
                    <li>
                        Udostępnij folder (lub folder główny z podfolderami)
                        kontu{" "}
                        <strong>{data.serviceAccountEmail || "serwisowemu Google"}</strong>{" "}
                        jako „Przeglądający”.
                    </li>
                    <li>
                        {data.rootFolderConfigured
                            ? "Podfoldery folderu głównego galerii są dodawane automatycznie. Inny folder możesz dodać linkiem poniżej."
                            : "Wklej poniżej link do folderu, aby dodać album."}
                    </li>
                    <li>
                        Kliknij „Synchronizuj” — serwer pobierze zdjęcia i zrobi z
                        nich lekkie miniatury. Później synchronizacja dzieje się
                        sama co noc; nowe zdjęcia wrzucone na Dysk pojawią się na
                        stronie następnego dnia (albo od razu po kliknięciu).
                    </li>
                </ol>
                <p className="admin-hint">
                    Zdjęcia w formacie HEIC (iPhone) nie są obsługiwane — wrzucaj JPG.
                </p>
            </details>

            <div className="submission-actions">
                <button
                    type="button"
                    onClick={() => startSync()}
                    disabled={isSyncing || !data.credentialsConfigured}
                >
                    {data.rootFolderConfigured
                        ? "Wykryj nowe albumy i synchronizuj wszystko"
                        : "Synchronizuj wszystkie albumy"}
                </button>
            </div>
            <SyncProgress sync={data.sync} />

            <form className="admin-bulk-bar" onSubmit={addAlbum}>
                <label>
                    <span className="field-label">Link do folderu na Dysku Google</span>
                    <input
                        value={newAlbum.driveUrl}
                        onChange={(event) => setNewAlbum({ ...newAlbum, driveUrl: event.target.value })}
                        placeholder="https://drive.google.com/drive/folders/…"
                        required
                    />
                </label>
                <label>
                    <span className="field-label">Nazwa (opcjonalna — domyślnie nazwa folderu)</span>
                    <input
                        value={newAlbum.title}
                        onChange={(event) => setNewAlbum({ ...newAlbum, title: event.target.value })}
                        placeholder="np. Street Show 2025"
                    />
                </label>
                <button type="submit" disabled={!data.credentialsConfigured}>
                    Dodaj album
                </button>
            </form>

            {data.albums.length === 0 && <p>Brak albumów.</p>}
            <ul className="album-admin-list">
                {data.albums.map((album, index) => (
                    <li key={album.id} className="submission-card">
                        <div className="album-admin-row">
                            {album.coverUrl ? (
                                <img src={album.coverUrl} alt="" className="album-admin-cover" />
                            ) : (
                                <span className="album-admin-cover" />
                            )}
                            <div className="album-admin-info">
                                <h3>
                                    {album.title}{" "}
                                    {!album.isVisible && (
                                        <span className="status-badge status-rejected">Ukryty</span>
                                    )}
                                </h3>
                                <p className="admin-hint">
                                    {photosLabel(album.totalPhotoCount)}
                                    {album.photoCount !== album.totalPhotoCount &&
                                        ` (ukryte: ${album.totalPhotoCount - album.photoCount})`}
                                    {album.lastSyncedAt
                                        ? ` · synchronizacja: ${formatDate(album.lastSyncedAt)}`
                                        : " · jeszcze nie synchronizowany"}
                                    {" · "}
                                    <a href={album.driveUrl} target="_blank" rel="noopener noreferrer">
                                        Otwórz na Dysku
                                    </a>
                                </p>
                                {album.lastSyncError && (
                                    <p className="form-error">{album.lastSyncError}</p>
                                )}
                            </div>
                        </div>
                        {editingId === album.id ? (
                            <AlbumEditForm
                                album={album}
                                onCancel={() => setEditingId(null)}
                                onSaved={() => {
                                    setEditingId(null);
                                    load();
                                    onAction();
                                }}
                            />
                        ) : (
                            <div className="submission-actions">
                                <button
                                    type="button"
                                    className="button-secondary"
                                    onClick={() => reorder(index, index - 1)}
                                    disabled={index === 0}
                                    title="Przesuń wyżej"
                                    aria-label="Przesuń wyżej"
                                >
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    className="button-secondary"
                                    onClick={() => reorder(index, index + 1)}
                                    disabled={index === data.albums.length - 1}
                                    title="Przesuń niżej"
                                    aria-label="Przesuń niżej"
                                >
                                    ↓
                                </button>
                                <button type="button" onClick={() => setEditingId(album.id)}>
                                    Edytuj
                                </button>
                                <button
                                    type="button"
                                    className="button-secondary"
                                    onClick={() =>
                                        setOpenPhotosId(openPhotosId === album.id ? null : album.id)
                                    }
                                >
                                    {openPhotosId === album.id ? "Zwiń zdjęcia" : "Zdjęcia"}
                                </button>
                                <button
                                    type="button"
                                    className="button-secondary"
                                    onClick={() => startSync(album.id)}
                                    disabled={isSyncing || !data.credentialsConfigured}
                                >
                                    Synchronizuj
                                </button>
                                <button
                                    type="button"
                                    className="button-danger"
                                    onClick={() => removeAlbum(album)}
                                    disabled={isSyncing}
                                >
                                    Usuń
                                </button>
                            </div>
                        )}
                        {openPhotosId === album.id && (
                            <AlbumPhotos album={album} onChanged={load} />
                        )}
                    </li>
                ))}
            </ul>
        </>
    );
}
