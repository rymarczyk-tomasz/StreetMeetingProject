import { useState } from "react";
import AdminStats from "./AdminStats";
import AuditLog from "./AuditLog";
import {
    AnnouncementEditor,
    ContactEditor,
    EditionEditor,
    EventEditor,
    FaqEditor,
    GalleryPreviewEditor,
    HomeEditor,
    PartnersEditor,
    RegulaminEditor,
    SubmissionSettingsEditor,
} from "./ContentEditors";
import GalleryAlbumsPanel from "./GalleryAlbumsPanel";
import SubmissionsPanel from "./SubmissionsPanel";
import UsersPanel from "./UsersPanel";

const SECTIONS = [
    ["dashboard", "Dashboard"],
    ["submissions", "Zgłoszenia"],
    ["users", "Użytkownicy"],
    ["gallery", "Galeria"],
    ["content", "Treści strony"],
    ["settings", "Ustawienia"],
    ["audit", "Dziennik działań"],
];

const CONTENT_TABS = [
    ["home", "Home", HomeEditor],
    ["event", "Event", EventEditor],
    ["gallery", "Podgląd galerii", GalleryPreviewEditor],
    ["partners", "Partnerzy", PartnersEditor],
    ["contact", "Kontakt", ContactEditor],
    ["faq", "FAQ", FaqEditor],
    ["regulamin", "Regulamin", RegulaminEditor],
    ["announcement", "Ogłoszenie", AnnouncementEditor],
] as const;

function SectionHeading({ title, description, children = null }) {
    return (
        <div className="admin-section-heading">
            <div>
                <h2>{title}</h2>
                <p>{description}</p>
            </div>
            {children}
        </div>
    );
}

export default function AdminPage() {
    const [activeSection, setActiveSection] = useState("dashboard");
    const [contentTab, setContentTab] = useState("home");
    // Bumped after every admin action so stats and the audit log reload.
    const [refreshKey, setRefreshKey] = useState(0);
    const onAction = () => setRefreshKey((value) => value + 1);
    const ContentEditor = CONTENT_TABS.find(([tab]) => tab === contentTab)[2];

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
                    <SectionHeading
                        title="Dashboard"
                        description="Najważniejsze informacje o bieżącej edycji."
                    >
                        <button
                            type="button"
                            onClick={() => setActiveSection("submissions")}
                        >
                            Przejdź do zgłoszeń
                        </button>
                    </SectionHeading>
                    <AdminStats refreshKey={refreshKey} />
                </div>
            )}

            {activeSection === "submissions" && (
                <div className="admin-section">
                    <SectionHeading
                        title="Zgłoszenia do strefy Select"
                        description="Przeglądaj, filtruj i rozpatruj zgłoszenia. Poprzednie lata znajdziesz w filtrze „Edycja”."
                    />
                    <SubmissionsPanel onAction={onAction} />
                </div>
            )}

            {activeSection === "users" && <UsersPanel onAction={onAction} />}

            {activeSection === "gallery" && (
                <div className="admin-section">
                    <SectionHeading
                        title="Galeria"
                        description="Albumy ze zdjęciami z Dysku Google, widoczne na stronie /galeria."
                    />
                    <GalleryAlbumsPanel onAction={onAction} />
                </div>
            )}

            {activeSection === "content" && (
                <div className="admin-section">
                    <SectionHeading
                        title="Treści strony"
                        description="Wybierz sekcję strony, którą chcesz edytować. Każdy zapis trafia do historii zmian, więc zawsze możesz wrócić do poprzedniej wersji."
                    />
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
                    <SectionHeading
                        title="Edycja wydarzenia"
                        description="Rok, data i miejsce bieżącej edycji — używane na stronie głównej, w Google i do liczenia zgłoszeń."
                    />
                    <EditionEditor onAction={onAction} />
                    <SectionHeading
                        title="Zgłoszenia do strefy Select"
                        description="Otwieranie i zamykanie zapisów, limity i kwota opłaty."
                    />
                    <SubmissionSettingsEditor onAction={onAction} />
                </div>
            )}

            {activeSection === "audit" && <AuditLog refreshKey={refreshKey} />}
        </section>
    );
}
