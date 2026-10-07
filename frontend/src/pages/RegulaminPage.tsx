import { useEffect, useMemo, useState } from "react";
import { useContent } from "../api/content";
import PageHeader from "../components/PageHeader";

// Gives every <h2> of the CMS HTML an id and returns the list for the table of
// contents. The HTML is sanitized on the server when saved.
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

// Highlights the heading currently at the top of the screen.
function useActiveHeading(ids: string[]) {
    const [activeId, setActiveId] = useState("");

    useEffect(() => {
        if (!ids.length) return;
        const elements = ids
            .map((id) => document.getElementById(id))
            .filter((element): element is HTMLElement => Boolean(element));

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((entry) => entry.isIntersecting);
                if (visible[0]) setActiveId(visible[0].target.id);
            },
            { rootMargin: "-120px 0px -70% 0px" },
        );
        elements.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, [ids]);

    return activeId || ids[0] || "";
}

// Also renders the privacy policy (contentKey="privacy") — same CMS shape.
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
