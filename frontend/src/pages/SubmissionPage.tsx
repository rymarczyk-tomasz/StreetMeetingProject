import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import ConsentFields from "../components/ConsentFields";
import { photosLabel } from "../utils/plural";

// Must match the backend limits in backend/src/submissions/routes.ts.
const MAX_PHOTOS = 5;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/avif";
const ACCEPTED_MIME = new Set(ACCEPTED_TYPES.split(","));
const ACCEPTED_EXTENSION = /\.(jpe?g|png|webp|avif)$/i;

// Some browsers report an empty type (e.g. .webp/.avif without an OS mime mapping),
// so fall back to the extension; the backend verifies the actual file content.
function isAcceptedPhoto(file: File) {
    return file.type ? ACCEPTED_MIME.has(file.type) : ACCEPTED_EXTENSION.test(file.name);
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

    function handlePhotosChange(event: ChangeEvent<HTMLInputElement>) {
        const selectedPhotos = Array.from(event.target.files || []);
        const totalSize = selectedPhotos.reduce(
            (sum, photo) => sum + photo.size,
            0,
        );

        if (selectedPhotos.length > MAX_PHOTOS) {
            event.target.value = "";
            setPhotos([]);
            setError(`Możesz dodać maksymalnie ${MAX_PHOTOS} zdjęć.`);
            return;
        }

        if (selectedPhotos.some((photo) => !isAcceptedPhoto(photo))) {
            event.target.value = "";
            setPhotos([]);
            setError(
                "Dozwolone są tylko zdjęcia w formatach JPG, PNG, WEBP lub AVIF.",
            );
            return;
        }

        if (totalSize > MAX_TOTAL_SIZE) {
            event.target.value = "";
            setPhotos([]);
            setError(
                `Łączny rozmiar zdjęć (${formatMegabytes(totalSize)}) przekracza 50 MB.`,
            );
            return;
        }

        setError("");
        setPhotos(selectedPhotos);
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

    return (
        <section className="page auth-page">
            <h1>Formularz Strefa Select</h1>
            {isLoading ? (
                <p className="page-status">Ładowanie...</p>
            ) : isSubmitted ? (
                <div className="submission-success">
                    <p>Twoje zgłoszenie zostało wysłane.</p>
                    {canSubmit ? (
                        <button type="button" onClick={startAnotherSubmission}>
                            Dodaj kolejny pojazd ({availability.remaining}{" "}
                            pozostało)
                        </button>
                    ) : null}
                    <p>
                        <Link to="/panel">Przejdź do swoich zgłoszeń</Link>
                    </p>
                </div>
            ) : !availability ? (
                error && <p className="form-error">{error}</p>
            ) : !availability.open ? (
                <div className="submission-info">
                    <p>{availability.reason}</p>
                    <Link to="/panel">Wróć do panelu</Link>
                </div>
            ) : availability.remaining <= 0 ? (
                <div className="submission-info">
                    <p>
                        Masz już {availability.activeCount} aktywnych zgłoszeń —
                        to maksymalna liczba pojazdów na jedno konto (
                        {availability.maxVehicles}). Możesz wycofać oczekujące
                        zgłoszenie w panelu, aby dodać inne auto.
                    </p>
                    <Link to="/panel">Przejdź do swoich zgłoszeń</Link>
                </div>
            ) : (
                <>
                    <p className="submission-info">
                        Zgłoszenie dotyczy edycji {availability.edition}. Możesz
                        zgłosić maksymalnie {availability.maxVehicles} pojazdów
                        (każdy osobnym formularzem).
                        {availability.activeCount > 0 &&
                            ` Masz już ${availability.activeCount} aktywnych zgłoszeń — pozostało ${availability.remaining}.`}
                    </p>
                    <form onSubmit={handleSubmit} className="auth-form">
                        {vehicles.length > 0 ? (
                            <label>
                                Pojazd z garażu (opcjonalnie)
                                <select
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
                            <p className="admin-hint">
                                Wskazówka: auta zapisane w{" "}
                                <Link to="/garaz">garażu</Link> zgłosisz jednym
                                kliknięciem, także w kolejnych latach.
                            </p>
                        )}
                        <label>
                            Imię
                            <input
                                value={form.firstName}
                                onChange={updateField("firstName")}
                                required
                                minLength={2}
                                maxLength={100}
                            />
                        </label>
                        <label>
                            Nazwisko
                            <input
                                value={form.lastName}
                                onChange={updateField("lastName")}
                                required
                                minLength={2}
                                maxLength={100}
                            />
                        </label>
                        <label>
                            Numer telefonu
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={updateField("phone")}
                                placeholder="np. +48 123 456 789"
                                required
                            />
                        </label>
                        <label>
                            Numer tablic rejestracyjnych
                            <input
                                value={form.licensePlate}
                                onChange={updateField("licensePlate")}
                                placeholder="np. GD 12345"
                                required
                                maxLength={20}
                            />
                        </label>
                        <label>
                            Marka pojazdu
                            <input
                                value={form.carBrand}
                                onChange={updateField("carBrand")}
                                required
                                minLength={2}
                                maxLength={100}
                            />
                        </label>
                        <label>
                            Opis pojazdu
                            <textarea
                                value={form.carDescription}
                                onChange={updateField("carDescription")}
                                rows={3}
                                required
                                minLength={10}
                                maxLength={3000}
                            />
                        </label>
                        {vehicle?.photos.length > 0 && (
                            <div className="garage-photos-preview">
                                <p className="admin-hint">
                                    {usesGaragePhotos
                                        ? `Wyślemy ${photosLabel(vehicle.photos.length)} z garażu. Możesz też wybrać nowe poniżej — wtedy zastąpią te z garażu.`
                                        : "Wybrałeś nowe zdjęcia — zastąpią zdjęcia z garażu."}
                                </p>
                                <div className="submission-photos">
                                    {vehicle.photos.map((photo) => (
                                        <img key={photo} src={photo} alt="" loading="lazy" />
                                    ))}
                                </div>
                            </div>
                        )}
                        <label>
                            {usesGaragePhotos ? "Inne zdjęcia (opcjonalnie)" : "Zdjęcia"} (maksymalnie{" "}
                            {MAX_PHOTOS}, łącznie do 50 MB; JPG, PNG, WEBP lub AVIF)
                            <input
                                type="file"
                                accept={ACCEPTED_TYPES}
                                multiple
                                required={!usesGaragePhotos}
                                onChange={handlePhotosChange}
                            />
                        </label>
                        {photos.length > 0 && (
                            <p className="file-selection-info">
                                Wybrano {photos.length} z {MAX_PHOTOS} zdjęć,
                                łącznie {formatMegabytes(totalSize)} z 50 MB.
                            </p>
                        )}
                        <ConsentFields value={consents} onChange={setConsents} />
                        {error && (
                            <p className="form-error" role="alert">
                                {error}
                            </p>
                        )}
                        <button type="submit" disabled={isSubmitting || !consents.acceptTerms}>
                            {isSubmitting
                                ? "Wysyłanie..."
                                : "Wyślij zgłoszenie"}
                        </button>
                    </form>
                </>
            )}
        </section>
    );
}
