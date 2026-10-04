import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import PhotoSetEditor from "../components/PhotoSetEditor";

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

function VehicleCard({ vehicle, onChanged, notify }) {
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
        <li className="submission-card">
            <div className="submission-summary">
                <strong>
                    {vehicle.carBrand} — {vehicle.licensePlate}
                </strong>
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
                    {vehicle.carDescription && <p>{vehicle.carDescription}</p>}
                    <div className="submission-photos">
                        {vehicle.photos.map((photo) => (
                            <img key={photo} src={photo} alt={vehicle.carBrand} loading="lazy" />
                        ))}
                        {vehicle.photos.length === 0 && (
                            <p className="admin-hint">Brak zdjęć — dodaj je, aby zgłaszać auto jednym kliknięciem.</p>
                        )}
                    </div>
                    <div className="submission-actions">
                        <button type="button" onClick={() => navigate(`/formularz?pojazd=${vehicle.id}`)}>
                            Zgłoś ten pojazd
                        </button>
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() => {
                                setForm({
                                    carBrand: vehicle.carBrand,
                                    licensePlate: vehicle.licensePlate,
                                    carDescription: vehicle.carDescription,
                                });
                                setMode("edit");
                            }}
                        >
                            Edytuj
                        </button>
                        <button type="button" className="button-secondary" onClick={() => setMode("photos")}>
                            Zdjęcia
                        </button>
                        <button type="button" className="button-danger" onClick={remove}>
                            Usuń
                        </button>
                    </div>
                </>
            )}
        </li>
    );
}

// The participant's saved cars, reusable for submissions in every edition.
export default function GaragePage() {
    const [vehicles, setVehicles] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [files, setFiles] = useState<File[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState({ message: "", error: "" });

    const load = useCallback(async () => {
        try {
            const { data } = await api.get("/vehicles");
            setVehicles(data.vehicles);
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
        <section className="page">
            <div className="page-heading-row">
                <div>
                    <p className="page-eyebrow">Panel konta</p>
                    <h1>Mój garaż</h1>
                </div>
                <Link className="account-back-link" to="/panel">
                    Wróć do panelu
                </Link>
            </div>
            <p className="account-settings-intro">
                Zapisz tu swoje auta razem ze zdjęciami — zgłosisz je do strefy Select
                jednym kliknięciem, także w kolejnych latach.
            </p>
            {feedback.error && <p className="form-error">{feedback.error}</p>}
            {feedback.message && <p className="form-success">{feedback.message}</p>}

            {isAdding ? (
                <form className="auth-form account-card" onSubmit={add}>
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
            ) : (
                <p>
                    <button type="button" className="account-settings-button" onClick={() => setIsAdding(true)}>
                        + Dodaj pojazd
                    </button>
                </p>
            )}

            {!vehicles ? (
                <p className="page-status">Ładowanie...</p>
            ) : vehicles.length === 0 ? (
                <p>
                    Garaż jest pusty. Dodaj auto powyżej albo użyj „Zapisz w garażu” przy
                    zgłoszeniu w panelu.
                </p>
            ) : (
                <ul className="submission-list">
                    {vehicles.map((vehicle) => (
                        <VehicleCard key={vehicle.id} vehicle={vehicle} onChanged={load} notify={notify} />
                    ))}
                </ul>
            )}
        </section>
    );
}
