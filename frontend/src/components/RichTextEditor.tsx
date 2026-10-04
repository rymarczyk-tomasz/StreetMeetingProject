import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { transformWordHtml } from "../utils/wordPaste";

type RichTextEditorProps = {
    value: string;
    onChange: (html: string) => void;
    minHeight?: number;
    ariaLabel?: string;
};

// Word-like editor for non-technical editors (FAQ answers, regulamin). Pasting from
// Word or Google Docs keeps headings, lists (incl. a/b/c) and bold/italic/underline;
// the server sanitizes the HTML again on save. Remount (change `key`) to load new
// content from outside, e.g. after restoring an older version.
export default function RichTextEditor({
    value,
    onChange,
    minHeight = 160,
    ariaLabel = "Edytor treści",
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                code: false,
                codeBlock: false,
                link: {
                    openOnClick: false,
                    autolink: true,
                    defaultProtocol: "https",
                },
            }),
        ],
        content: value,
        editorProps: {
            transformPastedHTML: transformWordHtml,
            attributes: {
                class: "rich-text-editor-content rich-text",
                "aria-label": ariaLabel,
                style: `min-height: ${minHeight}px`,
            },
        },
        onUpdate: ({ editor: current }) => onChange(current.getHTML()),
    });

    const state = useEditorState({
        editor,
        selector: ({ editor: current }) =>
            current
                ? {
                      h2: current.isActive("heading", { level: 2 }),
                      h3: current.isActive("heading", { level: 3 }),
                      bold: current.isActive("bold"),
                      italic: current.isActive("italic"),
                      underline: current.isActive("underline"),
                      bulletList: current.isActive("bulletList"),
                      numbered:
                          current.isActive("orderedList") &&
                          !current.getAttributes("orderedList").type,
                      lettered:
                          current.isActive("orderedList") &&
                          current.getAttributes("orderedList").type === "a",
                      link: current.isActive("link"),
                      canUndo: current.can().undo(),
                      canRedo: current.can().redo(),
                  }
                : null,
    });

    if (!editor || !state) return null;

    function toggleLetteredList() {
        if (state.lettered) {
            editor.chain().focus().toggleOrderedList().run();
        } else if (state.numbered) {
            editor.chain().focus().updateAttributes("orderedList", { type: "a" }).run();
        } else {
            editor
                .chain()
                .focus()
                .toggleOrderedList()
                .updateAttributes("orderedList", { type: "a" })
                .run();
        }
    }

    function toggleNumberedList() {
        if (state.lettered) {
            editor.chain().focus().updateAttributes("orderedList", { type: null }).run();
        } else {
            editor.chain().focus().toggleOrderedList().run();
        }
    }

    function editLink() {
        const previous = editor.getAttributes("link").href || "";
        const url = window.prompt(
            "Adres linku (np. https://… albo /regulamin). Zostaw puste, aby usunąć link.",
            previous,
        );
        if (url === null) return;
        if (!url.trim()) {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
    }

    const buttons = [
        { label: "Nagłówek", title: "Nagłówek sekcji", active: state.h2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
        { label: "Podtytuł", title: "Mniejszy nagłówek", active: state.h3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
        { label: "B", title: "Pogrubienie (Ctrl+B)", active: state.bold, run: () => editor.chain().focus().toggleBold().run(), className: "is-bold" },
        { label: "I", title: "Kursywa (Ctrl+I)", active: state.italic, run: () => editor.chain().focus().toggleItalic().run(), className: "is-italic" },
        { label: "U", title: "Podkreślenie (Ctrl+U)", active: state.underline, run: () => editor.chain().focus().toggleUnderline().run(), className: "is-underline" },
        { label: "• Lista", title: "Lista punktowana", active: state.bulletList, run: () => editor.chain().focus().toggleBulletList().run() },
        { label: "1. Lista", title: "Lista numerowana", active: state.numbered, run: toggleNumberedList },
        { label: "a) Lista", title: "Lista z literami a, b, c", active: state.lettered, run: toggleLetteredList },
        { label: "Link", title: "Dodaj lub zmień link", active: state.link, run: editLink },
        { label: "↶", title: "Cofnij (Ctrl+Z)", disabled: !state.canUndo, run: () => editor.chain().focus().undo().run() },
        { label: "↷", title: "Ponów (Ctrl+Y)", disabled: !state.canRedo, run: () => editor.chain().focus().redo().run() },
        { label: "Wyczyść format", title: "Usuń formatowanie zaznaczenia", run: () => editor.chain().focus().unsetAllMarks().clearNodes().run() },
    ];

    return (
        <div className="rich-text-editor">
            <div className="rich-text-toolbar" role="toolbar" aria-label="Formatowanie">
                {buttons.map((button) => (
                    <button
                        key={button.label}
                        type="button"
                        title={button.title}
                        aria-label={button.title}
                        aria-pressed={button.active ?? undefined}
                        disabled={button.disabled}
                        className={`${button.active ? "is-active " : ""}${button.className || ""}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={button.run}
                    >
                        {button.label}
                    </button>
                ))}
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}
