import { useEffect, useState } from "react";
import api from "../api/client";
import Lightbox from "../components/Lightbox";
import PageHeader from "../components/PageHeader";
import { photosLabel } from "../utils/plural";

function PhotoSkeleton() {
    return (
        <div className="photo-grid" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((key) => (
                <span className="photo-grid-item skeleton" key={key} />
            ))}
        </div>
    );
}

// The gallery is the photos of one Google Drive folder (Admin → Galeria).
export default function GalleryPage() {
    const [photos, setPhotos] = useState(null);
    const [error, setError] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    useEffect(() => {
        api.get("/gallery")
            .then(({ data }) => setPhotos(data.photos))
            .catch(() => setError(true));
    }, []);

    let body;
    if (error) {
        body = <p className="page-status">Galeria jest chwilowo niedostępna. Spróbuj ponownie za chwilę.</p>;
    } else if (!photos) {
        body = (
            <>
                <p className="visually-hidden" role="status">
                    Ładowanie galerii...
                </p>
                <PhotoSkeleton />
            </>
        );
    } else if (!photos.length) {
        body = <p className="page-status">Zdjęcia pojawią się wkrótce.</p>;
    } else {
        body = (
            <>
                <p className="gallery-count">{photosLabel(photos.length)}</p>
                <div className="photo-grid">
                    {photos.map((photo, index) => (
                        <button
                            key={photo.id}
                            type="button"
                            className="photo-grid-item"
                            onClick={() => setActiveIndex(index)}
                            aria-label={`Powiększ zdjęcie ${index + 1}`}
                        >
                            <img loading="lazy" src={photo.thumb} alt={`Street Show – zdjęcie ${index + 1}`} />
                        </button>
                    ))}
                </div>
                <Lightbox
                    photos={photos.map((photo, index) => ({
                        src: photo.full,
                        thumb: photo.thumb,
                        alt: `Street Show – zdjęcie ${index + 1} z ${photos.length}`,
                    }))}
                    index={activeIndex}
                    onIndexChange={setActiveIndex}
                    title="Galeria"
                    label="Galeria Street Show"
                />
            </>
        );
    }

    return (
        <>
            <PageHeader
                eyebrow="Zdjęcia z wydarzenia"
                title="Galeria"
                lead="Zdjęcia dodajemy kilka dni po wydarzeniu. Kliknij zdjęcie, żeby je powiększyć."
            />
            <section className="page-section">
                <div className="site-container">{body}</div>
            </section>
        </>
    );
}
