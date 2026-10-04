import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../api/client";
import { PAYMENT_STATUS_LABELS, errorMessage, formatDate } from "./shared";

// Camera QR scanning uses the browser's BarcodeDetector (Chrome/Edge on Android
// and desktop); elsewhere staff type the code or search by licence plate.
const canScan =
    typeof window !== "undefined" &&
    "BarcodeDetector" in window &&
    Boolean(navigator.mediaDevices?.getUserMedia);

function QrScanner({ onCode, onClose }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let stream;
        let timer;
        let stopped = false;
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });

        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: "environment" } })
            .then((mediaStream) => {
                stream = mediaStream;
                if (stopped) return;
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                timer = setInterval(async () => {
                    try {
                        const codes = await detector.detect(videoRef.current);
                        if (codes[0]?.rawValue) onCode(codes[0].rawValue);
                    } catch {
                        // Frame not ready yet.
                    }
                }, 400);
            })
            .catch(() => setError("Brak dostępu do aparatu. Wpisz kod ręcznie."));

        return () => {
            stopped = true;
            clearInterval(timer);
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, [onCode]);

    return (
        <div className="qr-scanner">
            {error ? <p className="form-error">{error}</p> : <video ref={videoRef} muted playsInline />}
            <button type="button" className="button-secondary" onClick={onClose}>
                Zamknij aparat
            </button>
        </div>
    );
}

function ResultCard({ submission, onToggle }) {
    const ok = submission.valid && submission.validForCurrentEdition;
    return (
        <div className={`checkin-result ${ok ? "is-valid" : "is-invalid"}`}>
            <p className="checkin-verdict">
                {!ok
                    ? !submission.validForCurrentEdition
                        ? `✗ Wejściówka z innej edycji (${submission.edition})`
                        : "✗ Zgłoszenie nieopłacone lub niezaakceptowane"
                    : submission.checkedInAt
                      ? "⚠ Już wjechał"
                      : "✓ Wejściówka ważna"}
            </p>
            <p className="entry-pass-plate">{submission.licensePlate}</p>
            <p>
                {submission.carBrand} · {submission.firstName} {submission.lastName} · tel.{" "}
                {submission.phone}
            </p>
            <p className="admin-hint">
                Opłata: {PAYMENT_STATUS_LABELS[submission.paymentStatus]}
                {submission.checkedInAt && ` · wjazd ${formatDate(submission.checkedInAt)}`}
            </p>
            {ok && (
                <button
                    type="button"
                    className={submission.checkedInAt ? "button-secondary" : ""}
                    onClick={() => onToggle(submission, !submission.checkedInAt)}
                >
                    {submission.checkedInAt ? "Cofnij wjazd" : "Zarejestruj wjazd"}
                </button>
            )}
        </div>
    );
}

export default function CheckinPanel({ onAction }) {
    const [code, setCode] = useState("");
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [list, setList] = useState([]);
    const [search, setSearch] = useState("");
    const lastScanned = useRef("");

    const loadList = useCallback(async () => {
        try {
            const { data } = await api.get("/admin/submissions", { params: { status: "approved" } });
            setList(data.submissions);
        } catch (err) {
            setError(errorMessage(err, "Nie udało się pobrać listy."));
        }
    }, []);

    useEffect(() => {
        loadList();
    }, [loadList]);

    const lookup = useCallback(async (value) => {
        const trimmed = String(value || "").trim();
        if (!trimmed) return;
        setError("");
        try {
            const { data } = await api.get(`/admin/checkin/${encodeURIComponent(trimmed)}`);
            setResult(data.submission);
        } catch (err) {
            setResult(null);
            setError(errorMessage(err, "Nie znaleziono wejściówki."));
        }
    }, []);

    const handleScan = useCallback(
        (value) => {
            // The detector fires several times per second; react once per code.
            if (value === lastScanned.current) return;
            lastScanned.current = value;
            setIsScanning(false);
            setCode(value);
            lookup(value);
        },
        [lookup],
    );

    async function toggleCheckin(submission, checkedIn) {
        try {
            const { data } = await api.post(`/admin/submissions/${submission.id}/checkin`, { checkedIn });
            if (result?.id === submission.id) setResult(data.submission);
            await loadList();
            onAction();
        } catch (err) {
            setError(errorMessage(err, "Nie udało się zapisać wjazdu."));
        }
    }

    const normalized = search.replace(/\s+/g, "").toUpperCase();
    const visible = list.filter(
        (s) =>
            !normalized ||
            s.licensePlate.replace(/\s+/g, "").toUpperCase().includes(normalized) ||
            `${s.firstName} ${s.lastName}`.toUpperCase().includes(search.toUpperCase()),
    );
    const paidCount = list.filter((s) => s.paymentStatus === "paid").length;
    const inCount = list.filter((s) => s.checkedInAt).length;

    return (
        <>
            <p className="admin-hint">
                Na miejscu: <strong>{inCount}</strong> z {paidCount} opłaconych aut (
                zaakceptowanych: {list.length}).
            </p>
            {error && <p className="form-error">{error}</p>}

            <form
                className="admin-bulk-bar"
                onSubmit={(event) => {
                    event.preventDefault();
                    lastScanned.current = "";
                    lookup(code);
                }}
            >
                <label>
                    Kod z wejściówki
                    <input
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        placeholder="SSP-…"
                        autoComplete="off"
                    />
                </label>
                <button type="submit">Sprawdź</button>
                {canScan && !isScanning && (
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={() => {
                            lastScanned.current = "";
                            setIsScanning(true);
                        }}
                    >
                        Skanuj aparatem
                    </button>
                )}
            </form>
            {isScanning && <QrScanner onCode={handleScan} onClose={() => setIsScanning(false)} />}
            {result && <ResultCard submission={result} onToggle={toggleCheckin} />}

            <h3 className="checkin-list-heading">Lista zaakceptowanych aut</h3>
            <label className="checkin-search">
                Szukaj po rejestracji lub nazwisku
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="np. GD 12345"
                />
            </label>
            <div className="admin-table-wrapper">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Rejestracja</th>
                            <th>Auto i uczestnik</th>
                            <th>Opłata</th>
                            <th>Wjazd</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((s) => (
                            <tr key={s.id}>
                                <td>
                                    <strong>{s.licensePlate}</strong>
                                </td>
                                <td>
                                    {s.carBrand} · {s.firstName} {s.lastName}
                                </td>
                                <td>{PAYMENT_STATUS_LABELS[s.paymentStatus]}</td>
                                <td>
                                    {s.checkedInAt ? (
                                        <button
                                            type="button"
                                            className="button-secondary"
                                            onClick={() => toggleCheckin(s, false)}
                                            title="Cofnij wjazd"
                                        >
                                            ✓ {formatDate(s.checkedInAt)}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => toggleCheckin(s, true)}
                                            disabled={s.paymentStatus !== "paid"}
                                            title={s.paymentStatus !== "paid" ? "Najpierw potwierdź opłatę" : undefined}
                                        >
                                            Wjechał
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
