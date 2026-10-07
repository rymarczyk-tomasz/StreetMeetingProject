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

export function buildEventJsonLd(edition, { ticketUrl, contact }) {
    if (!edition?.date) return null;

    const time = (value) => (value ? `T${value}` : "");
    return {
        "@context": "https://schema.org",
        "@type": "Event",
        name: edition.name,
        startDate: `${edition.date}${time(edition.startTime)}`,
        ...(edition.endTime ? { endDate: `${edition.date}${time(edition.endTime)}` } : {}),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
            "@type": "Place",
            name: edition.venueName,
            address: edition.venueAddress,
        },
        ...(ticketUrl ? { offers: { "@type": "Offer", url: ticketUrl } } : {}),
        organizer: {
            "@type": "Organization",
            name: "Street Meeting Poland",
            url: "https://www.streetshow.pl",
            sameAs: [contact?.facebookUrl, contact?.instagramUrl].filter(Boolean),
        },
    };
}
