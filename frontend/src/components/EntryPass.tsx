import { useEffect, useState } from "react";
import QRCode from "qrcode";
import api from "../api/client";
import Plate from "./Plate";
import { downloadPassPdf, downloadPassPng } from "../utils/passFile";

export default function EntryPass({ submissionId, onClose }) {
    const [pass, setPass] = useState(null);
    const [qr, setQr] = useState("");
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    async function save(download) {
        setIsSaving(true);
        try {
            await download(pass);
        } catch {
            setError("Nie udało się przygotować pliku. Użyj przycisku Drukuj albo zrób zrzut ekranu.");
        } finally {
            setIsSaving(false);
        }
    }

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
            {/* Phones: full-screen pass for the gate. */}
            <div className="pass-mobile-bar">
                <button type="button" className="pass-mobile-back" onClick={onClose}>
                    <i className="bi bi-chevron-left" aria-hidden="true" />
                    Panel
                </button>
                <span>Zwiększ jasność ekranu</span>
            </div>
            <div className="entry-pass">
                <div className="entry-pass-header">
                    <div>
                        <p>Street Show {pass?.edition || ""}</p>
                        <h2>Strefa Select</h2>
                    </div>
                    <img src="/img/Logo 2.0/SVG/Logo_4.svg" alt="" className="entry-pass-logo" />
                </div>
                <div className="entry-pass-main">
                    {error && <p className="form-error">{error}</p>}
                    {!pass && !error && <p className="page-status">Ładowanie...</p>}
                    {pass && (
                        <>
                            <img src={qr} alt={`Kod QR wejściówki ${pass.code}`} className="entry-pass-qr" />
                            <Plate value={pass.licensePlate} size="xl" />
                            <p className="entry-pass-owner">
                                {pass.carBrand} · {pass.name}
                            </p>
                            <p className="entry-pass-code-mobile">{pass.code}</p>
                        </>
                    )}
                </div>
                <div className="entry-pass-footer">
                    {pass && (
                        <p className="entry-pass-hint">
                            Pokaż ten kod przy wjeździe – na telefonie albo wydrukowany.
                            <br />
                            Kod: <strong>{pass.code}</strong>
                        </p>
                    )}
                    {pass?.checkedInAt && (
                        <p className="form-success">
                            <i className="bi bi-check-circle-fill" aria-hidden="true" /> Wjazd zarejestrowany.
                        </p>
                    )}
                    <div className="entry-pass-actions">
                        {pass && (
                            <button type="button" className="btn-street btn-street-dark" onClick={() => window.print()}>
                                <i className="bi bi-printer" aria-hidden="true" />
                                Drukuj
                            </button>
                        )}
                        <button type="button" className="btn-street btn-street-outline entry-pass-close" onClick={onClose}>
                            Zamknij
                        </button>
                    </div>
                    {pass && (
                        <p className="entry-pass-downloads">
                            <button type="button" className="text-action" disabled={isSaving} onClick={() => save(downloadPassPdf)}>
                                Pobierz PDF
                            </button>
                            <button type="button" className="text-action" disabled={isSaving} onClick={() => save(downloadPassPng)}>
                                Pobierz obraz (PNG)
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
