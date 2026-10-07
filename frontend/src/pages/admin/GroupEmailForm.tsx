import { useEffect, useState } from "react";
import api from "../../api/client";
import { errorMessage } from "./shared";
import { TemplatePicker, fillTemplate, useTemplates } from "./templates";

const AUDIENCES = [
    { id: "approved", label: "Zaakceptowani", filters: { status: "approved" } },
    {
        id: "approved-paid",
        label: "Zaakceptowani i opłaceni",
        filters: { status: "approved", paymentStatus: "paid" },
    },
    {
        id: "approved-unpaid",
        label: "Zaakceptowani, jeszcze nieopłaceni",
        filters: { status: "approved", paymentStatus: "unpaid" },
    },
    {
        id: "overdue",
        label: "Zaakceptowani po terminie płatności",
        filters: { paymentStatus: "overdue" },
    },
    { id: "pending", label: "Oczekujący na decyzję", filters: { status: "pending" } },
    { id: "waitlist", label: "Lista rezerwowa", filters: { status: "waitlist" } },
    { id: "all", label: "Wszyscy zgłaszający w tej edycji", filters: {} },
];

// One personal e-mail per participant ("Cześć <imię>, …"), sent in the background.
export default function GroupEmailForm({ edition, onSent }) {
    const [audienceId, setAudienceId] = useState("approved");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [recipients, setRecipients] = useState(null);
    const [feedback, setFeedback] = useState({ error: "", success: "" });
    const [isSending, setIsSending] = useState(false);
    const { templates, currentEdition } = useTemplates("group");

    function applyTemplate(template) {
        const values = { rok: edition || currentEdition || undefined };
        if (
            (subject || message) &&
            !window.confirm("Zastąpić wpisany temat i treść szablonem?")
        ) {
            return;
        }
        setSubject(fillTemplate(template.subject || template.title, values));
        setMessage(fillTemplate(template.body, values));
    }

    const audience = AUDIENCES.find((item) => item.id === audienceId);
    const filters = { ...audience.filters, edition: edition || undefined };

    useEffect(() => {
        const params = {
            ...AUDIENCES.find((item) => item.id === audienceId).filters,
            edition: edition || undefined,
        };
        api.get("/admin/emails/recipients", { params })
            .then(({ data }) => setRecipients(data))
            .catch(() => setRecipients(null));
    }, [audienceId, edition]);

    async function send(event) {
        event.preventDefault();
        if (
            !window.confirm(
                `Wysłać wiadomość „${subject}” do ${recipients?.count ?? 0} osób?`,
            )
        ) {
            return;
        }

        setIsSending(true);
        setFeedback({ error: "", success: "" });
        try {
            const { data } = await api.post("/admin/emails", { subject, message, filters });
            setFeedback({ error: "", success: data.message });
            setSubject("");
            setMessage("");
            onSent();
        } catch (err) {
            setFeedback({
                error: errorMessage(err, "Nie udało się wysłać wiadomości."),
                success: "",
            });
        } finally {
            setIsSending(false);
        }
    }

    return (
        <div className="group-email">
            <p className="admin-hint">
                Wiadomość pojawi się w panelu każdego uczestnika (sekcja „Komunikaty od
                organizatora”)
                {recipients?.emailConfigured
                    ? " i zostanie wysłana e-mailem."
                    : ". E-maile nie wyjdą, dopóki nie skonfigurujesz SMTP w backend/config/.env."}
            </p>
            <form className="event-editor" onSubmit={send}>
                <label>
                    Do kogo
                    <select value={audienceId} onChange={(event) => setAudienceId(event.target.value)}>
                        {AUDIENCES.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </label>
                <p className="admin-hint">
                    Odbiorców: <strong>{recipients?.count ?? "…"}</strong> (każdy
                    dostanie osobną wiadomość zaczynającą się od „Cześć &lt;imię&gt;,”).
                </p>
                <TemplatePicker templates={templates} onPick={applyTemplate} />
                <label>
                    Temat
                    <input
                        value={subject}
                        maxLength={200}
                        onChange={(event) => setSubject(event.target.value)}
                        required
                    />
                </label>
                <label>
                    Treść
                    <textarea
                        rows={8}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="np. godziny wjazdu na murawę, co zabrać, kontakt w dniu wydarzenia…"
                        required
                    />
                </label>
                {feedback.error && <p className="form-error">{feedback.error}</p>}
                {feedback.success && <p className="form-success">{feedback.success}</p>}
                <div className="submission-actions">
                    <button
                        type="submit"
                        disabled={isSending || !recipients?.count || recipients?.inProgress}
                    >
                        {isSending ? "Wysyłanie..." : "Wyślij"}
                    </button>
                </div>
            </form>
        </div>
    );
}
