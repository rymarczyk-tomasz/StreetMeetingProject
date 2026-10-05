import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import { errorMessage } from "./shared";

const LEVEL_LABELS = { ok: "OK", warn: "Uwaga", error: "Problem" };

const UPLOAD_LABELS = {
    submissions: "Zdjęcia zgłoszeń",
    vehicles: "Zdjęcia w garażach",
    content: "Pliki treści strony",
    gallery: "Galeria",
    showcase: "Auta strefy Select (kopie)",
};

function formatBytes(bytes) {
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} kB`;
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return days ? `${days} d ${hours} godz.` : hours ? `${hours} godz. ${minutes} min` : `${minutes} min`;
}

export default function SystemStatus({ onAction }) {
    const [status, setStatus] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isTesting, setIsTesting] = useState(false);

    const load = useCallback(() => {
        api.get("/admin/system")
            .then(({ data }) => {
                setStatus(data);
                setError("");
            })
            .catch((err) => setError(errorMessage(err, "Nie udało się sprawdzić stanu systemu.")));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function sendTest() {
        setIsTesting(true);
        setMessage("");
        setError("");
        try {
            const { data } = await api.post("/admin/system/test-email");
            setMessage(data.message);
            onAction();
        } catch (err) {
            setError(errorMessage(err, "Nie udało się wysłać testowego e-maila."));
        } finally {
            setIsTesting(false);
        }
    }

    if (!status) return error ? <p className="form-error">{error}</p> : <p className="page-status">Sprawdzanie...</p>;

    return (
        <div className="system-status">
            {error && <p className="form-error">{error}</p>}
            {message && <p className="form-success">{message}</p>}
            <ul className="system-checks">
                {status.checks.map((item) => (
                    <li key={item.id} className={`is-${item.level}`}>
                        <span className={`status-badge system-level-${item.level}`}>{LEVEL_LABELS[item.level]}</span>
                        <div>
                            <strong>{item.label}</strong>
                            <p>{item.detail}</p>
                            {item.id === "smtp" && item.level === "ok" && (
                                <button type="button" className="button-secondary" disabled={isTesting} onClick={sendTest}>
                                    {isTesting ? "Wysyłanie..." : "Wyślij testowy e-mail do mnie"}
                                </button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>

            <h3>Dane na serwerze</h3>
            <div className="admin-table-wrapper">
                <table className="admin-table">
                    <tbody>
                        <tr>
                            <td>Baza danych</td>
                            <td>{formatBytes(status.storage.database)}</td>
                        </tr>
                        {status.storage.uploads.map((row) => (
                            <tr key={row.name}>
                                <td>{UPLOAD_LABELS[row.name] || row.name}</td>
                                <td>{formatBytes(row.size)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="admin-hint">
                Serwer działa od {formatUptime(status.server.uptimeSeconds)} · Node.js {status.server.node}
            </p>
            <button type="button" className="button-secondary" onClick={load}>
                Odśwież
            </button>
        </div>
    );
}
