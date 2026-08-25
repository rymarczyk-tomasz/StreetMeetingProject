import { Link } from "react-router-dom";

export default function HomePage() {
    return (
        <>
            <header id="home" className="home">
                <div className="container-fluid h-100 d-flex flex-column justify-content-center align-items-center text-light text-center">
                    <h1 className="display-3 text-uppercase">Street Show</h1>
                    <h2 className="mb-2 text-uppercase">29 sierpnia 2026</h2>
                    <h2 className="mb-2 text-uppercase">
                        Polsat Plus Arena, Gdańsk
                    </h2>
                    <div className="hero-shadow"></div>
                </div>
            </header>

            <main>
                <section id="event" className="bg-dark text-light event py-5">
                    <div className="container text-center">
                        <h2 className="display-3 pb-lg-3 text-uppercase">
                            event
                        </h2>
                        <p className="py-3">
                            Weź udział w najbardziej unikalnym wydarzeniu
                            motoryzacyjnym w Polsce! Niezapomniane emocje,
                            wyjątkowe samochody i atmosfera, jakiej nie
                            znajdziesz nigdzie indziej.
                        </p>
                        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
                            <div className="col">
                                <article className="card h-100">
                                    <picture>
                                        <source
                                            type="image/avif"
                                            srcSet="/img/optimized/photos/10-400.avif   400w,
                                            /img/optimized/photos/10-800.avif   800w,
                                            /img/optimized/photos/10-1200.avif 1200w"
                                            sizes="(max-width:576px) 100vw, (max-width:992px) 50vw, 33vw"
                                        />
                                        <source
                                            type="image/webp"
                                            srcSet="/img/optimized/photos/10-400.webp   400w,
                                            /img/optimized/photos/10-800.webp   800w,
                                            /img/optimized/photos/10-1200.webp 1200w"
                                            sizes="(max-width:576px) 100vw, (max-width:992px) 50vw, 33vw"
                                        />
                                        <img
                                            loading="lazy"
                                            src="/img/photos/10.webp"
                                            className="card-img-top"
                                            alt="Samochody na murawie Polsat Plus Arena, Gdańsk, a na przodzie składane krzesełka z napisem street meeting"
                                        />
                                    </picture>
                                    <div className="card-body">
                                        <h3 className="card-title py-3">
                                            BILETY
                                        </h3>
                                        <p className="card-text">
                                            <strong>
                                                Zarezerwuj swoje miejsce już
                                                teraz!
                                            </strong>
                                            <br />
                                            Bilety na wydarzenie kupisz{" "}
                                            <a
                                                href="https://bkb.pl/197944-209dd"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <strong>TUTAJ</strong>
                                            </a>
                                            .
                                        </p>
                                    </div>
                                </article>
                            </div>
                            <div className="col">
                                <article className="card h-100">
                                    <picture>
                                        <source
                                            type="image/avif"
                                            srcSet="/img/optimized/photos/6-400.avif   400w,
                                            /img/optimized/photos/6-800.avif   800w,
                                            /img/optimized/photos/6-1200.avif 1200w"
                                            sizes="(max-width:576px) 100vw, (max-width:992px) 50vw, 33vw"
                                        />
                                        <source
                                            type="image/webp"
                                            srcSet="/img/optimized/photos/6-400.webp   400w,
                                            /img/optimized/photos/6-800.webp   800w,
                                            /img/optimized/photos/6-1200.webp 1200w"
                                            sizes="(max-width:576px) 100vw, (max-width:992px) 50vw, 33vw"
                                        />
                                        <img
                                            loading="lazy"
                                            src="/img/photos/6.webp"
                                            className="card-img-top"
                                            alt="Czarno-biały Nissan na wydarzeniu Street Show"
                                        />
                                    </picture>
                                    <div className="card-body">
                                        <h3 className="card-title py-3">
                                            STREFA POJAZDÓW SELECT
                                        </h3>
                                        <p className="card-text">
                                            <strong>
                                                Pokaż swój wyjątkowy pojazd!
                                            </strong>
                                            <br />
                                            Masz unikalne auto? Nie przegap
                                            szansy na jego prezentację{" "}
                                            <strong>
                                                na murawie stadionu
                                            </strong>{" "}
                                            w strefie <strong>Select</strong>!
                                        </p>
                                    </div>
                                </article>
                            </div>
                            <div className="col">
                                <article className="card h-100">
                                    <picture>
                                        <source
                                            type="image/avif"
                                            srcSet="/img/optimized/photos/7-400.avif   400w,
                                            /img/optimized/photos/7-800.avif   800w,
                                            /img/optimized/photos/7-1200.avif 1200w"
                                            sizes="(max-width:576px) 100vw, (max-width:992px) 50vw, 33vw"
                                        />
                                        <source
                                            type="image/webp"
                                            srcSet="/img/optimized/photos/7-400.webp   400w,
                                            /img/optimized/photos/7-800.webp   800w,
                                            /img/optimized/photos/7-1200.webp 1200w"
                                            sizes="(max-width:576px) 100vw, (max-width:992px) 50vw, 33vw"
                                        />
                                        <img
                                            loading="lazy"
                                            src="/img/photos/7.webp"
                                            className="card-img-top"
                                            alt="Trzy driftujące samochody podczas pokazu"
                                        />
                                    </picture>
                                    <div className="card-body">
                                        <h3 className="card-title py-3">
                                            DRIFT TAXI ORAZ STREFA EXPO
                                        </h3>
                                        <p className="card-text">
                                            Doświadcz prawdziwych
                                            motoryzacyjnych emocji! Widowiskowe
                                            pokazy driftu, przejażdżki na fotelu
                                            pasażera i adrenalina na najwyższym
                                            poziomie! W specjalnej strefie expo
                                            czekają na Ciebie najnowsze trendy
                                            motoryzacyjne oraz renomowane marki
                                            z Polski i Europy.
                                        </p>
                                    </div>
                                </article>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="gallery" className="bg-light text-dark py-5">
                    <div className="container text-center">
                        <h2 className="display-3 pb-lg-3 text-uppercase">
                            Galeria
                        </h2>
                        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
                            <div className="col">
                                <article className="card h-100">
                                    <picture>
                                        <source
                                            type="image/avif"
                                            srcSet="/img/optimized/photos/Street%20Meeting%20Poland%202024-139-400.avif   400w,
                                            /img/optimized/photos/Street%20Meeting%20Poland%202024-139-800.avif   800w,
                                            /img/optimized/photos/Street%20Meeting%20Poland%202024-139-1200.avif 1200w"
                                            sizes="(max-width:576px) 100vw, (max-width:992px) 50vw, 33vw"
                                        />
                                        <source
                                            type="image/webp"
                                            srcSet="/img/optimized/photos/Street%20Meeting%20Poland%202024-139-400.webp   400w,
                                            /img/optimized/photos/Street%20Meeting%20Poland%202024-139-800.webp   800w,
                                            /img/optimized/photos/Street%20Meeting%20Poland%202024-139-1200.webp 1200w"
                                            sizes="(max-width:576px) 100vw, (max-width:992px) 50vw, 33vw"
                                        />
                                        <img
                                            loading="lazy"
                                            src="/img/photos/Street Meeting Poland 2024-139.webp"
                                            className="card-img-top"
                                            alt="Samochód wystawowy na Street Show 2024"
                                        />
                                    </picture>
                                </article>
                            </div>
                            <div className="col">
                                <article className="card h-100">
                                    <picture>
                                        <source
                                            type="image/avif"
                                            srcSet="/img/optimized/photos/Street%20Meeting%20Poland%202024-252-400.avif   400w,
                                            /img/optimized/photos/Street%20Meeting%20Poland%202024-252-800.avif   800w,
                                            /img/optimized/photos/Street%20Meeting%20Poland%202024-252-1200.avif 1200w"
                                            sizes="(max-width:576px) 100vw, (max-width:992px) 50vw, 33vw"
                                        />
                                        <source
                                            type="image/webp"
                                            srcSet="/img/optimized/photos/Street%20Meeting%20Poland%202024-252-400.webp   400w,
                                            /img/optimized/photos/Street%20Meeting%20Poland%202024-252-800.webp   800w,
                                            /img/optimized/photos/Street%20Meeting%20Poland%202024-252-1200.webp 1200w"
                                            sizes="(max-width:576px) 100vw, (max-width:992px) 50vw, 33vw"
                                        />
                                        <img
                                            loading="lazy"
                                            src="/img/photos/Street Meeting Poland 2024-252.webp"
                                            className="card-img-top"
                                            alt="Widok z wydarzenia Street Meeting Poland 2024"
                                        />
                                    </picture>
                                </article>
                            </div>
                            <div className="col">
                                <article className="card h-100">
                                    <picture>
                                        <source
                                            type="image/avif"
                                            srcSet="/img/optimized/photos/2024.03.29%20Street%20Meeting%202-13-400.avif   400w,
                                            /img/optimized/photos/2024.03.29%20Street%20Meeting%202-13-800.avif   800w,
                                            /img/optimized/photos/2024.03.29%20Street%20Meeting%202-13-1200.avif 1200w"
                                            sizes="(max-width:576px) 100vw, (max-width:992px) 50vw, 33vw"
                                        />
                                        <source
                                            type="image/webp"
                                            srcSet="/img/optimized/photos/2024.03.29%20Street%20Meeting%202-13-400.webp   400w,
                                            /img/optimized/photos/2024.03.29%20Street%20Meeting%202-13-800.webp   800w,
                                            /img/optimized/photos/2024.03.29%20Street%20Meeting%202-13-1200.webp 1200w"
                                            sizes="(max-width:576px) 100vw, (max-width:992px) 50vw, 33vw"
                                        />
                                        <img
                                            loading="lazy"
                                            src="/img/photos/2024.03.29 Street Meeting 2-13.webp"
                                            className="card-img-top"
                                            alt="Samochody na murawie podczas Street Meeting 2024"
                                        />
                                    </picture>
                                </article>
                            </div>
                        </div>
                    </div>
                    <div className="container text-center">
                        <Link to="/galeria" className="gallery-btn">
                            Przejdź do galerii
                        </Link>
                    </div>
                </section>

                <section
                    id="contact"
                    className="contact bg-dark text-light py-5"
                >
                    <div className="container text-center">
                        <h2 className="display-3 pb-lg-3 text-uppercase">
                            kontakt
                        </h2>
                        <div className="row">
                            <div className="col-lg-6 mt-4 m-lg-0 contact-info">
                                <h3>Social media:</h3>
                                <a
                                    className="social-media"
                                    href="https://www.facebook.com/streetmeetingpoland/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Facebook Street Meeting Poland"
                                >
                                    <i
                                        className="bi bi-facebook"
                                        aria-hidden="true"
                                    ></i>
                                </a>
                                <a
                                    className="social-media"
                                    href="https://www.instagram.com/streetmeetingpoland/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Instagram Street Meeting Poland"
                                >
                                    <i
                                        className="bi bi-instagram"
                                        aria-hidden="true"
                                    ></i>
                                </a>
                            </div>
                            <div className="col-lg-6 mt-4 m-lg-0 contact-info">
                                <h3>Adres:</h3>
                                <p>Street Meeting Poland</p>
                                <a
                                    href="http://maps.app.goo.gl/PePJY3TXBjM7t4v37"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="links"
                                >
                                    <p>
                                        <i
                                            className="bi bi-geo-alt"
                                            aria-hidden="true"
                                        ></i>
                                        ul. Pokoleń Lechii Gdańsk 1 <br />
                                        80-560 Gdańsk
                                    </p>
                                </a>
                                <a
                                    href="mailto:streetmeetingpolska@gmail.com"
                                    className="links"
                                >
                                    <p>
                                        <i
                                            className="bi bi-at"
                                            aria-hidden="true"
                                        ></i>
                                        streetmeetingpolska@gmail.com
                                    </p>
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="form" className="form bg-light text-dark py-5">
                    <div className="container text-center">
                        <h2 className="display-3 pb-lg-3 text-uppercase">
                            Formularz Strefa Select
                        </h2>
                        <p className="lead mb-0">
                            Zgłoszenia do strefy Select są obecnie zamknięte.
                        </p>
                    </div>
                </section>
            </main>
        </>
    );
}
