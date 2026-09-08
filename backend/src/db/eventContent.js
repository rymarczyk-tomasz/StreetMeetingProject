const db = require("./database");

const DEFAULT_EVENT_CONTENT = {
    intro: "Weź udział w najbardziej unikalnym wydarzeniu motoryzacyjnym w Polsce! Niezapomniane emocje, wyjątkowe samochody i atmosfera, jakiej nie znajdziesz nigdzie indziej.",
    cards: [
        {
            id: "tickets",
            title: "BILETY",
            description:
                "Zarezerwuj swoje miejsce już teraz!\nBilety na wydarzenie kupisz TUTAJ.",
            image: "/img/photos/10.webp",
            alt: "Samochody na murawie Polsat Plus Arena, Gdańsk",
            actionLabel: "Kup bilety",
            actionHref: "https://bkb.pl/197944-209dd",
            actionExternal: true,
        },
        {
            id: "select",
            title: "STREFA POJAZDÓW SELECT",
            description:
                "Pokaż swój wyjątkowy pojazd!\nMasz unikalne auto? Nie przegap szansy na jego prezentację na murawie stadionu w strefie Select!",
            image: "/img/photos/6.webp",
            alt: "Czarno-biały Nissan na wydarzeniu Street Show",
            actionLabel: "Zgłoś pojazd",
            actionHref: "/formularz",
            actionExternal: false,
        },
        {
            id: "drift-expo",
            title: "DRIFT TAXI ORAZ STREFA EXPO",
            description:
                "Doświadcz prawdziwych motoryzacyjnych emocji! Widowiskowe pokazy driftu, przejażdżki na fotelu pasażera i adrenalina na najwyższym poziomie! W specjalnej strefie expo czekają na Ciebie najnowsze trendy motoryzacyjne oraz renomowane marki z Polski i Europy.",
            image: "/img/photos/7.webp",
            alt: "Trzy driftujące samochody podczas pokazu",
            actionLabel: "Sprawdź atrakcje",
            actionHref: "#contact",
            actionExternal: false,
        },
    ],
};

db.exec(`
    CREATE TABLE IF NOT EXISTS event_content (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        content TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
`);

function getEventContent() {
    const row = db
        .prepare("SELECT content FROM event_content WHERE id = 1")
        .get();
    if (!row) return JSON.parse(JSON.stringify(DEFAULT_EVENT_CONTENT));

    try {
        return JSON.parse(row.content);
    } catch {
        return JSON.parse(JSON.stringify(DEFAULT_EVENT_CONTENT));
    }
}

function saveEventContent(content) {
    db.prepare(
        `
        INSERT INTO event_content (id, content, updated_at)
        VALUES (1, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at
    `,
    ).run(JSON.stringify(content));
    return content;
}

module.exports = { getEventContent, saveEventContent };
