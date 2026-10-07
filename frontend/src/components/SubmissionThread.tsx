import { useEffect, useState } from "react";
import api from "../api/client";

function formatDate(value) {
    return new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(`${value.replace(" ", "T")}Z`),
    );
}

export default function SubmissionThread({ basePath, viewer, onRead = () => {} }) {
    const [messages, setMessages] = useState(null);
    const [text, setText] = useState("");
    const [error, setError] = useState("");
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        let cancelled = false;
        api.get(`${basePath}/messages`)
            .then(({ data }) => {
                if (cancelled) return;
                setMessages(data.messages);
                onRead();
            })
            .catch((err) => {
                if (!cancelled) setError(err.response?.data?.message || "Nie udało się pobrać wiadomości.");
            });
        return () => {
            cancelled = true;
        };
        // Not on onRead: it only refreshes counters, and a new function identity
        // on every parent render would reload the thread in a loop.
    }, [basePath]);

    async function send(event) {
        event.preventDefault();
        setIsSending(true);
        setError("");
        try {
            const { data } = await api.post(`${basePath}/messages`, { message: text });
            setMessages(data.messages);
            setText("");
        } catch (err) {
            setError(err.response?.data?.message || "Nie udało się wysłać wiadomości.");
        } finally {
            setIsSending(false);
        }
    }

    const isAdmin = viewer === "admin";
    return (
        <div className="submission-thread">
            {!messages && !error && <p className="page-status">Ładowanie...</p>}
            {messages?.length === 0 && (
                <p className="admin-hint">
                    {isAdmin
                        ? "Brak wiadomości. Uczestnik dostanie Twoją wiadomość w panelu i e-mailem."
                        : "Masz pytanie albo chcesz coś zmienić w zgłoszeniu? Napisz do organizatora — odpowiedź pojawi się tutaj i przyjdzie e-mailem."}
                </p>
            )}
            {messages?.length > 0 && (
                <ol className="thread-messages">
                    {messages.map((message) => {
                        const mine = message.fromAdmin === isAdmin;
                        return (
                            <li key={message.id} className={mine ? "is-mine" : "is-theirs"}>
                                <span className="thread-meta">
                                    {message.author} · {formatDate(message.createdAt)}
                                </span>
                                <p>{message.body}</p>
                            </li>
                        );
                    })}
                </ol>
            )}
            {error && <p className="form-error">{error}</p>}
            <form className="thread-form" onSubmit={send}>
                <label>
                    {isAdmin ? "Odpowiedź dla uczestnika" : "Wiadomość do organizatora"}
                    <textarea
                        rows={3}
                        maxLength={2000}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        required
                    />
                </label>
                <button type="submit" disabled={isSending || !text.trim()}>
                    {isSending ? "Wysyłanie..." : "Wyślij"}
                </button>
            </form>
        </div>
    );
}
