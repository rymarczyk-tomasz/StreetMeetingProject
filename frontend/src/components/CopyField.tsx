import { useState } from "react";

async function copyText(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        // Older browsers / insecure context: fall back to a temporary textarea.
        const area = document.createElement("textarea");
        area.value = text;
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        return ok;
    }
}

export default function CopyField({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);

    if (!value) return null;

    return (
        <div className="copy-field">
            <dt>
                {label}
                <button
                    type="button"
                    className="copy-field-button"
                    aria-label={copied ? `${label}: skopiowano` : `Kopiuj: ${label}`}
                    onClick={async () => {
                        if (await copyText(value)) {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                        }
                    }}
                >
                    <i className={`bi ${copied ? "bi-check-lg" : "bi-copy"}`} aria-hidden="true" />
                </button>
            </dt>
            <dd>{value}</dd>
            <span className="visually-hidden" aria-live="polite">
                {copied ? "Skopiowano" : ""}
            </span>
        </div>
    );
}
