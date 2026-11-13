import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

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
    // Callers often pass a fresh inline function on every render (e.g. while typing).
    // Setting up the dialog again for that would pull the focus back to the first field.
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        const firstField = panelRef.current?.querySelector<HTMLElement>(
            "textarea, input, select, button:not(.admin-dialog-close)",
        );
        (firstField || panelRef.current)?.focus();

        function onKey(event: KeyboardEvent) {
            if (event.key === "Escape") onCloseRef.current();
        }
        document.addEventListener("keydown", onKey);
        document.body.classList.add("is-dialog-open");
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.classList.remove("is-dialog-open");
            opener?.focus?.();
        };
    }, []);

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
