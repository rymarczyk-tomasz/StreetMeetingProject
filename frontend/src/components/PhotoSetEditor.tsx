import { useState } from "react";

// Must match backend/src/utils/userPhotos.ts.
const MAX_PHOTOS = 5;
const MAX_NEW_SIZE = 50 * 1024 * 1024;
const ACCEPTED = "image/jpeg,image/png,image/webp,image/avif";

type PhotoSetEditorProps = {
    photos: string[];
    onSave: (keepUrls: string[], newFiles: File[]) => Promise<void>;
    onCancel: () => void;
};

export default function PhotoSetEditor({ photos, onSave, onCancel }: PhotoSetEditorProps) {
    const [removed, setRemoved] = useState<string[]>([]);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const kept = photos.filter((photo) => !removed.includes(photo));
    const total = kept.length + newFiles.length;

    function toggle(photo) {
        setRemoved((current) =>
            current.includes(photo)
                ? current.filter((item) => item !== photo)
                : [...current, photo],
        );
    }

    function addFiles(event) {
        const files = Array.from(event.target.files || []) as File[];
        event.target.value = "";
        const next = [...newFiles, ...files];
        if (kept.length + next.length > MAX_PHOTOS) {
            setError(`Możesz mieć maksymalnie ${MAX_PHOTOS} zdjęć.`);
            return;
        }
        if (next.reduce((sum, file) => sum + file.size, 0) > MAX_NEW_SIZE) {
            setError("Łączny rozmiar zdjęć nie może przekraczać 50 MB.");
            return;
        }
        setError("");
        setNewFiles(next);
    }

    async function save() {
        if (!total) {
            setError("Zostaw lub dodaj przynajmniej jedno zdjęcie.");
            return;
        }
        setIsSaving(true);
        setError("");
        try {
            await onSave(kept, newFiles);
        } catch (err) {
            setError(err.response?.data?.message || "Nie udało się zapisać zdjęć.");
            setIsSaving(false);
        }
    }

    return (
        <div className="photo-set-editor">
            <p className="admin-hint">
                Kliknij zdjęcie, aby je usunąć (lub przywrócić). Zdjęć: {total} z{" "}
                {MAX_PHOTOS}.
            </p>
            <div className="submission-photos">
                {photos.map((photo, index) => (
                    <button
                        key={photo}
                        type="button"
                        className={`photo-thumb-button photo-toggle${removed.includes(photo) ? " is-removed" : ""}`}
                        onClick={() => toggle(photo)}
                        aria-pressed={removed.includes(photo)}
                        aria-label={`${removed.includes(photo) ? "Przywróć" : "Usuń"} zdjęcie ${index + 1}`}
                    >
                        <img src={photo} alt="" loading="lazy" />
                        {removed.includes(photo) && <span>Usunięte</span>}
                    </button>
                ))}
                {newFiles.map((file) => (
                    <span key={`${file.name}-${file.size}`} className="photo-new">
                        + {file.name}
                    </span>
                ))}
            </div>
            {total < MAX_PHOTOS && (
                <label>
                    Dodaj zdjęcia
                    <input type="file" accept={ACCEPTED} multiple onChange={addFiles} />
                </label>
            )}
            {error && (
                <p className="form-error" role="alert">
                    {error}
                </p>
            )}
            <div className="submission-actions">
                <button type="button" onClick={save} disabled={isSaving}>
                    {isSaving ? "Zapisywanie..." : "Zapisz zdjęcia"}
                </button>
                <button type="button" className="button-secondary" onClick={onCancel}>
                    Anuluj
                </button>
            </div>
        </div>
    );
}
