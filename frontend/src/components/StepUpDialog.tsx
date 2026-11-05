import { useEffect, useState } from "react";
import AdminDialog from "../pages/admin/AdminDialog";
import { registerStepUpAsker, type StepUpCredentials } from "../api/stepUp";

type Pending = {
    message: string;
    twoFactor: boolean;
    resolve: (value: StepUpCredentials | null) => void;
};

// mounted once in the admin panel; withStepUp() opens it when the server asks
export default function StepUpDialog() {
    const [pending, setPending] = useState<Pending | null>(null);
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");

    useEffect(() => {
        registerStepUpAsker(
            ({ message, twoFactor }) =>
                new Promise((resolve) => {
                    setPassword("");
                    setCode("");
                    setPending({ message, twoFactor, resolve });
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
                className="auth-form step-up-form"
                onSubmit={(event) => {
                    event.preventDefault();
                    close({ password, code: code.trim() });
                }}
            >
                <p className="admin-hint" role="status">
                    {pending.message}
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
                {pending.twoFactor && (
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
                )}
                <div className="submission-actions">
                    <button type="submit">Potwierdź</button>
                    <button type="button" className="button-secondary" onClick={() => close(null)}>
                        Anuluj
                    </button>
                </div>
            </form>
        </AdminDialog>
    );
}
