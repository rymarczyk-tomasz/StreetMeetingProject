import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useContent } from "../api/content";
import { useAuth } from "../context/AuthContext";
import Countdown from "../components/Countdown";
import HeroPhoto from "../components/HeroPhoto";
import { heroPhotoVars, shouldRotateOnMobile } from "../utils/hero";
import { cardImageProps } from "../utils/photos";
import { plural } from "../utils/plural";
import {
    buildEventJsonLd,
    formatEditionDate,
    formatEditionHours,
} from "../utils/edition";

const CONTENT_KEYS = ["edition", "home", "event", "select", "gallery", "contact", "partners"];

const DEFAULT_HERO_LEAD =
    "Najbardziej unikalne wydarzenie motoryzacyjne w Polsce – auta na murawie stadionu, drift taxi i strefa expo.";

const DEFAULT_SELECT = {
    eyebrow: "Strefa Select",
    title: "Wjedź autem na murawę",
    steps: [
        {
            title: "Konto i garaż",
            text: "Dodaj auta do garażu – w kolejnych latach zgłosisz je jednym kliknięciem.",
        },
        {
            title: "Zgłoszenie",
            text: "Dane pojazdu i do 5 zdjęć. Do decyzji możesz je poprawić albo wycofać.",
        },
        {
            title: "Akceptacja i opłata",
            text: "Decyzja przychodzi e-mailem, dane do przelewu znajdziesz w panelu.",
        },
        {
            title: "Wejściówka QR",
            text: "Pokazujesz kod przy wjeździe – na telefonie albo wydrukowany.",
        },
    ],
};

// Shown until the API answers (and if it can't), so the page never renders empty.
const FALLBACK = {
    home: {
        heroTitle: "Street Show",
        heroLead: DEFAULT_HERO_LEAD,
        heroImage: "/img/photos/Hero-image.webp",
        heroMobileRotate: true,
        ticketLabel: "Kup bilety",
        ticketUrl: "",
    },
    event: { intro: "", cards: [] },
    select: DEFAULT_SELECT,
    gallery: { intro: "", linkLabel: "Wszystkie albumy", photos: [] },
    contact: null,
    partners: { title: "Partnerzy", items: [] },
    edition: null,
};

// Internal paths go through the router, anchors and external links stay plain.
function SmartLink({ href, className, children }) {
    if (/^https?:\/\//i.test(href)) {
        return (
            <a className={className} href={href} target="_blank" rel="noopener noreferrer">
                {children}
            </a>
        );
    }
    if (href.startsWith("/")) {
        return (
            <Link className={className} to={href}>
                {children}
            </Link>
        );
    }
    return (
        <a className={className} href={href}>
            {children}
        </a>
    );
}

function CardAction({ card }) {
    if (!card.actionHref || !card.actionLabel) return null;
    const label = card.actionLabel.replace(/\s*→\s*$/, "");
    return (
        <SmartLink className="link-action" href={card.actionHref}>
            {label} →
        </SmartLink>
    );
}

function EventCards({ cards }) {
    return (
        <div className="feature-grid">
            {cards.map((card) => (
                <article className="feature-card" key={card.id}>
                    <img
                        loading="lazy"
                        {...cardImageProps(card.image)}
                        className="feature-card-img"
                        alt={card.alt}
                    />
                    <div className="feature-card-body">
                        <h3 className="feature-card-title">{card.title}</h3>
                        <p className="feature-card-text">
                            {card.description.split("\n").map((line, index) => (
                                <span key={`${card.id}-${index}`}>
                                    {index > 0 && <br />}
                                    {line}
                                </span>
                            ))}
                        </p>
                        <CardAction card={card} />
                    </div>
                </article>
            ))}
        </div>
    );
}

// Public open/closed state of Select submissions and the per-account limit.
function useSelectStatus() {
    const [status, setStatus] = useState(null);

    useEffect(() => {
        api.get("/select-status")
            .then(({ data }) => setStatus(data))
            .catch(() => setStatus(null));
    }, []);

    return status;
}

function SelectSteps({ select, user }) {
    const status = useSelectStatus();
    const content = { ...DEFAULT_SELECT, ...select };
    const steps = content.steps?.length ? content.steps : DEFAULT_SELECT.steps;
    const maxVehicles = status?.maxVehicles || 5;
    const closed = status && !status.open;
    // Phones show the button under the steps (CSS hides one of the two copies).
    const cta = closed ? (
        <p className="select-closed">{status.reason}</p>
    ) : (
        <Link className="btn-street btn-street-primary" to={user ? "/formularz" : "/rejestracja"}>
            {user ? "Zgłoś pojazd" : "Załóż konto"}
        </Link>
    );

    return (
        <section id="select" className="home-section home-select">
            <div className="site-container">
                <div className="section-head">
                    <div className="section-head-title">
                        <p className="eyebrow">{content.eyebrow}</p>
                        <h2 className="section-title">{content.title}</h2>
                    </div>
                    {cta}
                </div>
                <ol className="select-steps">
                    {steps.map((step, index) => (
                        <li key={index}>
                            <span className="select-step-number">
                                {String(index + 1).padStart(2, "0")}
                            </span>
                            <div>
                                <h3>{step.title}</h3>
                                <p>{step.text}</p>
                            </div>
                        </li>
                    ))}
                </ol>
                <div className="select-cta-mobile">{cta}</div>
                <p className="select-note">
                    Do {plural(maxVehicles, "pojazdu", "pojazdów", "pojazdów")} na konto · zdjęcia
                    JPG, PNG, WEBP lub AVIF, łącznie do 50 MB ·{" "}
                    <Link to="/faq">Pytania o strefę Select</Link>
                </p>
            </div>
        </section>
    );
}

const SHOWCASE_PREVIEW = 6;

// Teaser of the public "Auta strefy Select" page; hidden until it's switched on
// in Admin → Ustawienia and there are cars to show.
function SelectShowcase() {
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get("/showcase")
            .then(({ data: response }) => setData(response))
            .catch(() => setData(null));
    }, []);

    if (!data?.enabled || !data.cars.length) return null;

    return (
        <section id="select-cars" className="home-section">
            <div className="site-container">
                <div className="section-head">
                    <h2 className="section-title">Auta strefy Select {data.edition}</h2>
                    <Link to="/auta-select" className="link-action">
                        Zobacz wszystkie ({data.cars.length}) →
                    </Link>
                </div>
                <div className="showcase-preview-grid">
                    {data.cars.slice(0, SHOWCASE_PREVIEW).map((car) => (
                        <article className="showcase-preview-card" key={car.id}>
                            {car.photos[0] && (
                                <img loading="lazy" src={car.photos[0].thumb} alt={car.carBrand} />
                            )}
                            <p>{car.carBrand}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

function GalleryPreview({ gallery }) {
    const photos = gallery.photos.slice(0, 3);

    return (
        <section id="gallery" className="home-section home-gallery">
            <div className="site-container">
                <div className="section-head">
                    <h2 className="section-title">Galeria</h2>
                    <Link to="/galeria" className="link-action">
                        {(gallery.linkLabel || "Wszystkie albumy").replace(/\s*→\s*$/, "")} →
                    </Link>
                </div>
                {gallery.intro && <p className="section-lead">{gallery.intro}</p>}
                {photos.length > 0 && (
                    <div className={`gallery-mosaic is-count-${photos.length}`}>
                        {photos.map((photo) => (
                            <img
                                key={photo.id}
                                loading="lazy"
                                {...cardImageProps(photo.url)}
                                alt={photo.alt || "Zdjęcie z galerii Street Show"}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

// "Let me know the date" sign-up; shown while the edition has no date yet.
function NotifySignup({ edition }) {
    const [email, setEmail] = useState("");
    const [state, setState] = useState({ status: "idle", message: "" });

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setState({ status: "busy", message: "" });
        try {
            const { data } = await api.post("/notify", { email, consent: true });
            setState({ status: "done", message: data.message });
            setEmail("");
        } catch (error) {
            setState({
                status: "error",
                message:
                    error.response?.data?.message ||
                    "Nie udało się zapisać. Spróbuj ponownie za chwilę.",
            });
        }
    }

    return (
        <section className="home-notify" aria-labelledby="notify-title">
            <div className="site-container home-notify-grid">
                <div>
                    <h2 id="notify-title" className="block-title">
                        Daj mi znać o dacie
                    </h2>
                    <p className="section-lead">
                        Jeden e-mail, gdy ogłosimy termin edycji {edition?.year} i ruszy sprzedaż
                        biletów. Bez spamu.
                    </p>
                </div>
                {state.status === "done" ? (
                    <p className="form-success" role="status">
                        {state.message}
                    </p>
                ) : (
                    <form className="notify-form" onSubmit={submit}>
                        <div className="notify-row">
                            <label htmlFor="notify-email" className="visually-hidden">
                                Twój e-mail
                            </label>
                            <input
                                id="notify-email"
                                type="email"
                                className="field-input"
                                placeholder="Twój e-mail"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                            />
                            <button
                                type="submit"
                                className="btn-street btn-street-dark"
                                aria-busy={state.status === "busy"}
                            >
                                Powiadom mnie
                            </button>
                        </div>
                        {state.status === "error" && (
                            <p className="field-error" role="alert">
                                <i className="bi bi-exclamation-circle" aria-hidden="true" />
                                {state.message}
                            </p>
                        )}
                        <p className="notify-legal">
                            Zapisując się, akceptujesz <Link to="/regulamin">politykę prywatności</Link>.
                            Wypiszesz się jednym kliknięciem.
                        </p>
                    </form>
                )}
            </div>
        </section>
    );
}

// [tier, singular label, plural label]; items saved before tiers existed count as exhibitors.
const FEATURED_TIERS = [
    ["main", "Sponsor główny wydarzenia", "Sponsorzy główni wydarzenia"],
    ["partner", "Partner wydarzenia", "Partnerzy wydarzenia"],
];

function PartnerLogo({ partner }) {
    const logo = <img src={partner.logo} alt={partner.name} loading="lazy" />;
    if (!partner.url) return logo;
    return (
        <a href={partner.url} target="_blank" rel="noopener noreferrer" title={partner.name}>
            {logo}
        </a>
    );
}

function Partners({ partners }) {
    if (!partners?.items?.length) return null;

    const tierOf = (partner) => partner.tier || "exhibitor";
    const featured = FEATURED_TIERS.map(([tier, one, many]) => {
        const items = partners.items.filter((partner) => tierOf(partner) === tier);
        return { tier, label: items.length > 1 ? many : one, items };
    }).filter((group) => group.items.length);
    const exhibitors = partners.items.filter((partner) => tierOf(partner) === "exhibitor");

    return (
        <section id="partners" className="home-partners">
            <div className="site-container">
                <h2 className="eyebrow eyebrow-muted">{partners.title}</h2>
                {featured.length > 0 && (
                    <div className="partners-featured">
                        {featured.map((group) => (
                            <div className={`partners-featured-group is-${group.tier}`} key={group.tier}>
                                <h3 className="partners-tier-title">{group.label}</h3>
                                <ul>
                                    {group.items.map((partner) => (
                                        <li key={partner.id}>
                                            <PartnerLogo partner={partner} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
                {exhibitors.length > 0 && (
                    <>
                        {featured.length > 0 && <h3 className="partners-tier-title">Wystawcy</h3>}
                        <ul className="partners-grid">
                            {exhibitors.map((partner) => (
                                <li key={partner.id}>
                                    <PartnerLogo partner={partner} />
                                </li>
                            ))}
                        </ul>
                    </>
                )}
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
    const { user } = useAuth();
    const { content } = useContent(CONTENT_KEYS);
    const { edition, home, event, select, gallery, contact, partners } = {
        ...FALLBACK,
        ...content,
    };
    const dateLabel = formatEditionDate(edition);
    const hoursLabel = edition?.date ? formatEditionHours(edition) : "";
    const eyebrow = [dateLabel, hoursLabel, edition?.venueName].filter(Boolean).join(" · ");

    useEventJsonLd(edition, home, contact);

    return (
        <>
            <header
                id="home"
                className={`home${shouldRotateOnMobile(home) ? " hero-rotate-mobile" : ""}`}
                style={heroPhotoVars(home)}
            >
                <HeroPhoto />
                <div className="hero-shadow" aria-hidden="true"></div>
                <div className="site-container hero-content">
                    {eyebrow && <p className="eyebrow">{eyebrow}</p>}
                    <h1 className="hero-title">
                        {home.heroTitle}
                        {edition?.year && (
                            <>
                                <br />
                                {edition.year}
                            </>
                        )}
                    </h1>
                    <Countdown date={edition?.date} startTime={edition?.startTime} />
                    <p className="hero-lead">{home.heroLead || DEFAULT_HERO_LEAD}</p>
                    <div className="hero-actions">
                        {home.ticketUrl && (
                            <a
                                className="btn-street btn-street-primary btn-street-lg"
                                href={home.ticketUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {home.ticketLabel}
                            </a>
                        )}
                        {user ? (
                            <Link className="btn-street btn-street-light btn-street-lg" to="/formularz">
                                Zgłoś pojazd
                            </Link>
                        ) : (
                            <a className="btn-street btn-street-light btn-street-lg" href="#select">
                                Zgłoś pojazd
                            </a>
                        )}
                    </div>
                </div>
            </header>

            <main>
                <section id="event" className="home-section">
                    <div className="site-container">
                        <div className="section-head">
                            <h2 className="section-title">Co Cię czeka</h2>
                            {event.intro && <p className="section-lead">{event.intro}</p>}
                        </div>
                        <EventCards cards={event.cards} />
                    </div>
                </section>

                <SelectSteps select={select} user={user} />

                <SelectShowcase />

                <GalleryPreview gallery={gallery} />

                {edition && !edition.date && <NotifySignup edition={edition} />}

                <Partners partners={partners} />
            </main>
        </>
    );
}
