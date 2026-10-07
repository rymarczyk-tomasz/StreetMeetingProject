import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import ConsentFields from "../components/ConsentFields";
import { photosLabel, plural } from "../utils/plural";

// Must match the backend limits in backend/src/submissions/routes.ts.
const MAX_PHOTOS = 5;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/avif";
const ACCEPTED_MIME = new Set(ACCEPTED_TYPES.split(","));
const ACCEPTED_EXTENSION = /\.(jpe?g|png|webp|avif)$/i;

function isAcceptedPhoto(file: File) {
    return file.type ? ACCEPTED_MIME.has(file.type) : ACCEPTED_EXTENSION.test(file.name);
}

function formatDay(date) {
    return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(`${date}T12:00:00`),
    );
}

function formatMegabytes(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export default function SubmissionPage() {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [form, setForm] = useState({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        licensePlate: "",
        carBrand: "",
        carDescription: "",
    });
    const [photos, setPhotos] = useState<File[]>([]);
    const [consents, setConsents] = useState({ acceptTerms: false, photoPublishConsent: false });
    const [vehicles, setVehicles] = useState([]);
    const [vehicleId, setVehicleId] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [availability, setAvailability] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // Local previews of newly picked photos; released when the selection changes.
    const previews = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]);
    useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

    const vehicle = vehicles.find((item) => String(item.id) === vehicleId);
    const usesGaragePhotos = Boolean(vehicle?.photos.length) && photos.length === 0;

    function chooseVehicle(id, list = vehicles) {
        setVehicleId(id);
        const chosen = list.find((item) => String(item.id) === id);
        if (chosen) {
            setForm((previous) => ({
                ...previous,
                licensePlate: chosen.licensePlate,
                carBrand: chosen.carBrand,
                carDescription: chosen.carDescription || previous.carDescription,
            }));
        }
    }

    async function loadAvailability() {
        try {
            const [availabilityResponse, vehiclesResponse] = await Promise.all([
                api.get("/submissions/availability"),
                api.get("/vehicles"),
            ]);
            setAvailability(availabilityResponse.data.availability);
            setVehicles(vehiclesResponse.data.vehicles);
            // Coming from "Zgłoś ten pojazd" in the garage.
            const preselected = searchParams.get("pojazd");
            if (preselected) chooseVehicle(preselected, vehiclesResponse.data.vehicles);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się sprawdzić dostępności zgłoszeń.",
            );
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadAvailability();
    }, []);

    function updateField(field) {
        return (event) =>
            setForm((previous) => ({
                ...previous,
                [field]: event.target.value,
            }));
    }

    // New photos are added to the ones already picked (up to 5 / 50 MB).
    function addPhotos(files: File[]) {
        if (!files.length) return;
        const next = [...photos, ...files];
        const totalSize = next.reduce((sum, photo) => sum + photo.size, 0);

        if (next.length > MAX_PHOTOS) {
            setError(`Możesz dodać maksymalnie ${MAX_PHOTOS} zdjęć.`);
            return;
        }
        if (files.some((photo) => !isAcceptedPhoto(photo))) {
            setError("Dozwolone są tylko zdjęcia w formatach JPG, PNG, WEBP lub AVIF.");
            return;
        }
        if (totalSize > MAX_TOTAL_SIZE) {
            setError(`Łączny rozmiar zdjęć (${formatMegabytes(totalSize)}) przekracza 50 MB.`);
            return;
        }

        setError("");
        setPhotos(next);
    }

    function handlePhotosChange(event: ChangeEvent<HTMLInputElement>) {
        addPhotos(Array.from(event.target.files || []));
        event.target.value = "";
    }

    function removePhoto(index: number) {
        setPhotos((current) => current.filter((_, i) => i !== index));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        if (photos.length === 0 && !usesGaragePhotos) {
            setError("Proszę dodać przynajmniej jedno zdjęcie.");
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) =>
                formData.append(key, value),
            );
            formData.append("acceptTerms", String(consents.acceptTerms));
            formData.append("photoPublishConsent", String(consents.photoPublishConsent));
            if (vehicleId) formData.append("vehicleId", vehicleId);
            photos.forEach((file) => formData.append("photos", file));

            await api.post("/submissions", formData);
            setIsSubmitted(true);
            loadAvailability();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Nie udało się wysłać zgłoszenia.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    function startAnotherSubmission() {
        setForm({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            phone: user.phone || "",
            licensePlate: "",
            carBrand: "",
            carDescription: "",
        });
        setPhotos([]);
        setVehicleId("");
        setConsents({ acceptTerms: false, photoPublishConsent: false });
        setError("");
        setIsSubmitted(false);
    }

    const totalSize = photos.reduce((sum, photo) => sum + photo.size, 0);
    const canSubmit = availability?.open && availability.remaining > 0;
    const shownPhotos = photos.length ? previews : usesGaragePhotos ? vehicle.photos : [];
    const emptySlots = Math.max(0, MAX_PHOTOS - shownPhotos.length - (shownPhotos.length < MAX_PHOTOS ? 1 : 0));

    let body;
    if (isLoading) {
        body = <p className="page-status">Ładowanie...</p>;
    } else if (isSubmitted) {
        body = (
            <div className="account-card-form submission-success">
                <h2>Zgłoszenie wysłane</h2>
                <p>
                    Organizator rozpatrzy je i da znać e-mailem. Status sprawdzisz w panelu.
                </p>
                <div className="submission-actions">
                    <Link className="btn-street btn-street-primary" to="/panel">
                        Przejdź do swoich zgłoszeń
                    </Link>
                    {canSubmit && (
                        <button type="button" className="btn-street btn-street-outline" onClick={startAnotherSubmission}>
                            Dodaj kolejny pojazd ({availability.remaining} pozostało)
                        </button>
                    )}
                </div>
            </div>
        );
    } else if (!availability) {
        body = error && <p className="form-error">{error}</p>;
    } else if (!availability.open) {
        body = (
            <div className="account-card-form">
                <p>{availability.reason}</p>
                <Link className="back-link" to="/panel">
                    ← Wróć do panelu
                </Link>
            </div>
        );
    } else if (availability.remaining <= 0) {
        body = (
            <div className="account-card-form">
                <p>
                    Masz już {availability.activeCount} aktywnych zgłoszeń — to maksymalna liczba
                    pojazdów na jedno konto ({availability.maxVehicles}). Możesz wycofać oczekujące
                    zgłoszenie w panelu, aby dodać inne auto.
                </p>
                <Link className="back-link" to="/panel">
                    ← Przejdź do swoich zgłoszeń
                </Link>
            </div>
        );
    } else {
        body = (
            <form onSubmit={handleSubmit} className="submission-form">
                <fieldset className="form-card">
                    <legend className="form-card-title">
                        <span className="form-card-number">1</span>Pojazd
                    </legend>
                    {vehicles.length > 0 ? (
                        <label className="form-field">
                            <span className="field-label">Pojazd z garażu</span>
                            <select
                                className="field-input field-select"
                                value={vehicleId}
                                onChange={(event) => chooseVehicle(event.target.value)}
                            >
                                <option value="">— wpisz dane ręcznie —</option>
                                {vehicles.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.carBrand} ({item.licensePlate})
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : (
                        <p className="form-card-hint">
                            Wskazówka: auta zapisane w <Link to="/garaz">garażu</Link> zgłosisz jednym
                            kliknięciem, także w kolejnych latach.
                        </p>
                    )}
                    <div className="form-row-2">
                        <label className="form-field">
                            <span className="field-label">Marka pojazdu</span>
                            <input
                                className="field-input"
                                value={form.carBrand}
                                onChange={updateField("carBrand")}
                                required
                                minLength={2}
                                maxLength={100}
                            />
                        </label>
                        <label className="form-field">
                            <span className="field-label">Numer tablic</span>
                            <input
                                className="field-input"
                                value={form.licensePlate}
                                onChange={updateField("licensePlate")}
                                placeholder="np. GD 12345"
                                required
                                maxLength={20}
                            />
                        </label>
                    </div>
                    <label className="form-field">
                        <span className="field-label">Opis pojazdu</span>
                        <textarea
                            className="field-input field-textarea"
                            value={form.carDescription}
                            onChange={updateField("carDescription")}
                            rows={3}
                            required
                            minLength={10}
                            maxLength={3000}
                        />
                    </label>
                </fieldset>

                <fieldset className="form-card">
                    <legend className="form-card-title">
                        <span className="form-card-number">2</span>Dane kontaktowe
                    </legend>
                    <div className="form-row-3">
                        <label className="form-field">
                            <span className="field-label">Imię</span>
                            <input
                                className="field-input"
                                value={form.firstName}
                                onChange={updateField("firstName")}
                                autoComplete="given-name"
                                required
                                minLength={2}
                                maxLength={100}
                            />
                        </label>
                        <label className="form-field">
                            <span className="field-label">Nazwisko</span>
                            <input
                                className="field-input"
                                value={form.lastName}
                                onChange={updateField("lastName")}
                                autoComplete="family-name"
                                required
                                minLength={2}
                                maxLength={100}
                            />
                        </label>
                        <label className="form-field">
                            <span className="field-label">Telefon</span>
                            <input
                                className="field-input"
                                type="tel"
                                value={form.phone}
                                onChange={updateField("phone")}
                                autoComplete="tel"
                                placeholder="np. +48 123 456 789"
                                required
                            />
                        </label>
                    </div>
                </fieldset>

                <fieldset className="form-card">
                    <legend className="form-card-title">
                        <span className="form-card-number">3</span>Zdjęcia
                    </legend>
                    {vehicle?.photos.length > 0 && (
                        <p className="form-card-aside">
                            {usesGaragePhotos
                                ? `${photosLabel(vehicle.photos.length)} z garażu · możesz je zastąpić nowymi`
                                : "Nowe zdjęcia zastąpią zdjęcia z garażu"}
                        </p>
                    )}
                    <div className="photo-slots">
                        {shownPhotos.map((src, index) => (
                            <div className="photo-slot is-filled" key={src}>
                                <img src={src} alt={`Zdjęcie ${index + 1}`} />
                                {photos.length > 0 && (
                                    <button
                                        type="button"
                                        className="photo-slot-remove"
                                        aria-label={`Usuń zdjęcie ${index + 1}`}
                                        onClick={() => removePhoto(index)}
                                    >
                                        <i className="bi bi-x" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {shownPhotos.length < MAX_PHOTOS && (
                            <label
                                className={`photo-slot is-drop${isDragging ? " is-dragging" : ""}`}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    setIsDragging(false);
                                    addPhotos(Array.from(event.dataTransfer.files || []));
                                }}
                            >
                                <i className="bi bi-cloud-arrow-up" aria-hidden="true" />
                                Przeciągnij lub wybierz
                                <input
                                    type="file"
                                    className="visually-hidden"
                                    accept={ACCEPTED_TYPES}
                                    multiple
                                    onChange={handlePhotosChange}
                                />
                            </label>
                        )}
                        {Array.from({ length: emptySlots }, (_, index) => (
                            <div className="photo-slot is-empty" key={`empty-${index}`} aria-hidden="true" />
                        ))}
                    </div>
                    <div className="photo-progress">
                        <div className="progress-bar" aria-hidden="true">
                            <span style={{ width: `${(totalSize / MAX_TOTAL_SIZE) * 100}%` }} />
                        </div>
                        <p>
                            <span>
                                {shownPhotos.length} z {MAX_PHOTOS} zdjęć
                                {photos.length > 0 && ` · ${formatMegabytes(totalSize)} z 50 MB`}
                            </span>
                            <span>JPG, PNG, WEBP lub AVIF</span>
                        </p>
                    </div>
                </fieldset>

                <fieldset className="form-card">
                    <legend className="form-card-title">
                        <span className="form-card-number">4</span>Zgody
                    </legend>
                    <ConsentFields value={consents} onChange={setConsents} />
                </fieldset>

                {error && (
                    <p className="form-error" role="alert">
                        {error}
                    </p>
                )}
                <div className="submission-form-submit">
                    <button
                        type="submit"
                        className="btn-street btn-street-primary btn-street-lg"
                        disabled={isSubmitting || !consents.acceptTerms}
                        aria-busy={isSubmitting}
                    >
                        {isSubmitting ? "Wysyłanie..." : "Wyślij zgłoszenie"}
                    </button>
                    <p>Do decyzji organizatora możesz je poprawić albo wycofać.</p>
                </div>
            </form>
        );
    }

    const used = availability ? availability.activeCount : 0;
    const limit = availability?.maxVehicles || 0;

    return (
        <section className="page account-page">
            <div className="submission-layout">
                <div className="submission-main">
                    <div className="account-head-title">
                        <p className="eyebrow eyebrow-on-light">
                            Edycja {availability?.edition || ""}
                        </p>
                        <h1>Zgłoś pojazd</h1>
                    </div>
                    {body}
                </div>
                {availability && (
                    <aside className="submission-aside">
                        <div>
                            <p className="eyebrow">Twój limit</p>
                            <p className="submission-aside-count">
                                {used} <span>/ {plural(limit, "pojazdu", "pojazdów", "pojazdów")}</span>
                            </p>
                            <div className="progress-bar is-dark" aria-hidden="true">
                                <span style={{ width: `${limit ? (used / limit) * 100 : 0}%` }} />
                            </div>
                        </div>
                        <p className="submission-aside-note">
                            {availability.open
                                ? `Zgłoszenia otwarte${availability.deadline ? ` do ${formatDay(availability.deadline)}` : ""}`
                                : availability.reason}
                        </p>
                        <div className="submission-aside-steps">
                            <p className="submission-aside-title">Co dalej</p>
                            <ol>
                                <li>Organizator rozpatruje zgłoszenie</li>
                                <li>Decyzja i dane do przelewu – e-mail i panel</li>
                                <li>Po opłacie – wejściówka QR</li>
                            </ol>
                        </div>
                    </aside>
                )}
            </div>
        </section>
    );
}
