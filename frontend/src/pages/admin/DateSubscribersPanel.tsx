import { useEffect, useState } from "react";
import api from "../../api/client";
import { errorMessage } from "./shared";

export default function DateSubscribersPanel({ onAction }) {
    const [stats, setStats] = useState(null);
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [resendAll, setResendAll] = useState(false);
    const [feedback, setFeedback] = useState({ error: "", success: "" });
    const [isBusy, setIsBusy] = useState(false);

    function load() {
        api.get("/admin/date-subscribers")
            .then(({ data }) => setStats(data))
            .catch(() => setStats(null));
    }

    useEffect(load, []);

    async function exportCsv() {
        try {
            const { data } = await api.get("/admin/date-subscribers/export", {
                responseType: "blob",
            });
            const url = URL.createObjectURL(data);
            const link = document.createElement("a");
            link.href = url;
            link.download = "powiadomienia-o-dacie.csv";
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            setFeedback({ error: errorMessage(error, "Nie udało się. Spróbuj ponownie."), success: "" });
        }
    }

    async function send(event) {
        event.preventDefault();
        const count = resendAll ? stats?.total : stats?.pending;
        if (!window.confirm(`Wysłać „${subject}” do ${count ?? 0} osób?`)) return;

        setIsBusy(true);
        setFeedback({ error: "", success: "" });
        try {
            const { data } = await api.post("/admin/date-subscribers/send", {
                subject,
                message,
                all: resendAll,
            });
            setFeedback({ error: "", success: data.message });
            setSubject("");
            setMessage("");
            onAction?.();
            load();
        } catch (error) {
            setFeedback({ error: errorMessage(error, "Nie udało się. Spróbuj ponownie."), success: "" });
        } finally {
            setIsBusy(false);
        }
    }

    const sendCount = resendAll ? stats?.total : stats?.pending;

    return (
        <div className="gallery-howto group-email">
            <h3 className="admin-subheading">
                Lista „Daj mi znać o dacie” ({stats ? stats.total : "…"})
            </h3>
            <p className="admin-hint">
                Adresy zapisane na stronie głównej, gdy edycja nie ma jeszcze daty. Gdy
                ustawisz datę, formularz znika ze strony — wyślij wtedy jedną wiadomość z
                terminem i linkiem do biletów. Każdy e-mail ma link do wypisania się.
                Liczą się tylko adresy potwierdzone kliknięciem w link z e-maila;
                niepotwierdzone znikają po 7 dniach.
            </p>
            <p className="admin-hint">
                Zapisanych: <strong>{stats?.total ?? "…"}</strong>, jeszcze bez
                powiadomienia: <strong>{stats?.pending ?? "…"}</strong>.
                {stats?.unconfirmed > 0 && (
                    <> Niepotwierdzone: {stats.unconfirmed} (nie dostaną wiadomości).</>
                )}{" "}
                <button type="button" className="text-button" onClick={exportCsv}>
                    Pobierz CSV
                </button>
            </p>
            {stats && !stats.emailConfigured && (
                <p className="payment-alert">
                    SMTP nie jest skonfigurowany — wysyłka jest niedostępna.
                </p>
            )}
            <form className="event-editor" onSubmit={send}>
                <label>
                    <span className="field-label">Temat</span>
                    <input
                        value={subject}
                        maxLength={200}
                        onChange={(event) => setSubject(event.target.value)}
                        placeholder="np. Street Show 2027 – znamy datę!"
                        required
                    />
                </label>
                <label>
                    <span className="field-label">Treść</span>
                    <textarea
                        rows={6}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Data, miejsce i link do biletów…"
                        required
                    />
                </label>
                <label className="admin-checkbox-label">
                    <input
                        type="checkbox"
                        checked={resendAll}
                        onChange={(event) => setResendAll(event.target.checked)}
                    />
                    Wyślij także do osób, które dostały już powiadomienie
                </label>
                {feedback.error && <p className="form-error">{feedback.error}</p>}
                {feedback.success && <p className="form-success">{feedback.success}</p>}
                <div className="submission-actions">
                    <button
                        type="submit"
                        disabled={
                            isBusy || !sendCount || !stats?.emailConfigured || stats?.inProgress
                        }
                    >
                        {isBusy ? "Wysyłanie..." : `Wyślij (${sendCount ?? 0})`}
                    </button>
                </div>
            </form>
        </div>
    );
}
