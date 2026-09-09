import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

const TICKET_URL = "https://bkb.pl/197944-209dd";

const DEFAULT_EVENT = {
    intro: "Weź udział w najbardziej unikalnym wydarzeniu motoryzacyjnym w Polsce! Niezapomniane emocje, wyjątkowe samochody i atmosfera, jakiej nie znajdziesz nigdzie indziej.",
    cards: [
        {
            id: "tickets",
            title: "BILETY",
            description:
                "Zarezerwuj swoje miejsce już teraz!\nBilety na wydarzenie kupisz TUTAJ.",
            image: "/img/photos/10.webp",
            alt: "Samochody na murawie Polsat Plus Arena, Gdańsk",
            actionLabel: "Kup bilety",
            actionHref: TICKET_URL,
            actionExternal: true,
        },
        {
            id: "select",
            title: "STREFA POJAZDÓW SELECT",
            description:
                "Pokaż swój wyjątkowy pojazd!\nMasz unikalne auto? Nie przegap szansy na jego prezentację na murawie stadionu w strefie Select!",
            image: "/img/photos/6.webp",
            alt: "Czarno-biały Nissan na wydarzeniu Street Show",
            actionLabel: "Zgłoś pojazd",
            actionHref: "/formularz",
            actionExternal: false,
        },
        {
            id: "drift-expo",
            title: "DRIFT TAXI ORAZ STREFA EXPO",
            description:
                "Doświadcz prawdziwych motoryzacyjnych emocji! Widowiskowe pokazy driftu, przejażdżki na fotelu pasażera i adrenalina na najwyższym poziomie! W specjalnej strefie expo czekają na Ciebie najnowsze trendy motoryzacyjne oraz renomowane marki z Polski i Europy.",
            image: "/img/photos/7.webp",
            alt: "Trzy driftujące samochody podczas pokazu",
            actionLabel: "Sprawdź atrakcje",
            actionHref: "#contact",
            actionExternal: false,
        },
    ],
};

const DEFAULT_HOME = {
    heroTitle: "Street Show",
    heroDate: "29 sierpnia 2026",
    heroLocation: "Polsat Plus Arena, Gdańsk",
    heroImage: "/img/photos/Hero-image.webp",
    ticketLabel: "Kup bilety",
    ticketUrl: TICKET_URL,
    exploreLabel: "Poznaj atrakcje",
};

const DEFAULT_GALLERY_PHOTOS = [
    {
        id: "default-1",
        url: "/img/photos/Street Meeting Poland 2024-139.webp",
        alt: "Samochód wystawowy na Street Show 2024",
    },
    {
        id: "default-2",
        url: "/img/photos/Street Meeting Poland 2024-252.webp",
        alt: "Widok z wydarzenia Street Meeting Poland 2024",
    },
    {
        id: "default-3",
        url: "/img/photos/2024.03.29 Street Meeting 2-13.webp",
        alt: "Samochody na murawie podczas Street Meeting 2024",
    },
];

const DEFAULT_GALLERY = {
    intro: "",
    linkLabel: "Przejdź do galerii",
    photos: DEFAULT_GALLERY_PHOTOS,
};

const DEFAULT_CONTACT = {
    facebookUrl: "https://www.facebook.com/streetmeetingpoland/",
    instagramUrl: "https://www.instagram.com/streetmeetingpoland/",
    addressName: "Street Meeting Poland",
    addressLine1: "ul. Pokoleń Lechii Gdańsk 1",
    addressLine2: "80-560 Gdańsk",
    mapUrl: "http://maps.app.goo.gl/PePJY3TXBjM7t4v37",
    email: "streetmeetingpolska@gmail.com",
};

function EventCards({ event }) {
    return (
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
            {event.cards.map((card) => (
                <div className="col" key={card.id}>
                    <article className="card h-100">
                        <img
                            loading="lazy"
                            src={card.image}
                            className="card-img-top"
                            alt={card.alt}
                        />
                        <div className="card-body">
                            <h3 className="card-title py-3">{card.title}</h3>
                            <p className="card-text">
                                {card.description
                                    .split("\n")
                                    .map((line, index) => (
                                        <span key={`${card.id}-${index}`}>
                                            {index > 0 && <br />}
                                            {line}
                                        </span>
                                    ))}
                            </p>
                            {card.actionExternal ? (
                                <a
                                    className="card-action"
                                    href={card.actionHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {card.actionLabel}
                                </a>
                            ) : card.actionHref.startsWith("/") ? (
                                <Link
                                    className="card-action"
                                    to={card.actionHref}
                                >
                                    {card.actionLabel}
                                </Link>
                            ) : (
                                <a
                                    className="card-action"
                                    href={card.actionHref}
                                >
                                    {card.actionLabel}
                                </a>
                            )}
                        </div>
                    </article>
                </div>
            ))}
        </div>
    );
}

export default function HomePage() {
    const [event, setEvent] = useState(DEFAULT_EVENT);
    const [home, setHome] = useState(DEFAULT_HOME);
    const [gallery, setGallery] = useState(DEFAULT_GALLERY);
    const [contact, setContact] = useState(DEFAULT_CONTACT);

    useEffect(() => {
        api.get("/event")
            .then(({ data }) => setEvent(data.event))
            .catch(() => {});
        api.get("/home")
            .then(({ data }) => setHome(data.home))
            .catch(() => {});
        api.get("/gallery")
            .then(({ data }) => setGallery(data.gallery))
            .catch(() => {});
        api.get("/contact")
            .then(({ data }) => setContact(data.contact))
            .catch(() => {});
    }, []);

    return (
        <>
            <header
                id="home"
                className="home"
                style={
                    home.heroImage
                        ? { backgroundImage: `url("${home.heroImage}")` }
                        : undefined
                }
            >
                <div className="container-fluid h-100 d-flex flex-column justify-content-center align-items-center text-light text-center">
                    <h1 className="display-3 text-uppercase">
                        {home.heroTitle}
                    </h1>
                    <h2 className="mb-2 text-uppercase">{home.heroDate}</h2>
                    <h2 className="mb-2 text-uppercase">{home.heroLocation}</h2>
                    <div className="hero-actions">
                        <a
                            className="hero-button"
                            href={home.ticketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {home.ticketLabel}
                        </a>
                        <a className="hero-link" href="#event">
                            {home.exploreLabel}
                        </a>
                    </div>
                    <div className="hero-shadow"></div>
                </div>
            </header>

            <main>
                <section id="event" className="bg-dark text-light event py-5">
                    <div className="container text-center">
                        <h2 className="display-3 pb-lg-3 text-uppercase">
                            event
                        </h2>
                        <p className="py-3">{event.intro}</p>
                        <EventCards event={event} />
                        <div hidden>
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
                                                    href={TICKET_URL}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <strong>TUTAJ</strong>
                                                </a>
                                                .
                                            </p>
                                            <a
                                                className="card-action"
                                                href={TICKET_URL}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Kup bilety
                                            </a>
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
                                                w strefie{" "}
                                                <strong>Select</strong>!
                                            </p>
                                            <Link
                                                className="card-action"
                                                to="/formularz"
                                            >
                                                Zgłoś pojazd
                                            </Link>
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
                                                motoryzacyjnych emocji!
                                                Widowiskowe pokazy driftu,
                                                przejażdżki na fotelu pasażera i
                                                adrenalina na najwyższym
                                                poziomie! W specjalnej strefie
                                                expo czekają na Ciebie najnowsze
                                                trendy motoryzacyjne oraz
                                                renomowane marki z Polski i
                                                Europy.
                                            </p>
                                            <a
                                                className="card-action"
                                                href="#contact"
                                            >
                                                Sprawdź atrakcje
                                            </a>
                                        </div>
                                    </article>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="gallery" className="bg-light text-dark py-5">
                    <div className="container text-center">
                        <h2 className="display-3 pb-lg-3 text-uppercase">
                            Galeria
                        </h2>
                        {gallery.intro && (
                            <p className="py-3">{gallery.intro}</p>
                        )}
                        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
                            {(gallery.photos?.length
                                ? gallery.photos
                                : DEFAULT_GALLERY_PHOTOS
                            )
                                .slice(0, 3)
                                .map((photo) => (
                                    <div className="col" key={photo.id}>
                                        <article className="card h-100">
                                            <img
                                                loading="lazy"
                                                src={photo.url}
                                                className="card-img-top"
                                                alt={
                                                    photo.alt ||
                                                    "Zdjęcie z galerii Street Show"
                                                }
                                            />
                                        </article>
                                    </div>
                                ))}
                        </div>
                    </div>
                    <div className="container text-center">
                        <Link to="/galeria" className="gallery-btn">
                            {gallery.linkLabel}
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
                                {contact.facebookUrl && (
                                    <a
                                        className="social-media"
                                        href={contact.facebookUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Facebook Street Meeting Poland"
                                    >
                                        <i
                                            className="bi bi-facebook"
                                            aria-hidden="true"
                                        ></i>
                                    </a>
                                )}
                                {contact.instagramUrl && (
                                    <a
                                        className="social-media"
                                        href={contact.instagramUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Instagram Street Meeting Poland"
                                    >
                                        <i
                                            className="bi bi-instagram"
                                            aria-hidden="true"
                                        ></i>
                                    </a>
                                )}
                            </div>
                            <div className="col-lg-6 mt-4 m-lg-0 contact-info">
                                <h3>Adres:</h3>
                                <p>{contact.addressName}</p>
                                <a
                                    href={contact.mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="links"
                                >
                                    <p>
                                        <i
                                            className="bi bi-geo-alt"
                                            aria-hidden="true"
                                        ></i>
                                        {contact.addressLine1} <br />
                                        {contact.addressLine2}
                                    </p>
                                </a>
                                <a
                                    href={`mailto:${contact.email}`}
                                    className="links"
                                >
                                    <p>
                                        <i
                                            className="bi bi-at"
                                            aria-hidden="true"
                                        ></i>
                                        {contact.email}
                                    </p>
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}
