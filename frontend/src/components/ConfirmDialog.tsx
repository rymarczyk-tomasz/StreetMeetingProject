import { useEffect, useState } from "react";
import AdminDialog from "../pages/admin/AdminDialog";
import { registerConfirmAsker, type ConfirmRequest } from "../api/confirm";

type Pending = ConfirmRequest & { resolve: (value: boolean) => void };

// mounted once in the admin panel; askConfirm() opens it
export default function ConfirmDialog() {
    const [pending, setPending] = useState<Pending | null>(null);

    useEffect(() => {
        registerConfirmAsker(
            (request) =>
                new Promise((resolve) => {
                    setPending({ ...request, resolve });
                }),
        );
        return () => registerConfirmAsker(null);
    }, []);

    if (!pending) return null;

    function close(value: boolean) {
        pending.resolve(value);
        setPending(null);
    }

    return (
        <AdminDialog title={pending.title} onClose={() => close(false)}>
            <div className="dialog-message">
                <span className={`dialog-icon${pending.danger ? " is-danger" : ""}`} aria-hidden="true">
                    <i className={`bi ${pending.danger ? "bi-exclamation-triangle-fill" : "bi-question-circle-fill"}`} />
                </span>
                <p>{pending.message}</p>
            </div>
            <div className="dialog-actions">
                <button type="button" className="btn-street btn-street-outline" onClick={() => close(false)}>
                    Anuluj
                </button>
                <button
                    type="button"
                    className={`btn-street ${pending.danger ? "btn-street-danger-solid" : "btn-street-primary"}`}
                    onClick={() => close(true)}
                >
                    {pending.confirmLabel || "Potwierdź"}
                </button>
            </div>
        </AdminDialog>
    );
}
