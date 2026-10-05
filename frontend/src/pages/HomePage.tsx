import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useContent } from "../api/content";
import HeroPhoto from "../components/HeroPhoto";
import { heroPhotoVars, shouldRotateOnMobile } from "../utils/hero";
import { cardImageProps } from "../utils/photos";
import {
    buildEventJsonLd,
    formatEditionDate,
    formatEditionHours,
} from "../utils/edition";

const CONTENT_KEYS = ["edition", "home", "event", "gallery", "contact", "partners"];

// Shown until the API answers (and if it can't), so the page never renders empty.
const FALLBACK = {
    home: {
        heroTitle: "Street Show",
        heroImage: "/img/photos/Hero-image.webp",
        heroMobileRotate: true,
        ticketLabel: "Kup bilety",
        ticketUrl: "",
        exploreLabel: "Poznaj atrakcje",
    },
    event: { intro: "", cards: [] },
    gallery: { intro: "", linkLabel: "Przejdź do galerii", photos: [] },
    contact: null,
    partners: { title: "Partnerzy", items: [] },
    edition: null,
};

function CardAction({ card }) {
    if (!card.actionHref || !card.actionLabel) return null;

    if (/^https?:\/\//i.test(card.actionHref)) {
        return (
            <a
                className="card-action"
                href={card.actionHref}
                target="_blank"
                rel="noopener noreferrer"
            >
                {card.actionLabel}
            </a>
        );
    }
    if (card.actionHref.startsWith("/")) {
        return (
            <Link className="card-action" to={card.actionHref}>
                {card.actionLabel}
            </Link>
        );
    }
    return (
        <a className="card-action" href={card.actionHref}>
            {card.actionLabel}
        </a>
    );
}

function EventCards({ cards }) {
    return (
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4 justify-content-center">
            {cards.map((card) => (
                <div className="col" key={card.id}>
                    <article className="card h-100">
                        <img
                            loading="lazy"
                            {...cardImageProps(card.image)}
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
                            <CardAction card={card} />
                        </div>
                    </article>
                </div>
            ))}
        </div>
    );
}

function Partners({ partners }) {
    if (!partners?.items?.length) return null;

    return (
        <section id="partners" className="bg-light text-dark py-5 partners">
            <div className="container text-center">
                <h2 className="display-5 pb-lg-3 text-uppercase">
                    {partners.title}
                </h2>
                <ul className="partners-list">
                    {partners.items.map((partner) => {
                        const logo = (
                            <img
                                src={partner.logo}
                                alt={partner.name}
                                loading="lazy"
                            />
                        );
                        return (
                            <li key={partner.id}>
                                {partner.url ? (
                                    <a
                                        href={partner.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={partner.name}
                                    >
                                        {logo}
                                    </a>
                                ) : (
                                    logo
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
}

// Structured data lets search engines show the event date in results.
function useEventJsonLd(edition, home, contact) {
    useEffect(() => {
        const data = buildEventJsonLd(edition, {
            ticketUrl: home?.ticketUrl,
            contact,
        });
        if (!data) return;

        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.text = JSON.stringify(data);
        document.head.appendChild(script);
        return () => script.remove();
    }, [edition, home, contact]);
}

export default function HomePage() {
    const { content } = useContent(CONTENT_KEYS);
    const { edition, home, event, gallery, contact, partners } = content || FALLBACK;
    const dateLabel = formatEditionDate(edition);
    const hoursLabel = formatEditionHours(edition);

    useEventJsonLd(edition, home, contact);

    return (
        <>
            <header
                id="home"
                className={`home${shouldRotateOnMobile(home) ? " hero-rotate-mobile" : ""}`}
                style={heroPhotoVars(home)}
            >
                <HeroPhoto />
                <div className="container-fluid h-100 d-flex flex-column justify-content-center align-items-center text-light text-center">
                    <h1 className="hero-title text-uppercase">
                        {home.heroTitle}
                    </h1>
                    {dateLabel && (
                        <p className="hero-meta">
                            {dateLabel}
                            {edition?.date && hoursLabel && (
                                <span className="hero-hours">
                                    {" "}
                                    · {hoursLabel}
                                </span>
                            )}
                        </p>
                    )}
                    {edition?.venueName && (
                        <p className="hero-meta hero-meta-venue">
                            {edition.venueName}
                        </p>
                    )}
                    <div className="hero-actions">
                        {home.ticketUrl && (
                            <a
                                className="hero-button"
                                href={home.ticketUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {home.ticketLabel}
                            </a>
                        )}
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
                        {event.intro && <p className="py-3">{event.intro}</p>}
                        <EventCards cards={event.cards} />
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
                            {gallery.photos.slice(0, 3).map((photo) => (
                                <div className="col" key={photo.id}>
                                    <article className="card h-100">
                                        <img
                                            loading="lazy"
                                            {...cardImageProps(photo.url)}
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

                <Partners partners={partners} />

                {contact && (
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
                                        href={contact.mapUrl || undefined}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="links"
                                    >
                                        <p>
                                            <i
                                                className="bi bi-geo-alt"
                                                aria-hidden="true"
                                            ></i>
                                            <span>
                                                {contact.addressLine1} <br />
                                                {contact.addressLine2}
                                            </span>
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
                )}
            </main>
        </>
    );
}
