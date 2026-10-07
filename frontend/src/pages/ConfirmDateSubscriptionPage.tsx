import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";
import { SimpleAuthLayout } from "../components/AuthLayout";

// Link from the "Potwierdź zapis" e-mail (double opt-in for "Daj mi znać o dacie").
// Confirming takes a click, so mail scanners that open every link don't sign anyone up.
export default function ConfirmDateSubscriptionPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";
    const [result, setResult] = useState({ message: "", error: "" });
    const [isBusy, setIsBusy] = useState(false);

    async function confirm() {
        setIsBusy(true);
        try {
            const { data } = await api.post("/notify/confirm", { token });
            setResult({ message: data.message, error: "" });
        } catch (err) {
            setResult({
                message: "",
                error: err.response?.data?.message || "Nie udało się potwierdzić. Spróbuj ponownie.",
            });
        } finally {
            setIsBusy(false);
        }
    }

    return (
        <SimpleAuthLayout>
            <h1>Powiadomienie o dacie</h1>
            <div className="form-stack">
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
                        <p>Potwierdź, że chcesz dostać e-mail, gdy ogłosimy termin Street Show.</p>
                        {result.error && (
                            <p className="form-error" role="alert">
                                {result.error}
                            </p>
                        )}
                        <button
                            type="button"
                            className="btn-street btn-street-primary btn-street-block"
                            onClick={confirm}
                            aria-busy={isBusy}
                        >
                            Potwierdź zapis
                        </button>
                    </>
                )}
                <p className="auth-split-switch">
                    <Link to="/">Wróć na stronę główną</Link>
                </p>
            </div>
        </SimpleAuthLayout>
    );
}
