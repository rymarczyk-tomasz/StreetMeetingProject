import { useContent } from "../api/content";

const CONTENT_KEYS = ["regulamin"];

export default function RegulaminPage() {
    const { content, error } = useContent(CONTENT_KEYS);
    const regulamin = content?.regulamin;

    return (
        <div className="container my-5 regulamin-page">
            {error && (
                <p className="text-center">
                    Nie udało się wczytać regulaminu. Odśwież stronę za chwilę.
                </p>
            )}
            {!regulamin && !error && (
                <p className="page-status">Ładowanie...</p>
            )}
            {regulamin && (
                <>
                    <h1>{regulamin.title}</h1>
                    {regulamin.pdfUrl && (
                        <p className="regulamin-download">
                            <a
                                href={regulamin.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <i
                                    className="bi bi-file-earmark-pdf"
                                    aria-hidden="true"
                                ></i>{" "}
                                Pobierz regulamin (PDF)
                            </a>
                        </p>
                    )}
                    {/* Sanitized on the server when saved. */}
                    <div
                        className="rich-text"
                        dangerouslySetInnerHTML={{ __html: regulamin.html }}
                    />
                </>
            )}
        </div>
    );
}
