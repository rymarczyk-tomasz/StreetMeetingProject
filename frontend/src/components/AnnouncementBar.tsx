import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useContent } from "../api/content";
import { useAuth } from "../context/AuthContext";

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

const HIDDEN_ON = ["/admin", "/wjazd"];

export default function AnnouncementBar() {
    const { content } = useContent(CONTENT_KEYS);
    const { user } = useAuth();
    const { pathname } = useLocation();
    const [dismissed, setDismissed] = useState(readDismissed);
    const announcement = content?.announcement;
    const text = (user && announcement?.loggedInText) || announcement?.text;

    if (
        !announcement?.enabled ||
        !text ||
        HIDDEN_ON.some((prefix) => pathname.startsWith(prefix)) ||
        isExpired(announcement.expiresAt) ||
        dismissed === text
    ) {
        return null;
    }

    function dismiss() {
        setDismissed(text);
        try {
            localStorage.setItem(DISMISS_KEY, text);
        } catch {
            // Storage unavailable (private mode): hide for this page view only.
        }
    }

    const linkUrl = user ? announcement.loggedInLinkUrl : announcement.linkUrl;
    const linkLabel = user ? announcement.loggedInLinkLabel : announcement.linkLabel;

    return (
        <div
            className={`announcement-bar${announcement.variant === "warning" ? " is-warning" : ""}`}
            role="status"
        >
            <span>{text}</span>
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
