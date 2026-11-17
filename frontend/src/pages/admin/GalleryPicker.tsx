import { useEffect, useState } from "react";
import api from "../../api/client";
import AdminDialog from "./AdminDialog";
import { errorMessage } from "./shared";

type GalleryPhoto = { id: number; name: string; thumb: string; isHidden: boolean };

// Lists the synced gallery; the chosen photo is copied to page content and its URL returned.
export default function GalleryPicker({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
    const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null);
    const [error, setError] = useState("");
    const [copyingId, setCopyingId] = useState<number | null>(null);

    useEffect(() => {
        api.get("/admin/gallery")
            .then(({ data }) => setPhotos(data.photos || []))
            .catch((err) => setError(errorMessage(err, "Nie udało się wczytać galerii.")));
    }, []);

    async function pick(photo: GalleryPhoto) {
        setCopyingId(photo.id);
        setError("");
        try {
            const { data } = await api.post(`/admin/gallery/photos/${photo.id}/copy`);
            onPick(data.url);
            onClose();
        } catch (err) {
            setError(errorMessage(err, "Nie udało się użyć zdjęcia."));
            setCopyingId(null);
        }
    }

    return (
        <AdminDialog title="Wybierz zdjęcie z galerii" wide onClose={onClose}>
            {error && <p className="form-error">{error}</p>}
            {!photos && !error && <p className="page-status">Wczytywanie galerii...</p>}
            {photos?.length === 0 && (
                <p className="admin-hint">Galeria jest pusta. Wskaż folder i zsynchronizuj zdjęcia w zakładce Galeria.</p>
            )}
            {copyingId !== null && <p className="page-status">Przygotowuję zdjęcie w pełnej jakości...</p>}
            {!!photos?.length && (
                <div className="gallery-picker-grid">
                    {photos.map((photo) => (
                        <button
                            key={photo.id}
                            type="button"
                            className="gallery-picker-item"
                            onClick={() => pick(photo)}
                            disabled={copyingId !== null}
                            title={photo.isHidden ? `${photo.name} (ukryte w galerii)` : photo.name}
                        >
                            <img src={photo.thumb} alt={photo.name} loading="lazy" />
                        </button>
                    ))}
                </div>
            )}
        </AdminDialog>
    );
}
