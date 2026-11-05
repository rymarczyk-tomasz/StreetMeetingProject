import { useState } from "react";
import QRCode from "qrcode";
import api from "../api/client";

export function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
    const [saved, setSaved] = useState(false);

    function download() {
        const text = [
            "Street Show — kody zapasowe logowania dwuetapowego",
            "Każdy kod działa tylko raz. Trzymaj je poza telefonem.",
            "",
            ...codes,
        ].join("\n");
        const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "streetshow-kody-zapasowe.txt";
        link.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="two-factor-codes">
            <p>
                <strong>Zapisz kody zapasowe.</strong> Jeśli zgubisz telefon, zalogujesz się jednym z nich
                zamiast kodu z aplikacji. Każdy działa raz. Nie pokażemy ich ponownie.
            </p>
            <ul className="two-factor-code-list" aria-label="Kody zapasowe">
                {codes.map((code) => (
                    <li key={code}>
                        <code>{code}</code>
                    </li>
                ))}
            </ul>
            <div className="submission-actions">
                <button type="button" className="button-secondary" onClick={download}>
                    Pobierz jako plik
                </button>
            </div>
            <label className="check-label">
                <input
                    type="checkbox"
                    className="check-input"
                    checked={saved}
                    onChange={(event) => setSaved(event.target.checked)}
                />
                <span>Zapisałem kody w bezpiecznym miejscu</span>
            </label>
            <div className="submission-actions">
                <button type="button" disabled={!saved} onClick={onDone}>
                    Gotowe
                </button>
            </div>
        </div>
    );
}

// password → scan QR → first code → backup codes
export default function TwoFactorSetup({ onDone }: { onDone: () => void }) {
    const [step, setStep] = useState<"password" | "scan" | "codes">("password");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");
    const [secret, setSecret] = useState("");
    const [qr, setQr] = useState("");
    const [codes, setCodes] = useState<string[]>([]);
    const [error, setError] = useState("");
    const [isBusy, setIsBusy] = useState(false);

    async function start(event) {
        event.preventDefault();
        setError("");
        setIsBusy(true);
        try {
            const { data } = await api.post("/auth/2fa/setup", { password });
            setSecret(data.secret);
            setQr(await QRCode.toDataURL(data.uri, { width: 220, margin: 1 }));
            setStep("scan");
        } catch (err) {
            setError(err.response?.data?.message || "Nie udało się rozpocząć konfiguracji.");
        } finally {
            setIsBusy(false);
        }
    }

    async function confirm(event) {
        event.preventDefault();
        setError("");
        setIsBusy(true);
        try {
            const { data } = await api.post("/auth/2fa/enable", { code: code.trim() });
            setCodes(data.recoveryCodes);
            setStep("codes");
        } catch (err) {
            setError(err.response?.data?.message || "Nie udało się włączyć logowania dwuetapowego.");
        } finally {
            setIsBusy(false);
        }
    }

    return (
        <div className="two-factor-setup">
            {step === "password" && (
                <form className="auth-form" onSubmit={start}>
                    <p>
                        Konto administratora może zmieniać dane do przelewów i wysyłać e-maile do
                        wszystkich uczestników, dlatego logowanie wymaga też kodu z aplikacji w
                        telefonie (Google Authenticator, Microsoft Authenticator, 1Password, Authy…).
                    </p>
                    <label>
                        Twoje hasło
                        <input
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                    </label>
                    <div className="submission-actions">
                        <button type="submit" disabled={isBusy}>
                            Dalej
                        </button>
                    </div>
                </form>
            )}

            {step === "scan" && (
                <form className="auth-form" onSubmit={confirm}>
                    <p>Zeskanuj kod QR aplikacją w telefonie, a potem wpisz 6 cyfr, które pokaże.</p>
                    <img src={qr} alt="Kod QR do aplikacji uwierzytelniającej" className="two-factor-qr" />
                    <p className="admin-hint">
                        Nie możesz zeskanować? Wpisz w aplikacji klucz: <code className="two-factor-secret">{secret}</code>
                    </p>
                    <label>
                        Kod z aplikacji
                        <input
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={code}
                            onChange={(event) => setCode(event.target.value)}
                            placeholder="123456"
                            required
                        />
                    </label>
                    <div className="submission-actions">
                        <button type="submit" disabled={isBusy}>
                            Włącz logowanie dwuetapowe
                        </button>
                    </div>
                </form>
            )}

            {step === "codes" && <RecoveryCodes codes={codes} onDone={onDone} />}

            {error && (
                <p className="form-error" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
