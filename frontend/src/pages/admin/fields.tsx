import { useState } from "react";
import api from "../../api/client";
import { IMAGE_ACCEPT, errorMessage, uploadContentImage } from "./shared";

// Path/URL input + "upload from computer" + preview, used by every image in the CMS.
export function ImageField({ label, value, onChange, previewAlt = "Podgląd" }) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState("");

    async function handleFile(file) {
        if (!file) return;
        setIsUploading(true);
        setError("");
        try {
            onChange(await uploadContentImage(file));
        } catch (err) {
            setError(errorMessage(err, "Nie udało się przesłać zdjęcia."));
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <div className="image-field">
            <label>
                <span className="field-label">{label}</span>
                <input
                    type="text"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="/img/photos/nazwa.webp"
                />
                <span className="field-hint">Ścieżka lub adres obrazka</span>
            </label>
            <label>
                <span className="field-label">…albo prześlij z komputera</span>
                <input
                    type="file"
                    accept={IMAGE_ACCEPT}
                    onChange={(event) => handleFile(event.target.files?.[0])}
                    disabled={isUploading}
                />
            </label>
            {isUploading && <p className="page-status">Przesyłanie...</p>}
            {error && <p className="form-error">{error}</p>}
            {value && (
                <img className="event-editor-preview" src={value} alt={previewAlt} />
            )}
        </div>
    );
}

export function PdfField({ label, value, onChange }) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState("");

    async function handleFile(file) {
        if (!file) return;
        setIsUploading(true);
        setError("");
        try {
            const formData = new FormData();
            formData.append("document", file);
            const { data } = await api.post("/admin/upload-document", formData);
            onChange(data.url);
        } catch (err) {
            setError(errorMessage(err, "Nie udało się przesłać pliku PDF."));
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <div className="image-field">
            <span className="field-label">{label}</span>
            {value ? (
                <p>
                    <a href={value} target="_blank" rel="noopener noreferrer">
                        Otwórz aktualny plik PDF
                    </a>{" "}
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={() => onChange("")}
                    >
                        Usuń PDF ze strony
                    </button>
                </p>
            ) : (
                <p className="admin-hint">Brak pliku PDF.</p>
            )}
            <label>
                {value ? "Podmień plik PDF" : "Prześlij plik PDF"}
                <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => handleFile(event.target.files?.[0])}
                    disabled={isUploading}
                />
            </label>
            {isUploading && <p className="page-status">Przesyłanie...</p>}
            {error && <p className="form-error">{error}</p>}
        </div>
    );
}

// ↑ / ↓ / remove controls for items in an editable list.
export function ListItemControls({ index, count, onMove, onRemove, removeLabel = "Usuń" }) {
    return (
        <div className="list-item-controls">
            <button
                type="button"
                className="button-secondary"
                onClick={() => onMove(index, index - 1)}
                disabled={index === 0}
                aria-label="Przesuń wyżej"
                title="Przesuń wyżej"
            >
                ↑
            </button>
            <button
                type="button"
                className="button-secondary"
                onClick={() => onMove(index, index + 1)}
                disabled={index === count - 1}
                aria-label="Przesuń niżej"
                title="Przesuń niżej"
            >
                ↓
            </button>
            <button type="button" className="button-danger" onClick={onRemove}>
                {removeLabel}
            </button>
        </div>
    );
}

export function moveItem(list, from, to) {
    if (to < 0 || to >= list.length) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
}

export function newId(prefix) {
    return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
