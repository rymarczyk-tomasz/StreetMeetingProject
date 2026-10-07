import { useState } from "react";
import { useContent } from "../api/content";
import PageHeader from "../components/PageHeader";
import { faqFirstNumbers } from "../utils/faq";

const CONTENT_KEYS = ["faq", "contact"];

function FaqQuestion({ number, item, isOpen, onToggle }) {
    const answerId = `faq-answer-${item.id}`;

    return (
        <div className={`faq-row${isOpen ? " is-open" : ""}`}>
            <h3 className="faq-row-heading">
                <button
                    type="button"
                    className="faq-row-button"
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    onClick={onToggle}
                >
                    <span>
                        <span className="faq-row-number">{number}.</span> {item.question}
                    </span>
                    <i className={`bi ${isOpen ? "bi-dash-lg" : "bi-plus-lg"}`} aria-hidden="true" />
                </button>
            </h3>
            <div className="faq-row-panel" id={answerId} role="region" aria-hidden={!isOpen}>
                <div className="faq-row-panel-inner">
                    {/* Sanitized on the server when saved. */}
                    <div
                        className="faq-answer rich-text"
                        dangerouslySetInnerHTML={{ __html: item.answerHtml }}
                    />
                </div>
            </div>
        </div>
    );
}

export default function FaqPage() {
    const { content, error } = useContent(CONTENT_KEYS);
    const faq = content?.faq;
    const email = content?.contact?.email;
    const firstNumbers = faqFirstNumbers(faq);
    const [activeIndex, setActiveIndex] = useState(0);
    // Several answers may be open at once; the first question starts open.
    const [openIds, setOpenIds] = useState<Set<string> | null>(null);

    const categories = faq?.categories || [];
    const category = categories[activeIndex] || categories[0];
    const opened = openIds ?? new Set(categories[0]?.items[0] ? [categories[0].items[0].id] : []);

    function toggle(id: string) {
        const next = new Set(opened);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setOpenIds(next);
    }

    return (
        <>
            <PageHeader eyebrow="Pytania i odpowiedzi" title={faq?.title || "FAQ"} />
            <section className="page-section">
                <div className="site-container">
                    {error && (
                        <p className="page-status">
                            Nie udało się wczytać pytań. Odśwież stronę za chwilę.
                        </p>
                    )}
                    {!faq && !error && <p className="page-status">Ładowanie...</p>}
                    {category && (
                        <div className="side-layout">
                            <aside className="side-layout-aside">
                                <nav className="faq-categories" aria-label="Kategorie pytań">
                                    {categories.map((item, index) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className={index === activeIndex ? "is-active" : ""}
                                            aria-current={index === activeIndex || undefined}
                                            onClick={() => setActiveIndex(index)}
                                        >
                                            {item.title}
                                        </button>
                                    ))}
                                </nav>
                                {email && (
                                    <div className="faq-contact-box">
                                        <p className="faq-contact-title">Nie ma odpowiedzi?</p>
                                        <p>Napisz do nas:</p>
                                        <a href={`mailto:${email}`}>{email}</a>
                                    </div>
                                )}
                            </aside>
                            <div className="faq-list">
                                <h2 className="faq-list-title">{category.title}</h2>
                                {category.items.map((item, itemIndex) => (
                                    <FaqQuestion
                                        key={item.id}
                                        number={firstNumbers[activeIndex] + itemIndex}
                                        item={item}
                                        isOpen={opened.has(item.id)}
                                        onToggle={() => toggle(item.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}
