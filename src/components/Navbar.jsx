import React from "react";

const Navbar = () => {
    return (
        <nav
            className="navbar navbar-expand-lg bg-body-tertiary py-4 fixed-top"
            id="navbar"
        >
            <div className="container">
                <a className="navbar-brand" href="#home">
                    <img
                        className="logo"
                        src="img/Logo 2.0/SVG/Logo_4.svg"
                        alt="Street Meeting Poland"
                    />
                </a>
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
                        <a className="nav-link active" href="#home">
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
                        <a
                            className="nav-link"
                            href="https://streetshow.pl/faq"
                            rel="noopener noreferrer"
                        >
                            FAQ
                        </a>
                        <a
                            className="nav-link"
                            href="https://streetshow.pl/regulamin"
                            rel="noopener noreferrer"
                        >
                            Regulamin
                        </a>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
