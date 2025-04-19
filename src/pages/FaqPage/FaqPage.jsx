import { useState, useEffect, useCallback } from "react";
import debounce from "lodash.debounce";
import useMetaTags from "../../hooks/useMetaTags";
import styles from "./FaqPage.module.css";
import { faqData } from "./faqData";

const FaqPage = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredData, setFilteredData] = useState(faqData);

    useMetaTags({
        title: "FAQ - Street Meeting Poland 2025",
        description:
            "Najczęściej zadawane pytania dotyczące Street Meeting Poland 2025. Dowiedz się więcej o biletach, organizacji wydarzenia, dojeździe i zasadach bezpieczeństwa.",
        keywords:
            "FAQ, Street Meeting Poland, 2025, Polsat Plus Arena, Gdańsk, wydarzenie motoryzacyjne, bilety, regulamin",
        ogTitle: "FAQ - Street Meeting Poland 2025",
        ogDescription:
            "Najczęściej zadawane pytania dotyczące Street Meeting Poland 2025. Dowiedz się więcej o biletach, organizacji wydarzenia, dojeździe i zasadach bezpieczeństwa.",
        ogUrl: "https://www.streetshow.pl/faq",
        canonical: "https://www.streetshow.pl/faq",
    });

    const highlightText = (text, term) => {
        if (!term) return text;
        const regex = new RegExp(`(${term})`, "gi");
        return text.replace(regex, '<span class="highlight">$1</span>');
    };

    const filterFaqData = useCallback(
        debounce((term) => {
            const filtered = faqData
                .map((section) => ({
                    ...section,
                    questions: section.questions
                        .map((q) => ({
                            ...q,
                            highlightedQuestion: highlightText(
                                q.question,
                                term
                            ),
                            highlightedAnswer: highlightText(q.answer, term),
                        }))
                        .filter(
                            (q) =>
                                q.question
                                    .toLowerCase()
                                    .includes(term.toLowerCase()) ||
                                q.answer
                                    .toLowerCase()
                                    .includes(term.toLowerCase())
                        ),
                }))
                .filter((section) => section.questions.length > 0);
            setFilteredData(filtered);
        }, 300),
        []
    );

    useEffect(() => {
        filterFaqData(searchTerm);
    }, [searchTerm, filterFaqData]);

    return (
        <div className={styles.faqContainer}>
            <h1 className={styles.faqTitle}>FAQ</h1>
            <input
                type="text"
                className={styles.searchInput}
                placeholder="Szukaj pytań..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Wyszukaj pytania w FAQ"
            />
            <div className="accordion" id="faqAccordion">
                {filteredData.map((section, index) => (
                    <div className="accordion-item" key={section.id}>
                        <h2
                            className="accordion-header"
                            id={`heading${section.id}`}
                        >
                            <button
                                className={`${
                                    styles.accordionButton
                                } accordion-button ${
                                    index === 0 ? "" : "collapsed"
                                }`}
                                type="button"
                                data-bs-toggle="collapse"
                                data-bs-target={`#collapse${section.id}`}
                                aria-expanded={index === 0 ? "true" : "false"}
                                aria-controls={`collapse${section.id}`}
                            >
                                {section.title}
                            </button>
                        </h2>
                        <div
                            id={`collapse${section.id}`}
                            className={`accordion-collapse collapse ${
                                index === 0 ? "show" : ""
                            }`}
                            aria-labelledby={`heading${section.id}`}
                            data-bs-parent="#faqAccordion"
                        >
                            <div className="accordion-body">
                                {section.questions.map((q, qIndex) => (
                                    <div key={qIndex} className="mb-3">
                                        <strong
                                            dangerouslySetInnerHTML={{
                                                __html: `${
                                                    index * 10 + qIndex + 1
                                                }. ${q.highlightedQuestion}`,
                                            }}
                                        />
                                        <br />
                                        <span
                                            dangerouslySetInnerHTML={{
                                                __html: q.highlightedAnswer,
                                            }}
                                        />
                                        {qIndex <
                                            section.questions.length - 1 && (
                                            <br />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FaqPage;
