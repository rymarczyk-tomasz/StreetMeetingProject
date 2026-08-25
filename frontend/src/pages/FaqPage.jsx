const FAQ_CATEGORIES = [
    {
        id: "Bilety",
        title: "Bilety i Rejestracja",
        items: [
            {
                q: "1. Gdzie mogę kupić bilety na wydarzenie?",
                a: (
                    <>
                        Bilety są dostępne online na stronie internetowej
                        operatora sprzedaży biletów –{" "}
                        <a
                            rel="noopener noreferrer"
                            target="_blank"
                            href="https://bkb.pl/197944-209dd"
                        >
                            Kupbilecik
                        </a>{" "}
                        oraz w punktach sprzedaży w dniu wydarzenia.
                    </>
                ),
            },
            {
                q: "2. Czy muszę wydrukować bilet?",
                a: "Nie musisz drukować biletu – wystarczy, że pokażesz go w wersji elektronicznej na swoim telefonie przy wejściu.",
            },
            {
                q: "3. Czy mogę zwrócić bilet, jeśli nie mogę przyjść na wydarzenie?",
                a: "Zgodnie z regulaminem zakupione bilety nie podlegają zwrotowi, chyba że wydarzenie zostanie odwołane.",
            },
            {
                q: "4. Czy dzieci potrzebują biletu?",
                a: "Dzieci do lat 6 wchodzą za darmo w towarzystwie opiekuna posiadającego bilet.",
            },
            {
                q: "5. Czy bilety będą dostępne na miejscu?",
                a: "Bilety można kupić w kasach na miejscu wydarzenia, o ile nie zostaną wyprzedane wcześniej online.",
            },
            {
                q: "6. Czy mogę wymienić bilet, jeśli kupiłem niewłaściwy?",
                a: "Tak, w przypadku zakupu niewłaściwego rodzaju biletu, prosimy o kontakt ze sprzedawcą biletów w celu dokonania wymiany.",
            },
        ],
    },
    {
        id: "Organizacja",
        title: "Organizacja Wydarzenia",
        items: [
            {
                q: "7. Jakie są godziny otwarcia wydarzenia?",
                a: "Wydarzenie odbędzie się w godzinach 12:00 – 18:00 dla biletów normalnych oraz 11:00 – 18:00 dla biletów VIP.",
            },
            {
                q: "8. Czy będzie dostępny harmonogram wydarzenia?",
                a: "Szczegółowy harmonogram znajdziesz na stronie internetowej operatora sprzedaży biletów – Kupbilecik oraz w punkcie informacyjnym podczas wydarzenia.",
            },
            {
                q: "9. Czy wydarzenie odbędzie się w przypadku złej pogody?",
                a: "Wydarzenie odbędzie się bez względu na warunki atmosferyczne, chyba że organizator zdecyduje inaczej.",
            },
            {
                q: "10. Czy na wydarzeniu będzie strefa gastronomiczna?",
                a: "Na terenie wydarzenia znajdować się będzie strefa foodtrucków z szerokim wyborem dań ciepłych i napojów.",
            },
            {
                q: "11. Czy mogę przyprowadzić zwierzę na wydarzenie?",
                a: "Ze względu na bezpieczeństwo zwierzęta nie są dozwolone, z wyjątkiem psów przewodników.",
            },
        ],
    },
    {
        id: "Dojazd",
        title: "Dojazd i Parking",
        items: [
            {
                q: "12. Jak dojechać na wydarzenie?",
                a: "Wydarzenie odbywa się na stadionie Polsat Plus Arena Gdańsk w Gdańsku, przy ulicy Pokoleń Lechii Gdańsk 1, 80-560 Gdańsk.",
            },
            {
                q: "13. Czy na miejscu jest parking?",
                a: "Tak, na terenie wydarzenia dostępny jest parking. Koszt parkowania wynosi 30 zł, płatne na miejscu.",
            },
        ],
    },
    {
        id: "Wystawcy",
        title: "Strefa Wystawców",
        items: [
            {
                q: "14. Czy mogę zrobić zdjęcia wystawianych pojazdów?",
                a: "Tak, zachęcamy do robienia zdjęć, jednak pamiętaj o szanowaniu zasad obowiązujących na stoiskach.",
            },
            {
                q: "15. Czy można wejść do prezentowanych pojazdów?",
                a: "Możliwość wejścia do pojazdów zależy od indywidualnych zasad ustalonych przez wystawców.",
            },
        ],
    },
    {
        id: "Bezpieczenstwo",
        title: "Bezpieczeństwo i Regulamin",
        items: [
            {
                q: "16. Czy na wydarzeniu obowiązuje regulamin?",
                a: "Tak, regulamin wydarzenia znajduje się na stronie internetowej oraz jest dostępny w punkcie informacyjnym na miejscu wydarzenia.",
            },
            {
                q: "17. Czy mogę wnieść drona lub inne urządzenia latające?",
                a: "Dla bezpieczeństwa uczestników korzystanie z dronów na terenie wydarzenia jest zabronione.",
            },
            {
                q: "18. Czy na miejscu będą dostępne służby medyczne?",
                a: "Tak, na terenie wydarzenia dostępne będą służby medyczne.",
            },
            {
                q: "19. Czy dostępne są akredytacje medialne?",
                a: "Nie, na to wydarzenie akredytacje medialne nie są wydawane. Jednak posiadacze biletów mogą swobodnie robić zdjęcia i nagrywać materiały wideo podczas wydarzenia.",
            },
            {
                q: "20. Czy mogę wejść z własnym napojem lub jedzeniem?",
                a: "Zgodnie z regulaminem wydarzenia, wnoszenie własnych napojów i jedzenia na teren imprezy nie jest dozwolone, chyba że stan zdrowia uczestnika wymaga specjalistycznej diety potwierdzonej orzeczeniem lekarskim. Zapraszamy do skorzystania ze strefy gastronomicznej dostępnej na miejscu.",
            },
        ],
    },
];

export default function FaqPage() {
    return (
        <div className="container my-5">
            <h1 className="text-center mb-4">FAQ</h1>
            <div className="accordion" id="faqAccordion">
                {FAQ_CATEGORIES.map((category, categoryIndex) => (
                    <div className="accordion-item" key={category.id}>
                        <h2
                            className="accordion-header"
                            id={`heading${category.id}`}
                        >
                            <button
                                className={
                                    categoryIndex === 0
                                        ? "accordion-button"
                                        : "accordion-button collapsed"
                                }
                                type="button"
                                data-bs-toggle="collapse"
                                data-bs-target={`#collapse${category.id}`}
                                aria-expanded={categoryIndex === 0}
                                aria-controls={`collapse${category.id}`}
                            >
                                {category.title}
                            </button>
                        </h2>
                        <div
                            id={`collapse${category.id}`}
                            className={
                                categoryIndex === 0
                                    ? "accordion-collapse collapse show"
                                    : "accordion-collapse collapse"
                            }
                            aria-labelledby={`heading${category.id}`}
                            data-bs-parent="#faqAccordion"
                        >
                            <div className="accordion-body">
                                {category.items.map((item, index) => (
                                    <p key={item.q} className="mb-0">
                                        <strong>{item.q}</strong>
                                        <br />
                                        {item.a}
                                        {index < category.items.length - 1 && (
                                            <>
                                                <br />
                                                <br />
                                            </>
                                        )}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
