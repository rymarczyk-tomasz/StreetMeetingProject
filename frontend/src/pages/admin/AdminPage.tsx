import { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../../api/client";
import AdminHeading from "./AdminHeading";
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
import MessagesPanel from "./MessagesPanel";
import SubmissionsPanel from "./SubmissionsPanel";
import UsersPanel from "./UsersPanel";
import DateSubscribersPanel from "./DateSubscribersPanel";

// /admin/:sekcja + query params for filters (?status=pending&platnosc=overdue&id=184&tab=oplata),
// so F5 and shared links keep the view. "edycja" is the global edition filter from the side menu
// (Dashboard, Zgłoszenia, Raport) and is kept when switching sections.
const NAV_GROUPS: [string, [string, string, string][]][] = [
    [
        "Wydarzenie",
        [
            ["dashboard", "Dashboard", "speedometer2"],
            ["zgloszenia", "Zgłoszenia", "card-checklist"],
            ["wjazd", "Wjazd", "qr-code-scan"],
            ["wiadomosci", "Wiadomości", "envelope"],
            ["raport", "Raport", "bar-chart"],
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
            ["ustawienia", "Ustawienia", "sliders"],
            ["dziennik", "Dziennik działań", "journal-text"],
            ["system", "System", "heart-pulse"],
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
    ["zapisy", "Zapisy do Select"],
    ["oplaty", "Opłaty"],
    ["szablony", "Szablony wiadomości"],
    ["powiadomienia", "Lista „Daj mi znać”"],
] as const;

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

function NavBadge({ id, counts }) {
    if (id === "zgloszenia" && counts.pending > 0) {
        return <span className="admin-nav-count is-yellow" title="Oczekujące zgłoszenia">{counts.pending}</span>;
    }
    if (id === "wiadomosci" && counts.unread > 0) {
        return <span className="admin-nav-count" title="Nieprzeczytane wiadomości">{counts.unread}</span>;
    }
    if (id === "system" && counts.systemError) {
        return <span className="admin-nav-dot" title="Jest problem w System" />;
    }
    return null;
}

function EditionSelect({ editions, value, onChange, className = "" }) {
    return (
        <label className={`admin-edition-select ${className}`}>
            <span className="visually-hidden">Edycja</span>
            <select value={value} onChange={(event) => onChange(event.target.value)}>
                <option value="">
                    Edycja {editions?.currentEdition ?? ""}
                </option>
                {(editions?.editions || [])
                    .filter((row) => row.edition !== editions.currentEdition)
                    .map((row) => (
                        <option key={row.edition} value={row.edition}>
                            Edycja {row.edition} ({row.count})
                        </option>
                    ))}
                <option value="all">Wszystkie lata</option>
            </select>
        </label>
    );
}

function Sidebar({ active, rail, counts, editions, edition, onEdition, onOpen }) {
    return (
        <aside className={`admin-sidebar${rail ? " is-rail" : ""}`}>
            <div className="admin-sidebar-top">
                <p className="admin-eyebrow">Panel administratora</p>
                <EditionSelect editions={editions} value={edition} onChange={onEdition} />
                <label className="admin-section-select">
                    <span className="visually-hidden">Sekcja</span>
                    <select value={active} onChange={(event) => onOpen(event.target.value)}>
                        {NAV_GROUPS.map(([group, items]) => (
                            <optgroup label={group} key={group}>
                                {items.map(([id, label]) => (
                                    <option value={id} key={id}>
                                        {label}
                                        {id === "zgloszenia" && counts.pending ? ` (${counts.pending})` : ""}
                                        {id === "wiadomosci" && counts.unread ? ` (${counts.unread})` : ""}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </label>
            </div>
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
                                aria-label={rail ? label : undefined}
                                title={rail ? label : undefined}
                            >
                                <i className={`bi bi-${icon}`} aria-hidden="true" />
                                <span className="admin-sidenav-label">{label}</span>
                                <NavBadge id={id} counts={counts} />
                            </button>
                        ))}
                    </div>
                ))}
            </nav>
        </aside>
    );
}

export default function AdminPage() {
    const { sekcja } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    const activeSection = SECTION_IDS.includes(sekcja) ? sekcja : "dashboard";
    const edition = searchParams.get("edycja") || "";
    const tabParam = searchParams.get("zakladka");
    const contentTab = CONTENT_TABS.some(([tab]) => tab === tabParam) ? tabParam : "home";
    const settingsTab = SETTINGS_TABS.some(([tab]) => tab === tabParam) ? tabParam : "edycja";
    const ContentEditor = CONTENT_TABS.find(([tab]) => tab === contentTab)[2];

    // Bumped after every admin action so stats, counters and the audit log reload.
    const [refreshKey, setRefreshKey] = useState(0);
    const onAction = useCallback(() => setRefreshKey((value) => value + 1), []);
    const [stats, setStats] = useState(null);
    const [statsError, setStatsError] = useState("");
    const [system, setSystem] = useState(null);
    const [editions, setEditions] = useState(null);

    useEffect(() => {
        api.get("/admin/stats", { params: { edition: edition && edition !== "all" ? edition : undefined } })
            .then(({ data }) => {
                setStats(data);
                setStatsError("");
            })
            .catch(() => setStatsError("Nie udało się pobrać statystyk."));
    }, [refreshKey, activeSection, edition]);

    useEffect(() => {
        api.get("/admin/editions")
            .then(({ data }) => setEditions(data))
            .catch(() => setEditions(null));
    }, [refreshKey]);

    // Disk, backups, SMTP… checked once per visit (and again on Dashboard / System).
    useEffect(() => {
        if (system && !["dashboard", "system"].includes(activeSection)) return;
        api.get("/admin/system")
            .then(({ data }) => setSystem(data))
            .catch(() => setSystem(null));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSection, refreshKey]);

    // Opens a section with extra query params; the edition filter stays.
    const openSection = useCallback(
        (section: string, extra: Record<string, string> = {}) => {
            const params = new URLSearchParams();
            if (edition) params.set("edycja", edition);
            for (const [key, value] of Object.entries(extra)) if (value) params.set(key, value);
            const query = params.toString();
            navigate(`/admin${section === "dashboard" ? "" : `/${section}`}${query ? `?${query}` : ""}`);
            window.scrollTo({ top: 0 });
        },
        [edition, navigate],
    );

    function setEdition(value: string) {
        const params = new URLSearchParams(searchParams);
        if (value) params.set("edycja", value);
        else params.delete("edycja");
        params.delete("id");
        navigate({ search: params.toString() }, { replace: true });
    }

    function openTab(tab: string) {
        openSection(activeSection, { zakladka: tab });
    }

    // Links from before the /admin/:sekcja URLs (?sekcja=zgloszenia).
    const legacySection = searchParams.get("sekcja");
    if (legacySection) {
        const params = new URLSearchParams(location.search);
        params.delete("sekcja");
        const query = params.toString();
        return <Navigate replace to={`/admin/${legacySection}${query ? `?${query}` : ""}`} />;
    }

    const counts = {
        pending: stats?.submissions.pending || 0,
        unread: stats?.unreadMessages || 0,
        systemError: Boolean(system?.checks?.some((check) => check.level === "error")),
    };
    const rail = activeSection === "zgloszenia";

    return (
        <section className="page admin-page">
            <div className={`admin-layout${rail ? " is-rail" : ""}`}>
                <Sidebar
                    active={activeSection}
                    rail={rail}
                    counts={counts}
                    editions={editions}
                    edition={edition}
                    onEdition={setEdition}
                    onOpen={openSection}
                />
                <div className={`admin-main${rail ? " is-flush" : ""}`}>
                    {activeSection === "dashboard" && (
                        <AdminStats
                            stats={stats}
                            error={statsError}
                            system={system}
                            onOpen={openSection}
                        />
                    )}

                    {activeSection === "zgloszenia" && (
                        <SubmissionsPanel edition={edition} onAction={onAction} />
                    )}

                    {activeSection === "wjazd" && (
                        <div className="admin-section admin-gate">
                            <GateCheckin onAction={onAction} />
                            <p className="admin-hint">
                                Osobom z uprawnieniem „Obsługa wjazdu” (Użytkownicy) ten sam ekran
                                działa pod adresem /wjazd.
                            </p>
                        </div>
                    )}

                    {activeSection === "wiadomosci" && (
                        <div className="admin-section">
                            <AdminHeading
                                title="Wiadomości"
                                description="Rozmowy z uczestnikami ze wszystkich zgłoszeń — nieprzeczytane na górze."
                            />
                            <MessagesPanel refreshKey={refreshKey} onOpen={openSection} />
                        </div>
                    )}

                    {activeSection === "raport" && (
                        <div className="admin-section">
                            <AdminHeading
                                title="Raport"
                                description="Podsumowanie edycji: zgłoszenia, opłaty, wjazdy i nieobecni, z porównaniem do poprzednich lat."
                            />
                            <AdminReport edition={edition === "all" ? "" : edition} />
                        </div>
                    )}

                    {activeSection === "uzytkownicy" && <UsersPanel onAction={onAction} />}

                    {activeSection === "galeria" && (
                        <div className="admin-section">
                            <AdminHeading
                                title="Galeria"
                                description="Albumy ze zdjęciami z Dysku Google, widoczne na stronie /galeria."
                            />
                            <GalleryAlbumsPanel onAction={onAction} />
                        </div>
                    )}

                    {activeSection === "tresci" && (
                        <div className="admin-section">
                            <AdminHeading
                                title="Treści strony"
                                description="Każdy zapis trafia do historii zmian, więc zawsze możesz wrócić do poprzedniej wersji."
                            />
                            <Tabs
                                tabs={CONTENT_TABS}
                                active={contentTab}
                                onChange={openTab}
                                label="Sekcje treści strony"
                            />
                            <div className="admin-card">
                                <ContentEditor key={contentTab} onAction={onAction} />
                            </div>
                        </div>
                    )}

                    {activeSection === "ustawienia" && (
                        <div className="admin-section admin-settings">
                            <AdminHeading title="Ustawienia" />
                            <Tabs
                                tabs={SETTINGS_TABS}
                                active={settingsTab}
                                onChange={openTab}
                                label="Sekcje ustawień"
                            />
                            {settingsTab === "edycja" && (
                                <EditionEditor
                                    onAction={onAction}
                                    onOpenDateNotify={() => openTab("powiadomienia")}
                                />
                            )}
                            {settingsTab === "zapisy" && (
                                <SubmissionSettingsEditor key="zapisy" part="zapisy" onAction={onAction} />
                            )}
                            {settingsTab === "oplaty" && (
                                <SubmissionSettingsEditor key="oplaty" part="oplaty" onAction={onAction} />
                            )}
                            {settingsTab === "szablony" && (
                                <div className="admin-card">
                                    <p className="admin-hint">
                                        Gotowe komentarze do zgłoszeń (np. powody odrzucenia) i treści
                                        wiadomości do grupy.
                                    </p>
                                    <TemplatesEditor onAction={onAction} />
                                </div>
                            )}
                            {settingsTab === "powiadomienia" && <DateSubscribersPanel onAction={onAction} />}
                        </div>
                    )}

                    {activeSection === "dziennik" && <AuditLog refreshKey={refreshKey} />}

                    {activeSection === "system" && (
                        <div className="admin-section">
                            <AdminHeading
                                title="System"
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
