import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import Lightbox from "../components/Lightbox";
import PageHeader from "../components/PageHeader";
import { plural } from "../utils/plural";

export default function ShowcasePage() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    const [lightbox, setLightbox] = useState({ photos: [], index: null, title: "" });

    useEffect(() => {
        api.get("/showcase")
            .then(({ data: response }) => setData(response))
            .catch(() => setError(true));
    }, []);

    let body;
    if (error) {
        body = <p className="page-status">Lista aut jest chwilowo niedostępna. Spróbuj ponownie za chwilę.</p>;
    } else if (!data) {
        body = <p className="page-status">Ładowanie...</p>;
    } else if (!data.enabled || !data.cars.length) {
        body = (
            <p className="page-status">
                Lista aut strefy Select pojawi się, gdy organizator zakwalifikuje zgłoszenia.{" "}
                <Link to="/">Wróć na stronę główną</Link>
            </p>
        );
    } else {
        body = (
            <>
                <p className="section-lead showcase-lead">
                    {plural(data.cars.length, "zakwalifikowane auto", "zakwalifikowane auta", "zakwalifikowanych aut")}{" "}
                    (pokazujemy tylko auta, których właściciele zgodzili się na publikację zdjęć).
                </p>
                <div className="album-grid">
                    {data.cars.map((car) => (
                        <button
                            key={car.id}
                            type="button"
                            className="album-card showcase-card"
                            onClick={() =>
                                setLightbox({
                                    photos: car.photos.map((photo, index) => ({
                                        src: photo.full,
                                        thumb: photo.thumb,
                                        alt: `${car.carBrand} – zdjęcie ${index + 1}`,
                                    })),
                                    index: 0,
                                    title: car.carBrand,
                                })
                            }
                            aria-label={`${car.carBrand} — pokaż zdjęcia`}
                        >
                            <span className="album-card-cover">
                                {car.photos[0] ? (
                                    <img src={car.photos[0].thumb} alt="" loading="lazy" />
                                ) : (
                                    <span className="album-card-placeholder" />
                                )}
                            </span>
                            <span className="album-card-body">
                                <strong>{car.carBrand}</strong>
                                {car.photos.length > 1 && (
                                    <small>{plural(car.photos.length, "zdjęcie", "zdjęcia", "zdjęć")}</small>
                                )}
                            </span>
                        </button>
                    ))}
                </div>
            </>
        );
    }

    return (
        <>
            <PageHeader
                eyebrow="Strefa Select"
                title={`Auta strefy Select${data?.edition ? ` ${data.edition}` : ""}`}
            />
            <section className="page-section">
                <div className="site-container">{body}</div>
            </section>
            <Lightbox
                photos={lightbox.photos}
                index={lightbox.index}
                onIndexChange={(index) => setLightbox((current) => ({ ...current, index }))}
                title={lightbox.title}
                label="Zdjęcia auta"
            />
        </>
    );
}
