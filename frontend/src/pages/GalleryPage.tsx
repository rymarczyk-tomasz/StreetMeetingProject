import { useCallback, useEffect, useRef, useState } from "react";

const FALLBACK_PHOTOS = Array.from({ length: 13 }, (_, i) => ({
    name: `${i + 1}.webp`,
    src: `/img/gallery/${i + 1}.webp`,
    modalSrc: `/img/gallery/${i + 1}.webp`,
}));

function normalizeEntries(files) {
    return files.map((entry, index) => {
        if (typeof entry === "string") {
            return {
                name: entry,
                src: `/img/gallery/${entry}`,
                modalSrc: `/img/gallery/${entry}`,
            };
        }
        return {
            name: entry.name || `zdjecie-${index + 1}`,
            src: entry.src,
            modalSrc: entry.modalSrc || entry.src,
            srcSet: entry.srcset,
        };
    });
}

export default function GalleryPage() {
    const [photos, setPhotos] = useState([]);
    const [activeIndex, setActiveIndex] = useState(null);
    const touchStartX = useRef(0);

    useEffect(() => {
        let cancelled = false;

        async function loadGallery() {
            try {
                const response = await fetch(
                    `/img/gallery/manifest.json?t=${Date.now()}`,
                    { cache: "no-store" },
                );
                if (!response.ok) throw new Error("manifest fetch failed");
                const manifest = await response.json();
                const files = Array.isArray(manifest?.files)
                    ? manifest.files
                    : null;
                if (!cancelled) {
                    setPhotos(
                        files?.length
                            ? normalizeEntries(files)
                            : FALLBACK_PHOTOS,
                    );
                }
            } catch {
                if (!cancelled) setPhotos(FALLBACK_PHOTOS);
            }
        }

        loadGallery();
        return () => {
            cancelled = true;
        };
    }, []);

    const closeModal = useCallback(() => setActiveIndex(null), []);
    const showNext = useCallback(
        () => setActiveIndex((i) => (i === null ? i : (i + 1) % photos.length)),
        [photos.length],
    );
    const showPrev = useCallback(
        () =>
            setActiveIndex((i) =>
                i === null ? i : (i - 1 + photos.length) % photos.length,
            ),
        [photos.length],
    );

    useEffect(() => {
        if (activeIndex === null) return;
        document.body.style.overflow = "hidden";

        function handleKeydown(e) {
            if (e.key === "ArrowRight") showNext();
            if (e.key === "ArrowLeft") showPrev();
            if (e.key === "Escape") closeModal();
        }

        window.addEventListener("keydown", handleKeydown);
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleKeydown);
        };
    }, [activeIndex, showNext, showPrev, closeModal]);

    function handleTouchStart(e) {
        touchStartX.current = e.changedTouches[0].screenX;
    }

    function handleTouchEnd(e) {
        const delta = touchStartX.current - e.changedTouches[0].screenX;
        if (delta > 50) showNext();
        else if (delta < -50) showPrev();
    }

    const activePhoto = activeIndex !== null ? photos[activeIndex] : null;

    return (
        <>
            <div className="gallery container">
                {photos.map((photo, index) => (
                    <picture key={photo.name + index}>
                        <button
                            type="button"
                            className="gallery-thumb-button"
                            onClick={() => setActiveIndex(index)}
                            aria-label={`Powiększ zdjęcie ${index + 1}`}
                        >
                            <img
                                loading="lazy"
                                src={photo.src}
                                srcSet={photo.srcSet}
                                sizes={
                                    photo.srcSet
                                        ? "(max-width: 768px) 100vw, 33vw"
                                        : undefined
                                }
                                alt={`Zdjęcie z galerii Street Show ${index + 1}`}
                                className="gallery-thumb"
                            />
                        </button>
                    </picture>
                ))}
            </div>

            {activePhoto && (
                <div
                    id="imageModal"
                    className="modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Podgląd zdjęcia galerii"
                    style={{ display: "block" }}
                    onClick={(e) => {
                        if (e.target.id === "imageModal") closeModal();
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <button
                        type="button"
                        className="close"
                        aria-label="Zamknij galerię"
                        onClick={closeModal}
                    >
                        &times;
                    </button>
                    <img
                        className="modal-image"
                        src={activePhoto.modalSrc}
                        alt={`Powiększone zdjęcie ${activeIndex + 1} z ${photos.length}`}
                    />
                    <p className="lightbox-counter" aria-live="polite">
                        {activeIndex + 1} / {photos.length}
                    </p>
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
                </div>
            )}
        </>
    );
}
