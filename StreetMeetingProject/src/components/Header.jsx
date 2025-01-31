import React from "react";

const Header = () => {
    return (
        <header id="home" className="home">
            <div className="container-fluid h-100 d-flex flex-column justify-content-center align-items-center text-light text-center">
                <h1 className="display-3 text-uppercase">Street Show 2025</h1>

                <h2 className="mb-2 display-5 text-uppercase">31 maja</h2>

                <h2 className="mb-2 text-uppercase">
                    Polsat Plus Arena, Gdańsk
                </h2>

                <a
                    href="https://bkb.pl/151648-edcca "
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gallery-btn"
                >
                    Kup bilet
                </a>

                <div className="hero-shadow"></div>
            </div>
        </header>
    );
};

export default Header;
