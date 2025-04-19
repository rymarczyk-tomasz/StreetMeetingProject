import { useRef } from "react";
import { Link } from "react-router-dom";
import styles from "./NavBar.module.css";

const NavBar = () => {
    const navbarCollapseRef = useRef(null);

    const handleNavLinkClick = () => {
        if (navbarCollapseRef.current?.classList.contains("show")) {
            new window.bootstrap.Collapse(navbarCollapseRef.current).toggle();
        }
    };

    return (
        <nav
            className={`${styles.navbar} navbar navbar-expand-lg bg-body-tertiary fixed-top`}
            id="navbar"
        >
            <div className="container">
                <Link className="navbar-brand" to="/">
                    <img
                        className={styles.logo}
                        src="/img/Logo 2.0/SVG/Logo_4.svg"
                        alt="Street Meeting Poland"
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
                    ref={navbarCollapseRef}
                >
                    <div className="navbar-nav ms-auto">
                        <Link
                            className="nav-link"
                            to="/#home"
                            onClick={handleNavLinkClick}
                        >
                            Home
                        </Link>
                        <Link
                            className="nav-link"
                            to="/#event"
                            onClick={handleNavLinkClick}
                        >
                            Event
                        </Link>
                        <Link
                            className="nav-link"
                            to="/#gallery"
                            onClick={handleNavLinkClick}
                        >
                            Galeria
                        </Link>
                        <Link
                            className="nav-link"
                            to="/#contact"
                            onClick={handleNavLinkClick}
                        >
                            Kontakt
                        </Link>
                        <Link
                            className="nav-link"
                            to="/#form"
                            onClick={handleNavLinkClick}
                        >
                            Formularz
                        </Link>
                        <Link
                            className="nav-link"
                            to="/faq"
                            onClick={handleNavLinkClick}
                        >
                            FAQ
                        </Link>
                        <Link
                            className="nav-link"
                            to="/regulations"
                            onClick={handleNavLinkClick}
                        >
                            Regulamin
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default NavBar;
