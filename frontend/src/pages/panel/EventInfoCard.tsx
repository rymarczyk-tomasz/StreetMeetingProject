import { Link } from "react-router-dom";
import { formatEditionDate, formatEditionHours } from "../../utils/edition";
import { plural } from "../../utils/plural";

function formatDay(date) {
    return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(`${date}T12:00:00`),
    );
}

// Top of the participant panel: the current edition and what the user can do now.
export default function EventInfoCard({ overview, hasApprovedSubmission }) {
    if (!overview) return null;
    const { edition, availability, participantInfo, contactEmail } = overview;
    const dateLabel = formatEditionDate(edition);
    const hours = edition.date ? formatEditionHours(edition) : "";

    return (
        <section className="panel-event-card">
            <div className="panel-event-main">
                <p className="page-eyebrow">Bieżąca edycja</p>
                <h2>{edition.name}</h2>
                <p>
                    {dateLabel}
                    {hours && ` · ${hours}`}
                    <br />
                    {edition.venueName}
                </p>
            </div>
            <div className="panel-event-status">
                {availability.open ? (
                    <>
                        <p>
                            Zgłoszenia do strefy Select są <strong>otwarte</strong>
                            {availability.deadline && ` do ${formatDay(availability.deadline)}`}.
                        </p>
                        <p>
                            {availability.remaining > 0
                                ? `Możesz zgłosić jeszcze ${plural(availability.remaining, "pojazd", "pojazdy", "pojazdów")} (limit ${availability.maxVehicles}).`
                                : `Wykorzystano limit ${availability.maxVehicles} pojazdów w tej edycji.`}
                        </p>
                        {availability.remaining > 0 && (
                            <Link className="account-settings-button" to="/formularz">
                                Zgłoś pojazd
                            </Link>
                        )}
                    </>
                ) : (
                    <p>{availability.reason}</p>
                )}
                <p className="panel-event-links">
                    <Link to="/regulamin">Regulamin</Link>
                    {contactEmail && (
                        <>
                            {" · "}
                            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                        </>
                    )}
                </p>
            </div>
            {hasApprovedSubmission && participantInfo && (
                <div className="panel-event-info">
                    <h3>Informacje dla uczestników strefy Select</h3>
                    <p>{participantInfo}</p>
                </div>
            )}
        </section>
    );
}
