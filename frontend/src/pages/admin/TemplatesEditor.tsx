import { useLayoutEffect, useRef, useState } from "react";
import { moveItem, newId } from "./fields";
import { ContentForm, useContentEditor } from "./useContentEditor";

// Admin → Ustawienia → Szablony: a list of rows; one row at a time opens for
// editing in place and is saved on its own. Rows are reordered by dragging the
// grip (or with ↑/↓ on it).

const KIND_LABELS = { note: "Komentarz", group: "Do grupy" };
const KIND_OPTIONS = [
    ["note", "Komentarz"],
    ["group", "Do grupy"],
];
const FILTERS = [
    ["", "Wszystkie"],
    ["note", "Komentarze"],
    ["group", "Do grupy"],
];
// Group messages have no single submission, so only {rok} gets filled in there.
const VARIABLES = {
    note: ["{rok}", "{marka}", "{rejestracja}"],
    group: ["{rok}"],
};

function firstLine(text) {
    return String(text || "").split("\n").find((line) => line.trim()) || "";
}

// Grows with the text instead of scrolling inside (min. 6 rows from `rows`).
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
                    <select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value })}>
                        {KIND_OPTIONS.map(([kind, label]) => (
                            <option key={kind} value={kind}>
                                {label}
                            </option>
                        ))}
                    </select>
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
                <span>Wstaw dane zgłoszenia:</span>
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
        if (!window.confirm(`Usunąć szablon „${item.title}”?`)) return;
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
        </ContentForm>
    );
}
