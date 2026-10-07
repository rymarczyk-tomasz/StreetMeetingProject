import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useContent } from "../api/content";
import { formatEditionDate } from "../utils/edition";
import { useScrollLock } from "../utils/useScrollLock";
import AnnouncementBar from "./AnnouncementBar";

const LAYOUT_CONTENT_KEYS = ["contact", "home", "edition"];
const LOGO_SRC = "/img/Logo 2.0/SVG/Logo_4.svg";

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

function useActiveHomeSection(isHome: boolean) {
    const [activeSection, setActiveSection] = useState("home");

    useEffect(() => {
        if (!isHome) return;

        const sections = ["home", "event", "select", "gallery", "contact"]
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

type NavItem = { label: string; section?: string; to?: string };

const NAV_ITEMS: NavItem[] = [
    { label: "Event", section: "event" },
    { label: "Strefa Select", section: "select" },
    { label: "Galeria", to: "/galeria", section: "gallery" },
    { label: "FAQ", to: "/faq" },
    { label: "Kontakt", section: "contact" },
];

function NavItems({ isHome, activeSection, className, onNavigate }) {
    const { pathname } = useLocation();

    return NAV_ITEMS.map((item) => {
        const active =
            (item.to && pathname.startsWith(item.to)) ||
            (item.section && activeSection === item.section);
        const cls = `${className}${active ? " is-active" : ""}`;

        if (item.to) {
            return (
                <Link key={item.label} className={cls} to={item.to} onClick={onNavigate}>
                    {item.label}
                </Link>
            );
        }
        return (
            <a
                key={item.label}
                className={cls}
                href={isHome ? `#${item.section}` : `/#${item.section}`}
                onClick={onNavigate}
            >
                {item.label}
            </a>
        );
    });
}

function initials(user) {
    return `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "?";
}

function accountLinks(user) {
    const links = [
        { to: "/panel", icon: "bi-speedometer2", label: "Panel konta" },
        { to: "/garaz", icon: "bi-car-front", label: "Mój garaż" },
        { to: "/ustawienia-konta", icon: "bi-gear", label: "Ustawienia konta" },
    ];
    if (user.role === "admin") {
        links.push({ to: "/admin", icon: "bi-shield-lock", label: "Administrator" });
    }
    if (user.canCheckIn && user.role !== "admin") {
        links.push({ to: "/wjazd", icon: "bi-qr-code-scan", label: "Wjazd" });
    }
    return links;
}

function AccountMenu({ user, onLogout }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const { pathname } = useLocation();

    useEffect(() => setOpen(false), [pathname]);

    useEffect(() => {
        if (!open) return;
        function onPointerDown(event: PointerEvent) {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        }
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false);
                buttonRef.current?.focus();
            }
        }
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        rootRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    function onMenuKeyDown(event: React.KeyboardEvent) {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const items = [
            ...(rootRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") || []),
        ];
        const current = items.indexOf(document.activeElement as HTMLElement);
        const next =
            event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
                    items.length;
        items[next]?.focus();
    }

    return (
        <div className="account-menu" ref={rootRef}>
            <button
                ref={buttonRef}
                type="button"
                className={`account-menu-button${open ? " is-open" : ""}`}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
            >
                <span className="account-avatar" aria-hidden="true">
                    {initials(user)}
                </span>
                <span className="account-menu-name">{user.firstName || "Konto"}</span>
                <i className={`bi ${open ? "bi-chevron-up" : "bi-chevron-down"}`} aria-hidden="true" />
            </button>
            {open && (
                <div className="account-menu-list" role="menu" onKeyDown={onMenuKeyDown}>
                    {accountLinks(user).map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            role="menuitem"
                            className={({ isActive }) =>
                                `account-menu-item${isActive ? " is-active" : ""}`
                            }
                        >
                            <i className={`bi ${link.icon}`} aria-hidden="true" />
                            {link.label}
                        </NavLink>
                    ))}
                    <div className="account-menu-separator" role="separator" />
                    <button
                        type="button"
                        role="menuitem"
                        className="account-menu-item is-muted"
                        onClick={onLogout}
                    >
                        <i className="bi bi-box-arrow-right" aria-hidden="true" />
                        Wyloguj
                    </button>
                </div>
            )}
        </div>
    );
}

function MobileMenu({ user, isHome, activeSection, ticketUrl, ticketLabel, eventLine, onClose, onLogout }) {
    useScrollLock(true);
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") onClose();
        }
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    // Focus goes back to the hamburger button when the menu closes.
    useEffect(() => {
        return () => document.querySelector<HTMLElement>(".site-nav-toggle")?.focus();
    }, []);

    return (
        <div className="mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="mobile-menu-top">
                <Link to="/" onClick={onClose} className="site-nav-logo">
                    <img src={LOGO_SRC} alt="Street Meeting Poland – strona główna" />
                </Link>
                <button type="button" className="site-nav-icon-button" onClick={onClose} aria-label="Zamknij menu">
                    <i className="bi bi-x" aria-hidden="true" />
                </button>
            </div>
            <nav className="mobile-menu-links" aria-label="Główna">
                <NavItems
                    isHome={isHome}
                    activeSection={activeSection}
                    className="mobile-menu-link"
                    onNavigate={onClose}
                />
                {user ? (
                    <div className="mobile-menu-account">
                        {accountLinks(user).map((link) => (
                            <Link key={link.to} to={link.to} onClick={onClose}>
                                <i className={`bi ${link.icon}`} aria-hidden="true" />
                                {link.label}
                            </Link>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onLogout();
                            }}
                        >
                            <i className="bi bi-box-arrow-right" aria-hidden="true" />
                            Wyloguj
                        </button>
                    </div>
                ) : (
                    <Link to="/logowanie" className="mobile-menu-login" onClick={onClose}>
                        <i className="bi bi-person-circle" aria-hidden="true" />
                        Zaloguj się
                    </Link>
                )}
            </nav>
            <div className="mobile-menu-bottom">
                {ticketUrl && (
                    <a
                        className="btn-street btn-street-primary btn-street-block"
                        href={ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {ticketLabel}
                    </a>
                )}
                {eventLine && <p>{eventLine}</p>}
            </div>
        </div>
    );
}

function SocialLinks({ contact }) {
    return (
        <>
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
        </>
    );
}

function HomeFooter({ contact }) {
    const year = new Date().getFullYear();
    return (
        <footer id="contact" className="site-footer site-footer-full">
            <div className="site-container">
                <div className="site-footer-grid">
                    <div className="site-footer-about">
                        <img src={LOGO_SRC} alt="Street Meeting Poland" className="site-footer-logo" />
                        <p>
                            Organizator Street Show – największego motoryzacyjnego show na
                            Polsat Plus Arena Gdańsk.
                        </p>
                    </div>
                    {contact && (
                        <div className="site-footer-col">
                            <h2>Kontakt</h2>
                            <a
                                href={contact.mapUrl || undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="site-footer-line"
                            >
                                <i className="bi bi-geo-alt" aria-hidden="true"></i>
                                <span>
                                    {contact.addressLine1}
                                    <br />
                                    {contact.addressLine2}
                                </span>
                            </a>
                            <a href={`mailto:${contact.email}`} className="site-footer-line">
                                <i className="bi bi-at" aria-hidden="true"></i>
                                <span>{contact.email}</span>
                            </a>
                        </div>
                    )}
                    {(contact?.facebookUrl || contact?.instagramUrl) && (
                        <div className="site-footer-col">
                            <h2>Obserwuj</h2>
                            <div className="site-footer-social is-large">
                                <SocialLinks contact={contact} />
                            </div>
                        </div>
                    )}
                </div>
                <div className="site-footer-bottom">
                    <p>&copy; {year} Street Meeting Poland</p>
                    <nav className="site-footer-links" aria-label="Stopka">
                        <Link to="/faq">FAQ</Link>
                        <Link to="/regulamin">Regulamin</Link>
                        <Link to="/polityka-prywatnosci">Polityka prywatności</Link>
                    </nav>
                </div>
            </div>
        </footer>
    );
}

function PageFooter({ contact }) {
    return (
        <footer className="site-footer">
            <div className="site-container site-footer-row">
                <p>&copy; {new Date().getFullYear()} Street Meeting Poland</p>
                <div className="site-footer-row-links">
                    <nav className="site-footer-links" aria-label="Stopka">
                        <Link to="/faq">FAQ</Link>
                        <Link to="/regulamin">Regulamin</Link>
                        <Link to="/polityka-prywatnosci">Polityka prywatności</Link>
                        {contact?.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
                    </nav>
                    <div className="site-footer-social">
                        <SocialLinks contact={contact} />
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default function Layout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const isHome = location.pathname === "/";
    const [menuOpen, setMenuOpen] = useState(false);
    const closeMenu = useCallback(() => setMenuOpen(false), []);

    useNavbarOffset();
    const activeHomeSection = useActiveHomeSection(isHome);
    const { content } = useContent(LAYOUT_CONTENT_KEYS);
    const contact = content?.contact;
    const ticketUrl = content?.home?.ticketUrl;
    const ticketLabel = content?.home?.ticketLabel || "Kup bilety";
    const edition = content?.edition;
    const eventLine = [formatEditionDate(edition), edition?.venueName].filter(Boolean).join(" · ");

    useEffect(() => setMenuOpen(false), [location.pathname]);

    return (
        <>
            <div className="fixed-top" id="navbar">
                <AnnouncementBar />
                <nav className="site-nav" aria-label="Główna">
                    <div className="site-container site-nav-inner">
                        <Link className="site-nav-logo" to="/">
                            <img src={LOGO_SRC} alt="Street Meeting Poland – strona główna" />
                        </Link>
                        <div className="site-nav-right">
                            <div className="site-nav-links">
                                <NavItems
                                    isHome={isHome}
                                    activeSection={activeHomeSection}
                                    className="site-nav-link"
                                    onNavigate={undefined}
                                />
                            </div>
                            <div className="site-nav-actions">
                                <div className="site-nav-account">
                                    {user ? (
                                        <AccountMenu user={user} onLogout={logout} />
                                    ) : (
                                        <NavLink className="site-nav-login" to="/logowanie">
                                            <i className="bi bi-person-circle" aria-hidden="true" />
                                            Zaloguj się
                                        </NavLink>
                                    )}
                                </div>
                                {ticketUrl && (
                                    <a
                                        className="btn-street btn-street-primary site-nav-tickets"
                                        href={ticketUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <span className="label-full">{ticketLabel}</span>
                                        <span className="label-short">Bilety</span>
                                    </a>
                                )}
                                <button
                                    type="button"
                                    className="site-nav-icon-button site-nav-toggle"
                                    aria-label="Otwórz menu"
                                    aria-expanded={menuOpen}
                                    aria-controls="mobile-menu"
                                    onClick={() => setMenuOpen(true)}
                                >
                                    <i className="bi bi-list" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    </div>
                </nav>
            </div>
            {menuOpen && (
                <MobileMenu
                    user={user}
                    isHome={isHome}
                    activeSection={activeHomeSection}
                    ticketUrl={ticketUrl}
                    ticketLabel={ticketLabel}
                    eventLine={eventLine}
                    onClose={closeMenu}
                    onLogout={logout}
                />
            )}

            <div className="app-page-content">
                <Suspense
                    fallback={<p className="page-status">Ładowanie...</p>}
                >
                    <Outlet />
                </Suspense>
            </div>

            {isHome ? <HomeFooter contact={contact} /> : <PageFooter contact={contact} />}
        </>
    );
}
