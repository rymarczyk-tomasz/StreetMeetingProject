import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import { withStepUp } from "../../api/stepUp";
import { errorMessage } from "./shared";

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
            // payment details in Ustawienia need the password and a code again
            const { data } = await withStepUp((stepUp) =>
                api.patch(`/admin/content/${key}`, { content: nextContent || content, stepUp }),
            );
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
            const { data } = await withStepUp((stepUp) =>
                api.post(`/admin/content/${key}/revisions/${revisionId}/restore`, { stepUp }),
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
