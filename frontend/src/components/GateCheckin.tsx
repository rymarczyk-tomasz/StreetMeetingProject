import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/client";

// Gate check-in screen, used on /wjazd (gate staff and admins) and in Admin → Wjazd.
// Codes come from: a phone camera opening /wjazd?kod=… (the QR is a link), the
// in-page camera scanner (BarcodeDetector: Chrome/Edge on Android and desktop),
// typing the code, or picking the car from the list by licence plate.

const PAYMENT_LABELS = {
    unpaid: "Nieopłacone",
    verification: "Opłata w weryfikacji",
    paid: "Opłacone",
};

const canScanInPage =
    typeof window !== "undefined" &&
    "BarcodeDetector" in window &&
    Boolean(navigator.mediaDevices?.getUserMedia);

function formatTime(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(`${value.replace(" ", "T")}Z`),
    );
}

function errorText(err, fallback) {
    return err.response?.data?.message || fallback;
}

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
            .catch(() => setError("Brak dostępu do aparatu. Wpisz kod albo znajdź auto na liście."));

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

function verdict(car) {
    if (!car.validForCurrentEdition) return { ok: false, text: `✗ Wejściówka z innej edycji (${car.edition})` };
    if (!car.valid) return { ok: false, text: "✗ Zgłoszenie nieopłacone lub niezaakceptowane" };
    if (car.checkedInAt) return { ok: true, text: "⚠ Już wjechał" };
    return { ok: true, text: "✓ Wejściówka ważna" };
}

function ResultCard({ car, onToggle }) {
    const { ok, text } = verdict(car);
    return (
        <div className={`checkin-result ${ok ? "is-valid" : "is-invalid"}`} role="status">
            <p className="checkin-verdict">{text}</p>
            <p className="entry-pass-plate">{car.licensePlate}</p>
            <p>
                {car.carBrand} · {car.name}
            </p>
            <p className="admin-hint">
                {PAYMENT_LABELS[car.paymentStatus]}
                {car.checkedInAt && ` · wjazd ${formatTime(car.checkedInAt)}`}
            </p>
            {ok && (
                <button
                    type="button"
                    className={car.checkedInAt ? "button-secondary" : "checkin-main-button"}
                    onClick={() => onToggle(car, !car.checkedInAt)}
                >
                    {car.checkedInAt ? "Cofnij wjazd" : "Zarejestruj wjazd"}
                </button>
            )}
        </div>
    );
}

export default function GateCheckin({ initialCode = "", onAction = () => {} }) {
    const [code, setCode] = useState(initialCode);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [cars, setCars] = useState([]);
    const [search, setSearch] = useState("");
    const lastScanned = useRef("");

    const loadCars = useCallback(async () => {
        try {
            const { data } = await api.get("/gate/cars");
            setCars(data.cars);
        } catch (err) {
            setError(errorText(err, "Nie udało się pobrać listy aut."));
        }
    }, []);

    const lookup = useCallback(async (value) => {
        const trimmed = String(value || "").trim();
        if (!trimmed) return;
        setError("");
        try {
            const { data } = await api.get("/gate/check", { params: { code: trimmed } });
            setResult(data.car);
        } catch (err) {
            setResult(null);
            setError(errorText(err, "Nie znaleziono wejściówki."));
        }
    }, []);

    useEffect(() => {
        loadCars();
    }, [loadCars]);

    // Opened from a scanned QR link (/wjazd?kod=…): check it right away.
    useEffect(() => {
        if (initialCode) lookup(initialCode);
    }, [initialCode, lookup]);

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

    async function toggleCheckin(car, checkedIn) {
        setError("");
        try {
            const { data } = await api.post(`/gate/cars/${car.id}/checkin`, { checkedIn });
            setResult((current) => (current?.id === car.id || checkedIn ? data.car : current));
            await loadCars();
            onAction();
        } catch (err) {
            setError(errorText(err, "Nie udało się zapisać wjazdu."));
        }
    }

    const normalized = search.replace(/\s+/g, "").toUpperCase();
    const visible = cars.filter(
        (car) =>
            !normalized ||
            car.licensePlate.replace(/\s+/g, "").toUpperCase().includes(normalized) ||
            car.name.toUpperCase().includes(search.trim().toUpperCase()),
    );
    const paidCount = cars.filter((car) => car.paymentStatus === "paid").length;
    const inCount = cars.filter((car) => car.checkedInAt).length;

    return (
        <div className="gate-checkin">
            <p className="admin-hint">
                Na miejscu: <strong>{inCount}</strong> z {paidCount} opłaconych aut
                (zaakceptowanych: {cars.length}).
            </p>
            {error && (
                <p className="form-error" role="alert">
                    {error}
                </p>
            )}

            {result && <ResultCard car={result} onToggle={toggleCheckin} />}

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
                {canScanInPage && !isScanning && (
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
            {!canScanInPage && (
                <p className="admin-hint">
                    Na tym telefonie skanuj kod zwykłym aparatem — link otworzy tę stronę z
                    wynikiem.
                </p>
            )}
            {isScanning && <QrScanner onCode={handleScan} onClose={() => setIsScanning(false)} />}

            <h3 className="checkin-list-heading">Lista aut</h3>
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
                        {visible.map((car) => (
                            <tr key={car.id}>
                                <td>
                                    <strong>{car.licensePlate}</strong>
                                </td>
                                <td>
                                    {car.carBrand} · {car.name}
                                </td>
                                <td>{PAYMENT_LABELS[car.paymentStatus]}</td>
                                <td>
                                    {car.checkedInAt ? (
                                        <button
                                            type="button"
                                            className="button-secondary"
                                            onClick={() => toggleCheckin(car, false)}
                                            title="Cofnij wjazd"
                                        >
                                            ✓ {formatTime(car.checkedInAt)}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => toggleCheckin(car, true)}
                                            disabled={car.paymentStatus !== "paid"}
                                            title={car.paymentStatus !== "paid" ? "Opłata niepotwierdzona" : undefined}
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
        </div>
    );
}
