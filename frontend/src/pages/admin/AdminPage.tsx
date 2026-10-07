import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/client";
import AdminReport from "./AdminReport";
import AdminStats from "./AdminStats";
import SystemStatus from "./SystemStatus";
import AuditLog from "./AuditLog";
import GateCheckin from "../../components/GateCheckin";
import {
    AnnouncementEditor,
    ContactEditor,
    EditionEditor,
    EventEditor,
    FaqEditor,
    GalleryPreviewEditor,
    HomeEditor,
    PartnersEditor,
    SelectEditor,
    RegulaminEditor,
    PrivacyEditor,
    SubmissionSettingsEditor,
    TemplatesEditor,
} from "./ContentEditors";
import GalleryAlbumsPanel from "./GalleryAlbumsPanel";
import SubmissionsPanel from "./SubmissionsPanel";
import UsersPanel from "./UsersPanel";
import DateSubscribersPanel from "./DateSubscribersPanel";

// The section, sub-tab and submission filters live in the URL
// (/admin?sekcja=zgloszenia&platnosc=overdue), so F5 keeps them and they can be linked.
const NAV_GROUPS: [string, [string, string, string][]][] = [
    [
        "Wydarzenie",
        [
            ["dashboard", "Dashboard", "speedometer2"],
            ["zgloszenia", "Zgłoszenia", "card-checklist"],
            ["wjazd", "Wjazd", "qr-code-scan"],
            ["raport", "Raport", "bar-chart-line"],
        ],
    ],
    [
        "Strona",
        [
            ["tresci", "Treści strony", "layout-text-window"],
            ["galeria", "Galeria", "images"],
        ],
    ],
    [
        "Administracja",
        [
            ["uzytkownicy", "Użytkownicy", "people"],
            ["ustawienia", "Ustawienia", "gear"],
            ["dziennik", "Dziennik działań", "journal-text"],
            ["system", "System", "hdd-stack"],
        ],
    ],
];

const SECTION_IDS: string[] = NAV_GROUPS.flatMap(([, items]) => items.map(([id]) => id));

const CONTENT_TABS = [
    ["home", "Home", HomeEditor],
    ["event", "Co Cię czeka", EventEditor],
    ["select", "Strefa Select", SelectEditor],
    ["gallery", "Podgląd galerii", GalleryPreviewEditor],
    ["partners", "Partnerzy", PartnersEditor],
    ["contact", "Kontakt", ContactEditor],
    ["faq", "FAQ", FaqEditor],
    ["regulamin", "Regulamin", RegulaminEditor],
    ["privacy", "Polityka prywatności", PrivacyEditor],
    ["announcement", "Ogłoszenie", AnnouncementEditor],
] as const;

const SETTINGS_TABS = [
    ["edycja", "Edycja wydarzenia"],
    ["powiadomienia", "Powiadom o dacie"],
    ["zapisy", "Zapisy Select"],
    ["szablony", "Szablony wiadomości"],
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

function Tabs({ tabs, active, onChange, label }) {
    return (
        <nav className="admin-tabs" aria-label={label}>
            {tabs.map(([tab, tabLabel]) => (
                <button
                    className={active === tab ? "is-active" : ""}
                    key={tab}
                    type="button"
                    onClick={() => onChange(tab)}
                    aria-current={active === tab ? "page" : undefined}
                >
                    {tabLabel}
                </button>
            ))}
        </nav>
    );
}

function AdminNavigation({ active, pending, onOpen }) {
    return (
        <>
            <label className="admin-nav-select">
                <span className="visually-hidden">Sekcja panelu</span>
                <select
                    className="field-input"
                    value={active}
                    onChange={(event) => onOpen(event.target.value)}
                >
                    {NAV_GROUPS.map(([group, items]) => (
                        <optgroup label={group} key={group}>
                            {items.map(([id, label]) => (
                                <option value={id} key={id}>
                                    {label}
                                    {id === "zgloszenia" && pending ? ` (${pending} oczekuje)` : ""}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </label>
            <nav className="admin-sidenav" aria-label="Sekcje panelu administratora">
                {NAV_GROUPS.map(([group, items]) => (
                    <div className="admin-sidenav-group" key={group}>
                        <p className="admin-sidenav-title">{group}</p>
                        {items.map(([id, label, icon]) => (
                            <button
                                type="button"
                                key={id}
                                className={`admin-sidenav-item${active === id ? " is-active" : ""}`}
                                onClick={() => onOpen(id)}
                                aria-current={active === id ? "page" : undefined}
                            >
                                <i className={`bi bi-${icon}`} aria-hidden="true" />
                                <span>{label}</span>
                                {id === "zgloszenia" && pending > 0 && (
                                    <span className="admin-sidenav-count" title="Oczekujące zgłoszenia">
                                        {pending}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                ))}
            </nav>
        </>
    );
}

export default function AdminPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const sectionParam = searchParams.get("sekcja");
    const activeSection = SECTION_IDS.includes(sectionParam) ? sectionParam : "dashboard";
    const tabParam = searchParams.get("zakladka");
    const contentTab = CONTENT_TABS.some(([tab]) => tab === tabParam) ? tabParam : "home";
    const settingsTab = SETTINGS_TABS.some(([tab]) => tab === tabParam) ? tabParam : "edycja";
    const ContentEditor = CONTENT_TABS.find(([tab]) => tab === contentTab)[2];

    // Bumped after every admin action so stats, counters and the audit log reload.
    const [refreshKey, setRefreshKey] = useState(0);
    const onAction = () => setRefreshKey((value) => value + 1);
    const [stats, setStats] = useState(null);
    const [statsError, setStatsError] = useState("");

    useEffect(() => {
        api.get("/admin/stats")
            .then(({ data }) => {
                setStats(data);
                setStatsError("");
            })
            .catch(() => setStatsError("Nie udało się pobrać statystyk."));
    }, [refreshKey, activeSection]);

    // Opens a section with optional extra params (sub-tab, submission filters).
    function openSection(section: string, extra: Record<string, string> = {}) {
        setSearchParams(section === "dashboard" ? extra : { sekcja: section, ...extra });
        window.scrollTo({ top: 0 });
    }

    function openTab(tab: string) {
        setSearchParams({ sekcja: activeSection, zakladka: tab }, { replace: true });
    }

    return (
        <section className="page admin-page">
            <div className="admin-page-header">
                <div>
                    <p className="page-eyebrow">Strefa zarządzania</p>
                    <h1>Panel administratora</h1>
                </div>
                <span className="admin-page-status">Konto administratora</span>
            </div>
            <div className="admin-layout">
                <aside className="admin-sidebar">
                    <AdminNavigation
                        active={activeSection}
                        pending={stats?.submissions.pending || 0}
                        onOpen={openSection}
                    />
                </aside>
                <div className="admin-main">
                    {activeSection === "dashboard" && (
                        <div className="admin-section">
                            <SectionHeading
                                title="Dashboard"
                                description="Co jest do zrobienia i najważniejsze liczby bieżącej edycji."
                            >
                                <button type="button" onClick={() => openSection("zgloszenia")}>
                                    Przejdź do zgłoszeń
                                </button>
                            </SectionHeading>
                            <AdminStats stats={stats} error={statsError} onOpen={openSection} />
                        </div>
                    )}

                    {activeSection === "raport" && (
                        <div className="admin-section">
                            <SectionHeading
                                title="Raport po wydarzeniu"
                                description="Podsumowanie edycji: zgłoszenia, opłaty, wjazdy i nieobecni, z porównaniem do poprzednich lat."
                            />
                            <AdminReport />
                        </div>
                    )}

                    {activeSection === "zgloszenia" && (
                        <div className="admin-section">
                            <SectionHeading
                                title="Zgłoszenia do strefy Select"
                                description="Przeglądaj, filtruj i rozpatruj zgłoszenia. Poprzednie lata znajdziesz w filtrze „Edycja”."
                            />
                            <SubmissionsPanel onAction={onAction} />
                        </div>
                    )}

                    {activeSection === "wjazd" && (
                        <div className="admin-section">
                            <SectionHeading
                                title="Wjazd na strefę Select"
                                description="Skanuj kod QR z wejściówki uczestnika albo znajdź auto po rejestracji i zarejestruj wjazd. Osobom z uprawnieniem „Obsługa wjazdu” (Użytkownicy) ten sam ekran działa pod adresem /wjazd."
                            />
                            <GateCheckin onAction={onAction} />
                        </div>
                    )}

                    {activeSection === "uzytkownicy" && <UsersPanel onAction={onAction} />}

                    {activeSection === "galeria" && (
                        <div className="admin-section">
                            <SectionHeading
                                title="Galeria"
                                description="Albumy ze zdjęciami z Dysku Google, widoczne na stronie /galeria."
                            />
                            <GalleryAlbumsPanel onAction={onAction} />
                        </div>
                    )}

                    {activeSection === "tresci" && (
                        <div className="admin-section">
                            <SectionHeading
                                title="Treści strony"
                                description="Wybierz sekcję strony, którą chcesz edytować. Każdy zapis trafia do historii zmian, więc zawsze możesz wrócić do poprzedniej wersji."
                            />
                            <Tabs
                                tabs={CONTENT_TABS}
                                active={contentTab}
                                onChange={openTab}
                                label="Sekcje treści strony"
                            />
                            <ContentEditor key={contentTab} onAction={onAction} />
                        </div>
                    )}

                    {activeSection === "ustawienia" && (
                        <div className="admin-section">
                            <SectionHeading
                                title="Ustawienia"
                                description="Edycja wydarzenia, powiadomienia o dacie, zapisy do strefy Select i szablony wiadomości."
                            />
                            <Tabs
                                tabs={SETTINGS_TABS}
                                active={settingsTab}
                                onChange={openTab}
                                label="Sekcje ustawień"
                            />
                            {settingsTab === "edycja" && (
                                <>
                                    <p className="admin-hint">
                                        Rok, data i miejsce bieżącej edycji — używane na stronie
                                        głównej, w Google i do liczenia zgłoszeń.
                                    </p>
                                    <EditionEditor
                                        onAction={onAction}
                                        onOpenDateNotify={() => openTab("powiadomienia")}
                                    />
                                </>
                            )}
                            {settingsTab === "powiadomienia" && (
                                <DateSubscribersPanel onAction={onAction} />
                            )}
                            {settingsTab === "zapisy" && (
                                <>
                                    <p className="admin-hint">
                                        Otwieranie i zamykanie zapisów, limity i kwota opłaty.
                                    </p>
                                    <SubmissionSettingsEditor onAction={onAction} />
                                </>
                            )}
                            {settingsTab === "szablony" && (
                                <>
                                    <p className="admin-hint">
                                        Gotowe komentarze do zgłoszeń (np. powody odrzucenia) i treści
                                        wiadomości do grupy.
                                    </p>
                                    <TemplatesEditor onAction={onAction} />
                                </>
                            )}
                        </div>
                    )}

                    {activeSection === "dziennik" && <AuditLog refreshKey={refreshKey} />}

                    {activeSection === "system" && (
                        <div className="admin-section">
                            <SectionHeading
                                title="Stan systemu"
                                description="Kopie bazy, e-maile, galeria i miejsce na dysku — rzeczy, które na serwerze psują się po cichu."
                            />
                            <SystemStatus onAction={onAction} />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
