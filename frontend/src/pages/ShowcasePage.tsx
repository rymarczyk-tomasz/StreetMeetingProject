import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import Lightbox from "../components/Lightbox";
import { plural } from "../utils/plural";

// Public list of approved Select cars (only owners who agreed to photo publishing;
// switched on in Admin → Ustawienia). Brand and photos only.
export default function ShowcasePage() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    const [lightbox, setLightbox] = useState({ photos: [], index: null });

    useEffect(() => {
        api.get("/showcase")
            .then(({ data: response }) => setData(response))
            .catch(() => setError(true));
    }, []);

    let body;
    if (error) {
        body = <p className="text-center">Lista aut jest chwilowo niedostępna. Spróbuj ponownie za chwilę.</p>;
    } else if (!data) {
        body = <p className="page-status">Ładowanie...</p>;
    } else if (!data.enabled || !data.cars.length) {
        body = (
            <p className="text-center">
                Lista aut strefy Select pojawi się, gdy organizator zakwalifikuje zgłoszenia.{" "}
                <Link to="/">Wróć na stronę główną</Link>
            </p>
        );
    } else {
        body = (
            <>
                <p className="text-center">
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
                                        alt: `${car.carBrand} – zdjęcie ${index + 1}`,
                                    })),
                                    index: 0,
                                })
                            }
                            aria-label={`${car.carBrand} — pokaż zdjęcia`}
                        >
                            {car.photos[0] ? (
                                <img src={car.photos[0].thumb} alt="" loading="lazy" />
                            ) : (
                                <span className="album-card-placeholder" />
                            )}
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
        <div className="container my-5 gallery-page">
            <h1 className="text-center mb-4">Auta strefy Select{data?.edition ? ` ${data.edition}` : ""}</h1>
            {body}
            <Lightbox
                photos={lightbox.photos}
                index={lightbox.index}
                onIndexChange={(index) => setLightbox((current) => ({ ...current, index }))}
                label="Zdjęcia auta"
            />
        </div>
    );
}
