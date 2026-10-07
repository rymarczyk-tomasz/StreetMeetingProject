const defaultFaq = require("./defaultFaq");
const defaultRegulamin = require("./defaultRegulamin");
const defaultPrivacy = require("./defaultPrivacy");

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
        heroLead:
            "Najbardziej unikalne wydarzenie motoryzacyjne w Polsce – auta na murawie stadionu, drift taxi i strefa expo.",
    },
    event: {
        intro: "Niezapomniane emocje, wyjątkowe samochody i atmosfera, jakiej nie znajdziesz nigdzie indziej.",
        cards: [
            {
                id: "select",
                title: "Strefa Select",
                description: "Masz unikalne auto? Zaprezentuj je na murawie stadionu.",
                image: "/img/photos/6.webp",
                alt: "Czarno-biały Nissan na wydarzeniu Street Show",
                actionLabel: "Jak się zgłosić",
                actionHref: "#select",
                actionExternal: false,
            },
            {
                id: "drift-taxi",
                title: "Drift taxi",
                description: "Widowiskowe pokazy driftu i przejażdżki na fotelu pasażera.",
                image: "/img/photos/7.webp",
                alt: "Trzy driftujące samochody podczas pokazu",
                actionLabel: "Szczegóły w FAQ",
                actionHref: "/faq",
                actionExternal: false,
            },
            {
                id: "expo",
                title: "Strefa expo",
                description: "Najnowsze trendy i renomowane marki z Polski i Europy.",
                image: "/img/photos/10.webp",
                alt: "Samochody na murawie Polsat Plus Arena, Gdańsk",
                actionLabel: "Kup bilety",
                actionHref: "#bilety",
                actionExternal: true,
            },
        ],
    },
    // "Strefa Select" section on the home page: how taking part works, in 4 steps.
    select: {
        eyebrow: "Strefa Select",
        title: "Wjedź autem na murawę",
        steps: [
            {
                title: "Konto i garaż",
                text: "Dodaj auta do garażu – w kolejnych latach zgłosisz je jednym kliknięciem.",
            },
            {
                title: "Zgłoszenie",
                text: "Dane pojazdu i do 5 zdjęć. Do decyzji możesz je poprawić albo wycofać.",
            },
            {
                title: "Akceptacja i opłata",
                text: "Decyzja przychodzi e-mailem, dane do przelewu znajdziesz w panelu.",
            },
            {
                title: "Wejściówka QR",
                text: "Pokazujesz kod przy wjeździe – na telefonie albo wydrukowany.",
            },
        ],
    },
    gallery: {
        intro: "",
        linkLabel: "Wszystkie albumy",
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
    privacy: {
        title: defaultPrivacy.title,
        html: defaultPrivacy.html,
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
        // Days to pay counted from approval (0 = only the fixed deadline above).
        paymentDaysAfterApproval: 0,
        // Public page with approved cars (photo-publishing consent only).
        showcaseEnabled: false,
        // Practical info for accepted participants (entry hours, what to bring…).
        participantInfo: "",
    },
    // Ready-made texts: "note" = comment for a participant on a submission,
    // "group" = group message. {rok}, {marka}, {rejestracja} are filled in.
    templates: {
        items: [
            {
                id: "note-photos",
                kind: "note",
                title: "Prośba o lepsze zdjęcia",
                subject: "",
                body: "Prosimy o dodanie wyraźniejszych zdjęć auta {marka} — najlepiej całe auto z przodu, z boku i z tyłu, w dziennym świetle. Do tego czasu zgłoszenie czeka na decyzję.",
            },
            {
                id: "note-capacity",
                kind: "note",
                title: "Odrzucenie: brak miejsc",
                subject: "",
                body: "Dziękujemy za zgłoszenie {marka} ({rejestracja}). Niestety liczba miejsc w strefie Select na edycję {rok} jest ograniczona i tym razem nie możemy przyjąć auta. Zapraszamy na wydarzenie jako widz i do zgłoszenia w kolejnej edycji!",
            },
            {
                id: "note-profile",
                kind: "note",
                title: "Odrzucenie: auto nie pasuje do strefy",
                subject: "",
                body: "Dziękujemy za zgłoszenie {marka}. Strefa Select w edycji {rok} ma określony charakter i tym razem nie zakwalifikowaliśmy auta. Zapraszamy na wydarzenie jako widz!",
            },
            {
                id: "note-waitlist",
                kind: "note",
                title: "Lista rezerwowa",
                subject: "",
                body: "Auto {marka} jest na liście rezerwowej. Jeśli zwolni się miejsce, odezwiemy się z akceptacją i danymi do opłaty.",
            },
            {
                id: "group-payment",
                kind: "group",
                title: "Przypomnienie o opłacie",
                subject: "Street Show {rok}: przypomnienie o opłacie",
                body: "Przypominamy o opłacie za miejsce w strefie Select. Dane do przelewu znajdziesz w swoim panelu. Jeśli opłata jest już wykonana, zgłoś ją w panelu, najlepiej z potwierdzeniem przelewu.\n\nJeśli nie możesz przyjechać, kliknij w panelu „Rezygnuję” — miejsce dostanie ktoś z listy rezerwowej.",
            },
            {
                id: "group-info",
                kind: "group",
                title: "Informacje przed wydarzeniem",
                subject: "Street Show {rok}: informacje dla uczestników strefy Select",
                body: "Już niedługo widzimy się na Street Show!\n\nWjazd dla strefy Select: [godziny i brama]\nZabierz ze sobą: wejściówkę z kodem QR (w panelu, można ją pobrać jako PDF/PNG) i dokument tożsamości.\nKontakt w dniu wydarzenia: [telefon]",
            },
            {
                id: "group-thanks",
                kind: "group",
                title: "Podziękowanie po wydarzeniu",
                subject: "Dziękujemy za Street Show {rok}!",
                body: "Dziękujemy, że byliście z nami! Zdjęcia z wydarzenia znajdziecie wkrótce w galerii na stronie.\n\nDo zobaczenia w kolejnej edycji!",
            },
        ],
    },
};

// Sections anyone may read through the public API.
const PUBLIC_CONTENT_KEYS = [
    "edition",
    "home",
    "event",
    "select",
    "gallery",
    "contact",
    "faq",
    "regulamin",
    "privacy",
    "announcement",
    "partners",
];

module.exports = { DEFAULTS, PUBLIC_CONTENT_KEYS };
