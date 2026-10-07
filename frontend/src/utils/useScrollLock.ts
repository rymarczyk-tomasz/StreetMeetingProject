import { useEffect } from "react";

// Locks page scroll while `active` (mobile menu, lightbox). overflow: hidden alone
// doesn't stop the page behind from scrolling on older iOS, so the body is pinned
// with position: fixed at the current offset and the scroll position restored after.
// A counter keeps nested locks (e.g. lightbox over a dialog) from undoing each other.
let locks = 0;
let savedScrollY = 0;
let savedStyle = "";

export function useScrollLock(active: boolean) {
    useEffect(() => {
        if (!active) return;
        const { body } = document;
        if (locks === 0) {
            savedScrollY = window.scrollY;
            savedStyle = body.getAttribute("style") || "";
            Object.assign(body.style, {
                position: "fixed",
                top: `-${savedScrollY}px`,
                left: "0",
                right: "0",
                overflow: "hidden",
            });
        }
        locks += 1;

        return () => {
            locks -= 1;
            if (locks > 0) return;
            if (savedStyle) body.setAttribute("style", savedStyle);
            else body.removeAttribute("style");
            window.scrollTo(0, savedScrollY);
        };
    }, [active]);
}
