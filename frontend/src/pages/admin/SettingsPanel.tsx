import { useEffect, useState } from "react";
import api from "../../api/client";
import { errorMessage } from "./shared";

export default function SettingsPanel({ onAction }) {
    const [settings, setSettings] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        api.get("/admin/settings")
            .then(({ data }) => setSettings(data.settings))
            .catch((err) =>
                setError(errorMessage(err, "Nie udało się pobrać ustawień.")),
            );
    }, []);

    async function save(event) {
        event.preventDefault();
        setIsSaving(true);
        setError("");
        setMessage("");
        try {
            const { data } = await api.patch("/admin/settings", { settings });
            setSettings(data.settings);
            setMessage("Ustawienia zostały zapisane.");
            onAction();
        } catch (err) {
            setError(errorMessage(err, "Nie udało się zapisać ustawień."));
        } finally {
            setIsSaving(false);
        }
    }

    if (!settings) {
        return error ? (
            <p className="form-error">{error}</p>
        ) : (
            <p className="page-status">Ładowanie ustawień...</p>
        );
    }

    return (
        <form className="event-editor admin-settings-form" onSubmit={save}>
            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}
            <label className="admin-checkbox-label">
                <input
                    type="checkbox"
                    checked={settings.submissionsOpen}
                    onChange={(event) =>
                        setSettings({
                            ...settings,
                            submissionsOpen: event.target.checked,
                        })
                    }
                />
                Przyjmuj nowe zgłoszenia do strefy Select
            </label>
            <label>
                Termin zgłoszeń (ostatni dzień, opcjonalny)
                <input
                    type="date"
                    value={settings.submissionsDeadline}
                    onChange={(event) =>
                        setSettings({
                            ...settings,
                            submissionsDeadline: event.target.value,
                        })
                    }
                />
            </label>
            <label>
                Maksymalna liczba aktywnych zgłoszeń pojazdów na konto
                <input
                    type="number"
                    min={1}
                    max={50}
                    value={settings.maxVehiclesPerUser}
                    onChange={(event) =>
                        setSettings({
                            ...settings,
                            maxVehiclesPerUser: Number(event.target.value),
                        })
                    }
                />
            </label>
            <label>
                Liczba miejsc w strefie Select (0 = bez limitu, tylko
                informacyjnie na dashboardzie)
                <input
                    type="number"
                    min={0}
                    value={settings.selectCapacity}
                    onChange={(event) =>
                        setSettings({
                            ...settings,
                            selectCapacity: Number(event.target.value),
                        })
                    }
                />
            </label>
            <label>
                Kwota opłaty podawana w e-mailu o akceptacji
                <input
                    value={settings.selectFeeAmount}
                    maxLength={100}
                    onChange={(event) =>
                        setSettings({
                            ...settings,
                            selectFeeAmount: event.target.value,
                        })
                    }
                    placeholder="np. 150 zł (puste = wartość z SELECT_FEE_AMOUNT)"
                />
            </label>
            <button type="submit" disabled={isSaving}>
                {isSaving ? "Zapisywanie..." : "Zapisz ustawienia"}
            </button>
        </form>
    );
}
