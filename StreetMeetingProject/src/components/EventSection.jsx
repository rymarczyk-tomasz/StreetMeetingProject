import React from "react";

const EventSection = () => {
    return (
        <section id="event" className="bg-dark text-light event py-5">
            <div className="container text-center">
                <h2 className="display-3 pb-lg-3 text-uppercase">event</h2>
                <p className="py-3">
                    Przyjedź i odwiedź jedyne takie wydarzenie w Polsce.
                </p>
                <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
                    <div className="col">
                        <div className="card h-100">
                            <img
                                loading="lazy"
                                src="src/img/photos/10.jpg"
                                className="card-img-top"
                                alt="Samochody na murawie Polsat Plus Arena, Gdańsk, a na przodzie skłądane krzesełka z napisaem street meeting"
                            />
                            <div className="card-body">
                                <h3 className="card-title py-3">BILETY</h3>
                                <p className="card-text">
                                    Od 6 stycznia do 15 lutego kup swój bilet na
                                    wydarzenie w promocyjnej cenie! Link do
                                    biletów znajdziesz
                                    <a
                                        href="https://bkb.pl/151648-edcca "
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        TUTAJ
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="card h-100">
                            <img
                                loading="lazy"
                                src="src/img/photos/6.jpg"
                                className="card-img-top"
                                alt="Czeno biały nissan"
                            />
                            <div className="card-body">
                                <h3 className="card-title py-3">
                                    STREFA POJAZDÓW SELECT
                                </h3>
                                <p className="card-text">
                                    Zgłoś swój pojazd już teraz! Wyjątkowe
                                    pojazdy Select zostaną zaprezentowane
                                    wewnątrz stadionu, bezpośrednio na jego
                                    murawie. Formularz zgłoszeniowy znajdziesz
                                    poniżej.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="card h-100">
                            <img
                                loading="lazy"
                                src="src/img/photos/7.jpg"
                                className="card-img-top"
                                alt="Trzy driftujące samochody"
                            />
                            <div className="card-body">
                                <h3 className="card-title py-3">
                                    DRIFT TAXI ORAZ STREFA EXPO
                                </h3>
                                <p className="card-text">
                                    Nasze wydarzenie to doskonała okazja, by
                                    podziwiać widowiskowe drifterskie pokazy
                                    oraz samemu poczuć emocje, uczestnicząc w
                                    przejażdżkach jako pasażer. Dodatkowo, w
                                    specjalnej strefie expo czeka na Ciebie
                                    możliwość odkrywania najnowszych trendów
                                    motoryzacyjnych i poznania renomowanych
                                    marek z całej Polski i Europy.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default EventSection;
