import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
                home.style.marginTop = `${navbarHeight}px`;
                home.style.height = `calc(100vh - ${navbarHeight}px)`;
                if (content) (content as HTMLElement).style.paddingTop = "";
            } else if (content) {
                (content as HTMLElement).style.paddingTop = `${navbarHeight}px`;
            }
        }

        applyOffset();
        window.addEventListener("resize", applyOffset);
        return () => window.removeEventListener("resize", applyOffset);
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

    return (
        <>
            <nav
                className="navbar navbar-expand-lg bg-body-tertiary py-4 fixed-top"
                id="navbar"
            >
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

            <div className="app-page-content">
                <Outlet />
            </div>

            <footer className="bg-dark text-light">
                <p className="text-center mb-0 py-3">
                    &copy; {new Date().getFullYear()} Street Meeting Poland
                    <span className="mx-2">|</span>
                    <Link className="text-light" to="/regulamin">
                        Regulamin
                    </Link>
                </p>
            </footer>
        </>
    );
}
