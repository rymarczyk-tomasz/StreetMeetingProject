import { useEffect, useMemo, useState } from "react";
import { useContent } from "../api/content";
import PageHeader from "../components/PageHeader";

function withHeadingIds(html: string) {
    if (!html || typeof DOMParser === "undefined") return { html, headings: [] };

    const doc = new DOMParser().parseFromString(html, "text/html");
    const headings = [...doc.querySelectorAll("h2")].map((heading, index) => {
        const id = `sekcja-${index + 1}`;
        heading.id = id;
        return { id, text: heading.textContent?.trim() || `Sekcja ${index + 1}` };
    });
    return { html: doc.body.innerHTML, headings };
}

function useActiveHeading(ids: string[]) {
    const [activeId, setActiveId] = useState("");

    useEffect(() => {
        if (!ids.length) return;
        let frame = 0;

        // The active section is the last one whose heading has passed the top of the
        // screen (below the sticky navbar). Computed from positions on every scroll,
        // so fast scrolling and jumps from the table of contents can't skip a heading.
        const update = () => {
            frame = 0;
            const elements = ids
                .map((id) => document.getElementById(id))
                .filter((element): element is HTMLElement => Boolean(element));
            if (!elements.length) return;

            const navbar = parseFloat(
                getComputedStyle(document.documentElement).getPropertyValue("--navbar-height"),
            );
            const threshold = (Number.isFinite(navbar) ? navbar : 72) + 40;
            const atBottom =
                window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;

            let current = elements[0];
            if (atBottom) {
                current = elements[elements.length - 1];
            } else {
                for (const element of elements) {
                    if (element.getBoundingClientRect().top <= threshold) current = element;
                    else break;
                }
            }
            setActiveId(current.id);
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };

        schedule();
        window.addEventListener("scroll", schedule, { passive: true, capture: true });
        window.addEventListener("resize", schedule);
        return () => {
            if (frame) cancelAnimationFrame(frame);
            window.removeEventListener("scroll", schedule, { capture: true });
            window.removeEventListener("resize", schedule);
        };
    }, [ids]);

    return activeId || ids[0] || "";
}

export default function RegulaminPage({ contentKey = "regulamin", fallbackTitle = "Regulamin" }) {
    const contentKeys = useMemo(() => [contentKey], [contentKey]);
    const { content, error } = useContent(contentKeys);
    const regulamin = content?.[contentKey];
    const { html, headings } = useMemo(() => withHeadingIds(regulamin?.html || ""), [regulamin?.html]);
    const headingIds = useMemo(() => headings.map((heading) => heading.id), [headings]);
    const activeId = useActiveHeading(headingIds);

    return (
        <>
            <PageHeader
                eyebrow="Dokumenty"
                title={regulamin?.title || fallbackTitle}
                action={
                    regulamin?.pdfUrl && (
                        <a
                            className="btn-street btn-street-outline"
                            href={regulamin.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
                            Pobierz PDF
                        </a>
                    )
                }
            />
            <section className="page-section regulamin-page">
                <div className="site-container">
                    {error && (
                        <p className="page-status">
                            Nie udało się wczytać dokumentu. Odśwież stronę za chwilę.
                        </p>
                    )}
                    {!regulamin && !error && <p className="page-status">Ładowanie...</p>}
                    {regulamin && (
                        <div className={headings.length > 1 ? "side-layout" : ""}>
                            {headings.length > 1 && (
                                <aside className="side-layout-aside">
                                    <nav className="toc" aria-label="Spis treści">
                                        <p className="toc-title">Spis treści</p>
                                        {headings.map((heading) => (
                                            <a
                                                key={heading.id}
                                                href={`#${heading.id}`}
                                                className={heading.id === activeId ? "is-active" : ""}
                                            >
                                                {heading.text}
                                            </a>
                                        ))}
                                    </nav>
                                </aside>
                            )}
                            <div
                                className="rich-text document-text"
                                dangerouslySetInnerHTML={{ __html: html }}
                            />
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}
