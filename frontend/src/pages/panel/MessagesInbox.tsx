import { useState } from "react";
import api from "../../api/client";

function formatDate(value) {
    return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(`${value.replace(" ", "T")}Z`),
    );
}

export default function MessagesInbox({ messages, onChanged }) {
    const [openId, setOpenId] = useState(null);
    if (!messages?.length) return null;

    const unread = messages.filter((message) => !message.read).length;

    async function open(message) {
        setOpenId(openId === message.id ? null : message.id);
        if (!message.read) {
            await api.post(`/messages/${message.id}/read`).catch(() => {});
            onChanged();
        }
    }

    return (
        <section className="panel-messages">
            <div className="panel-section-heading">
                <h2>
                    Komunikaty od organizatora
                    {unread > 0 && <span className="unread-badge">nowe: {unread}</span>}
                </h2>
                {unread > 1 && (
                    <button
                        type="button"
                        className="text-action"
                        onClick={async () => {
                            await api.post("/messages/read-all").catch(() => {});
                            onChanged();
                        }}
                    >
                        Oznacz wszystkie jako przeczytane
                    </button>
                )}
            </div>
            <ul>
                {messages.map((message) => (
                    <li key={message.id} className={message.read ? "" : "is-unread"}>
                        <button
                            type="button"
                            className="panel-message-toggle"
                            onClick={() => open(message)}
                            aria-expanded={openId === message.id}
                        >
                            <span className="panel-message-subject">{message.subject}</span>
                            <span className="panel-message-date">{formatDate(message.createdAt)}</span>
                        </button>
                        {openId === message.id && <p className="panel-message-body">{message.body}</p>}
                    </li>
                ))}
            </ul>
        </section>
    );
}
