import { useEffect, useState } from "react";
import AdminDialog from "../pages/admin/AdminDialog";
import { registerStepUpAsker, type StepUpCredentials } from "../api/stepUp";

type Pending = {
    message: string;
    twoFactor: boolean;
    isRetry: boolean;
    context?: string;
    resolve: (value: StepUpCredentials | null) => void;
};

// mounted once in the admin panel; withStepUp() opens it when the server asks
export default function StepUpDialog() {
    const [pending, setPending] = useState<Pending | null>(null);
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");

    useEffect(() => {
        registerStepUpAsker(
            ({ message, twoFactor, isRetry, context }) =>
                new Promise((resolve) => {
                    setPassword("");
                    setCode("");
                    setPending({ message, twoFactor, isRetry, context, resolve });
                }),
        );
        return () => registerStepUpAsker(null);
    }, []);

    if (!pending) return null;

    function close(value: StepUpCredentials | null) {
        pending.resolve(value);
        setPending(null);
    }

    return (
        <AdminDialog title="Potwierdź operację" onClose={() => close(null)}>
            <form
                className="step-up-form"
                onSubmit={(event) => {
                    event.preventDefault();
                    close({ password, code: code.trim() });
                }}
            >
                <div className="dialog-message">
                    <span className="dialog-icon" aria-hidden="true">
                        <i className="bi bi-shield-lock-fill" />
                    </span>
                    <p>
                        {pending.context && (
                            <>
                                <strong>{pending.context}</strong>
                                <br />
                            </>
                        )}
                        Ta operacja wymaga potwierdzenia
                        {pending.twoFactor
                            ? " hasłem i aktualnym kodem z aplikacji w telefonie."
                            : " Twoim hasłem."}
                    </p>
                </div>
                {pending.isRetry && (
                    <p className="form-error" role="alert">
                        {pending.message}
                    </p>
                )}
                <label className="dialog-field">
                    <span className="field-label">Twoje hasło</span>
                    <input
                        className="field-input"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                    />
                </label>
                {pending.twoFactor && (
                    <label className="dialog-field">
                        <span className="field-label">Kod z aplikacji</span>
                        <input
                            className="field-input step-up-code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={code}
                            onChange={(event) => setCode(event.target.value)}
                            placeholder="123456"
                            required
                        />
                        <span className="dialog-field-hint">Kod zmienia się co 30 sekund. Możesz też użyć kodu zapasowego.</span>
                    </label>
                )}
                <div className="dialog-actions">
                    <button type="button" className="btn-street btn-street-outline" onClick={() => close(null)}>
                        Anuluj
                    </button>
                    <button type="submit" className="btn-street btn-street-primary">
                        Potwierdź
                    </button>
                </div>
            </form>
        </AdminDialog>
    );
}
