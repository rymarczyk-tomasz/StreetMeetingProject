import Select from "../../components/Select";
import { useLayoutEffect, useRef, useState } from "react";
import { askConfirm } from "../../api/confirm";
import { moveItem, newId } from "./shared";
import { ContentForm } from "./ContentForm";
import { useContentEditor } from "./useContentEditor";
import { ZONES } from "../../utils/zones";

// Admin → Ustawienia → Szablony: a list of rows; one row at a time opens for
// editing in place and is saved on its own. Rows are reordered by dragging the
// grip (or with ↑/↓ on it).

const KIND_LABELS = { note: "Komentarz", group: "Do grupy", zone: "Zmiana miejsca" };
const KIND_OPTIONS = [
    ["note", "Komentarz"],
    ["group", "Do grupy"],
    ["zone", "Zmiana miejsca"],
];
const FILTERS = [
    ["", "Wszystkie"],
    ["note", "Komentarze"],
    ["group", "Do grupy"],
    ["zone", "Zmiana miejsca"],
];
const VARIABLES = {
    note: ["{rok}", "{marka}", "{rejestracja}"],
    group: ["{rok}"],
    zone: ["{miejsce}", "{marka}", "{rejestracja}", "{rok}"],
};
const VARIABLE_HINTS = {
    note: "Zmienne zostaną podmienione od razu, gdy wstawisz szablon w zgłoszeniu.",
    group: "{rok} zostanie podmienione po wybraniu szablonu. Wiadomość zaczyna się sama od „Cześć Imię,” — nie wpisuj powitania w treści.",
    zone: "Używany przy zmianie miejsca auta w zgłoszeniu. {miejsce} to nowe miejsce. E-mail sam zaczyna się od powitania i podaje stare oraz nowe miejsce — w treści wpisz powód i dodatkowe informacje.",
};

// filled in by the server when the acceptance e-mail goes out (notifications/email.ts)
const ACCEPTANCE_VARIABLES = [
    "{imie}",
    "{marka}",
    "{rejestracja}",
    "{rok}",
    "{miejsce}",
    "{obiekt}",
    "{adres}",
    "{data}",
    "{kiedy}",
    "{kwota}",
    "{termin}",
    "{termin_platnosci}",
    "{link_platnosci}",
    "{numer_konta}",
    "{odbiorca}",
    "{tytul_przelewu}",
    "{panel}",
];

// The acceptance e-mail is kept per place; the place is chosen by the admin on approval.
function ZoneTemplates({ editor, field, legend, hint, saveLabel }) {
    const [zone, setZone] = useState(ZONES[0][0]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const texts = editor.content?.[field] || {};
    const value = texts[zone] ?? "";

    function setValue(next) {
        editor.update({ [field]: { ...texts, [zone]: next } });
    }

    function insertVariable(variable) {
        const element = textareaRef.current;
        const start = element ? element.selectionStart : value.length;
        const end = element ? element.selectionEnd : value.length;
        setValue(value.slice(0, start) + variable + value.slice(end));
        requestAnimationFrame(() => {
            if (!element) return;
            element.focus();
            element.setSelectionRange(start + variable.length, start + variable.length);
        });
    }

    return (
        <fieldset className="templates-signature templates-acceptance">
            <legend>{legend}</legend>
            <p className="admin-hint">
                {hint} Linia, w której zmienna jest pusta
                (np. brak linku do płatności), zostanie pominięta. <code>**tekst**</code> to pogrubienie,{" "}
                <code>!!tekst!!</code> to czerwone podkreślenie, linia zaczynająca się od <code>- </code> to punkt
                listy. Podpis dodaje się sam.
            </p>
            <div className="subs-chip-group" role="group" aria-label="Miejsce na wydarzeniu">
                {ZONES.map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        className={`subs-chip${zone === key ? " is-active" : ""}`}
                        aria-pressed={zone === key}
                        onClick={() => setZone(key)}
                    >
                        {label}
                        {!String(texts[key] || "").trim() && <span>domyślny</span>}
                    </button>
                ))}
            </div>
            <AutoTextarea
                textareaRef={textareaRef}
                value={value}
                maxLength={5000}
                aria-label={`${legend}: ${ZONES.find(([key]) => key === zone)?.[1]}`}
                onChange={setValue}
            />
            <div className="templates-variables">
                <span>Wstaw:</span>
                {ACCEPTANCE_VARIABLES.map((variable) => (
                    <button key={variable} type="button" className="subs-chip" onClick={() => insertVariable(variable)}>
                        {variable}
                    </button>
                ))}
            </div>
            <p className="admin-hint">
                {"{kwota}"} i {"{link_platnosci}"} biorą się z Ustawienia → Opłaty,{" "}
                {"{termin}"} to termin płatności, {"{termin_platnosci}"} to „w ciągu 7 dni od momentu otrzymania
                akceptacji.” (liczba dni z Ustawienia → Opłaty) albo „do 15 maja 2027 r.”, gdy obowiązuje stały termin,{" "}
                {"{obiekt}"}, {"{adres}"} i {"{data}"} — z sekcji Edycja,{" "}
                {"{kiedy}"} to data w formie „w sobotę, 29 maja 2027 r.”.
            </p>
            <div className="templates-form-footer">
                <button
                    type="button"
                    className="btn-street btn-street-primary"
                    disabled={editor.isSaving}
                    onClick={() => editor.save(null)}
                >
                    {editor.isSaving ? "Zapisywanie..." : saveLabel}
                </button>
            </div>
        </fieldset>
    );
}

const ACCREDITATION_VARIABLES = ["{rok}", "{obiekt}", "{adres}", "{data}", "{kiedy}"];
const STATUS_VARIABLES = ["{imie}", "{marka}", "{rejestracja}", "{rok}"];

// one text for every place: odrzucenie, rezerwa, potwierdzenie opłaty
function StatusTemplate({ editor, field, legend, hint, saveLabel, variables = STATUS_VARIABLES, subjectField = "" }) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const value = editor.content?.[field] ?? "";

    function insertVariable(variable) {
        const element = textareaRef.current;
        const start = element ? element.selectionStart : value.length;
        const end = element ? element.selectionEnd : value.length;
        editor.update({ [field]: value.slice(0, start) + variable + value.slice(end) });
        requestAnimationFrame(() => {
            if (!element) return;
            element.focus();
            element.setSelectionRange(start + variable.length, start + variable.length);
        });
    }

    return (
        <fieldset className="templates-signature templates-acceptance">
            <legend>{legend}</legend>
            <p className="admin-hint">
                {hint} <code>**tekst**</code> to pogrubienie, <code>!!tekst!!</code> to czerwone podkreślenie. Podpis
                dodaje się sam. Puste pole = krótki e-mail domyślny.
            </p>
            {subjectField && (
                <input
                    className="field-input"
                    aria-label={`${legend}: temat`}
                    placeholder="Temat wiadomości"
                    maxLength={200}
                    value={editor.content?.[subjectField] ?? ""}
                    onChange={(event) => editor.update({ [subjectField]: event.target.value })}
                />
            )}
            <AutoTextarea
                textareaRef={textareaRef}
                value={value}
                maxLength={5000}
                aria-label={legend}
                onChange={(next) => editor.update({ [field]: next })}
            />
            <div className="templates-variables">
                <span>Wstaw:</span>
                {variables.map((variable) => (
                    <button key={variable} type="button" className="subs-chip" onClick={() => insertVariable(variable)}>
                        {variable}
                    </button>
                ))}
            </div>
            <div className="templates-form-footer">
                <button
                    type="button"
                    className="btn-street btn-street-primary"
                    disabled={editor.isSaving}
                    onClick={() => editor.save(null)}
                >
                    {editor.isSaving ? "Zapisywanie..." : saveLabel}
                </button>
            </div>
        </fieldset>
    );
}

function firstLine(text) {
    return String(text || "").split("\n").find((line) => line.trim()) || "";
}

function AutoTextarea({ textareaRef, value, onChange, ...props }) {
    useLayoutEffect(() => {
        const element = textareaRef.current;
        if (!element) return;
        element.style.height = "auto";
        element.style.height = `${element.scrollHeight + 2}px`;
    }, [value, textareaRef]);

    return (
        <textarea
            ref={textareaRef}
            rows={6}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="templates-textarea"
            {...props}
        />
    );
}

function TemplateForm({ draft, setDraft, isNew, isSaving, onSave, onCancel, onRemove }) {
    const bodyRef = useRef<HTMLTextAreaElement>(null);

    // Puts the variable where the cursor is (or at the end) and keeps the focus.
    function insertVariable(variable) {
        const element = bodyRef.current;
        const start = element ? element.selectionStart : draft.body.length;
        const end = element ? element.selectionEnd : draft.body.length;
        const body = draft.body.slice(0, start) + variable + draft.body.slice(end);
        setDraft({ ...draft, body });
        requestAnimationFrame(() => {
            if (!element) return;
            element.focus();
            element.setSelectionRange(start + variable.length, start + variable.length);
        });
    }

    return (
        <div className="templates-form">
            <div className="templates-form-row">
                <label>
                    <span className="field-label">Rodzaj</span>
                    <Select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value })}>
                        {KIND_OPTIONS.map(([kind, label]) => (
                            <option key={kind} value={kind}>
                                {label}
                            </option>
                        ))}
                    </Select>
                </label>
                <label>
                    <span className="field-label">Nazwa (widoczna tylko w panelu)</span>
                    <input
                        value={draft.title}
                        maxLength={120}
                        onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                        autoFocus={isNew}
                    />
                </label>
            </div>
            {draft.kind === "group" && (
                <label>
                    <span className="field-label">Temat wiadomości</span>
                    <input
                        value={draft.subject}
                        maxLength={200}
                        onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
                    />
                </label>
            )}
            <label>
                <span className="field-label">Treść</span>
                <AutoTextarea
                    textareaRef={bodyRef}
                    value={draft.body}
                    maxLength={5000}
                    onChange={(body) => setDraft({ ...draft, body })}
                />
            </label>
            <div className="templates-variables">
                <span>{draft.kind === "group" ? "Wstaw:" : "Wstaw dane zgłoszenia:"}</span>
                {VARIABLES[draft.kind].map((variable) => (
                    <button
                        key={variable}
                        type="button"
                        className="subs-chip"
                        onClick={() => insertVariable(variable)}
                    >
                        {variable}
                    </button>
                ))}
            </div>
            <p className="admin-hint">{VARIABLE_HINTS[draft.kind]}</p>
            <div className="templates-form-footer">
                <button
                    type="button"
                    className="btn-street btn-street-primary"
                    disabled={isSaving || !draft.title.trim() || !draft.body.trim()}
                    onClick={onSave}
                >
                    {isSaving ? "Zapisywanie..." : "Zapisz"}
                </button>
                <button type="button" className="text-action" onClick={onCancel}>
                    Anuluj
                </button>
                {!isNew && (
                    <button type="button" className="text-action templates-remove" onClick={onRemove}>
                        Usuń
                    </button>
                )}
            </div>
        </div>
    );
}

export default function TemplatesEditor({ onAction }) {
    const editor = useContentEditor("templates", onAction);
    const items = editor.content?.items || [];
    const [filter, setFilter] = useState("");
    // The row being edited: its id and a draft copy (isNew until first saved).
    const [editing, setEditing] = useState(null);
    const [dragIndex, setDragIndex] = useState(null);

    async function saveItems(next) {
        return editor.save(null, { ...editor.content, items: next });
    }

    function open(item) {
        setEditing({ id: item.id, draft: { ...item }, isNew: false });
    }

    function addNew() {
        const draft = { id: newId("template"), kind: filter || "note", title: "", subject: "", body: "" };
        setEditing({ id: draft.id, draft, isNew: true });
    }

    async function saveDraft() {
        const { draft, isNew } = editing;
        const next = isNew ? [...items, draft] : items.map((item) => (item.id === draft.id ? draft : item));
        if (await saveItems(next)) setEditing(null);
    }

    async function remove(item) {
        const confirmed = await askConfirm({
            title: "Usunąć szablon?",
            message: `Szablon „${item.title}” zostanie usunięty.`,
            confirmLabel: "Usuń",
            danger: true,
        });
        if (!confirmed) return;
        if (await saveItems(items.filter((other) => other.id !== item.id))) setEditing(null);
    }

    function move(from, to) {
        if (to < 0 || to >= items.length || from === to) return;
        saveItems(moveItem(items, from, to));
    }

    const visible = items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !filter || item.kind === filter);
    const newRow = editing?.isNew ? editing : null;

    function renderForm() {
        return (
            <TemplateForm
                draft={editing.draft}
                setDraft={(draft) => setEditing({ ...editing, draft })}
                isNew={editing.isNew}
                isSaving={editor.isSaving}
                onSave={saveDraft}
                onCancel={() => setEditing(null)}
                onRemove={() => remove(editing.draft)}
            />
        );
    }

    return (
        <ContentForm editor={editor} showSave={false}>
            <div className="templates-toolbar">
                <div className="subs-chip-group" role="group" aria-label="Rodzaj szablonów">
                    {FILTERS.map(([kind, label]) => (
                        <button
                            key={label}
                            type="button"
                            className={`subs-chip${filter === kind ? " is-active" : ""}`}
                            aria-pressed={filter === kind}
                            onClick={() => setFilter(kind)}
                        >
                            {label}{" "}
                            <span>{kind ? items.filter((item) => item.kind === kind).length : items.length}</span>
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    className="btn-street btn-street-dark"
                    onClick={addNew}
                    disabled={Boolean(newRow)}
                >
                    <i className="bi bi-plus-lg" aria-hidden="true" />
                    Nowy szablon
                </button>
            </div>

            <ul className="templates-list">
                {visible.length === 0 && !newRow && (
                    <li className="templates-empty">Brak szablonów tego rodzaju.</li>
                )}
                {visible.map(({ item, index }) => {
                    const isOpen = editing?.id === item.id;
                    return (
                        <li
                            key={item.id}
                            className={`templates-row${isOpen ? " is-open" : ""}${dragIndex === index ? " is-dragging" : ""}`}
                            onDragOver={(event) => dragIndex !== null && event.preventDefault()}
                            onDrop={(event) => {
                                event.preventDefault();
                                if (dragIndex !== null) move(dragIndex, index);
                                setDragIndex(null);
                            }}
                        >
                            {isOpen ? (
                                renderForm()
                            ) : (
                                <div className="templates-row-main">
                                    <button
                                        type="button"
                                        className="templates-grip"
                                        draggable={!editor.isSaving}
                                        onDragStart={(event) => {
                                            event.dataTransfer.effectAllowed = "move";
                                            setDragIndex(index);
                                        }}
                                        onDragEnd={() => setDragIndex(null)}
                                        onKeyDown={(event) => {
                                            if (event.key === "ArrowUp") {
                                                event.preventDefault();
                                                move(index, index - 1);
                                            } else if (event.key === "ArrowDown") {
                                                event.preventDefault();
                                                move(index, index + 1);
                                            }
                                        }}
                                        aria-label={`Przesuń szablon „${item.title}” (strzałki ↑↓)`}
                                        title="Przeciągnij, żeby zmienić kolejność"
                                    >
                                        <i className="bi bi-grip-vertical" aria-hidden="true" />
                                    </button>
                                    <span className="templates-row-text">
                                        <strong>{item.title}</strong>
                                        <span>{firstLine(item.body)}</span>
                                    </span>
                                    <span className={`templates-kind is-${item.kind}`}>{KIND_LABELS[item.kind]}</span>
                                    <button
                                        type="button"
                                        className="text-action"
                                        onClick={() => open(item)}
                                        disabled={Boolean(editing)}
                                    >
                                        Edytuj
                                    </button>
                                </div>
                            )}
                        </li>
                    );
                })}
                {newRow && <li className="templates-row is-open">{renderForm()}</li>}
            </ul>

            <ZoneTemplates
                editor={editor}
                field="acceptance"
                legend="E-mail akceptacji"
                hint="Wysyłany po zaakceptowaniu zgłoszenia — treść zależy od miejsca wybranego przy akceptacji. Puste pole = krótki e-mail domyślny z danymi do opłaty."
                saveLabel="Zapisz e-mail akceptacji"
            />
            <StatusTemplate
                editor={editor}
                field="paymentConfirmed"
                legend="E-mail po potwierdzeniu opłaty"
                hint="Wysyłany, gdy w panelu admina klikniesz „Potwierdź opłatę i wyślij wejściówkę”. Jeden tekst dla każdego miejsca — {miejsce} wstawi się samo. {panel} prowadzi do wejściówki z kodem QR."
                saveLabel="Zapisz e-mail po opłacie"
                variables={ACCEPTANCE_VARIABLES}
            />

            <StatusTemplate
                editor={editor}
                field="waitlist"
                legend="E-mail rezerwy"
                hint="Wysyłany, gdy zgłoszenie trafia na listę rezerwową. Komentarz wpisany przy decyzji dopisze się pod treścią."
                saveLabel="Zapisz e-mail rezerwy"
            />
            <StatusTemplate
                editor={editor}
                field="rejection"
                legend="E-mail odrzucenia"
                hint="Wysyłany po odrzuceniu zgłoszenia. Komentarz wpisany przy odrzuceniu dopisze się pod treścią."
                saveLabel="Zapisz e-mail odrzucenia"
            />

            <StatusTemplate
                editor={editor}
                field="accreditationApproved"
                subjectField="accreditationApprovedSubject"
                legend="E-mail: akredytacja przyznana"
                hint="Wczytuje się po kliknięciu „Akceptuj” w Akredytacjach. Przed wysłaniem można go jeszcze poprawić dla tej jednej osoby."
                saveLabel="Zapisz e-mail akredytacji"
                variables={ACCREDITATION_VARIABLES}
            />
            <StatusTemplate
                editor={editor}
                field="accreditationRejected"
                subjectField="accreditationRejectedSubject"
                legend="E-mail: akredytacja odrzucona"
                hint="Wczytuje się po kliknięciu „Odrzuć” w Akredytacjach. Przed wysłaniem można go jeszcze poprawić dla tej jednej osoby."
                saveLabel="Zapisz e-mail odmowy akredytacji"
                variables={ACCREDITATION_VARIABLES}
            />

            <fieldset className="templates-signature">
                <legend>Podpis w e-mailach</legend>
                <p className="admin-hint">
                    Kończy każdą wiadomość wysyłaną ze strony: decyzje, przypomnienia, wiadomości do grupy i do
                    osób z „Daj mi znać”. Do trzech krótkich linijek; puste pole przywraca „Street Show Crew”.
                </p>
                <textarea
                    className="field-input field-textarea"
                    aria-label="Podpis w e-mailach"
                    rows={2}
                    maxLength={200}
                    value={editor.content?.signature ?? ""}
                    placeholder="Street Show Crew"
                    onChange={(event) => editor.update({ signature: event.target.value })}
                />
                <div className="templates-form-footer">
                    <button
                        type="button"
                        className="btn-street btn-street-primary"
                        disabled={editor.isSaving}
                        onClick={() => editor.save(null)}
                    >
                        {editor.isSaving ? "Zapisywanie..." : "Zapisz podpis"}
                    </button>
                </div>
            </fieldset>
        </ContentForm>
    );
}
