import { useCallback, useEffect, useRef } from "react";

type LightboxPhoto = { src: string; alt?: string };

type LightboxProps = {
    photos: LightboxPhoto[];
    index: number | null;
    onIndexChange: (index: number | null) => void;
    label?: string;
};

// Full-screen photo viewer with keyboard (←/→/Esc) and swipe navigation.
// Styles (.modal, .modal-image, .navigation…) live in public/css/custom.css.
export default function Lightbox({
    photos,
    index,
    onIndexChange,
    label = "Podgląd zdjęcia",
}: LightboxProps) {
    const touchStartX = useRef(0);
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

    useEffect(() => {
        if (index === null) return;
        document.body.style.overflow = "hidden";

        function handleKeydown(event) {
            if (event.key === "ArrowRight") showNext();
            if (event.key === "ArrowLeft") showPrev();
            if (event.key === "Escape") close();
        }

        window.addEventListener("keydown", handleKeydown);
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleKeydown);
        };
    }, [index, showNext, showPrev, close]);

    if (index === null || !photos[index]) return null;
    const photo = photos[index];

    return (
        <div
            className="modal lightbox-modal"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            style={{ display: "block" }}
            onClick={(event) => {
                if (event.target === event.currentTarget) close();
            }}
            onTouchStart={(event) => {
                touchStartX.current = event.changedTouches[0].screenX;
            }}
            onTouchEnd={(event) => {
                const delta = touchStartX.current - event.changedTouches[0].screenX;
                if (delta > 50) showNext();
                else if (delta < -50) showPrev();
            }}
        >
            <button
                type="button"
                className="close"
                aria-label="Zamknij podgląd"
                onClick={close}
            >
                &times;
            </button>
            <img
                className="modal-image"
                src={photo.src}
                alt={photo.alt || `Zdjęcie ${index + 1} z ${count}`}
            />
            <p className="lightbox-counter" aria-live="polite">
                {index + 1} / {count}
            </p>
            {count > 1 && (
                <div className="navigation">
                    <button
                        type="button"
                        className="prev"
                        aria-label="Poprzednie zdjęcie"
                        onClick={showPrev}
                    >
                        &#10094;
                    </button>
                    <button
                        type="button"
                        className="next"
                        aria-label="Następne zdjęcie"
                        onClick={showNext}
                    >
                        &#10095;
                    </button>
                </div>
            )}
        </div>
    );
}
