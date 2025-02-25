import Card from "./Card";

const EventSection = () => {
    return (
        <section id="event" className="bg-dark text-light event py-5">
            <div className="container text-center">
                <h2 className="display-3 pb-lg-3 text-uppercase">event</h2>
                <p className="py-3">
                    Przyjedź i odwiedź jedyne takie wydarzenie w Polsce.
                </p>
                <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
                    <Card
                        imgSrc="/img/photos/10.webp"
                        imgAlt="Samochody na murawie Polsat Plus Arena, Gdańsk, a na przodzie skłądane krzesełka z napisaem street meeting"
                        title="BILETY"
                    >
                        <strong>Zarezerwuj swoje miejsce już teraz! </strong>
                        <br />
                        Bilety na wydarzenie kupisz{" "}
                        <a
                            href="https://bkb.pl/151648-edcca"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            TUTAJ
                        </a>
                        . <br />
                        <strong>Zyskaj 15% zniżki!</strong>
                        <br />
                        Zapisz się do naszego newslettera i odbierz kod rabatowy
                        na bilet. Formularz zapisu znajdziesz na dole strony!
                    </Card>
                    <Card
                        imgSrc="/img/photos/6.webp"
                        imgAlt="Czeno biały nissan"
                        title="STREFA POJAZDÓW SELECT"
                    >
                        <strong>Pokaż swój wyjątkowy pojazd!</strong>
                        <br />
                        Masz unikalne auto? Nie przegap szansy na jego
                        prezentację
                        <strong>na murawie stadionu</strong> w strefie{" "}
                        <strong>Select</strong>!
                    </Card>
                    <Card
                        imgSrc="/img/photos/7.webp"
                        imgAlt="Trzy driftujące samochody"
                        title="DRIFT TAXI ORAZ STREFA EXPO"
                    >
                        Doświadcz prawdziwych motoryzacyjnych emocji!
                        Widowiskowe pokazy driftu, przejażdżki na fotelu
                        pasażera i adrenalina na najwyższym poziomie! W
                        specjalnej strefie expo czekają na Ciebie najnowsze
                        trendy motoryzacyjne oraz renomowane marki z Polski i
                        Europy.
                    </Card>
                </div>
            </div>
        </section>
    );
};

export default EventSection;
