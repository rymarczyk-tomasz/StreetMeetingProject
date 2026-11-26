// Last CMS content seen in this browser, shown at once on the next visit while the api answers,
// so a reload doesn't flash the built-in defaults (old hero photo, default texts).
const PREFIX = "ss-content:v1:";

export function readCachedContent(keyList: string) {
    try {
        const raw = localStorage.getItem(PREFIX + keyList);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
        return null;
    }
}

export function writeCachedContent(keyList: string, content) {
    try {
        localStorage.setItem(PREFIX + keyList, JSON.stringify(content));
    } catch {
        // private mode or full storage: the page just loads without the shortcut
    }
}
