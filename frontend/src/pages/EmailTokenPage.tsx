import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/auth";
import { SimpleAuthLayout } from "../components/AuthLayout";

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

export default function EmailTokenPage({ action }: { action: "verify" | "change" }) {
    const [searchParams] = useSearchParams();
    const { user, refreshUser } = useAuth();
    const [result, setResult] = useState({ message: "", error: "" });
    // Tokens are single-use: don't let StrictMode's double effect consume it twice.
    const sent = useRef(false);
    const { title, endpoint } = ACTIONS[action];
    const token = searchParams.get("token");

    useEffect(() => {
        if (sent.current || !token) return;
        sent.current = true;

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
    }, [endpoint, refreshUser, token]);

    const shown = token ? result : { message: "", error: "Brak tokenu w linku. Użyj linku z wiadomości e-mail." };

    return (
        <SimpleAuthLayout>
            <h1>{title}</h1>
            <div className="form-stack">
                {!shown.message && !shown.error && <p className="page-status">Sprawdzanie linku...</p>}
                {shown.message && (
                    <p className="form-success" role="status">
                        {shown.message}
                    </p>
                )}
                {shown.error && (
                    <p className="form-error" role="alert">
                        {shown.error}
                    </p>
                )}
                <Link
                    className="btn-street btn-street-primary btn-street-block"
                    to={user ? "/panel" : "/logowanie"}
                >
                    {user ? "Przejdź do panelu" : "Zaloguj się"}
                </Link>
            </div>
        </SimpleAuthLayout>
    );
}
