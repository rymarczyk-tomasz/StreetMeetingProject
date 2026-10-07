import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import { errorMessage, formatDate } from "./shared";

// Load / save / restore one CMS section (GET/PATCH /admin/content/:key).
// `version` changes whenever content is replaced from the server, so rich text
// editors can be remounted with key={version}.
export function useContentEditor(key: string, onAction: () => void) {
    const [content, setContent] = useState(null);
    const [version, setVersion] = useState(0);
    const [savedCount, setSavedCount] = useState(0);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const replaceContent = useCallback((next) => {
        setContent(next);
        setVersion((value) => value + 1);
    }, []);

    useEffect(() => {
        api.get(`/admin/content/${key}`)
            .then(({ data }) => replaceContent(data.content))
            .catch((err) =>
                setError(errorMessage(err, "Nie udało się pobrać treści.")),
            );
    }, [key, replaceContent]);

    // `nextContent` saves that version instead of the form state (editors that
    // save one list row at a time). Resolves to true when saved.
    async function save(event?, nextContent = null) {
        event?.preventDefault();
        setIsSaving(true);
        setError("");
        setMessage("");
        try {
            const { data } = await api.patch(`/admin/content/${key}`, {
                content: nextContent || content,
            });
            setContent(data.content);
            setSavedCount((value) => value + 1);
            setMessage("Zmiany zostały zapisane i są już widoczne na stronie.");
            onAction();
            return true;
        } catch (err) {
            setError(errorMessage(err, "Nie udało się zapisać zmian."));
            return false;
        } finally {
            setIsSaving(false);
        }
    }

    async function restore(revisionId) {
        setError("");
        setMessage("");
        try {
            const { data } = await api.post(
                `/admin/content/${key}/revisions/${revisionId}/restore`,
            );
            replaceContent(data.content);
            setSavedCount((value) => value + 1);
            setMessage("Przywrócono wybraną wersję.");
            onAction();
        } catch (err) {
            setError(errorMessage(err, "Nie udało się przywrócić wersji."));
        }
    }

    function update(patch) {
        setContent((current) => ({ ...current, ...patch }));
    }

    return {
        key,
        content,
        setContent,
        update,
        version,
        savedCount,
        error,
        message,
        isSaving,
        save,
        restore,
    };
}

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
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                "Przywrócić tę wersję? Obecna treść zostanie zastąpiona (i też trafi do historii).",
                                            )
                                        ) {
                                            editor.restore(revision.id);
                                        }
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

// "Ostatnia zmiana: admin, date" next to the save button.
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

// Form shell shared by all section editors: messages, save button, history.
// `showSave={false}` for editors that save from their own buttons.
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
