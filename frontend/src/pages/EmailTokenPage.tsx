import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const ACTIONS = {
    verify: {
        title: "Potwierdzenie adresu e-mail",
        endpoint: "/auth/verify-email",
    },
    change: {
        title: "Zmiana adresu e-mail",
        endpoint: "/auth/confirm-email-change",
    },
};

// Landing page for the links in "confirm your e-mail" / "confirm new e-mail" messages.
export default function EmailTokenPage({ action }: { action: "verify" | "change" }) {
    const [searchParams] = useSearchParams();
    const { user, refreshUser } = useAuth();
    const [result, setResult] = useState({ message: "", error: "" });
    // Tokens are single-use: don't let StrictMode's double effect consume it twice.
    const sent = useRef(false);
    const { title, endpoint } = ACTIONS[action];

    useEffect(() => {
        if (sent.current) return;
        sent.current = true;

        const token = searchParams.get("token");
        if (!token) {
            setResult({ message: "", error: "Brak tokenu w linku. Użyj linku z wiadomości e-mail." });
            return;
        }
        api.post(endpoint, { token })
            .then(async ({ data }) => {
                setResult({ message: data.message, error: "" });
                await refreshUser();
            })
            .catch((err) =>
                setResult({
                    message: "",
                    error: err.response?.data?.message || "Nie udało się potwierdzić adresu.",
                }),
            );
    }, [endpoint, refreshUser, searchParams]);

    return (
        <section className="page auth-page">
            <h1>{title}</h1>
            <div className="auth-form">
                {!result.message && !result.error && <p className="page-status">Sprawdzanie linku...</p>}
                {result.message && (
                    <p className="form-success" role="status">
                        {result.message}
                    </p>
                )}
                {result.error && (
                    <p className="form-error" role="alert">
                        {result.error}
                    </p>
                )}
                <Link to={user ? "/panel" : "/logowanie"}>
                    {user ? "Przejdź do panelu" : "Zaloguj się"}
                </Link>
            </div>
        </section>
    );
}
