import { lazy, Suspense, useEffect, useState } from "react";
import api from "../../api/client";
import { plural } from "../../utils/plural";
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

// tiptap is big, load it only where needed
const RichTextEditor = lazy(() => import("../../components/RichTextEditor"));

function RichText(props) {
    return (
        <Suspense fallback={<p className="page-status">Ładowanie edytora...</p>}>
            <RichTextEditor {...props} />
        </Suspense>
    );
}

function TextInput({ label, value, onChange, hint = "", ...props }) {
    return (
        <label>
            <span className="field-label">{label}</span>
            <input
                value={value ?? ""}
                onChange={(event) => onChange(event.target.value)}
                {...props}
            />
            {hint && <span className="field-hint">{hint}</span>}
        </label>
    );
}

function TextArea({ label, value, onChange, rows = 3, hint = "", ...props }) {
    return (
        <label>
            <span className="field-label">{label}</span>
            <textarea
                rows={rows}
                value={value ?? ""}
                onChange={(event) => onChange(event.target.value)}
                {...props}
            />
            {hint && <span className="field-hint">{hint}</span>}
        </label>
    );
}

function ItemLegend({ name, number }) {
    return (
        <legend className="item-legend">
            {name} <span>{number}</span>
        </legend>
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
                                <ItemLegend name="Kafelek" number={index + 1} />
                                <TextInput
                                    label="Tytuł"
                                    value={card.title}
                                    onChange={(title) => updateCard(index, { title })}
                                />
                                <TextArea
                                    label="Treść"
                                    hint="Enter = nowa linia"
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
                                    label="Tekst alternatywny zdjęcia"
                                    hint="Opis dla niewidomych i Google"
                                    value={card.alt}
                                    onChange={(alt) => updateCard(index, { alt })}
                                />
                                <TextInput
                                    label="Tekst przycisku"
                                    hint="Opcjonalny"
                                    value={card.actionLabel}
                                    onChange={(actionLabel) =>
                                        updateCard(index, { actionLabel })
                                    }
                                />
                                <TextInput
                                    label="Link przycisku"
                                    hint="Np. https://…, /faq, #select albo #bilety (link do biletów z Home)"
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
                    <TextArea
                        label="Opis pod tytułem"
                        hint="1–2 zdania"
                        value={home.heroLead}
                        maxLength={300}
                        onChange={(heroLead) => editor.update({ heroLead })}
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

                </>
            )}
        </ContentForm>
    );
}

// ---- Strefa Select (4 steps on the home page) ----------------------------------

export function SelectEditor({ onAction }) {
    const editor = useContentEditor("select", onAction);
    const select = editor.content;

    function updateStep(index, patch) {
        editor.update({
            steps: select.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)),
        });
    }

    return (
        <ContentForm editor={editor} saveLabel="Zapisz sekcję Strefa Select">
            {select && (
                <>
                    <p className="admin-hint">
                        Przycisk w sekcji zmienia się sam: „Załóż konto” dla gości, „Zgłoś
                        pojazd” po zalogowaniu, a przy zamkniętych zapisach pokazuje powód z
                        Ustawień. Limit pojazdów pod krokami też pochodzi z Ustawień.
                    </p>
                    <TextInput
                        label="Nadtytuł"
                        value={select.eyebrow}
                        onChange={(eyebrow) => editor.update({ eyebrow })}
                    />
                    <TextInput
                        label="Tytuł"
                        value={select.title}
                        onChange={(title) => editor.update({ title })}
                    />
                    {select.steps.map((step, index) => (
                        <fieldset className="event-editor-card" key={index}>
                            <ItemLegend name="Krok" number={index + 1} />
                            <TextInput
                                label="Tytuł kroku"
                                value={step.title}
                                onChange={(title) => updateStep(index, { title })}
                            />
                            <TextArea
                                label="Opis"
                                value={step.text}
                                rows={2}
                                onChange={(text) => updateStep(index, { text })}
                            />
                        </fieldset>
                    ))}
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
                        label="Opis nad podglądem galerii"
                        hint="Opcjonalny"
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
                                <ItemLegend name="Zdjęcie" number={index + 1} />
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
                            <ItemLegend name="Kategoria" number={categoryIndex + 1} />
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

// name = genitive, e.g. "regulaminu"
function DocumentEditor({ contentKey, name, saveLabel, hint = "", onAction }) {
    const editor = useContentEditor(contentKey, onAction);
    const document = editor.content;

    return (
        <ContentForm editor={editor} saveLabel={saveLabel}>
            {document && (
                <>
                    <p className="admin-hint">
                        Najprościej: otwórz dokument w Wordzie, zaznacz całość
                        (Ctrl+A), skopiuj (Ctrl+C) i wklej tutaj (Ctrl+V) w miejsce
                        starej treści. Nagłówki, listy (także a, b, c) i
                        pogrubienia zostaną zachowane. Możesz też dodać PDF — na
                        stronie pojawi się przycisk „Pobierz PDF”. {hint}
                    </p>
                    <TextInput
                        label="Tytuł"
                        value={document.title}
                        onChange={(title) => editor.update({ title })}
                    />
                    <PdfField
                        label={`Plik PDF ${name} (opcjonalny)`}
                        value={document.pdfUrl}
                        onChange={(pdfUrl) => editor.update({ pdfUrl })}
                    />
                    <span className="field-label">Treść {name}</span>
                    <RichText
                        key={editor.version}
                        value={document.html}
                        minHeight={400}
                        ariaLabel={`Treść ${name}`}
                        onChange={(html) => editor.update({ html })}
                    />
                </>
            )}
        </ContentForm>
    );
}

export function RegulaminEditor({ onAction }) {
    return (
        <DocumentEditor
            contentKey="regulamin"
            name="regulaminu"
            saveLabel="Zapisz regulamin"
            onAction={onAction}
        />
    );
}

export function PrivacyEditor({ onAction }) {
    return (
        <DocumentEditor
            contentKey="privacy"
            name="polityki prywatności"
            saveLabel="Zapisz politykę prywatności"
            hint="Domyślna treść opisuje dane, które zbiera ta strona — przed publikacją daj ją do sprawdzenia."
            onAction={onAction}
        />
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
                        label="Link"
                        hint="Opcjonalny, np. /regulamin albo https://…"
                        value={announcement.linkUrl}
                        onChange={(linkUrl) => editor.update({ linkUrl })}
                    />
                    <TextInput
                        label="Tekst linku"
                        value={announcement.linkLabel}
                        placeholder="Więcej"
                        onChange={(linkLabel) => editor.update({ linkLabel })}
                    />
                    <p className="admin-hint">
                        Dla zalogowanych (opcjonalnie). Puste pole „Treść” = ta sama treść co
                        wyżej. Bez linku dla zalogowanych link z góry jest dla nich ukryty —
                        np. „Załóż konto” nie ma sensu, gdy ktoś już je ma.
                    </p>
                    <TextInput
                        label="Treść dla zalogowanych"
                        value={announcement.loggedInText || ""}
                        maxLength={300}
                        onChange={(loggedInText) => editor.update({ loggedInText })}
                    />
                    <TextInput
                        label="Link dla zalogowanych"
                        hint="Np. /garaz"
                        value={announcement.loggedInLinkUrl || ""}
                        onChange={(loggedInLinkUrl) => editor.update({ loggedInLinkUrl })}
                    />
                    <TextInput
                        label="Tekst linku dla zalogowanych"
                        value={announcement.loggedInLinkLabel || ""}
                        placeholder="Więcej"
                        onChange={(loggedInLinkLabel) => editor.update({ loggedInLinkLabel })}
                    />
                    <label>
                        <span className="field-label">Kolor</span>
                        <select
                            value={announcement.variant}
                            onChange={(event) => editor.update({ variant: event.target.value })}
                        >
                            <option value="info">Czarny (informacja)</option>
                            <option value="warning">Żółty (ważne)</option>
                        </select>
                    </label>
                    <label>
                        <span className="field-label">Ukryj automatycznie po dniu (opcjonalnie)</span>
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

const PARTNER_TIERS = [
    ["main", "Sponsor główny wydarzenia"],
    ["partner", "Partner wydarzenia"],
    ["exhibitor", "Wystawca"],
];

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
                        Logotypy pokazują się na stronie głównej nad kontaktem.
                        Sponsor główny i partner wydarzenia mają duże, kolorowe logo
                        na górze sekcji, wystawcy są w siatce pod nimi. Bez wpisów
                        sekcja jest ukryta. Najlepiej wyglądają logotypy PNG/WEBP
                        z przezroczystym tłem.
                    </p>
                    <TextInput
                        label="Nagłówek sekcji"
                        value={partners.title}
                        onChange={(title) => editor.update({ title })}
                    />
                    <div className="event-editor-grid">
                        {items.map((item, index) => (
                            <fieldset className="event-editor-card" key={item.id}>
                                {item.name ? (
                                    <legend className="item-legend">{item.name}</legend>
                                ) : (
                                    <ItemLegend name="Partner" number={index + 1} />
                                )}
                                <label>
                                    <span className="field-label">Rodzaj</span>
                                    <select
                                        value={item.tier || "exhibitor"}
                                        onChange={(event) => updateItem(index, { tier: event.target.value })}
                                    >
                                        {PARTNER_TIERS.map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
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
                                    label="Strona partnera"
                                    hint="Opcjonalnie"
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
                                setItems([...items, { id: newId("partner"), tier: "exhibitor", name: "", logo: "", url: "" }])
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

function DateNotifyBanner({ edition, savedCount, onOpen }) {
    const [pending, setPending] = useState(0);

    useEffect(() => {
        if (!savedCount || !edition?.date) return;
        api.get("/admin/date-subscribers")
            .then(({ data }) => setPending(data.pending || 0))
            .catch(() => setPending(0));
    }, [savedCount, edition?.date]);

    if (!pending || !edition?.date) return null;
    return (
        <div className="admin-dark-banner" role="status">
            <i className="bi bi-envelope-paper" aria-hidden="true" />
            <div>
                <p className="admin-dark-banner-title">
                    Data zapisana.{" "}
                    {plural(pending, "osoba czeka", "osoby czekają", "osób czeka")} na powiadomienie.
                </p>
                <p>
                    Formularz „Daj mi znać o dacie” zniknął ze strony. Wyślij jedną wiadomość z
                    terminem i linkiem do biletów.
                </p>
            </div>
            <button type="button" className="btn-street btn-street-primary" onClick={onOpen}>
                Napisz wiadomość
            </button>
        </div>
    );
}

// iOS shows no placeholder in empty date inputs
function DateField({ label, value, onChange, type = "date" }) {
    return (
        <label>
            <span className="field-label">{label}</span>
            <input type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} />
            {type === "date" && <span className="field-hint">Zostaw puste, jeśli termin nie jest znany</span>}
        </label>
    );
}

export function EditionEditor({ onAction, onOpenDateNotify = undefined }) {
    const editor = useContentEditor("edition", onAction);
    const edition = editor.content;

    return (
        <>
            {onOpenDateNotify && (
                <DateNotifyBanner
                    edition={edition}
                    savedCount={editor.savedCount}
                    onOpen={onOpenDateNotify}
                />
            )}
            <ContentForm editor={editor} saveLabel="Zapisz">
                {edition && (
                    <>
                        <div className="admin-form-row admin-form-row-year">
                            <TextInput
                                label="Rok"
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
                        </div>
                        <div className="admin-form-row admin-form-row-3">
                            <DateField
                                label="Data"
                                value={edition.date}
                                onChange={(date) => editor.update({ date })}
                            />
                            <DateField
                                label="Start"
                                type="time"
                                value={edition.startTime}
                                onChange={(startTime) => editor.update({ startTime })}
                            />
                            <DateField
                                label="Koniec"
                                type="time"
                                value={edition.endTime}
                                onChange={(endTime) => editor.update({ endTime })}
                            />
                        </div>
                        <TextInput
                            label="Tekst, gdy data nie jest jeszcze znana"
                            value={edition.dateText}
                            placeholder="Termin wkrótce"
                            onChange={(dateText) => editor.update({ dateText })}
                        />
                        <div className="admin-form-row">
                            <TextInput
                                label="Miejsce"
                                value={edition.venueName}
                                onChange={(venueName) => editor.update({ venueName })}
                            />
                            <TextInput
                                label="Adres"
                                value={edition.venueAddress}
                                onChange={(venueAddress) => editor.update({ venueAddress })}
                            />
                        </div>
                        <p className="admin-info">
                            <i className="bi bi-info-circle" aria-hidden="true" />
                            <span>
                                Zmiana roku rozpoczyna nowy sezon: limity i statystyki liczą się od
                                zera, starsze zgłoszenia trafiają do archiwum. Data i miejsce
                                pokazują się na stronie głównej i w Google.
                            </span>
                        </p>
                    </>
                )}
            </ContentForm>
        </>
    );
}

// one cms section split into two tabs, each saves the whole section
export function SubmissionSettingsEditor({ onAction, part = "zapisy" }) {
    const editor = useContentEditor("settings", onAction);
    const settings = editor.content;

    if (part === "oplaty") {
        return (
            <ContentForm editor={editor} saveLabel="Zapisz">
                {settings && (
                    <>
                        <p className="admin-hint">
                            Uczestnik z zaakceptowanym zgłoszeniem widzi te dane w panelu (z
                            przyciskami „Kopiuj”) i w e-mailu o akceptacji.
                        </p>
                        <div className="admin-form-row">
                            <TextInput
                                label="Kwota"
                                value={settings.selectFeeAmount}
                                maxLength={100}
                                placeholder="np. 150 zł"
                                onChange={(selectFeeAmount) => editor.update({ selectFeeAmount })}
                            />
                            <TextInput
                                label="Odbiorca przelewu"
                                value={settings.paymentRecipient}
                                maxLength={200}
                                placeholder="np. Street Meeting Poland Sp. z o.o."
                                onChange={(paymentRecipient) => editor.update({ paymentRecipient })}
                            />
                        </div>
                        <TextInput
                            label="Numer konta"
                            hint="26 cyfr"
                            value={settings.paymentAccount}
                            maxLength={60}
                            placeholder="12 3456 7890 1234 5678 9012 3456"
                            inputMode="numeric"
                            onChange={(paymentAccount) => editor.update({ paymentAccount })}
                            onBlur={() => editor.update({ paymentAccount: formatAccount(settings.paymentAccount) })}
                        />
                        {settings.paymentAccount && accountDigits(settings.paymentAccount).length !== 26 && (
                            <p className="form-error">
                                Numer konta ma 26 cyfr — teraz: {accountDigits(settings.paymentAccount).length}.
                            </p>
                        )}
                        <TextInput
                            label="Tytuł przelewu — {rok} i {rejestracja} zostaną podmienione"
                            value={settings.paymentTitleTemplate}
                            maxLength={140}
                            onChange={(paymentTitleTemplate) => editor.update({ paymentTitleTemplate })}
                        />
                        <div className="admin-form-row">
                            <DateField
                                label="Termin płatności (opcjonalny)"
                                value={settings.paymentDeadline}
                                onChange={(paymentDeadline) => editor.update({ paymentDeadline })}
                            />
                            <TextInput
                                label="Dni na opłatę od akceptacji"
                                hint="0 = tylko termin"
                                type="number"
                                min={0}
                                max={90}
                                value={settings.paymentDaysAfterApproval ?? 0}
                                onChange={(value) => editor.update({ paymentDaysAfterApproval: Number(value) })}
                            />
                        </div>
                        <p className="admin-info">
                            <i className="bi bi-info-circle" aria-hidden="true" />
                            <span>
                                Obowiązuje wcześniejszy z terminów. 3 dni przed nim uczestnik dostaje
                                przypomnienie e-mailem. Po potwierdzeniu opłaty dostaje e-mail z
                                linkiem do wejściówki QR.
                            </span>
                        </p>
                    </>
                )}
            </ContentForm>
        );
    }

    return (
        <ContentForm editor={editor} saveLabel="Zapisz">
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
                    <div className="admin-form-row admin-form-row-3">
                        <DateField
                            label="Termin zgłoszeń (opcjonalny)"
                            value={settings.submissionsDeadline}
                            onChange={(submissionsDeadline) => editor.update({ submissionsDeadline })}
                        />
                        <TextInput
                            label="Pojazdów na konto"
                            type="number"
                            min={1}
                            max={50}
                            value={settings.maxVehiclesPerUser}
                            onChange={(value) => editor.update({ maxVehiclesPerUser: Number(value) })}
                        />
                        <TextInput
                            label="Miejsc w strefie"
                            hint="0 = bez limitu"
                            type="number"
                            min={0}
                            value={settings.selectCapacity}
                            onChange={(value) => editor.update({ selectCapacity: Number(value) })}
                        />
                    </div>
                    <p className="admin-hint">
                        Limit pojazdów liczy się w bieżącej edycji. Akceptacja ponad liczbę miejsc
                        wymaga potwierdzenia — nadmiarowe auta trafiają na listę rezerwową.
                    </p>
                    <label className="admin-checkbox-label">
                        <input
                            type="checkbox"
                            checked={Boolean(settings.showcaseEnabled)}
                            onChange={(event) => editor.update({ showcaseEnabled: event.target.checked })}
                        />
                        Pokazuj na stronie listę zaakceptowanych aut („Auta strefy Select”, /auta-select) — tylko
                        marka i zdjęcia aut, których właściciele zgodzili się na publikację zdjęć
                    </label>
                    <TextArea
                        label="Informacje dla zaakceptowanych uczestników (widoczne w ich panelu): godziny i brama wjazdu, co zabrać, kontakt w dniu wydarzenia…"
                        rows={5}
                        maxLength={3000}
                        value={settings.participantInfo}
                        onChange={(participantInfo) => editor.update({ participantInfo })}
                    />
                </>
            )}
        </ContentForm>
    );
}

function accountDigits(value) {
    return String(value || "").replace(/\s+/g, "").replace(/^PL/i, "");
}

function formatAccount(value) {
    const digits = accountDigits(value);
    if (!/^\d{26}$/.test(digits)) return String(value || "").trim();
    return `${digits.slice(0, 2)} ${digits.slice(2).replace(/(\d{4})(?=\d)/g, "$1 ")}`;
}

export { default as TemplatesEditor } from "./TemplatesEditor";
