import { useCallback, useEffect, useRef } from "react";
import { useScrollLock } from "../utils/useScrollLock";

type LightboxPhoto = { src: string; thumb?: string; alt?: string };

type LightboxProps = {
    photos: LightboxPhoto[];
    index: number | null;
    onIndexChange: (index: number | null) => void;
    label?: string;
    // Shown in the top bar (album name).
    title?: string;
};

// How many thumbnails the strip shows around the current photo.
const THUMB_WINDOW = 9;

// Full-screen photo viewer with keyboard (←/→/Esc) and swipe navigation.
// Styles: .lightbox-* in public/css/custom.css.
export default function Lightbox({
    photos,
    index,
    onIndexChange,
    label = "Podgląd zdjęcia",
    title = "",
}: LightboxProps) {
    const touchStartX = useRef(0);
    const closeRef = useRef<HTMLButtonElement>(null);
    const count = photos.length;

    const close = useCallback(() => onIndexChange(null), [onIndexChange]);
    const showNext = useCallback(
        () => index !== null && onIndexChange((index + 1) % count),
        [index, count, onIndexChange],
    );
    const showPrev = useCallback(
        () => index !== null && onIndexChange((index - 1 + count) % count),
        [index, count, onIndexChange],
    );

    const isOpen = index !== null;

    useScrollLock(isOpen);
    useEffect(() => {
        if (!isOpen) return;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        closeRef.current?.focus();
        return () => previouslyFocused?.focus?.();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        function handleKeydown(event) {
            if (event.key === "ArrowRight") showNext();
            if (event.key === "ArrowLeft") showPrev();
            if (event.key === "Escape") close();
        }

        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [isOpen, showNext, showPrev, close]);

    if (index === null || !photos[index]) return null;
    const photo = photos[index];

    const hasThumbs = count > 1 && photos.every((item) => item.thumb);
    const windowStart = Math.max(0, Math.min(index - Math.floor(THUMB_WINDOW / 2), count - THUMB_WINDOW));
    const thumbs = hasThumbs ? photos.slice(windowStart, windowStart + THUMB_WINDOW) : [];

    return (
        <div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onTouchStart={(event) => {
                touchStartX.current = event.changedTouches[0].screenX;
            }}
            onTouchEnd={(event) => {
                const delta = touchStartX.current - event.changedTouches[0].screenX;
                if (delta > 50) showNext();
                else if (delta < -50) showPrev();
            }}
        >
            <div className="lightbox-top">
                <p className="lightbox-title">{title}</p>
                <div className="lightbox-top-right">
                    <p className="lightbox-counter" aria-live="polite">
                        {index + 1} / {count}
                    </p>
                    <button
                        ref={closeRef}
                        type="button"
                        className="lightbox-button lightbox-close"
                        aria-label="Zamknij podgląd"
                        onClick={close}
                    >
                        <i className="bi bi-x" aria-hidden="true" />
                    </button>
                </div>
            </div>
            <div
                className="lightbox-stage"
                onClick={(event) => {
                    if (event.target === event.currentTarget) close();
                }}
            >
                {count > 1 && (
                    <button
                        type="button"
                        className="lightbox-button lightbox-arrow"
                        aria-label="Poprzednie zdjęcie"
                        onClick={showPrev}
                    >
                        <i className="bi bi-chevron-left" aria-hidden="true" />
                    </button>
                )}
                <img
                    className="lightbox-image"
                    src={photo.src}
                    alt={photo.alt || `Zdjęcie ${index + 1} z ${count}`}
                />
                {count > 1 && (
                    <button
                        type="button"
                        className="lightbox-button lightbox-arrow is-next"
                        aria-label="Następne zdjęcie"
                        onClick={showNext}
                    >
                        <i className="bi bi-chevron-right" aria-hidden="true" />
                    </button>
                )}
            </div>
            {thumbs.length > 0 && (
                <div className="lightbox-thumbs">
                    {thumbs.map((item, offset) => {
                        const thumbIndex = windowStart + offset;
                        return (
                            <button
                                key={thumbIndex}
                                type="button"
                                className={thumbIndex === index ? "is-active" : ""}
                                aria-label={`Zdjęcie ${thumbIndex + 1}`}
                                aria-current={thumbIndex === index || undefined}
                                onClick={() => onIndexChange(thumbIndex)}
                            >
                                <img src={item.thumb} alt="" />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
