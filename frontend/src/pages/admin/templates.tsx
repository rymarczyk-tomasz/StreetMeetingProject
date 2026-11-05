// Message templates picker; the data helpers live in templateData.ts.

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
