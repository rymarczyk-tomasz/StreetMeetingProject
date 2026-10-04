import { useState } from "react";
import { Link } from "react-router-dom";
import { useContent } from "../api/content";

const CONTENT_KEYS = ["announcement"];
const DISMISS_KEY = "announcement-dismissed";

function readDismissed() {
    try {
        return localStorage.getItem(DISMISS_KEY) || "";
    } catch {
        return "";
    }
}

function isExpired(expiresAt) {
    if (!expiresAt) return false;
    return Date.now() > new Date(`${expiresAt}T23:59:59`).getTime();
}

// Site-wide notice edited in Admin → Treści strony → Ogłoszenie. A visitor can
// close it; it reappears when the text changes.
export default function AnnouncementBar() {
    const { content } = useContent(CONTENT_KEYS);
    const [dismissed, setDismissed] = useState(readDismissed);
    const announcement = content?.announcement;

    if (
        !announcement?.enabled ||
        !announcement.text ||
        isExpired(announcement.expiresAt) ||
        dismissed === announcement.text
    ) {
        return null;
    }

    function dismiss() {
        setDismissed(announcement.text);
        try {
            localStorage.setItem(DISMISS_KEY, announcement.text);
        } catch {
            // Storage unavailable (private mode): hide for this page view only.
        }
    }

    const { linkUrl, linkLabel } = announcement;

    return (
        <div
            className={`announcement-bar${announcement.variant === "warning" ? " is-warning" : ""}`}
            role="status"
        >
            <span>{announcement.text}</span>
            {linkUrl &&
                (linkUrl.startsWith("/") ? (
                    <Link to={linkUrl}>{linkLabel || "Więcej"}</Link>
                ) : (
                    <a href={linkUrl} target="_blank" rel="noopener noreferrer">
                        {linkLabel || "Więcej"}
                    </a>
                ))}
            <button type="button" onClick={dismiss} aria-label="Zamknij ogłoszenie">
                &times;
            </button>
        </div>
    );
}
