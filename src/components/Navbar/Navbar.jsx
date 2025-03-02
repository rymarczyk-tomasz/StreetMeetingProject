import { useEffect } from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
    useEffect(() => {
        const navLinks = document.querySelectorAll(".nav-link");
        const navbarCollapse = document.getElementById("navbarNavAltMarkup");

        navLinks.forEach((link) => {
            link.addEventListener("click", () => {
                if (navbarCollapse.classList.contains("show")) {
                    new window.bootstrap.Collapse(navbarCollapse).toggle();
                }
            });
        });
    }, []);

    return (
        <nav
            className="navbar navbar-expand-lg bg-body-tertiary py-4 fixed-top"
            id="navbar"
        >
            <div className="container">
                <Link className="navbar-brand" to="/">
                    <img
                        className="logo"
                        src="img/Logo 2.0/SVG/Logo_4.svg"
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
                >
                    <div className="navbar-nav ms-auto">
                        <a className="nav-link" href="#home">
                            Home
                        </a>
                        <a className="nav-link" href="#event">
                            Event
                        </a>
                        <a className="nav-link" href="#gallery">
                            Galeria
                        </a>
                        <a className="nav-link" href="#contact">
                            Kontakt
                        </a>
                        <a className="nav-link" href="#form">
                            Formularz
                        </a>
                        <a className="nav-link" href="/faq">
                            FAQ
                        </a>
                        <a className="nav-link" href="/regulations">
                            Regulamin
                        </a>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
