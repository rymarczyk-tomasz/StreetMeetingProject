const defaultFaq = require("./defaultFaq");
const defaultRegulamin = require("./defaultRegulamin");

// Fallback content for every editable section, used until an admin saves it.
// Saved content is merged over these, so new fields get sensible values.
const DEFAULTS = {
    // The current event edition. Its year scopes submissions, limits and stats;
    // date/venue are shown on the home page and in structured data.
    edition: {
        year: 2027,
        name: "Street Show 2027",
        date: "",
        dateText: "Termin wkrótce",
        startTime: "12:00",
        endTime: "18:00",
        venueName: "Polsat Plus Arena Gdańsk",
        venueAddress: "ul. Pokoleń Lechii Gdańsk 1, 80-560 Gdańsk",
    },
    home: {
        heroTitle: "Street Show",
        heroImage: "/img/photos/Hero-image.webp",
        // Optional upright photo for phones; empty = use heroImage.
        heroImageMobile: "",
        // Lay the (landscape) hero photo on its side on phones held upright.
        heroMobileRotate: true,
        // Framing set in the admin crop tool: x/y = point of the photo (in %) that
        // stays in view, zoom = 1 (whole width/height) … 3.
        heroCropDesktop: { x: 50, y: 50, zoom: 1 },
        heroCropMobile: { x: 50, y: 50, zoom: 1 },
        ticketLabel: "Kup bilety",
        ticketUrl: "https://bkb.pl/197944-209dd",
        exploreLabel: "Poznaj atrakcje",
    },
    event: {
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
    faq: defaultFaq,
    regulamin: {
        title: defaultRegulamin.title,
        html: defaultRegulamin.html,
        pdfUrl: "",
    },
    announcement: {
        enabled: false,
        text: "",
        linkUrl: "",
        linkLabel: "",
        variant: "info",
        expiresAt: "",
    },
    partners: {
        title: "Partnerzy",
        items: [],
    },
    // Not page content, but editable from the admin panel the same way.
    settings: {
        submissionsOpen: true,
        submissionsDeadline: "",
        selectFeeAmount: "",
        selectCapacity: 0,
        maxVehiclesPerUser: 5,
        // Bank transfer details shown to participants with an approved submission.
        // In the title, {rok} = edition year, {rejestracja} = licence plate.
        paymentRecipient: "",
        paymentAccount: "",
        paymentTitleTemplate: "Strefa Select {rok} – {rejestracja}",
        paymentDeadline: "",
        // Practical info for accepted participants (entry hours, what to bring…).
        participantInfo: "",
    },
};

// Sections anyone may read through the public API.
const PUBLIC_CONTENT_KEYS = [
    "edition",
    "home",
    "event",
    "gallery",
    "contact",
    "faq",
    "regulamin",
    "announcement",
    "partners",
];

module.exports = { DEFAULTS, PUBLIC_CONTENT_KEYS };
