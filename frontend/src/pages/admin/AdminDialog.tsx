import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

// Modal window for admin forms (group e-mail, bulk decision). Esc / × / backdrop close it;
// focus moves inside and returns to the opener afterwards.
export default function AdminDialog({
    title,
    onClose,
    children,
    wide = false,
}: {
    title: string;
    onClose: () => void;
    children: ReactNode;
    wide?: boolean;
}) {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        const firstField = panelRef.current?.querySelector<HTMLElement>(
            "textarea, input, select, button:not(.admin-dialog-close)",
        );
        (firstField || panelRef.current)?.focus();

        function onKey(event: KeyboardEvent) {
            if (event.key === "Escape") onClose();
        }
        document.addEventListener("keydown", onKey);
        document.body.classList.add("is-dialog-open");
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.classList.remove("is-dialog-open");
            opener?.focus?.();
        };
    }, [onClose]);

    return (
        <div className="admin-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <div
                ref={panelRef}
                className={`admin-dialog${wide ? " is-wide" : ""}`}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
            >
                <div className="admin-dialog-head">
                    <h3>{title}</h3>
                    <button type="button" className="admin-dialog-close" aria-label="Zamknij" onClick={onClose}>
                        <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                </div>
                <div className="admin-dialog-body">{children}</div>
            </div>
        </div>
    );
}
