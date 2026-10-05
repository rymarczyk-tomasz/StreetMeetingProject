import { useEffect, useState } from "react";
import QRCode from "qrcode";
import api from "../api/client";

// QR entry pass for an approved + paid car; staff scan it at the gate
// (Admin → Wjazd). Shown in a dialog with a print button.
export default function EntryPass({ submissionId, onClose }) {
    const [pass, setPass] = useState(null);
    const [qr, setQr] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        api.get(`/submissions/${submissionId}/pass`)
            .then(async ({ data }) => {
                // The QR holds a link, so any phone camera (also iPhone) opens the
                // gate screen; older passes with the bare code still work there too.
                const image = await QRCode.toDataURL(data.pass.link || data.pass.code, {
                    width: 320,
                    margin: 1,
                    errorCorrectionLevel: "M",
                });
                if (!cancelled) {
                    setPass(data.pass);
                    setQr(image);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err.response?.data?.message || "Nie udało się pobrać wejściówki.");
                }
            });
        return () => {
            cancelled = true;
        };
    }, [submissionId]);

    useEffect(() => {
        function handleKey(event) {
            if (event.key === "Escape") onClose();
        }
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    return (
        <div
            className="pass-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Wejściówka"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="entry-pass">
                {error && <p className="form-error">{error}</p>}
                {!pass && !error && <p className="page-status">Ładowanie...</p>}
                {pass && (
                    <>
                        <p className="page-eyebrow">Street Show {pass.edition} · Strefa Select</p>
                        <h2>Wejściówka dla pojazdu</h2>
                        <img src={qr} alt={`Kod QR wejściówki ${pass.code}`} className="entry-pass-qr" />
                        <p className="entry-pass-plate">{pass.licensePlate}</p>
                        <p>
                            {pass.carBrand} · {pass.name}
                        </p>
                        <p className="admin-hint">
                            Pokaż ten kod przy wjeździe (na telefonie albo wydrukowany).
                            Kod: {pass.code}
                        </p>
                        {pass.checkedInAt && (
                            <p className="form-success">Wjazd zarejestrowany.</p>
                        )}
                    </>
                )}
                <div className="submission-actions entry-pass-actions">
                    {pass && (
                        <button type="button" onClick={() => window.print()}>
                            Drukuj
                        </button>
                    )}
                    <button type="button" className="button-secondary" onClick={onClose}>
                        Zamknij
                    </button>
                </div>
            </div>
        </div>
    );
}
