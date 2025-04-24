import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import useMetaTags from "../../hooks/useMetaTags";
import Header from "../../components/Header/Header";
import EventSection from "../../components/EventSection/EventSection";
import GallerySection from "../../components/GallerySection/GallerySection";
import ContactSection from "../../components/ContactSection/ContactSection";
import FormSection from "../../components/FormSection/FormSection";
import styles from "./HomePage.module.css";
import { initializeAnalytics } from "../../analytics";

const HomePage = () => {
    const location = useLocation();

    useMetaTags({
        title: "Street Meeting Poland 2025",
        description:
            "Street Meeting Poland 2025 - wydarzenie motoryzacyjne 31 maja na Polsat Plus Arena, Gdańsk. Dołącz do nas i przeżyj niezapomniane emocje!",
        keywords:
            "Street Meeting, 2025, Polsat Plus Arena, Gdańsk, wydarzenie motoryzacyjne, bilety",
        ogTitle: "Street Meeting Poland 2025",
        ogDescription:
            "Street Meeting Poland 2025 - wydarzenie motoryzacyjne 31 maja na Polsat Plus Arena, Gdańsk. Dołącz do nas i przeżyj niezapomniane emocje!",
        ogUrl: "https://www.streetshow.pl/",
        canonical: "https://www.streetshow.pl/",
    });

    useEffect(() => {
        initializeAnalytics();
    }, []);

    useEffect(() => {
        if (location.hash) {
            const element = document.querySelector(location.hash);
            if (element) {
                element.scrollIntoView({ behavior: "smooth" });
            }
        } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [location]);

    return (
        <div
            className={styles.pageWrapper}
            data-bs-spy="scroll"
            data-bs-target="#navbar"
        >
            <Header id="home" />
            <EventSection id="event" />
            <GallerySection id="gallery" />
            <ContactSection id="contact" />
            <FormSection id="form" />
        </div>
    );
};

export default HomePage;
