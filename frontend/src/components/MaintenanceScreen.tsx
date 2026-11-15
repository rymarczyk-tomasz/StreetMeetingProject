import { Link } from "react-router-dom";

const LOGO_SRC = "/img/logo-street-show-white.png";

// shown instead of the whole site while maintenance mode is on (see Layout)
export default function MaintenanceScreen({ maintenance, contact }) {
    return (
        <main className="maintenance-screen">
            <div className="maintenance-card">
                <img className="maintenance-logo" src={LOGO_SRC} alt="Street Show" />
                <h1>{maintenance.title}</h1>
                {maintenance.message && <p className="maintenance-message">{maintenance.message}</p>}
                {contact?.email && (
                    <p className="maintenance-contact">
                        Pytania? <a href={`mailto:${contact.email}`}>{contact.email}</a>
                    </p>
                )}
            </div>
            <Link className="maintenance-login" to="/logowanie">
                Logowanie dla organizatorów
            </Link>
        </main>
    );
}
