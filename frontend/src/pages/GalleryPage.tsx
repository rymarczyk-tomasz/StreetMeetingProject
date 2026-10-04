import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client";
import Lightbox from "../components/Lightbox";
import { photosLabel } from "../utils/plural";

function AlbumList() {
    const [albums, setAlbums] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        api.get("/gallery/albums")
            .then(({ data }) => setAlbums(data.albums))
            .catch(() => setError(true));
    }, []);

    if (error) {
        return (
            <p className="text-center">
                Galeria jest chwilowo niedostępna. Spróbuj ponownie za chwilę.
            </p>
        );
    }
    if (!albums) return <p className="page-status">Ładowanie galerii...</p>;
    if (!albums.length) {
        return <p className="text-center">Zdjęcia pojawią się wkrótce.</p>;
    }

    return (
        <div className="album-grid">
            {albums.map((album) => (
                <Link
                    key={album.id}
                    to={`/galeria/${album.id}`}
                    className="album-card"
                >
                    {album.coverUrl ? (
                        <img src={album.coverUrl} alt="" loading="lazy" />
                    ) : (
                        <span className="album-card-placeholder" />
                    )}
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
            <div className="text-center">
                <p>Nie znaleziono albumu.</p>
                <Link to="/galeria">Wróć do galerii</Link>
            </div>
        );
    }
    if (!data) return <p className="page-status">Ładowanie zdjęć...</p>;

    const { album, photos } = data;

    return (
        <>
            <div className="album-header">
                <Link to="/galeria" className="album-back">
                    ← Wszystkie albumy
                </Link>
                <h2>{album.title}</h2>
                {album.description && <p>{album.description}</p>}
            </div>
            <div className="gallery container">
                {photos.map((photo, index) => (
                    <button
                        key={photo.id}
                        type="button"
                        className="gallery-thumb-button"
                        onClick={() => setActiveIndex(index)}
                        aria-label={`Powiększ zdjęcie ${index + 1}`}
                    >
                        <img
                            loading="lazy"
                            src={photo.thumb}
                            width={photo.width ? 480 : undefined}
                            height={
                                photo.width
                                    ? Math.round((480 * photo.height) / photo.width)
                                    : undefined
                            }
                            alt={`${album.title} – zdjęcie ${index + 1}`}
                            className="gallery-thumb"
                        />
                    </button>
                ))}
            </div>
            <Lightbox
                photos={photos.map((photo, index) => ({
                    src: photo.full,
                    alt: `${album.title} – zdjęcie ${index + 1} z ${photos.length}`,
                }))}
                index={activeIndex}
                onIndexChange={setActiveIndex}
                label={`Galeria ${album.title}`}
            />
        </>
    );
}

export default function GalleryPage() {
    const { albumId } = useParams();

    return (
        <div className="container my-5 gallery-page">
            <h1 className="text-center mb-4">Galeria</h1>
            {albumId ? <AlbumView albumId={albumId} /> : <AlbumList />}
        </div>
    );
}
