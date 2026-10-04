import { useEffect, useState } from "react";
import api from "../../api/client";
import { IMAGE_ACCEPT, uploadContentImage } from "./shared";

export function EventEditor({ onAction }) {
    const [event, setEvent] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingIndex, setUploadingIndex] = useState(null);

    useEffect(() => {
        api.get("/admin/event")
            .then(({ data }) => setEvent(data.event))
            .catch((err) =>
                setError(
                    err.response?.data?.message ||
                        "Nie udało się pobrać treści Eventu.",
                ),
            );
    }, []);

    function updateCard(index, field, value) {
        setEvent((current) => ({
            ...current,
            cards: current.cards.map((card, cardIndex) =>
                cardIndex === index ? { ...card, [field]: value } : card,
            ),
        }));
    }

    async function handleImageFile(index, file) {
        if (!file) return;
        setUploadingIndex(index);
        setError("");
        try {
            const url = await uploadContentImage(file);
            updateCard(index, "image", url);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się przesłać zdjęcia.",
            );
        } finally {
            setUploadingIndex(null);
        }
    }

    async function save(eventSubmit) {
        eventSubmit.preventDefault();
        setIsSaving(true);
        setError("");
        setMessage("");
        try {
            await api.patch("/admin/event", { event });
            setMessage("Treść Eventu została zapisana.");
            onAction();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się zapisać treści Eventu.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    if (!event)
        return <p className="page-status">Ładowanie treści Eventu...</p>;

    return (
        <form className="event-editor" onSubmit={save}>
            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}
            <label>
                Opis sekcji Event
                <textarea
                    rows={3}
                    value={event.intro}
                    onChange={(eventInput) =>
                        setEvent({ ...event, intro: eventInput.target.value })
                    }
                />
            </label>
            <div className="event-editor-grid">
                {event.cards.map((card, index) => (
                    <fieldset className="event-editor-card" key={card.id}>
                        <legend>Kafelek {index + 1}</legend>
                        <label>
                            Tytuł
                            <input
                                value={card.title}
                                onChange={(input) =>
                                    updateCard(
                                        index,
                                        "title",
                                        input.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Treść
                            <textarea
                                rows={6}
                                value={card.description}
                                onChange={(input) =>
                                    updateCard(
                                        index,
                                        "description",
                                        input.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Ścieżka lub URL zdjęcia
                            <input
                                type="text"
                                value={card.image}
                                onChange={(input) =>
                                    updateCard(
                                        index,
                                        "image",
                                        input.target.value,
                                    )
                                }
                                placeholder="/img/photos/nazwa.webp"
                            />
                        </label>
                        <label>
                            Prześlij zdjęcie z komputera
                            <input
                                type="file"
                                accept={IMAGE_ACCEPT}
                                onChange={(input) =>
                                    handleImageFile(
                                        index,
                                        input.target.files?.[0],
                                    )
                                }
                                disabled={uploadingIndex === index}
                            />
                        </label>
                        {uploadingIndex === index && (
                            <p className="page-status">Przesyłanie...</p>
                        )}
                        <img
                            className="event-editor-preview"
                            src={card.image}
                            alt="Podgląd kafelka"
                        />
                        <label>
                            Tekst alternatywny
                            <input
                                value={card.alt}
                                onChange={(input) =>
                                    updateCard(index, "alt", input.target.value)
                                }
                            />
                        </label>
                        <label>
                            Tekst przycisku
                            <input
                                value={card.actionLabel}
                                onChange={(input) =>
                                    updateCard(
                                        index,
                                        "actionLabel",
                                        input.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Link przycisku
                            <input
                                value={card.actionHref}
                                onChange={(input) =>
                                    updateCard(
                                        index,
                                        "actionHref",
                                        input.target.value,
                                    )
                                }
                            />
                        </label>
                    </fieldset>
                ))}
            </div>
            <button type="submit" disabled={isSaving}>
                {isSaving ? "Zapisywanie..." : "Zapisz zmiany Eventu"}
            </button>
        </form>
    );
}

export function HomeEditor({ onAction }) {
    const [home, setHome] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingHero, setIsUploadingHero] = useState(false);

    useEffect(() => {
        api.get("/admin/home")
            .then(({ data }) => setHome(data.home))
            .catch((err) =>
                setError(
                    err.response?.data?.message ||
                        "Nie udało się pobrać treści Home.",
                ),
            );
    }, []);

    async function save(formEvent) {
        formEvent.preventDefault();
        setIsSaving(true);
        setError("");
        setMessage("");
        try {
            await api.patch("/admin/home", { home });
            setMessage("Treść Home została zapisana.");
            onAction();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się zapisać treści Home.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    if (!home) return <p className="page-status">Ładowanie treści Home...</p>;

    async function handleHeroImageFile(file) {
        if (!file) return;
        setIsUploadingHero(true);
        setError("");
        try {
            const url = await uploadContentImage(file);
            setHome((current) => ({ ...current, heroImage: url }));
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się przesłać zdjęcia hero.",
            );
        } finally {
            setIsUploadingHero(false);
        }
    }

    return (
        <form className="event-editor" onSubmit={save}>
            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}
            <label>
                Tytuł
                <input
                    value={home.heroTitle}
                    onChange={(input) =>
                        setHome({ ...home, heroTitle: input.target.value })
                    }
                />
            </label>
            <label>
                Data wydarzenia
                <input
                    value={home.heroDate}
                    onChange={(input) =>
                        setHome({ ...home, heroDate: input.target.value })
                    }
                />
            </label>
            <label>
                Miejsce wydarzenia
                <input
                    value={home.heroLocation}
                    onChange={(input) =>
                        setHome({ ...home, heroLocation: input.target.value })
                    }
                />
            </label>
            <label>
                Ścieżka lub URL zdjęcia hero
                <input
                    type="text"
                    value={home.heroImage}
                    onChange={(input) =>
                        setHome({ ...home, heroImage: input.target.value })
                    }
                    placeholder="/img/photos/nazwa.webp"
                />
            </label>
            <label>
                Prześlij zdjęcie hero z komputera
                <input
                    type="file"
                    accept={IMAGE_ACCEPT}
                    onChange={(input) =>
                        handleHeroImageFile(input.target.files?.[0])
                    }
                    disabled={isUploadingHero}
                />
            </label>
            {isUploadingHero && <p className="page-status">Przesyłanie...</p>}
            {home.heroImage && (
                <img
                    className="event-editor-preview"
                    src={home.heroImage}
                    alt="Podgląd zdjęcia hero"
                />
            )}
            <label>
                Tekst przycisku biletów
                <input
                    value={home.ticketLabel}
                    onChange={(input) =>
                        setHome({ ...home, ticketLabel: input.target.value })
                    }
                />
            </label>
            <label>
                Link do biletów
                <input
                    value={home.ticketUrl}
                    onChange={(input) =>
                        setHome({ ...home, ticketUrl: input.target.value })
                    }
                />
            </label>
            <label>
                Tekst linku "Poznaj atrakcje"
                <input
                    value={home.exploreLabel}
                    onChange={(input) =>
                        setHome({ ...home, exploreLabel: input.target.value })
                    }
                />
            </label>
            <button type="submit" disabled={isSaving}>
                {isSaving ? "Zapisywanie..." : "Zapisz zmiany Home"}
            </button>
        </form>
    );
}

export function GalleryEditor({ onAction }) {
    const [gallery, setGallery] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingId, setUploadingId] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        api.get("/admin/gallery")
            .then(({ data }) => setGallery(data.gallery))
            .catch((err) =>
                setError(
                    err.response?.data?.message ||
                        "Nie udało się pobrać treści Galerii.",
                ),
            );
    }, []);

    function updatePhoto(id, field, value) {
        setGallery((current) => ({
            ...current,
            photos: (current.photos || []).map((photo) =>
                photo.id === id ? { ...photo, [field]: value } : photo,
            ),
        }));
    }

    async function addPhoto(file) {
        if (!file) return;
        setUploadingId("new");
        setError("");
        try {
            const url = await uploadContentImage(file);
            setGallery((current) => ({
                ...current,
                photos: [
                    ...(current.photos || []),
                    { id: `photo-${Date.now()}`, url, alt: "" },
                ],
            }));
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się przesłać zdjęcia.",
            );
        } finally {
            setUploadingId(null);
        }
    }

    async function replacePhoto(id, file) {
        if (!file) return;
        setUploadingId(id);
        setError("");
        try {
            const url = await uploadContentImage(file);
            updatePhoto(id, "url", url);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się przesłać zdjęcia.",
            );
        } finally {
            setUploadingId(null);
        }
    }

    async function syncGallery() {
        setIsSyncing(true);
        setError("");
        setMessage("");
        try {
            const { data } = await api.post("/admin/gallery/sync");
            setMessage(data.message);
            onAction();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się zsynchronizować galerii.",
            );
        } finally {
            setIsSyncing(false);
        }
    }

    function removePhoto(id) {
        setGallery((current) => ({
            ...current,
            photos: (current.photos || []).filter((photo) => photo.id !== id),
        }));
    }

    async function save(formEvent) {
        formEvent.preventDefault();
        setIsSaving(true);
        setError("");
        setMessage("");
        try {
            await api.patch("/admin/gallery", { gallery });
            setMessage("Treść Galerii została zapisana.");
            onAction();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się zapisać treści Galerii.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    if (!gallery)
        return <p className="page-status">Ładowanie treści Galerii...</p>;

    return (
        <form className="event-editor" onSubmit={save}>
            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}
            <p className="admin-hint">
                Te zdjęcia widać w podglądzie sekcji "Galeria" na stronie
                głównej (maks. 3). Pełna galeria pod adresem /galeria nadal
                synchronizuje się automatycznie z Dysku Google i nie jest tu
                edytowana.
            </p>
            <div className="submission-actions">
                <button
                    type="button"
                    className="button-secondary"
                    onClick={syncGallery}
                    disabled={isSyncing}
                >
                    {isSyncing
                        ? "Synchronizowanie..."
                        : "Synchronizuj pełną galerię z Dysku Google teraz"}
                </button>
            </div>
            <label>
                Opis nad podglądem galerii (opcjonalny)
                <textarea
                    rows={3}
                    value={gallery.intro}
                    onChange={(input) =>
                        setGallery({ ...gallery, intro: input.target.value })
                    }
                />
            </label>
            <label>
                Tekst przycisku "Przejdź do galerii"
                <input
                    value={gallery.linkLabel}
                    onChange={(input) =>
                        setGallery({
                            ...gallery,
                            linkLabel: input.target.value,
                        })
                    }
                />
            </label>
            <div className="event-editor-grid">
                {(gallery.photos || []).map((photo, index) => (
                    <fieldset className="event-editor-card" key={photo.id}>
                        <legend>Zdjęcie {index + 1}</legend>
                        <label>
                            Ścieżka lub URL zdjęcia
                            <input
                                type="text"
                                value={photo.url}
                                onChange={(input) =>
                                    updatePhoto(
                                        photo.id,
                                        "url",
                                        input.target.value,
                                    )
                                }
                                placeholder="/img/photos/nazwa.webp"
                            />
                        </label>
                        <label>
                            Prześlij zdjęcie z komputera
                            <input
                                type="file"
                                accept={IMAGE_ACCEPT}
                                onChange={(input) =>
                                    replacePhoto(
                                        photo.id,
                                        input.target.files?.[0],
                                    )
                                }
                                disabled={uploadingId === photo.id}
                            />
                        </label>
                        {uploadingId === photo.id && (
                            <p className="page-status">Przesyłanie...</p>
                        )}
                        <img
                            className="event-editor-preview"
                            src={photo.url}
                            alt={photo.alt || "Podgląd zdjęcia galerii"}
                        />
                        <label>
                            Tekst alternatywny
                            <input
                                value={photo.alt}
                                onChange={(input) =>
                                    updatePhoto(
                                        photo.id,
                                        "alt",
                                        input.target.value,
                                    )
                                }
                            />
                        </label>
                        <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                        >
                            Usuń zdjęcie
                        </button>
                    </fieldset>
                ))}
            </div>
            <label>
                Dodaj nowe zdjęcie z komputera
                <input
                    type="file"
                    accept={IMAGE_ACCEPT}
                    onChange={(input) => addPhoto(input.target.files?.[0])}
                    disabled={uploadingId === "new"}
                />
            </label>
            {uploadingId === "new" && (
                <p className="page-status">Przesyłanie...</p>
            )}
            <button type="submit" disabled={isSaving}>
                {isSaving ? "Zapisywanie..." : "Zapisz zmiany Galerii"}
            </button>
        </form>
    );
}

export function ContactEditor({ onAction }) {
    const [contact, setContact] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        api.get("/admin/contact")
            .then(({ data }) => setContact(data.contact))
            .catch((err) =>
                setError(
                    err.response?.data?.message ||
                        "Nie udało się pobrać treści Kontaktu.",
                ),
            );
    }, []);

    async function save(formEvent) {
        formEvent.preventDefault();
        setIsSaving(true);
        setError("");
        setMessage("");
        try {
            await api.patch("/admin/contact", { contact });
            setMessage("Treść Kontaktu została zapisana.");
            onAction();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się zapisać treści Kontaktu.",
            );
        } finally {
            setIsSaving(false);
        }
    }

    if (!contact)
        return <p className="page-status">Ładowanie treści Kontaktu...</p>;

    return (
        <form className="event-editor" onSubmit={save}>
            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}
            <label>
                Link do Facebooka
                <input
                    value={contact.facebookUrl}
                    onChange={(input) =>
                        setContact({
                            ...contact,
                            facebookUrl: input.target.value,
                        })
                    }
                />
            </label>
            <label>
                Link do Instagrama
                <input
                    value={contact.instagramUrl}
                    onChange={(input) =>
                        setContact({
                            ...contact,
                            instagramUrl: input.target.value,
                        })
                    }
                />
            </label>
            <label>
                Nazwa
                <input
                    value={contact.addressName}
                    onChange={(input) =>
                        setContact({
                            ...contact,
                            addressName: input.target.value,
                        })
                    }
                />
            </label>
            <label>
                Adres — linia 1
                <input
                    value={contact.addressLine1}
                    onChange={(input) =>
                        setContact({
                            ...contact,
                            addressLine1: input.target.value,
                        })
                    }
                />
            </label>
            <label>
                Adres — linia 2
                <input
                    value={contact.addressLine2}
                    onChange={(input) =>
                        setContact({
                            ...contact,
                            addressLine2: input.target.value,
                        })
                    }
                />
            </label>
            <label>
                Link do mapy
                <input
                    value={contact.mapUrl}
                    onChange={(input) =>
                        setContact({ ...contact, mapUrl: input.target.value })
                    }
                />
            </label>
            <label>
                E-mail kontaktowy
                <input
                    type="email"
                    value={contact.email}
                    onChange={(input) =>
                        setContact({ ...contact, email: input.target.value })
                    }
                />
            </label>
            <button type="submit" disabled={isSaving}>
                {isSaving ? "Zapisywanie..." : "Zapisz zmiany Kontaktu"}
            </button>
        </form>
    );
}
