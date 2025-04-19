import { useEffect } from "react";
import { useLocation } from "react-router-dom"; // Dodano import
import useMetaTags from "../../hooks/useMetaTags";
import Header from "../../components/Header/Header";
import EventSection from "../../components/EventSection/EventSection";
import GallerySection from "../../components/GallerySection/GallerySection";
import ContactSection from "../../components/ContactSection/ContactSection";
import FormSection from "../../components/FormSection/FormSection";
import styles from "./HomePage.module.css";

const HomePage = () => {
    const location = useLocation(); // Dodano hook useLocation

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
        if (!window.fbq) {
            !(function (f, b, e, v, n, t, s) {
                if (f.fbq) return;
                n = f.fbq = function () {
                    n.callMethod
                        ? n.callMethod.apply(n, arguments)
                        : n.queue.push(arguments);
                };
                if (!f._fbq) f._fbq = n;
                n.push = n;
                n.loaded = !0;
                n.version = "2.0";
                n.queue = [];
                t = b.createElement(e);
                t.async = !0;
                t.src = v;
                s = b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t, s);
            })(
                window,
                document,
                "script",
                "https://connect.facebook.net/en_US/fbevents.js"
            );
            window.fbq("init", "2023117151421928");
            window.fbq("track", "PageView");
        }

        if (!window.dataLayer) {
            window.dataLayer = window.dataLayer || [];
            function gtag() {
                window.dataLayer.push(arguments);
            }
            gtag("js", new Date());
            gtag("config", "G-C740ZF1G1N");

            const script = document.createElement("script");
            script.async = true;
            script.src =
                "https://www.googletagmanager.com/gtag/js?id=G-C740ZF1G1N";
            document.head.appendChild(script);

            return () => {
                if (document.head.contains(script)) {
                    document.head.removeChild(script);
                }
            };
        }

        if (!window.dataLayer) {
            (function (w, d, s, l, i) {
                w[l] = w[l] || [];
                w[l].push({
                    "gtm.start": new Date().getTime(),
                    event: "gtm.js",
                });
                var f = d.getElementsByTagName(s)[0],
                    j = d.createElement(s),
                    dl = l != "dataLayer" ? "&l=" + l : "";
                j.async = true;
                j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
                f.parentNode.insertBefore(j, f);
            })(window, document, "script", "dataLayer", "GTM-WHCQDGMC");
        }
    }, []);

    // Dodano useEffect do przewijania
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
