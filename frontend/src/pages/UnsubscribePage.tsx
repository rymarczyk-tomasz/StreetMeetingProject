import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";

// Link from "Daj mi znać o dacie" e-mails. Unsubscribing takes a click, so mail
// scanners that open every link don't remove people from the list.
export default function UnsubscribePage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";
    const [result, setResult] = useState({ message: "", error: "" });
    const [isBusy, setIsBusy] = useState(false);

    async function unsubscribe() {
        setIsBusy(true);
        try {
            const { data } = await api.post("/notify/unsubscribe", { token });
            setResult({ message: data.message, error: "" });
        } catch (err) {
            setResult({
                message: "",
                error: err.response?.data?.message || "Nie udało się wypisać. Spróbuj ponownie.",
            });
        } finally {
            setIsBusy(false);
        }
    }

    return (
        <section className="page auth-page">
            <h1>Powiadomienie o dacie</h1>
            <div className="auth-form">
                {!token ? (
                    <p className="form-error" role="alert">
                        Brak tokenu w linku. Użyj linku z wiadomości e-mail.
                    </p>
                ) : result.message ? (
                    <p className="form-success" role="status">
                        {result.message}
                    </p>
                ) : (
                    <>
                        <p>Nie chcesz dostać e-maila, gdy ogłosimy termin Street Show?</p>
                        {result.error && (
                            <p className="form-error" role="alert">
                                {result.error}
                            </p>
                        )}
                        <button type="button" onClick={unsubscribe} aria-busy={isBusy}>
                            Wypisz mnie
                        </button>
                    </>
                )}
                <p className="auth-switch-text">
                    <Link to="/">Wróć na stronę główną</Link>
                </p>
            </div>
        </section>
    );
}
