import { useState } from "react";
import api from "../api/client";

export default function EmailVerifyBanner() {
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
                Potwierdź swój adres e-mail – bez tego nie zgłosisz pojazdu do strefy Select.
                Link wysłaliśmy po rejestracji (sprawdź też spam).
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
