import { lazy, Suspense } from "react";
import { faqFirstNumbers } from "../../utils/faq";
import HeroCropEditor from "./HeroCropEditor";
import { ContentForm, useContentEditor } from "./useContentEditor";
import {
    ImageField,
    ListItemControls,
    PdfField,
    moveItem,
    newId,
} from "./fields";

// TipTap is fairly large; only the FAQ and regulamin tabs need it.
const RichTextEditor = lazy(() => import("../../components/RichTextEditor"));

function RichText(props) {
    return (
        <Suspense fallback={<p className="page-status">Ładowanie edytora...</p>}>
            <RichTextEditor {...props} />
        </Suspense>
    );
}

function TextInput({ label, value, onChange, ...props }) {
    return (
        <label>
            {label}
            <input
                value={value ?? ""}
                onChange={(event) => onChange(event.target.value)}
                {...props}
            />
        </label>
    );
}

function TextArea({ label, value, onChange, rows = 3, ...props }) {
    return (
        <label>
            {label}
            <textarea
                rows={rows}
                value={value ?? ""}
                onChange={(event) => onChange(event.target.value)}
                {...props}
            />
        </label>
    );
}

// ---- Event cards ---------------------------------------------------------

const MAX_EVENT_CARDS = 6;

export function EventEditor({ onAction }) {
    const editor = useContentEditor("event", onAction);
    const cards = editor.content?.cards || [];

    function setCards(next) {
        editor.update({ cards: next });
    }

    function updateCard(index, patch) {
        setCards(cards.map((card, i) => (i === index ? { ...card, ...patch } : card)));
    }

    return (
        <ContentForm editor={editor} saveLabel="Zapisz sekcję Event">
            {editor.content && (
                <>
                    <TextArea
                        label="Opis sekcji Event"
                        value={editor.content.intro}
                        onChange={(intro) => editor.update({ intro })}
                    />
                    <div className="event-editor-grid">
                        {cards.map((card, index) => (
                            <fieldset className="event-editor-card" key={card.id}>
                                <legend>Kafelek {index + 1}</legend>
                                <TextInput
                                    label="Tytuł"
                                    value={card.title}
                                    onChange={(title) => updateCard(index, { title })}
                                />
                                <TextArea
                                    label="Treść (Enter = nowa linia)"
                                    rows={6}
                                    value={card.description}
                                    onChange={(description) =>
                                        updateCard(index, { description })
                                    }
                                />
                                <ImageField
                                    label="Zdjęcie"
                                    value={card.image}
                                    onChange={(image) => updateCard(index, { image })}
                                    previewAlt="Podgląd kafelka"
                                />
                                <TextInput
                                    label="Tekst alternatywny zdjęcia (opis dla niewidomych i Google)"
                                    value={card.alt}
                                    onChange={(alt) => updateCard(index, { alt })}
                                />
                                <TextInput
                                    label="Tekst przycisku (opcjonalny)"
                                    value={card.actionLabel}
                                    onChange={(actionLabel) =>
                                        updateCard(index, { actionLabel })
                                    }
                                />
                                <TextInput
                                    label="Link przycisku (https://…, /formularz albo #contact)"
                                    value={card.actionHref}
                                    onChange={(actionHref) =>
                                        updateCard(index, { actionHref })
                                    }
                                />
                                <ListItemControls
                                    index={index}
                                    count={cards.length}
                                    onMove={(from, to) => setCards(moveItem(cards, from, to))}
                                    onRemove={() => {
                                        if (cards.length === 1) return;
                                        setCards(cards.filter((_, i) => i !== index));
                                    }}
                                    removeLabel="Usuń kafelek"
                                />
                            </fieldset>
                        ))}
                    </div>
                    {cards.length < MAX_EVENT_CARDS && (
                        <div className="submission-actions">
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={() =>
                                    setCards([
                                        ...cards,
                                        {
                                            id: newId("card"),
                                            title: "",
                                            description: "",
                                            image: "",
                                            alt: "",
                                            actionLabel: "",
                                            actionHref: "",
                                        },
                                    ])
                                }
                            >
                                + Dodaj kafelek
                            </button>
                        </div>
                    )}
                </>
            )}
        </ContentForm>
    );
}

// ---- Home (hero) -------------------------------------------------------------

export function HomeEditor({ onAction }) {
    const editor = useContentEditor("home", onAction);
    const home = editor.content;

    return (
        <ContentForm editor={editor} saveLabel="Zapisz sekcję Home">
            {home && (
                <>
                    <p className="admin-hint">
                        Data, godziny i miejsce wydarzenia ustawiasz raz w zakładce
                        Ustawienia → Edycja wydarzenia — pokażą się tu automatycznie.
                    </p>
                    <TextInput
                        label="Tytuł"
                        value={home.heroTitle}
                        onChange={(heroTitle) => editor.update({ heroTitle })}
                    />
                    <ImageField
                        label="Zdjęcie w tle"
                        value={home.heroImage}
                        onChange={(heroImage) => editor.update({ heroImage })}
                        previewAlt="Podgląd zdjęcia hero"
                    />
                    <label className="admin-checkbox-label">
                        <input
                            type="checkbox"
                            checked={Boolean(home.heroMobileRotate)}
                            onChange={(event) =>
                                editor.update({ heroMobileRotate: event.target.checked })
                            }
                        />
                        Obróć zdjęcie o 90° na telefonie (dobre dla poziomych zdjęć z
                        góry, np. stadionu z drona)
                    </label>
                    <ImageField
                        label="Osobne zdjęcie na telefon (opcjonalne, pionowe; zastępuje obracanie)"
                        value={home.heroImageMobile || ""}
                        onChange={(heroImageMobile) => editor.update({ heroImageMobile })}
                        previewAlt="Podgląd zdjęcia na telefon"
                    />
                    <HeroCropEditor home={home} update={editor.update} />
                    <TextInput
                        label="Tekst przycisku biletów"
                        value={home.ticketLabel}
                        onChange={(ticketLabel) => editor.update({ ticketLabel })}
                    />
                    <TextInput
                        label="Link do biletów"
                        value={home.ticketUrl}
                        onChange={(ticketUrl) => editor.update({ ticketUrl })}
                    />
                    <TextInput
                        label='Tekst linku "Poznaj atrakcje"'
                        value={home.exploreLabel}
                        onChange={(exploreLabel) => editor.update({ exploreLabel })}
                    />
                </>
            )}
        </ContentForm>
    );
}

// ---- Home gallery preview ------------------------------------------------------

export function GalleryPreviewEditor({ onAction }) {
    const editor = useContentEditor("gallery", onAction);
    const gallery = editor.content;
    const photos = gallery?.photos || [];

    function setPhotos(next) {
        editor.update({ photos: next });
    }

    return (
        <ContentForm editor={editor} saveLabel="Zapisz podgląd galerii">
            {gallery && (
                <>
                    <p className="admin-hint">
                        Te zdjęcia widać w sekcji „Galeria” na stronie głównej
                        (pierwsze 3). Albumy pełnej galerii zarządzasz w zakładce
                        Galeria.
                    </p>
                    <TextArea
                        label="Opis nad podglądem galerii (opcjonalny)"
                        value={gallery.intro}
                        onChange={(intro) => editor.update({ intro })}
                    />
                    <TextInput
                        label='Tekst przycisku "Przejdź do galerii"'
                        value={gallery.linkLabel}
                        onChange={(linkLabel) => editor.update({ linkLabel })}
                    />
                    <div className="event-editor-grid">
                        {photos.map((photo, index) => (
                            <fieldset className="event-editor-card" key={photo.id}>
                                <legend>Zdjęcie {index + 1}</legend>
                                <ImageField
                                    label="Zdjęcie"
                                    value={photo.url}
                                    onChange={(url) =>
                                        setPhotos(
                                            photos.map((p, i) =>
                                                i === index ? { ...p, url } : p,
                                            ),
                                        )
                                    }
                                    previewAlt={photo.alt || "Podgląd zdjęcia"}
                                />
                                <TextInput
                                    label="Tekst alternatywny"
                                    value={photo.alt}
                                    onChange={(alt) =>
                                        setPhotos(
                                            photos.map((p, i) =>
                                                i === index ? { ...p, alt } : p,
                                            ),
                                        )
                                    }
                                />
                                <ListItemControls
                                    index={index}
                                    count={photos.length}
                                    onMove={(from, to) => setPhotos(moveItem(photos, from, to))}
                                    onRemove={() =>
                                        setPhotos(photos.filter((_, i) => i !== index))
                                    }
                                    removeLabel="Usuń zdjęcie"
                                />
                            </fieldset>
                        ))}
                    </div>
                    <div className="submission-actions">
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() =>
                                setPhotos([...photos, { id: newId("photo"), url: "", alt: "" }])
                            }
                        >
                            + Dodaj zdjęcie
                        </button>
                    </div>
                </>
            )}
        </ContentForm>
    );
}

// ---- Contact ------------------------------------------------------------------

export function ContactEditor({ onAction }) {
    const editor = useContentEditor("contact", onAction);
    const contact = editor.content;

    return (
        <ContentForm editor={editor} saveLabel="Zapisz sekcję Kontakt">
            {contact &&
                [
                    ["facebookUrl", "Link do Facebooka"],
                    ["instagramUrl", "Link do Instagrama"],
                    ["addressName", "Nazwa"],
                    ["addressLine1", "Adres — linia 1"],
                    ["addressLine2", "Adres — linia 2"],
                    ["mapUrl", "Link do mapy"],
                    ["email", "E-mail kontaktowy"],
                ].map(([field, label]) => (
                    <TextInput
                        key={field}
                        label={label}
                        type={field === "email" ? "email" : "text"}
                        value={contact[field]}
                        onChange={(value) => editor.update({ [field]: value })}
                    />
                ))}
        </ContentForm>
    );
}

// ---- FAQ ------------------------------------------------------------------------

export function FaqEditor({ onAction }) {
    const editor = useContentEditor("faq", onAction);
    const faq = editor.content;
    const categories = faq?.categories || [];

    function setCategories(next) {
        editor.update({ categories: next });
    }

    function updateCategory(index, patch) {
        setCategories(categories.map((c, i) => (i === index ? { ...c, ...patch } : c)));
    }

    function updateItem(categoryIndex, itemIndex, patch) {
        const items = categories[categoryIndex].items.map((item, i) =>
            i === itemIndex ? { ...item, ...patch } : item,
        );
        updateCategory(categoryIndex, { items });
    }

    const firstNumbers = faqFirstNumbers(faq);

    return (
        <ContentForm editor={editor} saveLabel="Zapisz FAQ">
            {faq && (
                <>
                    <p className="admin-hint">
                        Pytania są numerowane automatycznie. Odpowiedź możesz
                        wkleić z Worda — formatowanie (pogrubienia, listy, linki)
                        zostanie zachowane.
                    </p>
                    {categories.map((category, categoryIndex) => (
                        <fieldset className="faq-editor-category" key={category.id}>
                            <legend>Kategoria {categoryIndex + 1}</legend>
                            <TextInput
                                label="Nazwa kategorii"
                                value={category.title}
                                onChange={(title) => updateCategory(categoryIndex, { title })}
                            />
                            {category.items.map((item, itemIndex) => {
                                const questionNumber = firstNumbers[categoryIndex] + itemIndex;
                                return (
                                    <div className="faq-editor-item" key={item.id}>
                                        <TextInput
                                            label={`Pytanie ${questionNumber}`}
                                            value={item.question}
                                            onChange={(question) =>
                                                updateItem(categoryIndex, itemIndex, { question })
                                            }
                                        />
                                        <span className="field-label">Odpowiedź</span>
                                        <RichText
                                            key={`${editor.version}-${item.id}`}
                                            value={item.answerHtml}
                                            minHeight={80}
                                            ariaLabel={`Odpowiedź na pytanie ${questionNumber}`}
                                            onChange={(answerHtml) =>
                                                updateItem(categoryIndex, itemIndex, { answerHtml })
                                            }
                                        />
                                        <ListItemControls
                                            index={itemIndex}
                                            count={category.items.length}
                                            onMove={(from, to) =>
                                                updateCategory(categoryIndex, {
                                                    items: moveItem(category.items, from, to),
                                                })
                                            }
                                            onRemove={() => {
                                                if (window.confirm("Usunąć to pytanie?")) {
                                                    updateCategory(categoryIndex, {
                                                        items: category.items.filter(
                                                            (_, i) => i !== itemIndex,
                                                        ),
                                                    });
                                                }
                                            }}
                                            removeLabel="Usuń pytanie"
                                        />
                                    </div>
                                );
                            })}
                            <div className="submission-actions">
                                <button
                                    type="button"
                                    className="button-secondary"
                                    onClick={() =>
                                        updateCategory(categoryIndex, {
                                            items: [
                                                ...category.items,
                                                { id: newId("q"), question: "", answerHtml: "" },
                                            ],
                                        })
                                    }
                                >
                                    + Dodaj pytanie
                                </button>
                            </div>
                            <ListItemControls
                                index={categoryIndex}
                                count={categories.length}
                                onMove={(from, to) => setCategories(moveItem(categories, from, to))}
                                onRemove={() => {
                                    if (
                                        window.confirm(
                                            `Usunąć całą kategorię „${category.title}” razem z pytaniami?`,
                                        )
                                    ) {
                                        setCategories(categories.filter((_, i) => i !== categoryIndex));
                                    }
                                }}
                                removeLabel="Usuń kategorię"
                            />
                        </fieldset>
                    ))}
                    <div className="submission-actions">
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() =>
                                setCategories([
                                    ...categories,
                                    { id: newId("kategoria"), title: "", items: [] },
                                ])
                            }
                        >
                            + Dodaj kategorię
                        </button>
                    </div>
                </>
            )}
        </ContentForm>
    );
}

// ---- Regulamin -------------------------------------------------------------------

export function RegulaminEditor({ onAction }) {
    const editor = useContentEditor("regulamin", onAction);
    const regulamin = editor.content;

    return (
        <ContentForm editor={editor} saveLabel="Zapisz regulamin">
            {regulamin && (
                <>
                    <p className="admin-hint">
                        Najprościej: otwórz regulamin w Wordzie, zaznacz całość
                        (Ctrl+A), skopiuj (Ctrl+C) i wklej tutaj (Ctrl+V) w miejsce
                        starej treści. Nagłówki, listy (także a, b, c) i
                        pogrubienia zostaną zachowane. Możesz też dodać PDF — na
                        stronie pojawi się przycisk „Pobierz regulamin (PDF)”.
                    </p>
                    <TextInput
                        label="Tytuł"
                        value={regulamin.title}
                        onChange={(title) => editor.update({ title })}
                    />
                    <PdfField
                        label="Plik PDF regulaminu (opcjonalny)"
                        value={regulamin.pdfUrl}
                        onChange={(pdfUrl) => editor.update({ pdfUrl })}
                    />
                    <span className="field-label">Treść regulaminu</span>
                    <RichText
                        key={editor.version}
                        value={regulamin.html}
                        minHeight={400}
                        ariaLabel="Treść regulaminu"
                        onChange={(html) => editor.update({ html })}
                    />
                </>
            )}
        </ContentForm>
    );
}

// ---- Announcement bar ---------------------------------------------------------------

export function AnnouncementEditor({ onAction }) {
    const editor = useContentEditor("announcement", onAction);
    const announcement = editor.content;

    return (
        <ContentForm editor={editor} saveLabel="Zapisz ogłoszenie">
            {announcement && (
                <>
                    <p className="admin-hint">
                        Pasek z ogłoszeniem nad menu, widoczny na każdej stronie, np.
                        „Zapisy do strefy Select zamknięte” albo „Zmiana godzin
                        otwarcia bram”.
                    </p>
                    <label className="admin-checkbox-label">
                        <input
                            type="checkbox"
                            checked={announcement.enabled}
                            onChange={(event) => editor.update({ enabled: event.target.checked })}
                        />
                        Pokazuj ogłoszenie
                    </label>
                    <TextInput
                        label="Treść ogłoszenia"
                        value={announcement.text}
                        maxLength={300}
                        onChange={(text) => editor.update({ text })}
                    />
                    <TextInput
                        label="Link (opcjonalny, np. /regulamin albo https://…)"
                        value={announcement.linkUrl}
                        onChange={(linkUrl) => editor.update({ linkUrl })}
                    />
                    <TextInput
                        label="Tekst linku"
                        value={announcement.linkLabel}
                        placeholder="Więcej"
                        onChange={(linkLabel) => editor.update({ linkLabel })}
                    />
                    <label>
                        Kolor
                        <select
                            value={announcement.variant}
                            onChange={(event) => editor.update({ variant: event.target.value })}
                        >
                            <option value="info">Czarny (informacja)</option>
                            <option value="warning">Żółty (ważne)</option>
                        </select>
                    </label>
                    <label>
                        Ukryj automatycznie po dniu (opcjonalnie)
                        <input
                            type="date"
                            value={announcement.expiresAt}
                            onChange={(event) => editor.update({ expiresAt: event.target.value })}
                        />
                    </label>
                </>
            )}
        </ContentForm>
    );
}

// ---- Partners ------------------------------------------------------------------------

export function PartnersEditor({ onAction }) {
    const editor = useContentEditor("partners", onAction);
    const partners = editor.content;
    const items = partners?.items || [];

    function setItems(next) {
        editor.update({ items: next });
    }

    function updateItem(index, patch) {
        setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    }

    return (
        <ContentForm editor={editor} saveLabel="Zapisz partnerów">
            {partners && (
                <>
                    <p className="admin-hint">
                        Logotypy partnerów i sponsorów pokazują się na stronie
                        głównej nad kontaktem. Bez partnerów sekcja jest ukryta.
                        Najlepiej wyglądają logotypy PNG/WEBP z przezroczystym tłem.
                    </p>
                    <TextInput
                        label="Nagłówek sekcji"
                        value={partners.title}
                        onChange={(title) => editor.update({ title })}
                    />
                    <div className="event-editor-grid">
                        {items.map((item, index) => (
                            <fieldset className="event-editor-card" key={item.id}>
                                <legend>{item.name || `Partner ${index + 1}`}</legend>
                                <TextInput
                                    label="Nazwa"
                                    value={item.name}
                                    onChange={(name) => updateItem(index, { name })}
                                />
                                <ImageField
                                    label="Logo"
                                    value={item.logo}
                                    onChange={(logo) => updateItem(index, { logo })}
                                    previewAlt={item.name || "Logo"}
                                />
                                <TextInput
                                    label="Strona partnera (opcjonalnie)"
                                    value={item.url}
                                    onChange={(url) => updateItem(index, { url })}
                                />
                                <ListItemControls
                                    index={index}
                                    count={items.length}
                                    onMove={(from, to) => setItems(moveItem(items, from, to))}
                                    onRemove={() => setItems(items.filter((_, i) => i !== index))}
                                />
                            </fieldset>
                        ))}
                    </div>
                    <div className="submission-actions">
                        <button
                            type="button"
                            className="button-secondary"
                            onClick={() =>
                                setItems([...items, { id: newId("partner"), name: "", logo: "", url: "" }])
                            }
                        >
                            + Dodaj partnera
                        </button>
                    </div>
                </>
            )}
        </ContentForm>
    );
}

// ---- Settings: edition + submissions -------------------------------------------------

export function EditionEditor({ onAction }) {
    const editor = useContentEditor("edition", onAction);
    const edition = editor.content;

    return (
        <ContentForm editor={editor} saveLabel="Zapisz edycję wydarzenia">
            {edition && (
                <>
                    <p className="admin-hint">
                        Rok edycji decyduje, do której edycji trafiają nowe
                        zgłoszenia Select, i od niego liczy się limit pojazdów.
                        Zgłoszenia z poprzednich lat zostają w archiwum (filtr
                        „Edycja” w Zgłoszeniach). Data i miejsce pokazują się na
                        stronie głównej i w Google.
                    </p>
                    <TextInput
                        label="Rok edycji"
                        type="number"
                        min={2020}
                        max={2100}
                        value={edition.year}
                        onChange={(year) => editor.update({ year: Number(year) })}
                    />
                    <TextInput
                        label="Nazwa"
                        value={edition.name}
                        onChange={(name) => editor.update({ name })}
                    />
                    <label>
                        Data wydarzenia
                        <input
                            type="date"
                            value={edition.date}
                            onChange={(event) => editor.update({ date: event.target.value })}
                        />
                    </label>
                    <TextInput
                        label="Tekst, gdy data nie jest jeszcze znana"
                        value={edition.dateText}
                        placeholder="Termin wkrótce"
                        onChange={(dateText) => editor.update({ dateText })}
                    />
                    <div className="admin-inline-fields">
                        <label>
                            Godzina rozpoczęcia
                            <input
                                type="time"
                                value={edition.startTime}
                                onChange={(event) => editor.update({ startTime: event.target.value })}
                            />
                        </label>
                        <label>
                            Godzina zakończenia
                            <input
                                type="time"
                                value={edition.endTime}
                                onChange={(event) => editor.update({ endTime: event.target.value })}
                            />
                        </label>
                    </div>
                    <TextInput
                        label="Miejsce"
                        value={edition.venueName}
                        onChange={(venueName) => editor.update({ venueName })}
                    />
                    <TextInput
                        label="Adres miejsca"
                        value={edition.venueAddress}
                        onChange={(venueAddress) => editor.update({ venueAddress })}
                    />
                </>
            )}
        </ContentForm>
    );
}

export function SubmissionSettingsEditor({ onAction }) {
    const editor = useContentEditor("settings", onAction);
    const settings = editor.content;

    return (
        <ContentForm editor={editor} saveLabel="Zapisz ustawienia zgłoszeń">
            {settings && (
                <>
                    <label className="admin-checkbox-label">
                        <input
                            type="checkbox"
                            checked={settings.submissionsOpen}
                            onChange={(event) =>
                                editor.update({ submissionsOpen: event.target.checked })
                            }
                        />
                        Przyjmuj nowe zgłoszenia do strefy Select
                    </label>
                    <label>
                        Termin zgłoszeń (ostatni dzień, opcjonalny)
                        <input
                            type="date"
                            value={settings.submissionsDeadline}
                            onChange={(event) =>
                                editor.update({ submissionsDeadline: event.target.value })
                            }
                        />
                    </label>
                    <TextInput
                        label="Maksymalna liczba aktywnych zgłoszeń pojazdów na konto (w edycji)"
                        type="number"
                        min={1}
                        max={50}
                        value={settings.maxVehiclesPerUser}
                        onChange={(value) => editor.update({ maxVehiclesPerUser: Number(value) })}
                    />
                    <TextInput
                        label="Liczba miejsc w strefie Select (0 = bez limitu, tylko informacyjnie na dashboardzie)"
                        type="number"
                        min={0}
                        value={settings.selectCapacity}
                        onChange={(value) => editor.update({ selectCapacity: Number(value) })}
                    />
                    <TextInput
                        label="Kwota opłaty podawana w e-mailu o akceptacji"
                        value={settings.selectFeeAmount}
                        maxLength={100}
                        placeholder="np. 150 zł"
                        onChange={(selectFeeAmount) => editor.update({ selectFeeAmount })}
                    />
                </>
            )}
        </ContentForm>
    );
}
