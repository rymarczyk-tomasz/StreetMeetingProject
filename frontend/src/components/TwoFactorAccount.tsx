import { useEffect, useState } from "react";
import api from "../api/client";
import { askConfirm } from "../api/confirm";
import { withStepUp } from "../api/stepUp";
import ConfirmDialog from "./ConfirmDialog";
import StepUpDialog from "./StepUpDialog";
import TwoFactorSetup, { RecoveryCodes } from "./TwoFactorSetup";
import { useAuth } from "../context/auth";

// Ustawienia konta → admins only
export default function TwoFactorAccount() {
    const { refreshUser } = useAuth();
    const [status, setStatus] = useState<{ enabled: boolean; recoveryCodesLeft: number } | null>(null);
    const [codes, setCodes] = useState<string[]>([]);
    const [error, setError] = useState("");

    function load() {
        api.get("/auth/2fa")
            .then(({ data }) => setStatus(data))
            .catch(() => setError("Nie udało się pobrać ustawień logowania dwuetapowego."));
    }

    useEffect(load, []);

    async function regenerate() {
        const confirmed = await askConfirm({
            title: "Wygenerować nowe kody zapasowe?",
            message: "Dotychczasowe kody zapasowe przestaną działać. Nowe pokażemy tylko raz, więc zapisz je w bezpiecznym miejscu.",
            confirmLabel: "Wygeneruj",
        });
        if (!confirmed) return;
        setError("");
        try {
            const { data } = await withStepUp((stepUp) => api.post("/auth/2fa/recovery-codes", { stepUp }));
            setCodes(data.recoveryCodes);
        } catch (err) {
            setError(err.response?.data?.message || "Nie udało się wygenerować kodów.");
        }
    }

    return (
        <section className="account-card">
            <h2>Logowanie dwuetapowe</h2>
            <StepUpDialog />
            <ConfirmDialog />
            {status && !status.enabled && (
                <TwoFactorSetup
                    onDone={() => {
                        refreshUser();
                        load();
                    }}
                />
            )}
            {status?.enabled && !codes.length && (
                <>
                    <p>
                        <span className="status-badge status-approved">Włączone</span> Przy logowaniu
                        podajesz hasło i kod z aplikacji w telefonie.
                    </p>
                    <p className={status.recoveryCodesLeft <= 3 ? "payment-alert" : ""}>
                        Nieużyte kody zapasowe: <strong>{status.recoveryCodesLeft}</strong>
                        {status.recoveryCodesLeft <= 3 && " — wygeneruj nowe."}
                    </p>
                    <div className="submission-actions">
                        <button type="button" className="button-secondary" onClick={regenerate}>
                            Wygeneruj nowe kody zapasowe
                        </button>
                    </div>
                    <p className="admin-hint">
                        Nowy telefon albo zgubiona aplikacja? Poproś innego administratora o reset
                        logowania dwuetapowego (Panel → Użytkownicy).
                    </p>
                </>
            )}
            {codes.length > 0 && (
                <RecoveryCodes
                    codes={codes}
                    onDone={() => {
                        setCodes([]);
                        load();
                    }}
                />
            )}
            {error && (
                <p className="form-error" role="alert">
                    {error}
                </p>
            )}
        </section>
    );
}
