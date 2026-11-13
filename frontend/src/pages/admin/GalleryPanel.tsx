import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import { errorMessage, formatDate } from "./shared";
import { photosLabel } from "../../utils/plural";

const POLL_INTERVAL_MS = 2000;

function SyncProgress({ sync }) {
    if (!sync) return null;

    if (sync.inProgress) {
        const percent = sync.total ? Math.round((sync.processed / sync.total) * 100) : 0;
        return (
            <div className="gallery-sync-progress" role="status">
                <strong>Pobieranie zdjęć w toku…</strong>{" "}
                {sync.total > 0 && `${sync.processed} z ${photosLabel(sync.total)}`}
                <div className="admin-capacity-meter">
                    <span style={{ width: `${percent}%` }} />
                </div>
                <small className="admin-hint">
                    Pierwsze pobranie dużego folderu może potrwać kilka minut — możesz w tym czasie korzystać z
                    panelu.
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

export default function GalleryPanel({ onAction }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [driveUrl, setDriveUrl] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const load = useCallback(
        () =>
            api.get("/admin/gallery").then(
                ({ data: response }) => setData(response),
                (err) => setError(errorMessage(err, "Nie udało się pobrać galerii.")),
            ),
        [],
    );

    useEffect(() => {
        load();
    }, [load]);

    // While photos are being downloaded, poll the progress and reload the list at the end.
    const isSyncing = data?.sync?.inProgress;
    useEffect(() => {
        if (!isSyncing) return;
        const timer = setInterval(async () => {
            try {
                const { data: response } = await api.get("/admin/gallery/sync-status");
                if (response.sync.inProgress) {
                    setData((current) => ({ ...current, sync: response.sync }));
                } else {
                    load();
                    onAction();
                }
            } catch {
                // Try again on the next tick.
            }
        }, POLL_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [isSyncing, load, onAction]);

    async function run(action, fallback) {
        setError("");
        setMessage("");
        try {
            const { data: response } = await action();
            if (response?.message) setMessage(response.message);
            await load();
            onAction();
            return true;
        } catch (err) {
            setError(errorMessage(err, fallback));
            return false;
        }
    }

    async function saveFolder(event) {
        event.preventDefault();
        setIsSaving(true);
        const saved = await run(
            () => api.put("/admin/gallery/folder", { driveUrl }),
            "Nie udało się zapisać folderu.",
        );
        if (saved) setDriveUrl("");
        setIsSaving(false);
    }

    function startSync() {
        return run(() => api.post("/admin/gallery/sync"), "Nie udało się uruchomić synchronizacji.");
    }

    function toggleHidden(photo) {
        return run(
            () => api.patch(`/admin/gallery/photos/${photo.id}`, { isHidden: !photo.isHidden }),
            "Nie udało się zmienić zdjęcia.",
        );
    }

    if (!data) {
        return error ? <p className="form-error">{error}</p> : <p className="page-status">Ładowanie...</p>;
    }

    const { folder, photos } = data;
    const hiddenCount = photos.filter((photo) => photo.isHidden).length;

    return (
        <>
            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}

            {!data.credentialsConfigured && (
                <p className="payment-alert">
                    Brak danych konta serwisowego Google w <code>backend/config/.env</code> (GOOGLE_PRIVATE_KEY,
                    GOOGLE_CLIENT_EMAIL) — pobieranie zdjęć nie zadziała, dopóki ich nie uzupełnisz.
                </p>
            )}

            <details className="gallery-howto" open={!folder}>
                <summary>Jak to działa?</summary>
                <ol>
                    <li>Wrzuć zdjęcia do jednego folderu na Dysku Google (JPG, PNG lub WEBP).</li>
                    <li>
                        Udostępnij ten folder kontu <strong>{data.serviceAccountEmail || "serwisowemu Google"}</strong>{" "}
                        jako „Przeglądający”.
                    </li>
                    <li>Wklej poniżej link do folderu i zapisz — serwer pobierze zdjęcia i zrobi z nich lekkie miniatury.</li>
                    <li>
                        Nowe zdjęcia wrzucone do folderu pojawią się na stronie następnego dnia (synchronizacja
                        działa co noc) albo od razu po kliknięciu „Odśwież zdjęcia”.
                    </li>
                </ol>
                <p className="admin-hint">
                    Pobierane są tylko zdjęcia leżące bezpośrednio w tym folderze — podfoldery są pomijane. Zdjęcia w
                    formacie HEIC (iPhone) nie są obsługiwane — wrzucaj JPG.
                </p>
            </details>

            {folder && (
                <div className="gallery-folder-current">
                    <strong>{folder.name}</strong>
                    <p className="admin-hint">
                        {photosLabel(folder.totalPhotoCount)}
                        {hiddenCount > 0 && ` (ukryte: ${hiddenCount})`}
                        {folder.lastSyncedAt
                            ? ` · ostatnia synchronizacja: ${formatDate(folder.lastSyncedAt)}`
                            : " · jeszcze nie pobrano zdjęć"}
                        {" · "}
                        <a href={folder.driveUrl} target="_blank" rel="noopener noreferrer">
                            Otwórz na Dysku
                        </a>
                    </p>
                    {folder.lastSyncError && <p className="form-error">{folder.lastSyncError}</p>}
                    <div className="submission-actions">
                        <button type="button" onClick={startSync} disabled={isSyncing || !data.credentialsConfigured}>
                            Odśwież zdjęcia
                        </button>
                    </div>
                </div>
            )}
            <SyncProgress sync={data.sync} />

            <form className="gallery-folder" onSubmit={saveFolder}>
                <label>
                    <span className="field-label">
                        {folder ? "Zmień folder (zdjęcia z obecnego zostaną zastąpione)" : "Link do folderu na Dysku Google"}
                    </span>
                    <input
                        className="field-input"
                        value={driveUrl}
                        onChange={(event) => setDriveUrl(event.target.value)}
                        placeholder="https://drive.google.com/drive/folders/…"
                        required
                    />
                </label>
                <button
                    type="submit"
                    className="btn-street btn-street-primary"
                    disabled={isSaving || isSyncing || !data.credentialsConfigured}
                >
                    {isSaving ? "Zapisywanie..." : folder ? "Zmień folder" : "Zapisz folder"}
                </button>
            </form>

            {folder && photos.length === 0 && !isSyncing && (
                <p className="admin-hint">Brak zdjęć — kliknij „Odśwież zdjęcia”.</p>
            )}
            {photos.length > 0 && (
                <>
                    <p className="admin-hint">
                        Ukryte zdjęcie zostaje w folderze, ale nie pokazuje się na stronie.
                    </p>
                    <div className="admin-photo-grid">
                        {photos.map((photo) => (
                            <figure key={photo.id} className={`admin-photo${photo.isHidden ? " is-hidden" : ""}`}>
                                <img src={photo.thumb} alt={photo.name} loading="lazy" />
                                <figcaption>
                                    <span title={photo.name}>{photo.name}</span>
                                    <button type="button" className="button-secondary" onClick={() => toggleHidden(photo)}>
                                        {photo.isHidden ? "Pokaż" : "Ukryj"}
                                    </button>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </>
            )}
        </>
    );
}
