import { useEffect, useState } from "react";
import AdminDialog from "../pages/admin/AdminDialog";
import { registerConfirmAsker, type ConfirmRequest, type TextRequest } from "../api/confirm";

type Pending = ConfirmRequest &
    Partial<TextRequest> & {
        input: boolean;
        resolve: (value: { confirmed: boolean; value: string }) => void;
    };

// mounted once in Layout; askConfirm() / askText() open it
export default function ConfirmDialog() {
    const [pending, setPending] = useState<Pending | null>(null);
    const [text, setText] = useState("");

    useEffect(() => {
        registerConfirmAsker(
            (request) =>
                new Promise((resolve) => {
                    setText(request.value || "");
                    setPending({ ...request, resolve });
                }),
        );
        return () => registerConfirmAsker(null);
    }, []);

    if (!pending) return null;

    function close(confirmed: boolean) {
        pending.resolve({ confirmed, value: text });
        setPending(null);
    }

    return (
        <AdminDialog title={pending.title} onClose={() => close(false)}>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    close(true);
                }}
            >
                <div className="dialog-message">
                    <span className={`dialog-icon${pending.danger ? " is-danger" : ""}`} aria-hidden="true">
                        <i className={`bi ${pending.danger ? "bi-exclamation-triangle-fill" : "bi-question-circle-fill"}`} />
                    </span>
                    <p>{pending.message}</p>
                </div>
                {pending.input && (
                    <label className="dialog-field">
                        <span className="field-label">{pending.label}</span>
                        <input
                            className="field-input"
                            value={text}
                            placeholder={pending.placeholder}
                            onChange={(event) => setText(event.target.value)}
                        />
                    </label>
                )}
                <div className="dialog-actions">
                    <button type="button" className="btn-street btn-street-outline" onClick={() => close(false)}>
                        Anuluj
                    </button>
                    <button
                        type="submit"
                        className={`btn-street ${pending.danger ? "btn-street-danger-solid" : "btn-street-primary"}`}
                    >
                        {pending.confirmLabel || "Potwierdź"}
                    </button>
                </div>
            </form>
        </AdminDialog>
    );
}
