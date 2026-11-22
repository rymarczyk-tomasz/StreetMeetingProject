// Helpers for the current event edition (edited in Admin → Ustawienia).

export function formatEditionDate(edition) {
    if (!edition) return "";
    if (!edition.date) return edition.dateText || "";

    return new Intl.DateTimeFormat("pl-PL", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(`${edition.date}T12:00:00`));
}

export function formatEditionHours(edition) {
    if (!edition?.startTime) return "";
    return edition.endTime
        ? `${edition.startTime} – ${edition.endTime}`
        : `od ${edition.startTime}`;
}

const SITE_URL = "https://www.streetshow.pl";

// "2027-05-29T12:00:00+02:00": without the offset Google has to guess the time zone
function polishDateTime(date, time) {
    if (!time) return date;
    const offset = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Warsaw", timeZoneName: "longOffset" })
        .formatToParts(new Date(`${date}T${time}:00Z`))
        .find((part) => part.type === "timeZoneName")
        ?.value.replace("GMT", "");
    return `${date}T${time}:00${offset || ""}`;
}

// "ul. X 1, 80-560 Gdańsk" split into its parts; anything else stays as typed
function postalAddress(address) {
    const match = /^(.+),\s*(\d{2}-\d{3})\s+(.+)$/.exec(String(address || "").trim());
    if (!match) return address;
    return {
        "@type": "PostalAddress",
        streetAddress: match[1],
        postalCode: match[2],
        addressLocality: match[3],
        addressCountry: "PL",
    };
}

type EventPage = { contact: any; description?: string; image?: string };

export function buildEventJsonLd(edition, { contact, description, image }: EventPage) {
    if (!edition?.date) return null;

    return {
        "@context": "https://schema.org",
        "@type": "Event",
        name: edition.name,
        ...(description ? { description } : {}),
        image: [new URL(image || "/img/og-image.jpg", SITE_URL).href],
        startDate: polishDateTime(edition.date, edition.startTime),
        ...(edition.endTime ? { endDate: polishDateTime(edition.date, edition.endTime) } : {}),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
            "@type": "Place",
            name: edition.venueName,
            address: postalAddress(edition.venueAddress),
        },
        organizer: {
            "@type": "Organization",
            name: "Street Meeting Poland",
            url: SITE_URL,
            sameAs: [contact?.facebookUrl, contact?.instagramUrl].filter(Boolean),
        },
    };
}
