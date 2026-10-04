import { useState } from "react";
import AdminStats from "./AdminStats";
import AuditLog from "./AuditLog";
import {
    ContactEditor,
    EventEditor,
    GalleryEditor,
    HomeEditor,
} from "./ContentEditors";
import SettingsPanel from "./SettingsPanel";
import SubmissionsPanel from "./SubmissionsPanel";
import UsersPanel from "./UsersPanel";

const SECTIONS = [
    ["dashboard", "Dashboard"],
    ["submissions", "Zgłoszenia"],
    ["users", "Użytkownicy"],
    ["content", "Treści strony"],
    ["settings", "Ustawienia"],
    ["audit", "Dziennik działań"],
];

const CONTENT_TABS = [
    ["event", "Event"],
    ["gallery", "Galeria"],
    ["home", "Home"],
    ["contact", "Kontakt"],
];

const CONTENT_EDITORS = {
    event: EventEditor,
    gallery: GalleryEditor,
    home: HomeEditor,
    contact: ContactEditor,
};

export default function AdminPage() {
    const [activeSection, setActiveSection] = useState("dashboard");
    const [contentTab, setContentTab] = useState("event");
    // Bumped after every admin action so stats and the audit log reload.
    const [refreshKey, setRefreshKey] = useState(0);
    const onAction = () => setRefreshKey((value) => value + 1);
    const ContentEditor = CONTENT_EDITORS[contentTab];

    return (
        <section className="page admin-page">
            <div className="admin-page-header">
                <div>
                    <p className="page-eyebrow">Strefa zarządzania</p>
                    <h1>Panel administratora</h1>
                </div>
                <span className="admin-page-status">Konto administratora</span>
            </div>
            <nav
                className="admin-navigation"
                aria-label="Sekcje panelu administratora"
            >
                {SECTIONS.map(([section, label]) => (
                    <button
                        className={activeSection === section ? "is-active" : ""}
                        key={section}
                        type="button"
                        onClick={() => setActiveSection(section)}
                        aria-current={
                            activeSection === section ? "page" : undefined
                        }
                    >
                        {label}
                    </button>
                ))}
            </nav>

            {activeSection === "dashboard" && (
                <div className="admin-section">
                    <div className="admin-section-heading">
                        <div>
                            <h2>Dashboard</h2>
                            <p>
                                Najważniejsze informacje o aktywności w panelu.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActiveSection("submissions")}
                        >
                            Przejdź do zgłoszeń
                        </button>
                    </div>
                    <AdminStats refreshKey={refreshKey} />
                </div>
            )}

            {activeSection === "users" && <UsersPanel onAction={onAction} />}

            {activeSection === "content" && (
                <div className="admin-section">
                    <div className="admin-section-heading">
                        <div>
                            <h2>Treści strony</h2>
                            <p>Wybierz sekcję strony, którą chcesz edytować.</p>
                        </div>
                    </div>
                    <nav
                        className="admin-navigation admin-subnavigation"
                        aria-label="Sekcje treści strony"
                    >
                        {CONTENT_TABS.map(([tab, label]) => (
                            <button
                                className={
                                    contentTab === tab ? "is-active" : ""
                                }
                                key={tab}
                                type="button"
                                onClick={() => setContentTab(tab)}
                                aria-current={
                                    contentTab === tab ? "page" : undefined
                                }
                            >
                                {label}
                            </button>
                        ))}
                    </nav>
                    <ContentEditor key={contentTab} onAction={onAction} />
                </div>
            )}

            {activeSection === "settings" && (
                <div className="admin-section">
                    <div className="admin-section-heading">
                        <div>
                            <h2>Ustawienia zgłoszeń</h2>
                            <p>
                                Otwieranie i zamykanie zapisów do strefy Select,
                                limity i kwota opłaty.
                            </p>
                        </div>
                    </div>
                    <SettingsPanel onAction={onAction} />
                </div>
            )}

            {activeSection === "submissions" && (
                <div className="admin-section">
                    <div className="admin-section-heading">
                        <div>
                            <h2>Zgłoszenia do strefy Select</h2>
                            <p>Przeglądaj, filtruj i rozpatruj zgłoszenia.</p>
                        </div>
                    </div>
                    <SubmissionsPanel onAction={onAction} />
                </div>
            )}

            {activeSection === "audit" && <AuditLog refreshKey={refreshKey} />}
        </section>
    );
}
