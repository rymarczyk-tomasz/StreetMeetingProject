// Microsoft Word puts lists on the clipboard as plain paragraphs
// (<p style="mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">1.</span>…)
// instead of <ol>/<ul>. This rebuilds real (nested) lists so a regulamin pasted
// from Word keeps its 1., a), • numbering as proper lists in the editor.

const MSO_LIST = /mso-list:\s*(l\d+)\s+level(\d+)/i;
const MARKER = /^(\d+[.)]?|[a-zA-Z][.)]|[ivxlcIVXLC]+[.)]|[·•o§▪■◦\-–*])$/;

function listTypeFor(marker: string) {
    if (/^\d+[.)]?$/.test(marker)) return { tag: "ol", type: null };
    if (/^[a-z][.)]$/.test(marker)) return { tag: "ol", type: "a" };
    if (/^[A-Z][.)]$/.test(marker)) return { tag: "ol", type: "A" };
    if (/^[ivxlc]+[.)]$/.test(marker)) return { tag: "ol", type: "i" };
    if (/^[IVXLC]+[.)]$/.test(marker)) return { tag: "ol", type: "I" };
    return { tag: "ul", type: null };
}

function normalizeMarker(text: string) {
    return text.replace(/[\s ]+/g, "");
}

// Removes Word's marker ("1.", "a)", "·" + spacing) from the paragraph and returns it.
function takeMarker(paragraph: HTMLElement) {
    const ignored = paragraph.querySelector<HTMLElement>('[style*="mso-list" i][style*="ignore" i]');
    if (ignored) {
        const marker = normalizeMarker(ignored.textContent || "");
        ignored.remove();
        return marker;
    }

    // Fallback (conditional comments stripped): first child span holding only the marker.
    const first = paragraph.firstElementChild as HTMLElement | null;
    const candidate = first ? normalizeMarker(first.textContent || "") : "";
    if (first && MARKER.test(candidate)) {
        first.remove();
        return candidate;
    }
    return "";
}

export function transformWordHtml(html: string) {
    if (!/mso-list/i.test(html)) return html;

    const doc = new DOMParser().parseFromString(html, "text/html");
    let stack: { list: HTMLElement; level: number; item: HTMLElement | null }[] = [];

    for (const paragraph of Array.from(doc.body.querySelectorAll<HTMLElement>("p"))) {
        const match = (paragraph.getAttribute("style") || "").match(MSO_LIST);
        if (!match) {
            stack = [];
            continue;
        }

        const level = Number(match[2]);
        const { tag, type } = listTypeFor(takeMarker(paragraph));

        // A list continues only while its paragraphs directly follow each other.
        const rootList = stack[0]?.list;
        if (!rootList || paragraph.previousElementSibling !== rootList) stack = [];

        while (stack.length && stack[stack.length - 1].level > level) stack.pop();
        let current = stack[stack.length - 1];

        if (!current || current.level < level || current.list.tagName.toLowerCase() !== tag) {
            if (current && current.level === level) stack.pop();
            const list = doc.createElement(tag);
            if (type) list.setAttribute("type", type);
            const parent = stack[stack.length - 1];
            if (parent?.item) parent.item.appendChild(list);
            else paragraph.before(list);
            current = { list, level, item: null };
            stack.push(current);
        }

        const item = doc.createElement("li");
        item.innerHTML = paragraph.innerHTML.replace(/^(\s|&nbsp;)+/, "");
        current.list.appendChild(item);
        current.item = item;
        paragraph.remove();
    }

    return doc.body.innerHTML;
}
