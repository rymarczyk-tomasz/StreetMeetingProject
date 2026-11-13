import { useEffect, useState } from "react";
import api from "../../api/client";
import { askConfirm } from "../../api/confirm";
import { formatDate } from "./shared";

function RevisionHistory({ editor }) {
    const [isOpen, setIsOpen] = useState(false);
    const [revisions, setRevisions] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        api.get(`/admin/content/${editor.key}/revisions`)
            .then(({ data }) => setRevisions(data.revisions))
            .catch(() => setRevisions([]));
    }, [isOpen, editor.key, editor.savedCount]);

    return (
        <details
            className="revision-history"
            onToggle={(event) =>
                setIsOpen((event.target as HTMLDetailsElement).open)
            }
        >
            <summary>Historia zmian</summary>
            {!revisions ? (
                <p className="page-status">Ładowanie...</p>
            ) : revisions.length === 0 ? (
                <p className="admin-hint">
                    Brak zapisanych wersji — pierwsza pojawi się po zapisaniu
                    zmian.
                </p>
            ) : (
                <ul>
                    {revisions.map((revision, index) => (
                        <li key={revision.id}>
                            <span>
                                {formatDate(revision.createdAt)}
                                {revision.adminEmail &&
                                    ` — ${revision.adminEmail}`}
                                {index === 0 && " (aktualna)"}
                            </span>
                            {index > 0 && (
                                <button
                                    type="button"
                                    className="button-secondary"
                                    onClick={async () => {
                                        const confirmed = await askConfirm({
                                            title: "Przywrócić tę wersję?",
                                            message: `Obecna treść zostanie zastąpiona wersją z ${formatDate(revision.createdAt)} (i też trafi do historii).`,
                                            confirmLabel: "Przywróć",
                                        });
                                        if (confirmed) editor.restore(revision.id);
                                    }}
                                >
                                    Przywróć
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </details>
    );
}

function LastChange({ editor }) {
    const [last, setLast] = useState(null);

    useEffect(() => {
        api.get(`/admin/content/${editor.key}/revisions`)
            .then(({ data }) => setLast(data.revisions?.[0] || null))
            .catch(() => setLast(null));
    }, [editor.key, editor.savedCount]);

    if (!last) return null;
    return (
        <span className="admin-last-change">
            Ostatnia zmiana: {last.adminEmail ? `${last.adminEmail}, ` : ""}
            {formatDate(last.createdAt)}
        </span>
    );
}

export function ContentForm({ editor, saveLabel = "Zapisz zmiany", showSave = true, children }) {
    if (!editor.content) {
        return editor.error ? (
            <p className="form-error">{editor.error}</p>
        ) : (
            <p className="page-status">Ładowanie treści...</p>
        );
    }

    return (
        <form
            className="event-editor"
            onSubmit={showSave ? editor.save : (event) => event.preventDefault()}
        >
            {children}
            {editor.error && (
                <p className="form-error" role="alert">
                    {editor.error}
                </p>
            )}
            {editor.message && (
                <p className="form-success" role="status">
                    {editor.message}
                </p>
            )}
            <div className="admin-form-footer">
                {showSave && (
                    <button
                        type="submit"
                        className="btn-street btn-street-primary btn-street-lg"
                        disabled={editor.isSaving}
                    >
                        {editor.isSaving ? "Zapisywanie..." : saveLabel}
                    </button>
                )}
                <LastChange editor={editor} />
            </div>
            <RevisionHistory editor={editor} />
        </form>
    );
}
