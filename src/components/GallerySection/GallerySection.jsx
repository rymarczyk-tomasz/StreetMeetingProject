import { Link } from "react-router-dom";
import Card from "../Card/Card";
import styles from "./GallerySection.module.css";

const GallerySection = () => {
    return (
        <section id="gallery" className={styles.gallery}>
            <div className="container text-center">
                <h2 className="display-3 pb-lg-3 text-uppercase">Galeria</h2>
                <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
                    <Card
                        imgSrc="/photos/Street Meeting Poland 2024-139.webp"
                        imgAlt="Grupa osób relaksujących się na krzesłach ogrodowych na trawniku na stadionie, w tle zaparkowane czarne i białe samochody sportowe.

"
                    />
                    <Card
                        imgSrc="/photos/Street Meeting Poland 2024-252.webp"
                        imgAlt="Biały samochód sportowy z otwartą maską zaparkowany przed stadionem, obok kontenera transportowego CMA CGM, w tle inne pojazdy i ludzie.

"
                    />
                    <Card
                        imgSrc="/photos/2024.03.29 Street Meeting 2-13.webp"
                        imgAlt="Rząd samochodów sportowych driftujących przed budynkiem stadionu, w tym jeden z kolorową grafiką na karoserii, z banerami i flagami w tle.

"
                    />
                </div>
            </div>
            <div className="container text-center">
                <Link to="/gallery" className={styles.galleryBtn}>
                    Przejdź do galerii
                </Link>
            </div>
        </section>
    );
};

export default GallerySection;
