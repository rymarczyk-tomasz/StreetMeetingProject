import { useEffect, useState } from "react";
import api from "./client";
import { readCachedContent, writeCachedContent } from "../utils/contentCache";

// cache: start from the content last seen in this browser (pages that would otherwise flash defaults)
export function useContent(keys: string[], { cache = false } = {}) {
    const keyList = keys.join(",");
    const [content, setContent] = useState(() => (cache ? readCachedContent(keyList) : null));
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        api.get("/content", { params: { keys: keyList } })
            .then(({ data }) => {
                if (cancelled) return;
                setContent(data.content);
                if (cache) writeCachedContent(keyList, data.content);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            });
        return () => {
            cancelled = true;
        };
    }, [keyList, cache]);

    return { content, error };
}
