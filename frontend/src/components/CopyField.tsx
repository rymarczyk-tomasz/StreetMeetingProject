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

// "Label: value [Kopiuj]" — used for bank transfer details.
export default function CopyField({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);

    if (!value) return null;

    return (
        <div className="copy-field">
            <dt>{label}</dt>
            <dd>
                <span>{value}</span>
                <button
                    type="button"
                    className="button-secondary"
                    onClick={async () => {
                        if (await copyText(value)) {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                        }
                    }}
                >
                    {copied ? "Skopiowano" : "Kopiuj"}
                </button>
            </dd>
        </div>
    );
}
