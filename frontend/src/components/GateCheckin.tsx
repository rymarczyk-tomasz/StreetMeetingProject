import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/client";
import {
    applyQueue,
    enqueueCheckin,
    hashToken,
    isNetworkError,
    loadQueue,
    loadSavedCars,
    removeFromQueue,
    saveCars,
    toApiTime,
    tokenFromCode,
} from "../utils/gateOffline";

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

const SYNC_INTERVAL_MS = 30 * 1000;

function OfflineStatus({ offline, savedAt, queue, syncErrors, isSyncing, onSync }) {
    if (!offline && !queue.length && !syncErrors.length) return null;
    return (
        <div className={`gate-offline-status${offline ? " is-offline" : ""}`} role="status">
            {offline && (
                <p>
                    <strong>Brak połączenia</strong> — sprawdzanie działa na liście aut zapisanej w
                    telefonie{savedAt ? ` (${formatTime(toApiTime(savedAt))})` : ""}. Wjazdy zapisują
                    się lokalnie i zostaną wysłane, gdy wróci internet.
                </p>
            )}
            {queue.length > 0 && (
                <p>
                    Czeka na wysłanie: <strong>{queue.length}</strong> (
                    {queue.map((item) => item.licensePlate).join(", ")}).{" "}
                    <button type="button" className="button-secondary" disabled={isSyncing} onClick={onSync}>
                        {isSyncing ? "Wysyłanie..." : "Wyślij teraz"}
                    </button>
                </p>
            )}
            {syncErrors.map((message) => (
                <p key={message} className="form-error">
                    {message}
                </p>
            ))}
        </div>
    );
}

export default function GateCheckin({ initialCode = "", onAction = () => {} }) {
    const [code, setCode] = useState(initialCode);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    // Cars as last received from the server (or from the phone's copy offline).
    const [serverCars, setServerCars] = useState([]);
    const [queue, setQueue] = useState(loadQueue);
    const [offline, setOffline] = useState(false);
    const [savedAt, setSavedAt] = useState("");
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncErrors, setSyncErrors] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const lastScanned = useRef("");
    const syncing = useRef(false);
    // Read by the retry timer without restarting it on every change.
    const offlineRef = useRef(false);
    useEffect(() => {
        offlineRef.current = offline;
    }, [offline]);

    const cars = applyQueue(serverCars, queue);

    const loadCars = useCallback(async () => {
        try {
            const { data } = await api.get("/gate/cars");
            setServerCars(data.cars);
            saveCars(data.cars, data.generatedAt);
            setSavedAt(data.generatedAt);
            setOffline(false);
        } catch (err) {
            if (!isNetworkError(err)) {
                setError(errorText(err, "Nie udało się pobrać listy aut."));
                return;
            }
            setOffline(true);
            const saved = loadSavedCars();
            if (saved) {
                setServerCars(saved.cars);
                setSavedAt(saved.savedAt);
            } else {
                setError("Brak połączenia, a w telefonie nie ma jeszcze zapisanej listy aut.");
            }
        }
    }, []);

    // Sends queued offline check-ins in order. Stops at the first connection
    // failure; entries the server rejects are dropped and shown as errors.
    const syncQueue = useCallback(async () => {
        if (syncing.current || !loadQueue().length) return;
        syncing.current = true;
        setIsSyncing(true);
        const errors = [];
        let sent = 0;
        try {
            for (const item of loadQueue()) {
                try {
                    await api.post(`/gate/cars/${item.id}/checkin`, {
                        checkedIn: item.checkedIn,
                        checkedInAt: item.at,
                    });
                    sent += 1;
                } catch (err) {
                    if (isNetworkError(err)) {
                        setOffline(true);
                        break;
                    }
                    errors.push(`${item.licensePlate}: ${errorText(err, "nie udało się zapisać wjazdu.")}`);
                }
                setQueue(removeFromQueue(item));
            }
        } finally {
            syncing.current = false;
            setIsSyncing(false);
        }
        if (errors.length) setSyncErrors((current) => [...current, ...errors]);
        if (sent || errors.length) {
            await loadCars();
            onAction();
        }
    }, [loadCars, onAction]);

    const lookupOffline = useCallback(
        async (value) => {
            const token = tokenFromCode(value);
            const hash = token && (await hashToken(token));
            const car = hash && applyQueue(loadSavedCars()?.cars || [], loadQueue()).find((row) => row.passHash === hash);
            if (car) {
                setResult(car);
            } else {
                setResult(null);
                setError(
                    token
                        ? "Brak połączenia i nie ma tego kodu na liście w telefonie. Znajdź auto po rejestracji."
                        : "Nieprawidłowy kod wejściówki.",
                );
            }
        },
        [],
    );

    const lookup = useCallback(
        async (value) => {
            const trimmed = String(value || "").trim();
            if (!trimmed) return;
            setError("");
            try {
                const { data } = await api.get("/gate/check", { params: { code: trimmed } });
                setOffline(false);
                const pending = loadQueue().find((item) => item.id === data.car.id);
                setResult(pending ? applyQueue([data.car], [pending])[0] : data.car);
            } catch (err) {
                if (isNetworkError(err)) {
                    setOffline(true);
                    await lookupOffline(trimmed);
                    return;
                }
                setResult(null);
                setError(errorText(err, "Nie znaleziono wejściówki."));
            }
        },
        [lookupOffline],
    );

    useEffect(() => {
        loadCars().then(syncQueue);
    }, [loadCars, syncQueue]);

    // Retry when the phone says it's back online, and periodically while
    // anything is waiting (the "online" event isn't reliable on every phone).
    useEffect(() => {
        const goOnline = () => {
            loadCars().then(syncQueue);
        };
        const goOffline = () => setOffline(true);
        window.addEventListener("online", goOnline);
        window.addEventListener("offline", goOffline);
        const timer = setInterval(() => {
            if (loadQueue().length || offlineRef.current) loadCars().then(syncQueue);
        }, SYNC_INTERVAL_MS);
        return () => {
            window.removeEventListener("online", goOnline);
            window.removeEventListener("offline", goOffline);
            clearInterval(timer);
        };
    }, [loadCars, syncQueue]);

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
        // Offline, or earlier taps still queued: queue this one too, so the
        // server receives them in the order they happened.
        if (offline || loadQueue().length) {
            saveOffline(car, checkedIn);
            if (!offline) syncQueue();
            return;
        }
        try {
            const { data } = await api.post(`/gate/cars/${car.id}/checkin`, { checkedIn });
            setResult((current) => (current?.id === car.id || checkedIn ? data.car : current));
            await loadCars();
            onAction();
        } catch (err) {
            if (isNetworkError(err)) {
                setOffline(true);
                saveOffline(car, checkedIn);
                return;
            }
            setError(errorText(err, "Nie udało się zapisać wjazdu."));
        }
    }

    function saveOffline(car, checkedIn) {
        const entry = {
            id: car.id,
            checkedIn,
            at: new Date().toISOString(),
            licensePlate: car.licensePlate,
        };
        const nextQueue = enqueueCheckin(entry);
        setQueue(nextQueue);
        setResult((current) =>
            current?.id === car.id || checkedIn ? applyQueue([car], [entry])[0] : current,
        );
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
            <OfflineStatus
                offline={offline}
                savedAt={savedAt}
                queue={queue}
                syncErrors={syncErrors}
                isSyncing={isSyncing}
                onSync={syncQueue}
            />
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
