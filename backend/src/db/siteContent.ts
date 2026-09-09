const db = require("./database");

const DEFAULTS = {
    home: {
        heroTitle: "Street Show",
        heroDate: "29 sierpnia 2026",
        heroLocation: "Polsat Plus Arena, Gdańsk",
        heroImage: "/img/photos/Hero-image.webp",
        ticketLabel: "Kup bilety",
        ticketUrl: "https://bkb.pl/197944-209dd",
        exploreLabel: "Poznaj atrakcje",
    },
    gallery: {
        intro: "",
        linkLabel: "Przejdź do galerii",
        photos: [
            {
                id: "default-1",
                url: "/img/photos/Street Meeting Poland 2024-139.webp",
                alt: "Samochód wystawowy na Street Show 2024",
            },
            {
                id: "default-2",
                url: "/img/photos/Street Meeting Poland 2024-252.webp",
                alt: "Widok z wydarzenia Street Meeting Poland 2024",
            },
            {
                id: "default-3",
                url: "/img/photos/2024.03.29 Street Meeting 2-13.webp",
                alt: "Samochody na murawie podczas Street Meeting 2024",
            },
        ],
    },
    contact: {
        facebookUrl: "https://www.facebook.com/streetmeetingpoland/",
        instagramUrl: "https://www.instagram.com/streetmeetingpoland/",
        addressName: "Street Meeting Poland",
        addressLine1: "ul. Pokoleń Lechii Gdańsk 1",
        addressLine2: "80-560 Gdańsk",
        mapUrl: "http://maps.app.goo.gl/PePJY3TXBjM7t4v37",
        email: "streetmeetingpolska@gmail.com",
    },
};

db.exec(`
    CREATE TABLE IF NOT EXISTS site_content (
        content_key TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
`);

function getContent(key) {
    if (!DEFAULTS[key]) {
        throw new Error(`Nieznana sekcja treści: ${key}`);
    }

    const defaults = JSON.parse(JSON.stringify(DEFAULTS[key]));
    const row = db
        .prepare("SELECT content FROM site_content WHERE content_key = ?")
        .get(key);
    if (!row) return defaults;

    // Merge over defaults so fields added after a section was first saved don't come back undefined.
    try {
        return { ...defaults, ...JSON.parse(row.content) };
    } catch {
        return defaults;
    }
}

function saveContent(key, content) {
    if (!DEFAULTS[key]) {
        throw new Error(`Nieznana sekcja treści: ${key}`);
    }

    db.prepare(
        `
        INSERT INTO site_content (content_key, content, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(content_key) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at
    `,
    ).run(key, JSON.stringify(content));
    return content;
}

module.exports = { getContent, saveContent };
