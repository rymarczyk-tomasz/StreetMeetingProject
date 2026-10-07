import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import Lightbox from "../components/Lightbox";
import EventInfoCard from "./panel/EventInfoCard";
import MessagesInbox from "./panel/MessagesInbox";
import SubmissionCard from "./panel/SubmissionCard";

function EmailVerifyBanner() {
    const [feedback, setFeedback] = useState("");

    async function resend() {
        try {
            const { data } = await api.post("/auth/resend-verification");
            setFeedback(data.message);
        } catch (err) {
            setFeedback(err.response?.data?.message || "Nie udało się wysłać linku.");
        }
    }

    return (
        <div className="verify-banner" role="status">
            <span className="verify-banner-text">
                <i className="bi bi-envelope-exclamation" aria-hidden="true" />
                Potwierdź swój adres e-mail – dzięki temu dostaniesz decyzję w sprawie
                zgłoszenia i ważne informacje o wydarzeniu.
            </span>
            {feedback ? (
                <span>{feedback}</span>
            ) : (
                <button type="button" className="text-action" onClick={resend}>
                    Wyślij link ponownie
                </button>
            )}
        </div>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState([]);
    const [overview, setOverview] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [feedback, setFeedback] = useState({ message: "", error: "" });
    const [lightbox, setLightbox] = useState({ photos: [], index: null, title: "" });

    const load = useCallback(async () => {
        try {
            const [submissionsResponse, overviewResponse, messagesResponse] = await Promise.all([
                api.get("/submissions"),
                api.get("/submissions/overview"),
                api.get("/messages"),
            ]);
            setSubmissions(submissionsResponse.data.submissions);
            setOverview(overviewResponse.data);
            setMessages(messagesResponse.data.messages);
        } catch (err) {
            setFeedback({ message: "", error: err.response?.data?.message || "Nie udało się pobrać danych." });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    function notify({ message = "", error = "" }) {
        setFeedback({ message, error });
    }

    const currentEdition = overview?.availability.edition;
    const current = submissions.filter((s) => s.edition === currentEdition);
    const archived = submissions.filter((s) => s.edition !== currentEdition);
    const cardProps = {
        availability: overview?.availability,
        onChanged: load,
        notify,
        onOpenPhotos: (submission, index) =>
            setLightbox({
                photos: submission.photos.map((src) => ({ src, thumb: src, alt: `Zdjęcie ${submission.carBrand}` })),
                index,
                title: submission.carBrand,
            }),
    };

    return (
        <section className="page account-page">
            <div className="account-head">
                <div className="account-head-title">
                    <p className="eyebrow eyebrow-on-light">Panel użytkownika</p>
                    <h1>Witaj, {user.firstName || user.email}!</h1>
                </div>
                <div className="account-head-actions">
                    <Link className="btn-street btn-street-outline" to="/garaz">
                        <i className="bi bi-car-front" aria-hidden="true" />
                        Mój garaż
                    </Link>
                    <Link className="btn-street btn-street-outline" to="/ustawienia-konta">
                        <i className="bi bi-gear" aria-hidden="true" />
                        Ustawienia
                    </Link>
                </div>
            </div>

            {!user.emailVerified && <EmailVerifyBanner />}
            {feedback.error && (
                <p className="form-error" role="alert">
                    {feedback.error}
                </p>
            )}
            {feedback.message && (
                <p className="form-success" role="status">
                    {feedback.message}
                </p>
            )}

            {isLoading ? (
                <div aria-hidden="true" className="account-skeleton">
                    <span className="skeleton" />
                    <span className="skeleton" />
                </div>
            ) : (
                <>
                    <EventInfoCard
                        overview={overview}
                        hasApprovedSubmission={current.some((s) => s.status === "approved")}
                    />
                    <MessagesInbox messages={messages} onChanged={load} />

                    <h2 className="account-section-title">
                        Twoje zgłoszenia {currentEdition && `na edycję ${currentEdition}`}
                    </h2>
                    {current.length === 0 ? (
                        <p className="account-empty">
                            Nie masz jeszcze zgłoszeń na tę edycję.
                            {archived.length > 0 &&
                                " Auto z poprzedniego roku zgłosisz jednym kliknięciem z archiwum poniżej."}
                        </p>
                    ) : (
                        <ul className="submission-list">
                            {current.map((s) => (
                                <SubmissionCard key={s.id} submission={s} {...cardProps} />
                            ))}
                        </ul>
                    )}

                    {archived.length > 0 && (
                        <details className="panel-archive" open={current.length === 0}>
                            <summary>
                                <i className="bi bi-chevron-right" aria-hidden="true" />
                                Archiwum – poprzednie edycje ({archived.length})
                            </summary>
                            <ul className="submission-list">
                                {archived.map((s) => (
                                    <SubmissionCard key={s.id} submission={s} archived {...cardProps} />
                                ))}
                            </ul>
                        </details>
                    )}
                </>
            )}

            <Lightbox
                photos={lightbox.photos}
                index={lightbox.index}
                onIndexChange={(index) => setLightbox((currentBox) => ({ ...currentBox, index }))}
                title={lightbox.title}
                label="Zdjęcia zgłoszenia"
            />
        </section>
    );
}
