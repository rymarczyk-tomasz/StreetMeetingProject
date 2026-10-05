import { Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useContent } from "../api/content";
import AnnouncementBar from "./AnnouncementBar";

const FOOTER_CONTENT_KEYS = ["contact"];

// Keeps the fixed navbar from overlapping page content (hero gets its own offset).
function useNavbarOffset() {
    const location = useLocation();

    useEffect(() => {
        const navbar = document.getElementById("navbar");
        const content = document.querySelector(".app-page-content");

        function applyOffset() {
            if (!navbar) return;
            const navbarHeight = navbar.offsetHeight;
            const home = document.querySelector<HTMLElement>(".home");
            document.documentElement.style.setProperty(
                "--navbar-height",
                `${navbarHeight}px`,
            );

            if (home) {
                // Height comes from CSS (.home uses --navbar-height).
                home.style.marginTop = `${navbarHeight}px`;
                if (content) (content as HTMLElement).style.paddingTop = "";
            } else if (content) {
                (content as HTMLElement).style.paddingTop = `${navbarHeight}px`;
            }
        }

        applyOffset();
        // Also reacts to the header growing later, e.g. when the announcement loads.
        const observer = new ResizeObserver(applyOffset);
        if (navbar) observer.observe(navbar);
        return () => observer.disconnect();
    }, [location.pathname]);
}

function closeMobileNav() {
    const navbarCollapse = document.getElementById("navbarNavAltMarkup");
    if (!navbarCollapse || !window.bootstrap) return;
    const instance = window.bootstrap.Collapse.getInstance(navbarCollapse);
    if (instance && navbarCollapse.classList.contains("show")) {
        instance.hide();
    }
}

function useActiveHomeSection(isHome: boolean) {
    const [activeSection, setActiveSection] = useState("home");

    useEffect(() => {
        if (!isHome) return;

        const sections = ["home", "event", "gallery", "contact"]
            .map((id) => document.getElementById(id))
            .filter((section): section is HTMLElement => Boolean(section));

        if (!sections.length) return;

        const navbarHeight =
            document.documentElement.style.getPropertyValue(
                "--navbar-height",
            ) || "0px";

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleSections = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

                if (visibleSections[0]) {
                    setActiveSection(visibleSections[0].target.id);
                }
            },
            {
                rootMargin: `-${navbarHeight} 0px -45% 0px`,
                threshold: [0.15, 0.35, 0.6],
            },
        );

        sections.forEach((section) => observer.observe(section));
        return () => observer.disconnect();
    }, [isHome]);

    return isHome ? activeSection : "";
}

export default function Layout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const isHome = location.pathname === "/";

    useNavbarOffset();
    const activeHomeSection = useActiveHomeSection(isHome);
    const { content } = useContent(FOOTER_CONTENT_KEYS);
    // The home page has its own contact section right above the footer.
    const contact = isHome ? null : content?.contact;

    return (
        <>
            <div className="fixed-top" id="navbar">
                <AnnouncementBar />
                <nav className="navbar navbar-expand-lg bg-body-tertiary py-4">
                    <div className="container">
                        <Link className="navbar-brand" to="/">
                            <img
                                className="logo"
                                src="/img/Logo 2.0/SVG/Logo_4.svg"
                                alt="Street Meeting Poland - Logo"
                            />
                        </Link>
                        <button
                            className="navbar-toggler"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#navbarNavAltMarkup"
                            aria-controls="navbarNavAltMarkup"
                            aria-expanded="false"
                            aria-label="Toggle navigation"
                        >
                            <span className="navbar-toggler-icon"></span>
                        </button>
                        <div
                            className="collapse navbar-collapse"
                            id="navbarNavAltMarkup"
                        >
                            <div className="navbar-nav ms-auto">
                                <a
                                    className={`nav-link ${
                                        activeHomeSection === "home" ? "active" : ""
                                    }`}
                                    href={isHome ? "#home" : "/#home"}
                                    onClick={closeMobileNav}
                                >
                                    Home
                                </a>
                                <a
                                    className={`nav-link ${
                                        activeHomeSection === "event"
                                            ? "active"
                                            : ""
                                    }`}
                                    href={isHome ? "#event" : "/#event"}
                                    onClick={closeMobileNav}
                                >
                                    Event
                                </a>
                                <NavLink
                                    className={({ isActive }) =>
                                        `nav-link ${
                                            isActive ||
                                            activeHomeSection === "gallery"
                                                ? "active"
                                                : ""
                                        }`
                                    }
                                    to="/galeria"
                                    onClick={closeMobileNav}
                                >
                                    Galeria
                                </NavLink>
                                <a
                                    className={`nav-link ${
                                        activeHomeSection === "contact"
                                            ? "active"
                                            : ""
                                    }`}
                                    href={isHome ? "#contact" : "/#contact"}
                                    onClick={closeMobileNav}
                                >
                                    Kontakt
                                </a>
                                <NavLink
                                    className="nav-link"
                                    to="/faq"
                                    onClick={closeMobileNav}
                                >
                                    FAQ
                                </NavLink>
                                {user ? (
                                    <>
                                        <NavLink
                                            className="nav-link"
                                            to="/panel"
                                            onClick={closeMobileNav}
                                        >
                                            Panel konta
                                        </NavLink>
                                        {user.role === "admin" && (
                                            <NavLink
                                                className="nav-link"
                                                to="/admin"
                                                onClick={closeMobileNav}
                                            >
                                                Administrator
                                            </NavLink>
                                        )}
                                        <button
                                            type="button"
                                            className="nav-link link-button"
                                            onClick={logout}
                                        >
                                            Wyloguj
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <NavLink
                                            className="nav-link"
                                            to="/logowanie"
                                            onClick={closeMobileNav}
                                        >
                                            Zaloguj się
                                        </NavLink>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </nav>
            </div>

            <div className="app-page-content">
                <Suspense
                    fallback={<p className="page-status">Ładowanie...</p>}
                >
                    <Outlet />
                </Suspense>
            </div>

            <footer className="site-footer bg-dark text-light">
                <div className="container site-footer-inner">
                    <p className="mb-0">
                        &copy; {new Date().getFullYear()} Street Meeting Poland
                    </p>
                    <nav className="site-footer-links" aria-label="Stopka">
                        <Link to="/faq">FAQ</Link>
                        <Link to="/regulamin">Regulamin</Link>
                        {contact?.email && (
                            <a href={`mailto:${contact.email}`}>{contact.email}</a>
                        )}
                    </nav>
                    <div className="site-footer-social">
                        {contact?.facebookUrl && (
                            <a
                                href={contact.facebookUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Facebook Street Meeting Poland"
                            >
                                <i className="bi bi-facebook" aria-hidden="true"></i>
                            </a>
                        )}
                        {contact?.instagramUrl && (
                            <a
                                href={contact.instagramUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Instagram Street Meeting Poland"
                            >
                                <i className="bi bi-instagram" aria-hidden="true"></i>
                            </a>
                        )}
                    </div>
                </div>
            </footer>
        </>
    );
}
