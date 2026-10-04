import { useContent } from "../api/content";
import { faqFirstNumbers } from "../utils/faq";

const CONTENT_KEYS = ["faq"];

export default function FaqPage() {
    const { content, error } = useContent(CONTENT_KEYS);
    const faq = content?.faq;
    const firstNumbers = faqFirstNumbers(faq);

    return (
        <div className="container my-5">
            <h1 className="text-center mb-4">{faq?.title || "FAQ"}</h1>
            {error && (
                <p className="text-center">
                    Nie udało się wczytać pytań. Odśwież stronę za chwilę.
                </p>
            )}
            {!faq && !error && <p className="page-status">Ładowanie...</p>}
            {faq && (
                <div className="accordion" id="faqAccordion">
                    {faq.categories.map((category, categoryIndex) => (
                        <div className="accordion-item" key={category.id}>
                            <h2
                                className="accordion-header"
                                id={`heading-${category.id}`}
                            >
                                <button
                                    className={
                                        categoryIndex === 0
                                            ? "accordion-button"
                                            : "accordion-button collapsed"
                                    }
                                    type="button"
                                    data-bs-toggle="collapse"
                                    data-bs-target={`#collapse-${category.id}`}
                                    aria-expanded={categoryIndex === 0}
                                    aria-controls={`collapse-${category.id}`}
                                >
                                    {category.title}
                                </button>
                            </h2>
                            <div
                                id={`collapse-${category.id}`}
                                className={
                                    categoryIndex === 0
                                        ? "accordion-collapse collapse show"
                                        : "accordion-collapse collapse"
                                }
                                aria-labelledby={`heading-${category.id}`}
                                data-bs-parent="#faqAccordion"
                            >
                                <div className="accordion-body">
                                    {category.items.map((item, itemIndex) => (
                                        <div
                                            className="faq-item"
                                            key={item.id}
                                        >
                                            <p className="faq-question">
                                                <strong>
                                                    {firstNumbers[categoryIndex] +
                                                        itemIndex}
                                                    . {item.question}
                                                </strong>
                                            </p>
                                            {/* Sanitized on the server when saved. */}
                                            <div
                                                className="faq-answer rich-text"
                                                dangerouslySetInnerHTML={{
                                                    __html: item.answerHtml,
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
