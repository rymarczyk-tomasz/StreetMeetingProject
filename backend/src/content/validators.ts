const { EMAIL_REGEX, normalizeText, isSafeUrl } = require("../utils/validation");
const { sanitizeRichText, isRichTextEmpty } = require("../utils/html");

// Each validator turns untrusted admin input into the stored shape, or returns
// { error } with a message for the panel. Unknown fields are always dropped.

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function urlError(label) {
    return `${label}: podaj adres zaczynający się od https:// lub ścieżkę zaczynającą się od /.`;
}

function text(value, maxLength = 500) {
    return normalizeText(value).slice(0, maxLength);
}

function makeId(value, fallback) {
    const id = text(value, 60).replace(/[^a-zA-Z0-9_-]/g, "");
    return id || fallback;
}

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function validateEdition(input) {
    const content = {
        year: Number(input.year),
        name: text(input.name, 120),
        date: text(input.date, 10),
        dateText: text(input.dateText, 120),
        startTime: text(input.startTime, 5),
        endTime: text(input.endTime, 5),
        venueName: text(input.venueName, 200),
        venueAddress: text(input.venueAddress, 300),
    };

    if (!Number.isInteger(content.year) || content.year < 2020 || content.year > 2100) {
        return { error: "Rok edycji musi być liczbą, np. 2027." };
    }
    if (!content.name || !content.venueName) {
        return { error: "Podaj nazwę edycji i miejsce wydarzenia." };
    }
    if (content.date && !DATE_REGEX.test(content.date)) {
        return { error: "Data wydarzenia musi mieć format RRRR-MM-DD." };
    }
    if (!content.date && !content.dateText) {
        return { error: "Podaj datę wydarzenia albo tekst zastępczy (np. „Termin wkrótce”)." };
    }
    for (const [field, label] of [
        ["startTime", "Godzina rozpoczęcia"],
        ["endTime", "Godzina zakończenia"],
    ]) {
        if (content[field] && !TIME_REGEX.test(content[field])) {
            return { error: `${label} musi mieć format GG:MM.` };
        }
    }
    return { content };
}

function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

// Hero framing from the admin crop tool; out-of-range values are clamped.
function readCrop(crop) {
    return {
        x: Math.round(clampNumber(crop?.x, 0, 100, 50) * 10) / 10,
        y: Math.round(clampNumber(crop?.y, 0, 100, 50) * 10) / 10,
        zoom: Math.round(clampNumber(crop?.zoom, 1, 3, 1) * 100) / 100,
    };
}

function validateHome(input) {
    const required = {
        heroTitle: text(input.heroTitle, 120),
        heroImage: text(input.heroImage, 500),
        ticketLabel: text(input.ticketLabel, 60),
        ticketUrl: text(input.ticketUrl, 500),
    };

    if (Object.values(required).some((value) => !value)) {
        return { error: "Uzupełnij wszystkie pola sekcji Home." };
    }

    const content = {
        ...required,
        heroLead: text(input.heroLead, 300),
        heroImageMobile: text(input.heroImageMobile, 500),
        heroMobileRotate: Boolean(input.heroMobileRotate),
        heroCropDesktop: readCrop(input.heroCropDesktop),
        heroCropMobile: readCrop(input.heroCropMobile),
    };

    if (!isSafeUrl(content.heroImage)) return { error: urlError("Zdjęcie hero") };
    if (!isSafeUrl(content.heroImageMobile, { allowEmpty: true })) {
        return { error: urlError("Zdjęcie hero na telefon") };
    }
    if (!isSafeUrl(content.ticketUrl)) return { error: urlError("Link do biletów") };
    return { content };
}

function validateEvent(input) {
    const cards = asArray(input.cards).map((card, index) => ({
        id: makeId(card.id, `card-${index + 1}`),
        title: text(card.title, 120),
        description: text(card.description, 2000),
        image: text(card.image, 500),
        alt: text(card.alt, 200),
        actionLabel: text(card.actionLabel, 60),
        actionHref: text(card.actionHref, 500),
        actionExternal: /^https?:\/\//i.test(text(card.actionHref, 500)),
    }));
    const intro = text(input.intro, 2000);

    if (!intro) return { error: "Uzupełnij opis sekcji Event." };
    if (cards.length < 1 || cards.length > 6) {
        return { error: "Sekcja Event musi mieć od 1 do 6 kafelków." };
    }
    for (const [index, card] of cards.entries()) {
        const label = `Kafelek ${index + 1}`;
        if (!card.title || !card.description || !card.image || !card.alt) {
            return {
                error: `${label}: uzupełnij tytuł, treść, zdjęcie i tekst alternatywny.`,
            };
        }
        if (!isSafeUrl(card.image)) return { error: urlError(`${label} – zdjęcie`) };
        if (!isSafeUrl(card.actionHref, { allowEmpty: true })) {
            return { error: urlError(`${label} – link`) };
        }
        if (card.actionHref && !card.actionLabel) {
            return { error: `${label}: podaj tekst przycisku dla linku.` };
        }
    }
    // Keep ids unique even if an admin duplicated a card.
    const seen = new Set();
    for (const [index, card] of cards.entries()) {
        if (seen.has(card.id)) card.id = `${card.id}-${index + 1}`;
        seen.add(card.id);
    }
    return { content: { intro, cards } };
}

const SELECT_STEP_COUNT = 4;

function validateSelect(input) {
    const steps = asArray(input.steps)
        .slice(0, SELECT_STEP_COUNT)
        .map((step) => ({ title: text(step?.title, 80), text: text(step?.text, 300) }));
    const content = {
        eyebrow: text(input.eyebrow, 60),
        title: text(input.title, 120),
        steps,
    };

    if (!content.title) return { error: "Podaj tytuł sekcji Strefa Select." };
    if (steps.length !== SELECT_STEP_COUNT || steps.some((step) => !step.title || !step.text)) {
        return { error: "Uzupełnij tytuł i opis wszystkich 4 kroków." };
    }
    return { content };
}

function validateGalleryPreview(input) {
    const content = {
        intro: text(input.intro, 1000),
        linkLabel: text(input.linkLabel, 60),
        photos: asArray(input.photos)
            .slice(0, 12)
            .map((photo, index) => ({
                id: makeId(photo.id, `photo-${index + 1}`),
                url: text(photo.url, 500),
                alt: text(photo.alt, 200),
            })),
    };

    if (!content.linkLabel) return { error: "Podaj tekst przycisku do galerii." };
    if (content.photos.some((photo) => !photo.url)) {
        return { error: "Każde zdjęcie w podglądzie galerii musi mieć plik lub URL." };
    }
    if (content.photos.some((photo) => !isSafeUrl(photo.url))) {
        return { error: urlError("Zdjęcie galerii") };
    }
    return { content };
}

function validateContact(input) {
    const content = {
        facebookUrl: text(input.facebookUrl, 500),
        instagramUrl: text(input.instagramUrl, 500),
        addressName: text(input.addressName, 200),
        addressLine1: text(input.addressLine1, 200),
        addressLine2: text(input.addressLine2, 200),
        mapUrl: text(input.mapUrl, 500),
        email: text(input.email, 254),
    };

    if (
        !content.addressName ||
        !content.addressLine1 ||
        !content.addressLine2 ||
        !content.email
    ) {
        return { error: "Uzupełnij wymagane pola sekcji Kontakt." };
    }
    if (!EMAIL_REGEX.test(content.email)) {
        return { error: "Podaj poprawny e-mail kontaktowy." };
    }
    for (const [field, label] of [
        ["facebookUrl", "Link do Facebooka"],
        ["instagramUrl", "Link do Instagrama"],
        ["mapUrl", "Link do mapy"],
    ]) {
        if (!isSafeUrl(content[field], { allowEmpty: true })) return { error: urlError(label) };
    }
    return { content };
}

function validateFaq(input) {
    const categories = asArray(input.categories)
        .slice(0, 20)
        .map((category, categoryIndex) => ({
            id: makeId(category.id, `kategoria-${categoryIndex + 1}`),
            title: text(category.title, 120),
            items: asArray(category.items)
                .slice(0, 60)
                .map((item, itemIndex) => ({
                    id: makeId(item.id, `pytanie-${categoryIndex + 1}-${itemIndex + 1}`),
                    question: text(item.question, 300),
                    answerHtml: sanitizeRichText(item.answerHtml),
                })),
        }));

    if (!categories.length) return { error: "FAQ musi mieć przynajmniej jedną kategorię." };
    for (const category of categories) {
        if (!category.title) return { error: "Każda kategoria FAQ musi mieć nazwę." };
        for (const item of category.items) {
            if (!item.question || isRichTextEmpty(item.answerHtml)) {
                return {
                    error: `Kategoria „${category.title}”: każde pytanie musi mieć treść i odpowiedź.`,
                };
            }
        }
    }
    return { content: { title: text(input.title, 120) || "FAQ", categories } };
}

function validateRegulamin(input) {
    const content = {
        title: text(input.title, 200),
        html: sanitizeRichText(input.html),
        pdfUrl: text(input.pdfUrl, 500),
    };

    if (!content.title) return { error: "Podaj tytuł regulaminu." };
    if (isRichTextEmpty(content.html) && !content.pdfUrl) {
        return { error: "Wpisz treść regulaminu albo dodaj plik PDF." };
    }
    if (!isSafeUrl(content.pdfUrl, { allowEmpty: true })) return { error: urlError("Plik PDF") };
    return { content };
}

function validateAnnouncement(input) {
    const content = {
        enabled: Boolean(input.enabled),
        text: text(input.text, 300),
        linkUrl: text(input.linkUrl, 500),
        linkLabel: text(input.linkLabel, 60),
        variant: input.variant === "warning" ? "warning" : "info",
        expiresAt: text(input.expiresAt, 10),
    };

    if (content.enabled && !content.text) {
        return { error: "Wpisz treść ogłoszenia albo je wyłącz." };
    }
    if (!isSafeUrl(content.linkUrl, { allowEmpty: true })) return { error: urlError("Link ogłoszenia") };
    if (content.expiresAt && !DATE_REGEX.test(content.expiresAt)) {
        return { error: "Data wygaśnięcia musi mieć format RRRR-MM-DD." };
    }
    return { content };
}

function validatePartners(input) {
    const items = asArray(input.items)
        .slice(0, 40)
        .map((item, index) => ({
            id: makeId(item.id, `partner-${index + 1}`),
            name: text(item.name, 120),
            logo: text(item.logo, 500),
            url: text(item.url, 500),
        }));

    for (const item of items) {
        if (!item.name || !item.logo) {
            return { error: "Każdy partner musi mieć nazwę i logo." };
        }
        if (!isSafeUrl(item.logo)) return { error: urlError(`Logo „${item.name}”`) };
        if (!isSafeUrl(item.url, { allowEmpty: true })) return { error: urlError(`Link „${item.name}”`) };
    }
    return { content: { title: text(input.title, 120) || "Partnerzy", items } };
}

function validateSettings(input) {
    const content = {
        submissionsOpen: Boolean(input.submissionsOpen),
        submissionsDeadline: text(input.submissionsDeadline, 10),
        selectFeeAmount: text(input.selectFeeAmount, 100),
        selectCapacity: Number(input.selectCapacity || 0),
        maxVehiclesPerUser: Number(input.maxVehiclesPerUser || 0),
        paymentRecipient: text(input.paymentRecipient, 200),
        paymentAccount: text(input.paymentAccount, 60),
        paymentTitleTemplate: text(input.paymentTitleTemplate, 140),
        paymentDeadline: text(input.paymentDeadline, 10),
        paymentDaysAfterApproval: Number(input.paymentDaysAfterApproval || 0),
        showcaseEnabled: Boolean(input.showcaseEnabled),
        participantInfo: String(input.participantInfo || "").trim().slice(0, 3000),
    };

    for (const [field, label] of [
        ["submissionsDeadline", "Termin zgłoszeń"],
        ["paymentDeadline", "Termin płatności"],
    ]) {
        if (content[field] && !DATE_REGEX.test(content[field])) {
            return { error: `${label} musi być datą (RRRR-MM-DD).` };
        }
    }

    // Polish IBAN: 26 digits, optionally with "PL" and spaces.
    const accountDigits = content.paymentAccount.replace(/\s+/g, "").replace(/^PL/i, "");
    if (content.paymentAccount && !/^\d{26}$/.test(accountDigits)) {
        return { error: "Numer konta musi mieć 26 cyfr (polski numer IBAN)." };
    }
    if (
        !Number.isInteger(content.selectCapacity) ||
        content.selectCapacity < 0 ||
        content.selectCapacity > 10000
    ) {
        return { error: "Limit miejsc musi być liczbą całkowitą (0 = bez limitu)." };
    }
    if (
        !Number.isInteger(content.maxVehiclesPerUser) ||
        content.maxVehiclesPerUser < 1 ||
        content.maxVehiclesPerUser > 50
    ) {
        return { error: "Limit pojazdów na konto musi być liczbą od 1 do 50." };
    }
    if (
        !Number.isInteger(content.paymentDaysAfterApproval) ||
        content.paymentDaysAfterApproval < 0 ||
        content.paymentDaysAfterApproval > 90
    ) {
        return { error: "Liczba dni na opłatę musi być liczbą od 0 do 90." };
    }
    return { content };
}

const TEMPLATE_KINDS = ["note", "group"];

function validateTemplates(input) {
    const items = asArray(input.items)
        .slice(0, 60)
        .map((item, index) => ({
            id: makeId(item.id, `template-${index + 1}`),
            kind: TEMPLATE_KINDS.includes(item.kind) ? item.kind : "note",
            title: text(item.title, 120),
            subject: text(item.subject, 200),
            body: String(item.body || "").trim().slice(0, 5000),
        }));

    for (const item of items) {
        if (!item.title || !item.body) {
            return { error: "Każdy szablon musi mieć nazwę i treść." };
        }
    }
    return { content: { items } };
}

const VALIDATORS = {
    edition: validateEdition,
    home: validateHome,
    event: validateEvent,
    select: validateSelect,
    gallery: validateGalleryPreview,
    contact: validateContact,
    faq: validateFaq,
    regulamin: validateRegulamin,
    announcement: validateAnnouncement,
    partners: validatePartners,
    settings: validateSettings,
    templates: validateTemplates,
};

function validateContent(key, input) {
    const validator = VALIDATORS[key];
    if (!validator) return { error: "Nieznana sekcja treści." };
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return { error: "Nieprawidłowe dane." };
    }
    return validator(input);
}

module.exports = { validateContent };
