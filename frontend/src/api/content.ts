import { useEffect, useState } from "react";
import api from "./client";

export function useContent(keys: string[]) {
    const keyList = keys.join(",");
    const [content, setContent] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        api.get("/content", { params: { keys: keyList } })
            .then(({ data }) => {
                if (!cancelled) setContent(data.content);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            });
        return () => {
            cancelled = true;
        };
    }, [keyList]);

    return { content, error };
}
