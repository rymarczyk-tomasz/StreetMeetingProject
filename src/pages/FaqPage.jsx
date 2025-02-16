import BackButton from "../components/BackButton";

const FAQ = () => {
    return (
        <div className="container my-5">
            <h1 style={{ marginTop: "100px" }} className="text-center mb-4">
                FAQ
            </h1>
            <div className="accordion" id="faqAccordion">
                <div className="accordion-item">
                    <h2 className="accordion-header" id="headingBilety">
                        <button
                            className="accordion-button"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#collapseBilety"
                            aria-expanded="true"
                            aria-controls="collapseBilety"
                        >
                            Bilety i Rejestracja
                        </button>
                    </h2>
                    <div
                        id="collapseBilety"
                        className="accordion-collapse collapse show"
                        aria-labelledby="headingBilety"
                        data-bs-parent="#faqAccordion"
                    >
                        <div className="accordion-body">
                            <strong>
                                1. Gdzie mogę kupić bilety na wydarzenie?
                            </strong>
                            <br />
                            Bilety są dostępne online na stronie internetowej
                            operatora sprzedaży biletów –{" "}
                            <a
                                rel="noopener noreferrer"
                                target="_blank"
                                href="https://bkb.pl/151648-edcca"
                            >
                                Kupbilecik
                            </a>{" "}
                            oraz w punktach sprzedaży w dniu wydarzenia.
                            <br />
                            <br />
                            <strong>2. Czy muszę wydrukować bilet?</strong>
                            <br />
                            Nie musisz drukować biletu – wystarczy, że pokażesz
                            go w wersji elektronicznej na swoim telefonie przy
                            wejściu.
                            <br />
                            <br />
                            <strong>
                                3. Czy mogę zwrócić bilet, jeśli nie mogę
                                przyjść na wydarzenie?
                            </strong>
                            <br />
                            Zgodnie z regulaminem zakupione bilety nie podlegają
                            zwrotowi, chyba że wydarzenie zostanie odwołane.
                            <br />
                            <br />
                            <strong>4. Czy dzieci potrzebują biletu?</strong>
                            <br />
                            Dzieci do lat 6 wchodzą za darmo w towarzystwie
                            opiekuna posiadającego bilet.
                            <br />
                            <br />
                            <strong>
                                5. Czy bilety będą dostępne na miejscu?
                            </strong>
                            <br />
                            Bilety można kupić w kasach na miejscu wydarzenia, o
                            ile nie zostaną wyprzedane wcześniej online.
                            <br />
                            <br />
                            <strong>
                                6. Czy mogę wymienić bilet, jeśli kupiłem
                                niewłaściwy?
                            </strong>
                            <br />
                            Tak, w przypadku zakupu niewłaściwego rodzaju
                            biletu, prosimy o kontakt ze sprzedawcą biletów w
                            celu dokonania wymiany.
                        </div>
                    </div>
                </div>
                <div className="accordion-item">
                    <h2 className="accordion-header" id="headingOrganizacja">
                        <button
                            className="accordion-button collapsed"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#collapseOrganizacja"
                            aria-expanded="false"
                            aria-controls="collapseOrganizacja"
                        >
                            Organizacja Wydarzenia
                        </button>
                    </h2>
                    <div
                        id="collapseOrganizacja"
                        className="accordion-collapse collapse"
                        aria-labelledby="headingOrganizacja"
                        data-bs-parent="#faqAccordion"
                    >
                        <div className="accordion-body">
                            <strong>
                                7. Jakie są godziny otwarcia wydarzenia?
                            </strong>
                            <br />
                            Wydarzenie odbędzie się w godzinach 12:00 – 21:00
                            dla biletów normalnych oraz 11:00 – 23:00 dla
                            biletów VIP.
                            <br />
                            <br />
                            <strong>
                                8. Czy będzie dostępny harmonogram wydarzenia?
                            </strong>
                            <br />
                            Szczegółowy harmonogram znajdziesz na stronie
                            internetowej operatora sprzedaży biletów –
                            Kupbilecik oraz w punkcie informacyjnym podczas
                            wydarzenia.
                            <br />
                            <br />
                            <strong>
                                9. Czy wydarzenie odbędzie się w przypadku złej
                                pogody?
                            </strong>
                            <br />
                            Wydarzenie odbędzie się bez względu na warunki
                            atmosferyczne, chyba że organizator zdecyduje
                            inaczej.
                            <br />
                            <br />
                            <strong>
                                10. Czy na wydarzeniu będzie strefa
                                gastronomiczna?
                            </strong>
                            <br />
                            Na terenie wydarzenia znajdować się będzie strefa
                            foodtrucków z szerokim wyborem dań ciepłych i
                            napojów.
                            <br />
                            <br />
                            <strong>
                                11. Czy mogę przyprowadzić zwierzę na
                                wydarzenie?
                            </strong>
                            <br />
                            Ze względu na bezpieczeństwo zwierzęta nie są
                            dozwolone, z wyjątkiem psów przewodników.
                        </div>
                    </div>
                </div>

                <div className="accordion-item">
                    <h2 className="accordion-header" id="headingDojazd">
                        <button
                            className="accordion-button collapsed"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#collapseDojazd"
                            aria-expanded="false"
                            aria-controls="collapseDojazd"
                        >
                            Dojazd i Parking
                        </button>
                    </h2>
                    <div
                        id="collapseDojazd"
                        className="accordion-collapse collapse"
                        aria-labelledby="headingDojazd"
                        data-bs-parent="#faqAccordion"
                    >
                        <div className="accordion-body">
                            <strong>12. Jak dojechać na wydarzenie?</strong>
                            <br />
                            Wydarzenie odbywa się na stadionie Polsat Plus Arena
                            Gdańsk w Gdańsku, przy ulicy Pokoleń Lechii Gdańsk
                            1, 80-560 Gdańsk.
                            <br />
                            <br />
                            <strong>13. Czy na miejscu jest parking?</strong>
                            <br />
                            Tak, na terenie wydarzenia dostępny jest parking.
                            Koszt parkowania wynosi [30 zł], płatne na miejscu.
                        </div>
                    </div>
                </div>

                <div className="accordion-item">
                    <h2 className="accordion-header" id="headingWystawcy">
                        <button
                            className="accordion-button collapsed"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#collapseWystawcy"
                            aria-expanded="false"
                            aria-controls="collapseWystawcy"
                        >
                            Strefa Wystawców
                        </button>
                    </h2>
                    <div
                        id="collapseWystawcy"
                        className="accordion-collapse collapse"
                        aria-labelledby="headingWystawcy"
                        data-bs-parent="#faqAccordion"
                    >
                        <div className="accordion-body">
                            <strong>
                                14. Czy mogę zrobić zdjęcia wystawianych
                                pojazdów?
                            </strong>
                            <br />
                            Tak, zachęcamy do robienia zdjęć, jednak pamiętaj o
                            szanowaniu zasad obowiązujących na stoiskach.
                            <br />
                            <br />
                            <strong>
                                15. Czy można wejść do prezentowanych pojazdów?
                            </strong>
                            <br />
                            Możliwość wejścia do pojazdów zależy od
                            indywidualnych zasad ustalonych przez wystawców.
                        </div>
                    </div>
                </div>

                <div className="accordion-item">
                    <h2 className="accordion-header" id="headingBezpieczenstwo">
                        <button
                            className="accordion-button collapsed"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#collapseBezpieczenstwo"
                            aria-expanded="false"
                            aria-controls="collapseBezpieczenstwo"
                        >
                            Bezpieczeństwo i Regulamin
                        </button>
                    </h2>
                    <div
                        id="collapseBezpieczenstwo"
                        className="accordion-collapse collapse"
                        aria-labelledby="headingBezpieczenstwo"
                        data-bs-parent="#faqAccordion"
                    >
                        <div className="accordion-body">
                            <strong>
                                16. Czy na wydarzeniu obowiązuje regulamin?
                            </strong>
                            <br />
                            Tak, regulamin wydarzenia znajduje się na stronie
                            internetowej oraz jest dostępny w punkcie
                            informacyjnym na miejscu wydarzenia.
                            <br />
                            <br />
                            <strong>
                                17. Czy mogę wnieść drona lub inne urządzenia
                                latające?
                            </strong>
                            <br />
                            Dla bezpieczeństwa uczestników korzystanie z dronów
                            na terenie wydarzenia jest zabronione.
                            <br />
                            <br />
                            <strong>
                                18. Czy na miejscu będą dostępne służby
                                medyczne?
                            </strong>
                            <br />
                            Tak, na terenie wydarzenia dostępne będą służby
                            medyczne.
                            <br />
                            <br />
                            <strong>
                                19. Czy dostępne są akredytacje medialne?
                            </strong>
                            <br />
                            Nie, na to wydarzenie akredytacje medialne nie są
                            wydawane. Jednak posiadacze biletów mogą swobodnie
                            robić zdjęcia i nagrywać materiały wideo podczas
                            wydarzenia.
                            <br />
                            <br />
                            <strong>
                                20. Czy mogę wejść z własnym napojem lub
                                jedzeniem?
                            </strong>
                            <br />
                            Zgodnie z regulaminem wydarzenia, wnoszenie własnych
                            napojów i jedzenia na teren imprezy nie jest
                            dozwolone, chyba że stan zdrowia uczestnika wymaga
                            specjalistycznej diety potwierdzonej orzeczeniem
                            lekarskim. Zapraszamy do skorzystania ze strefy
                            gastronomicznej dostępnej na miejscu.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FAQ;
