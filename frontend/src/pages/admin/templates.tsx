import { useEffect, useState } from "react";
import api from "../../api/client";

// Message templates (Admin → Ustawienia → Szablony wiadomości): "note" for the
// comment on a submission, "group" for group messages.

export type Template = { id: string; kind: "note" | "group"; title: string; subject: string; body: string };

// {rok}, {marka}, {rejestracja} → values; unknown placeholders stay as typed.
export function fillTemplate(text: string, values: Record<string, string | number | undefined>) {
    return String(text || "").replace(/\{(rok|marka|rejestracja)\}/g, (match, key) =>
        values[key] !== undefined && values[key] !== "" ? String(values[key]) : match,
    );
}

export function useTemplates(kind: Template["kind"]) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [currentEdition, setCurrentEdition] = useState<number | null>(null);

    useEffect(() => {
        api.get("/admin/content/templates")
            .then(({ data }) => setTemplates((data.content.items || []).filter((item) => item.kind === kind)))
            .catch(() => setTemplates([]));
        api.get("/admin/editions")
            .then(({ data }) => setCurrentEdition(data.currentEdition))
            .catch(() => setCurrentEdition(null));
    }, [kind]);

    return { templates, currentEdition };
}

// "Wstaw szablon…" dropdown; resets after each pick so the same one can be reused.
export function TemplatePicker({ templates, onPick, label = "Wstaw szablon" }) {
    if (!templates.length) return null;
    return (
        <select
            className="template-picker"
            aria-label={label}
            value=""
            onChange={(event) => {
                const template = templates.find((item) => item.id === event.target.value);
                if (template) onPick(template);
            }}
        >
            <option value="">{label}…</option>
            {templates.map((template) => (
                <option key={template.id} value={template.id}>
                    {template.title}
                </option>
            ))}
        </select>
    );
}
