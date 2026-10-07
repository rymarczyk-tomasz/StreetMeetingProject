import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client";
import Lightbox from "../components/Lightbox";
import PageHeader from "../components/PageHeader";
import { photosLabel } from "../utils/plural";

function AlbumSkeleton() {
    return (
        <div className="album-grid" aria-hidden="true">
            {[0, 1, 2].map((key) => (
                <div className="album-card is-skeleton" key={key}>
                    <span className="album-card-cover skeleton" />
                    <span className="skeleton skeleton-line" />
                </div>
            ))}
        </div>
    );
}

function AlbumList() {
    const [albums, setAlbums] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        api.get("/gallery/albums")
            .then(({ data }) => setAlbums(data.albums))
            .catch(() => setError(true));
    }, []);

    if (error) {
        return <p className="page-status">Galeria jest chwilowo niedostępna. Spróbuj ponownie za chwilę.</p>;
    }
    if (!albums) {
        return (
            <>
                <p className="visually-hidden" role="status">
                    Ładowanie galerii...
                </p>
                <AlbumSkeleton />
            </>
        );
    }
    if (!albums.length) return <p className="page-status">Zdjęcia pojawią się wkrótce.</p>;

    return (
        <div className="album-grid">
            {albums.map((album, index) => (
                <Link key={album.id} to={`/galeria/${album.id}`} className="album-card">
                    <span className="album-card-cover">
                        {album.coverUrl ? (
                            <img src={album.coverUrl} alt="" loading="lazy" />
                        ) : (
                            <span className="album-card-placeholder" />
                        )}
                        {index === 0 && <span className="badge-new">Najnowszy</span>}
                    </span>
                    <span className="album-card-body">
                        <strong>{album.title}</strong>
                        <small>{photosLabel(album.photoCount)}</small>
                    </span>
                </Link>
            ))}
        </div>
    );
}

function AlbumView({ albumId }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    useEffect(() => {
        api.get(`/gallery/albums/${albumId}`)
            .then(({ data: response }) => setData(response))
            .catch(() => setError(true));
    }, [albumId]);

    if (error) {
        return (
            <section className="page-section">
                <div className="site-container">
                    <p className="page-status">Nie znaleziono albumu.</p>
                    <Link to="/galeria" className="back-link">
                        ← Wszystkie albumy
                    </Link>
                </div>
            </section>
        );
    }
    if (!data) return <p className="page-status">Ładowanie zdjęć...</p>;

    const { album, photos } = data;

    return (
        <section className="page-section album-view">
            <div className="site-container">
                <Link to="/galeria" className="back-link">
                    ← Wszystkie albumy
                </Link>
                <div className="album-view-head">
                    <h1>{album.title}</h1>
                    <p>{photosLabel(photos.length)}</p>
                </div>
                {album.description && <p className="section-lead album-view-lead">{album.description}</p>}
                <div className="photo-grid">
                    {photos.map((photo, index) => (
                        <button
                            key={photo.id}
                            type="button"
                            className="photo-grid-item"
                            onClick={() => setActiveIndex(index)}
                            aria-label={`Powiększ zdjęcie ${index + 1}`}
                        >
                            <img
                                loading="lazy"
                                src={photo.thumb}
                                alt={`${album.title} – zdjęcie ${index + 1}`}
                            />
                        </button>
                    ))}
                </div>
            </div>
            <Lightbox
                photos={photos.map((photo, index) => ({
                    src: photo.full,
                    thumb: photo.thumb,
                    alt: `${album.title} – zdjęcie ${index + 1} z ${photos.length}`,
                }))}
                index={activeIndex}
                onIndexChange={setActiveIndex}
                title={album.title}
                label={`Galeria ${album.title}`}
            />
        </section>
    );
}

export default function GalleryPage() {
    const { albumId } = useParams();

    if (albumId) return <AlbumView albumId={albumId} />;

    return (
        <>
            <PageHeader
                eyebrow="Zdjęcia z wydarzeń"
                title="Galeria"
                lead="Każda edycja to osobny album. Zdjęcia dodajemy kilka dni po wydarzeniu."
            />
            <section className="page-section">
                <div className="site-container">
                    <AlbumList />
                </div>
            </section>
        </>
    );
}
