import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import EmptyState from "../components/EmptyState";
import Lightbox from "../components/Lightbox";
import PhotoSetEditor from "../components/PhotoSetEditor";
import Plate from "../components/Plate";

const EMPTY_FORM = { carBrand: "", licensePlate: "", carDescription: "" };
const ACCEPTED = "image/jpeg,image/png,image/webp,image/avif";

function VehicleFields({ form, setForm }) {
    return (
        <>
            <label>
                Marka i model
                <input
                    value={form.carBrand}
                    maxLength={100}
                    onChange={(event) => setForm({ ...form, carBrand: event.target.value })}
                    required
                />
            </label>
            <label>
                Numer rejestracyjny
                <input
                    value={form.licensePlate}
                    maxLength={20}
                    onChange={(event) => setForm({ ...form, licensePlate: event.target.value })}
                    placeholder="np. GD 12345"
                    required
                />
            </label>
            <label>
                Opis (modyfikacje, historia auta…)
                <textarea
                    rows={4}
                    maxLength={3000}
                    value={form.carDescription}
                    onChange={(event) => setForm({ ...form, carDescription: event.target.value })}
                />
            </label>
        </>
    );
}

// One big photo + two small ones; the third tile shows "+N" for the rest.
function PhotoMosaic({ photos, alt, onOpen }) {
    if (!photos.length) {
        return (
            <div className="vehicle-photo-empty">
                <i className="bi bi-camera" aria-hidden="true" />
                Brak zdjęć
            </div>
        );
    }
    if (photos.length < 3) {
        return (
            <button type="button" className="vehicle-photo-single" onClick={() => onOpen(0)}>
                <img src={photos[0]} alt={alt} loading="lazy" />
            </button>
        );
    }
    const more = photos.length - 3;
    return (
        <div className="vehicle-mosaic">
            {photos.slice(0, 3).map((photo, index) => (
                <button
                    type="button"
                    key={photo}
                    onClick={() => onOpen(index)}
                    aria-label={`${alt} – zdjęcie ${index + 1}`}
                >
                    <img src={photo} alt="" loading="lazy" />
                    {index === 2 && more > 0 && <span className="vehicle-mosaic-more">+{more}</span>}
                </button>
            ))}
        </div>
    );
}

function VehicleCard({ vehicle, edition, onChanged, notify, onOpenPhotos }) {
    const navigate = useNavigate();
    const [mode, setMode] = useState<"view" | "edit" | "photos">("view");
    const [form, setForm] = useState(EMPTY_FORM);

    async function save(event) {
        event.preventDefault();
        try {
            await api.patch(`/vehicles/${vehicle.id}`, form);
            setMode("view");
            notify({ message: "Zapisano zmiany pojazdu." });
            await onChanged();
        } catch (err) {
            notify({ error: err.response?.data?.message || "Nie udało się zapisać pojazdu." });
        }
    }

    async function savePhotos(keepUrls, newFiles) {
        const formData = new FormData();
        keepUrls.forEach((url) => formData.append("keep", url));
        newFiles.forEach((file) => formData.append("photos", file));
        await api.put(`/vehicles/${vehicle.id}/photos`, formData);
        setMode("view");
        notify({ message: "Zdjęcia pojazdu zostały zaktualizowane." });
        await onChanged();
    }

    async function remove() {
        if (!window.confirm(`Usunąć ${vehicle.carBrand} (${vehicle.licensePlate}) z garażu?`)) return;
        try {
            const { data } = await api.delete(`/vehicles/${vehicle.id}`);
            notify({ message: data.message });
            await onChanged();
        } catch (err) {
            notify({ error: err.response?.data?.message || "Nie udało się usunąć pojazdu." });
        }
    }

    return (
        <li className={`vehicle-card${mode !== "view" ? " is-editing" : ""}`}>
            {mode === "view" && (
                <PhotoMosaic
                    photos={vehicle.photos}
                    alt={vehicle.carBrand}
                    onOpen={(index) => onOpenPhotos(vehicle, index)}
                />
            )}
            <div className="vehicle-card-body">
                <div className="vehicle-card-head">
                    <h2>{vehicle.carBrand}</h2>
                    <Plate value={vehicle.licensePlate} size="sm" />
                </div>
                {mode === "edit" ? (
                    <form className="auth-form" onSubmit={save}>
                        <VehicleFields form={form} setForm={setForm} />
                        <div className="submission-actions">
                            <button type="submit">Zapisz</button>
                            <button type="button" className="button-secondary" onClick={() => setMode("view")}>
                                Anuluj
                            </button>
                        </div>
                    </form>
                ) : mode === "photos" ? (
                    <PhotoSetEditor photos={vehicle.photos} onSave={savePhotos} onCancel={() => setMode("view")} />
                ) : (
                    <>
                        {vehicle.carDescription && <p className="vehicle-card-text">{vehicle.carDescription}</p>}
                        {vehicle.photos.length === 0 && (
                            <p className="vehicle-card-text">
                                Dodaj zdjęcia, aby zgłaszać auto jednym kliknięciem.
                            </p>
                        )}
                        <div className="vehicle-card-actions">
                            {vehicle.submittedThisEdition ? (
                                <span className="btn-street vehicle-submitted" aria-disabled="true">
                                    Zgłoszone na {edition}
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    className="btn-street btn-street-primary"
                                    onClick={() => navigate(`/formularz?pojazd=${vehicle.id}`)}
                                >
                                    Zgłoś ten pojazd
                                </button>
                            )}
                            <button
                                type="button"
                                className="vehicle-icon-button"
                                aria-label={`Edytuj ${vehicle.carBrand}`}
                                title="Edytuj dane"
                                onClick={() => {
                                    setForm({
                                        carBrand: vehicle.carBrand,
                                        licensePlate: vehicle.licensePlate,
                                        carDescription: vehicle.carDescription,
                                    });
                                    setMode("edit");
                                }}
                            >
                                <i className="bi bi-pencil" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                className="vehicle-icon-button"
                                aria-label={`Zdjęcia ${vehicle.carBrand}`}
                                title="Zmień zdjęcia"
                                onClick={() => setMode("photos")}
                            >
                                <i className="bi bi-images" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                className="vehicle-icon-button is-danger"
                                aria-label={`Usuń ${vehicle.carBrand} z garażu`}
                                title="Usuń z garażu"
                                onClick={remove}
                            >
                                <i className="bi bi-trash3" aria-hidden="true" />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </li>
    );
}

// The participant's saved cars, reusable for submissions in every edition.
export default function GaragePage() {
    const [vehicles, setVehicles] = useState(null);
    const [edition, setEdition] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [files, setFiles] = useState<File[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState({ message: "", error: "" });
    const [lightbox, setLightbox] = useState({ photos: [], index: null, title: "" });

    const load = useCallback(async () => {
        try {
            const { data } = await api.get("/vehicles");
            setVehicles(data.vehicles);
            setEdition(data.edition);
        } catch (err) {
            setFeedback({ message: "", error: err.response?.data?.message || "Nie udało się pobrać garażu." });
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    function notify({ message = "", error = "" }) {
        setFeedback({ message, error });
    }

    function startAdding() {
        setIsAdding(true);
        requestAnimationFrame(() =>
            document.getElementById("new-vehicle")?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
    }

    async function add(event) {
        event.preventDefault();
        setIsSaving(true);
        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => formData.append(key, value));
            files.forEach((file) => formData.append("photos", file));
            await api.post("/vehicles", formData);
            setForm(EMPTY_FORM);
            setFiles([]);
            setIsAdding(false);
            notify({ message: "Pojazd dodany do garażu." });
            await load();
        } catch (err) {
            notify({ error: err.response?.data?.message || "Nie udało się dodać pojazdu." });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <section className="page account-page">
            <div className="account-head">
                <div className="account-head-title">
                    <Link className="back-link" to="/panel">
                        ← Panel konta
                    </Link>
                    <h1>Mój garaż</h1>
                    <p className="section-lead">
                        Zapisz tu swoje auta razem ze zdjęciami – zgłosisz je do strefy Select
                        jednym kliknięciem, także w kolejnych latach.
                    </p>
                </div>
                {!isAdding && vehicles?.length > 0 && (
                    <button type="button" className="btn-street btn-street-dark" onClick={startAdding}>
                        <i className="bi bi-plus-lg" aria-hidden="true" />
                        Dodaj pojazd
                    </button>
                )}
            </div>
            {feedback.error && <p className="form-error">{feedback.error}</p>}
            {feedback.message && <p className="form-success">{feedback.message}</p>}

            {isAdding && (
                <form id="new-vehicle" className="auth-form account-card-form" onSubmit={add}>
                    <h2>Nowy pojazd</h2>
                    <VehicleFields form={form} setForm={setForm} />
                    <label>
                        Zdjęcia (maksymalnie 5, łącznie do 50 MB)
                        <input
                            type="file"
                            accept={ACCEPTED}
                            multiple
                            onChange={(event) => setFiles((Array.from(event.target.files || []) as File[]).slice(0, 5))}
                        />
                    </label>
                    <div className="submission-actions">
                        <button type="submit" disabled={isSaving}>
                            {isSaving ? "Zapisywanie..." : "Dodaj do garażu"}
                        </button>
                        <button type="button" className="button-secondary" onClick={() => setIsAdding(false)}>
                            Anuluj
                        </button>
                    </div>
                </form>
            )}

            {!vehicles ? (
                <div aria-hidden="true" className="vehicle-grid">
                    <span className="skeleton vehicle-skeleton" />
                    <span className="skeleton vehicle-skeleton" />
                </div>
            ) : vehicles.length === 0 ? (
                !isAdding && (
                    <EmptyState
                        icon="bi-car-front"
                        title="Garaż jest pusty"
                        action={
                            <button type="button" className="btn-street btn-street-primary" onClick={startAdding}>
                                Dodaj pierwszy pojazd
                            </button>
                        }
                    >
                        Dodaj auto raz – ze zdjęciami i opisem – a do strefy Select zgłosisz je
                        jednym kliknięciem, także w kolejnych latach.
                    </EmptyState>
                )
            ) : (
                <ul className="vehicle-grid">
                    {vehicles.map((vehicle) => (
                        <VehicleCard
                            key={vehicle.id}
                            vehicle={vehicle}
                            edition={edition}
                            onChanged={load}
                            notify={notify}
                            onOpenPhotos={(item, index) =>
                                setLightbox({
                                    photos: item.photos.map((src) => ({ src, thumb: src, alt: item.carBrand })),
                                    index,
                                    title: item.carBrand,
                                })
                            }
                        />
                    ))}
                    {!isAdding && (
                        <li>
                            <button type="button" className="vehicle-add-tile" onClick={startAdding}>
                                <i className="bi bi-plus-circle" aria-hidden="true" />
                                <span className="vehicle-add-title">Dodaj pojazd</span>
                                <span>do 5 zdjęć, łącznie 50 MB</span>
                            </button>
                        </li>
                    )}
                </ul>
            )}
            <Lightbox
                photos={lightbox.photos}
                index={lightbox.index}
                onIndexChange={(index) => setLightbox((current) => ({ ...current, index }))}
                title={lightbox.title}
                label="Zdjęcia pojazdu"
            />
        </section>
    );
}
