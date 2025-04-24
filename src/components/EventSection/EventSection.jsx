import { memo, useEffect } from "react";
import Card from "../Card/Card";
import styles from "./EventSection.module.css";
import PropTypes from "prop-types";

const TicketCardContent = ({ onLinkClick }) => (
    <>
        <strong>Zarezerwuj swoje miejsce już teraz!</strong> Bilety na
        wydarzenie kupisz{" "}
        <a
            href="https://bkb.pl/151648-edcca"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.eventLink}
            onClick={() => onLinkClick("Kup bilety")}
            aria-label="Kup bilety na Street Meeting Poland 2025"
        >
            tutaj
        </a>
        . <br />
        <strong>Zyskaj 15% zniżki!</strong> Zapisz się do naszego newslettera i
        odbierz kod rabatowy na bilet. Formularz zapisu znajdziesz na dole
        strony!
    </>
);

TicketCardContent.propTypes = {
    onLinkClick: PropTypes.func.isRequired,
};

const SelectZoneCardContent = () => (
    <>
        <strong>Pokaż swój wyjątkowy pojazd!</strong> Masz unikalne auto? Nie
        przegap szansy na jego prezentację <strong>na murawie stadionu</strong>{" "}
        w strefie <strong>Select</strong>!
    </>
);

const DriftTaxiCardContent = () => (
    <>
        Doświadcz prawdziwych motoryzacyjnych emocji! Widowiskowe pokazy driftu,
        przejażdżki na fotelu pasażera i adrenalina na najwyższym poziomie! W
        specjalnej strefie expo czekają na Ciebie najnowsze trendy motoryzacyjne
        oraz renomowane marki z Polski i Europy.
    </>
);

const EventSection = () => {
    const handleLinkClick = (label) => {
        if (window.gtag) {
            window.gtag("event", "event_section_link_click", {
                event_category: "EventSection",
                event_label: label,
            });
        }
    };

    useEffect(() => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.text = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Event",
            name: "Street Meeting Poland 2025",
            startDate: "2025-05-31T12:00:00+02:00",
            endDate: "2025-05-31T23:00:00+02:00",
            location: {
                "@type": "Place",
                name: "Polsat Plus Arena",
                address: {
                    "@type": "PostalAddress",
                    streetAddress: "Pokoleń Lechii Gdańsk 1",
                    addressLocality: "Gdańsk",
                    postalCode: "80-560",
                    addressCountry: "PL",
                },
            },
            description:
                "Przyjedź i odwiedź jedyne takie wydarzenie motoryzacyjne w Polsce.",
            offers: {
                "@type": "Offer",
                url: "https://bkb.pl/151648-edcca",
                priceCurrency: "PLN",
                availability: "https://schema.org/InStock",
            },
        });
        document.head.appendChild(script);

        return () => {
            document.head.removeChild(script);
        };
    }, []);

    return (
        <section id="event" className={styles.event}>
            <div className={styles.container}>
                <h2
                    className={styles.title}
                    aria-label="Informacje o wydarzeniu Street Meeting Poland 2025"
                >
                    Event
                </h2>
                <p className={styles.description}>
                    Przyjedź i odwiedź jedyne takie wydarzenie w Polsce.
                </p>
                <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
                    <Card
                        imgSrc="/photos/10.webp"
                        imgAlt="Samochody na murawie Polsat Plus Arena, Gdańsk, a na przodzie składane krzesełka z napisem Street Meeting"
                        title="Bilety"
                        link="https://bkb.pl/151648-edcca"
                        imgHeight="300px"
                    >
                        <TicketCardContent onLinkClick={handleLinkClick} />
                    </Card>
                    <Card
                        imgSrc="/photos/6.webp"
                        imgAlt="Czerwono-biały Nissan"
                        title="Strefa Pojazdów Select"
                        imgHeight="300px"
                    >
                        <SelectZoneCardContent />
                    </Card>
                    <Card
                        imgSrc="/photos/7.webp"
                        imgAlt="Trzy driftujące samochody"
                        title="Drift Taxi oraz Strefa Expo"
                        imgHeight="300px"
                    >
                        <DriftTaxiCardContent />
                    </Card>
                </div>
            </div>
        </section>
    );
};

export default memo(EventSection);
