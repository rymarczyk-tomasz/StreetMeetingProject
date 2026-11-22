const defaultFaq = require("./defaultFaq");
const defaultRegulamin = require("./defaultRegulamin");
const defaultPrivacy = require("./defaultPrivacy");
const defaultRegulaminSelect = require("./defaultRegulaminSelect");

// saved content is merged over these, so new fields get defaults too
const DEFAULTS = {
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
        heroMobileRotate: true,
        // x/y in %, zoom 1-3
        heroCropDesktop: { x: 50, y: 50, zoom: 1 },
        heroCropMobile: { x: 50, y: 50, zoom: 1 },
        ticketLabel: "Kup bilety",
        ticketUrl: "https://bkb.pl/225497-e27af",
        heroLead:
            "Najbardziej unikalne wydarzenie motoryzacyjne w Polsce – auta na murawie stadionu, drift taxi i strefa expo.",
    },
    event: {
        intro: "",
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
                text: "Dane pojazdu i dokładnie 5 zdjęć. Do decyzji możesz je poprawić albo wycofać.",
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
        // {limit} = vehicles per account from Settings, e.g. "5 pojazdów"
        note: "Do {limit} na konto · 5 zdjęć JPG, PNG, WEBP lub AVIF, łącznie do 50 MB",
        noteLinkLabel: "Pytania o strefę Select",
        noteLinkHref: "/faq",
    },
    gallery: {
        intro: "",
        linkLabel: "Zobacz galerię",
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
        footerText:
            "Organizator Street Show – wyjątkowej wystawy pojazdów na murawie Polsat Plus Areny w Gdańsku.",
    },
    faq: defaultFaq,
    regulamin: {
        title: defaultRegulamin.title,
        html: defaultRegulamin.html,
        pdfUrl: "",
    },
    regulaminSelect: {
        title: defaultRegulaminSelect.title,
        html: defaultRegulaminSelect.html,
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
        loggedInText: "",
        loggedInLinkUrl: "",
        loggedInLinkLabel: "",
        variant: "info",
        expiresAt: "",
    },
    partners: {
        enabled: true,
        title: "Partnerzy",
        items: [],
    },
    // while enabled, visitors see only a "work in progress" screen; admins keep full access
    maintenance: {
        enabled: false,
        title: "Strona w przebudowie",
        message: "Pracujemy nad stroną. Wkrótce wróci do działania — zajrzyj do nas niebawem.",
    },
    settings: {
        submissionsOpen: true,
        submissionsDeadline: "",
        selectFeeAmount: "",
        selectCapacity: 0,
        maxVehiclesPerUser: 5,

        paymentRecipient: "",
        paymentAccount: "",
        paymentTitleTemplate: "Strefa Select {rok} – {rejestracja}",
        paymentDeadline: "",
        paymentDaysAfterApproval: 0,
        showcaseEnabled: false,
        participantInfo: "",
        // online payment link (e.g. Przelewy24), one for every place
        paymentUrl: "",
        // what the participant sees in e-mails instead of the payment link address
        paymentLinkLabel: "kliknij, aby zapłacić przez Przelewy24",
    },
    templates: {
        // closing line of every e-mail the site sends
        signature: "Street Show Crew",
        // acceptance e-mail per place (notifications/email.ts#renderAcceptanceTemplate);
        // a line whose variable is empty is left out, "- " makes a list, **text** is bold
        // sent when the organizer confirms the payment (same rules as acceptance)
        paymentConfirmed: "Dzień dobry,\n\npotwierdzamy otrzymanie płatności za miejsce w strefie Select Street Show {rok} dla auta {marka} ({rejestracja}). Dziękujemy!\n\nMiejsce Państwa auta: **{miejsce}**\nWydarzenie: **{obiekt}**, {adres}\n{data}\n\nWejściówka z kodem QR czeka w panelu uczestnika: {panel}\nProsimy pokazać ją przy wjeździe – na telefonie albo wydrukowaną. W panelu można ją też pobrać jako PDF lub PNG.\n\nSzczegóły dotyczące dojazdu oraz godzin wjazdu przekażemy w osobnym e-mailu organizacyjnym.\n\nW przypadku pytań lub wątpliwości pozostajemy do Państwa dyspozycji.",
        acceptance: {
            murawa: "Dzień dobry,\n\nMiło nam poinformować, że Państwa zgłoszenie na strefę select Street Show {rok} zostało pozytywnie rozpatrzone.\n**Gratulujemy!**\n\nWydarzenie odbędzie się na:\n**{obiekt}**\n{adres}\n{kiedy}\n\nMiejsce Państwa auta: **{miejsce}**\n\nSzczegóły dotyczące instrukcji dojazdu oraz godzin rozpoczęcia wydarzenia przekażemy w kolejnym e-mailu organizacyjnym.\n\nProsimy o uregulowanie płatności za miejsce w strefie select {termin_platnosci}\nW tytule przelewu prosimy o wpisanie danych umieszczonych w formularzu zgłoszeniowym.\n\n**Link do płatności:** {link_platnosci}\n\n**Kwota: {kwota}**\n**Cena obejmuje:**\n- wjazd do wnętrza stadionu na otok murawy,\n- wjazd z jedną osobą towarzyszącą,\n- atrakcyjny pakiet powitalny.\n\nW przypadku pytań lub wątpliwości pozostajemy do Państwa dyspozycji.",
            tunel: "Dzień dobry,\n\nMiło nam poinformować, że Państwa zgłoszenie na strefę select Street Show {rok} zostało pozytywnie rozpatrzone.\n**Gratulujemy!**\n\nWydarzenie odbędzie się na:\n**{obiekt}**\n{adres}\n{kiedy}\n\nMiejsce Państwa auta: **{miejsce}**\n\nSzczegóły dotyczące instrukcji dojazdu oraz godzin rozpoczęcia wydarzenia przekażemy w kolejnym e-mailu organizacyjnym.\n\nProsimy o uregulowanie płatności za miejsce w strefie select {termin_platnosci}\nW tytule przelewu prosimy o wpisanie danych umieszczonych w formularzu zgłoszeniowym.\n\n**Link do płatności:** {link_platnosci}\n\n**Kwota: {kwota}**\n**Cena obejmuje:**\n- wjazd do wnętrza stadionu – miejsce w tunelu,\n- wjazd z jedną osobą towarzyszącą,\n- atrakcyjny pakiet powitalny.\n\nW przypadku pytań lub wątpliwości pozostajemy do Państwa dyspozycji.",
            korona: "Dzień dobry,\n\nMiło nam poinformować, że Państwa zgłoszenie na strefę select Street Show {rok} zostało pozytywnie rozpatrzone.\n**Gratulujemy!**\n\nWydarzenie odbędzie się na:\n**{obiekt}**\n{adres}\n{kiedy}\n\nMiejsce Państwa auta: **{miejsce}**\n\nSzczegóły dotyczące instrukcji dojazdu oraz godzin rozpoczęcia wydarzenia przekażemy w kolejnym e-mailu organizacyjnym.\n\nProsimy o uregulowanie płatności za miejsce w strefie select {termin_platnosci}\nW tytule przelewu prosimy o wpisanie danych umieszczonych w formularzu zgłoszeniowym.\n\n**Link do płatności:** {link_platnosci}\n\n**Kwota: {kwota}**\n**Cena obejmuje:**\n- wjazd na teren stadionu – miejsce na koronie,\n- wjazd z jedną osobą towarzyszącą,\n- atrakcyjny pakiet powitalny.\n\nW przypadku pytań lub wątpliwości pozostajemy do Państwa dyspozycji.",
        },
        // sent when a submission is rejected; the admin's note is added below it
        rejection: "Dzień dobry,\n\nDziękujemy za przesłanie zgłoszenia do udziału w Street Show {rok}.\n\nZ przykrością informujemy, że w związku z ograniczoną liczbą miejsc oraz bardzo dużą liczbą zgłoszeń, nie możemy w tym roku zakwalifikować Państwa do udziału w strefie select.\n\nChcielibyśmy jednak serdecznie zaprosić Państwa jako uczestników wydarzenia!\n\nUdział w Street Show {rok} to wspaniała okazja, aby wspólnie cieszyć się atmosferą naszego eventu, podziwiać inne pojazdy i wziąć udział w licznych atrakcjach przygotowanych dla gości.\n\nDziękujemy za zainteresowanie i wkład w rozwój Street Show – mamy nadzieję, że mimo wszystko będziemy mogli spotkać się z Państwem podczas tegorocznego wydarzenia.\n\nW razie jakichkolwiek pytań pozostajemy do Państwa dyspozycji.",
        // sent when a submission goes to the reserve list; the admin's note is added below it
        waitlist: "Dzień dobry,\n\nDziękujemy za przesłanie zgłoszenia do udziału w Street Show {rok}.\n\nInformujemy, że Państwa zgłoszenie ({marka}, {rejestracja}) trafiło na **listę rezerwową** strefy select. Ze względu na ograniczoną liczbę miejsc oraz bardzo dużą liczbę zgłoszeń nie możemy w tej chwili potwierdzić miejsca.\n\nJeżeli zwolni się miejsce, skontaktujemy się z Państwem e-mailem i prześlemy informacje dotyczące płatności. Do tego czasu nie trzeba niczego opłacać.\n\nW razie jakichkolwiek pytań pozostajemy do Państwa dyspozycji.",
        // media accreditation decisions; the admin sees and can change the text before it goes out.
        // No variable for the applicant's data: the form is open to anyone
        accreditationApprovedSubject: "Street Show: akredytacja medialna przyznana",
        accreditationApproved:
            "Dzień dobry,\n\nakredytacja medialna na Street Show {rok} została przyznana.\n\nWydarzenie: {obiekt}, {adres}\nTermin: {data}\n\nW razie pytań prosimy o odpowiedź na tę wiadomość.",
        accreditationRejectedSubject: "Street Show: akredytacja medialna – decyzja",
        accreditationRejected:
            "Dzień dobry,\n\ndziękujemy za wniosek o akredytację medialną na Street Show {rok}. Niestety tym razem nie możemy przyznać akredytacji.\n\nW razie pytań prosimy o odpowiedź na tę wiadomość.",
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
                id: "zone-change",
                kind: "zone",
                title: "Zmiana miejsca",
                subject: "",
                body: "Ze względów organizacyjnych Twoje auto {marka} ({rejestracja}) stanie w nowym miejscu: {miejsce}.\n\n[Dodatkowe informacje: np. brama i godzina wjazdu, kontakt w dniu wydarzenia]\n\nPrzepraszamy za zmianę i do zobaczenia na Street Show {rok}!",
            },
            {
                id: "group-payment",
                kind: "group",
                title: "Przypomnienie o opłacie",
                subject: "Street Show {rok}: przypomnienie o opłacie",
                body: "Przypominamy o opłacie za miejsce w strefie Select. Dane do przelewu znajdziesz w swoim panelu. Jeśli opłata jest już wykonana, zgłoś ją w panelu, najlepiej z potwierdzeniem przelewu.\n\nJeśli nie możesz przyjechać, napisz do nas w wiadomościach w panelu — miejsce dostanie ktoś z listy rezerwowej.",
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

const PUBLIC_CONTENT_KEYS = [
    "edition",
    "home",
    "event",
    "select",
    "gallery",
    "contact",
    "faq",
    "regulamin",
    "regulaminSelect",
    "privacy",
    "announcement",
    "partners",
    "maintenance",
];

module.exports = { DEFAULTS, PUBLIC_CONTENT_KEYS };
