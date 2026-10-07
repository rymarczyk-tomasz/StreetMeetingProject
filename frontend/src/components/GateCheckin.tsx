import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/client";
import Plate from "./Plate";
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

const PAYMENT_LABELS = {
    unpaid: "Nieopłacone",
    verification: "Opłata w weryfikacji",
    paid: "Opłacone",
};

const canScanInPage = typeof window !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
const SCAN_INTERVAL_MS = 250;

async function createDecoder() {
    if ("BarcodeDetector" in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        return async (video: HTMLVideoElement) => (await detector.detect(video))[0]?.rawValue || null;
    }
    const { default: jsQR } = await import("jsqr");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    return async (video: HTMLVideoElement) => {
        const size = Math.min(video.videoWidth, video.videoHeight);
        if (!size) return null;
        const side = Math.min(size, 640);
        canvas.width = side;
        canvas.height = side;
        context.drawImage(
            video,
            (video.videoWidth - size) / 2,
            (video.videoHeight - size) / 2,
            size,
            size,
            0,
            0,
            side,
            side,
        );
        const image = context.getImageData(0, 0, side, side);
        return jsQR(image.data, side, side, { inversionAttempts: "dontInvert" })?.data || null;
    };
}

function formatTime(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(`${value.replace(" ", "T")}Z`),
    );
}

function formatHour(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("pl-PL", { timeStyle: "short" }).format(new Date(`${value.replace(" ", "T")}Z`));
}

function errorText(err, fallback) {
    return err.response?.data?.message || fallback;
}

function QrScanner({ onCode, onClose }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState("");
    // parent passes a new arrow every render - keep it in a ref so the camera doesn't restart
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    // iOS needs getUserMedia inside a user gesture (we're opened from a click)
    useEffect(() => {
        let stream;
        let timer;
        let stopped = false;

        function stop() {
            stopped = true;
            clearInterval(timer);
            stream?.getTracks().forEach((track) => track.stop());
        }

        function handleVisibility() {
            if (document.visibilityState === "hidden") {
                stop();
                onCloseRef.current();
            }
        }
        document.addEventListener("visibilitychange", handleVisibility);

        Promise.all([navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }), createDecoder()])
            .then(([mediaStream, decode]) => {
                stream = mediaStream;
                if (stopped) {
                    stop();
                    return;
                }
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(() => {});
                let busy = false;
                timer = setInterval(async () => {
                    if (busy || !videoRef.current) return;
                    busy = true;
                    try {
                        const value = await decode(videoRef.current);
                        if (value) onCode(value);
                    } catch {
                        // Frame not ready yet.
                    } finally {
                        busy = false;
                    }
                }, SCAN_INTERVAL_MS);
            })
            .catch(() => setError("Brak dostępu do aparatu. Wpisz kod albo znajdź auto po rejestracji."));

        return () => {
            document.removeEventListener("visibilitychange", handleVisibility);
            stop();
        };
    }, [onCode]);

    return (
        <div className="qr-scanner">
            {error ? <p className="form-error">{error}</p> : <video ref={videoRef} muted playsInline autoPlay />}
            <button type="button" className="gate-button is-outline" onClick={onClose}>
                Zamknij aparat
            </button>
        </div>
    );
}

function verdict(car) {
    if (!car.validForCurrentEdition) {
        return { ok: false, text: "Inna edycja", note: `Wejściówka z edycji ${car.edition}` };
    }
    if (!car.valid) {
        return car.paymentStatus !== "paid"
            ? { ok: false, text: "Nieopłacone", note: PAYMENT_LABELS[car.paymentStatus] }
            : { ok: false, text: "Kod nieważny", note: "Zgłoszenie nie jest zaakceptowane" };
    }
    if (car.checkedInAt) {
        return { ok: false, text: "Już wjechał", note: `Wjazd zarejestrowany o ${formatHour(car.checkedInAt)}` };
    }
    return { ok: true, text: "Może wjechać", note: "" };
}

function ResultCard({ car, onToggle, onNext }) {
    const { ok, text, note } = verdict(car);
    return (
        <>
            <div className={`gate-result ${ok ? "is-ok" : "is-bad"}`} role="status">
                <p className="gate-result-head">
                    <i className={`bi bi-${ok ? "check-circle-fill" : "x-octagon-fill"}`} aria-hidden="true" />
                    {text}
                </p>
                <div className="gate-result-body">
                    <Plate value={car.licensePlate} size="xl" />
                    <p className="gate-result-car">{car.carBrand}</p>
                    <p className="gate-result-name">{car.name}</p>
                    {note && <p className="gate-result-name">{note}</p>}
                    {ok && (
                        <p className="gate-result-badges">
                            <span className="status-badge payment-status-paid">Opłacone</span>
                            <span className="status-badge status-pending">Pierwszy wjazd</span>
                        </p>
                    )}
                </div>
            </div>
            {ok ? (
                <>
                    <button type="button" className="gate-button is-primary" onClick={() => onToggle(car, true)}>
                        <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
                        Zarejestruj wjazd
                    </button>
                    <button type="button" className="gate-button is-outline" onClick={onNext}>
                        <i className="bi bi-qr-code-scan" aria-hidden="true" />
                        Skanuj kolejny
                    </button>
                </>
            ) : (
                <>
                    <button type="button" className="gate-button is-dark" onClick={onNext}>
                        <i className="bi bi-qr-code-scan" aria-hidden="true" />
                        Skanuj kolejny
                    </button>
                    {car.checkedInAt && (
                        <button type="button" className="text-action gate-undo" onClick={() => onToggle(car, false)}>
                            Cofnij wjazd (pomyłka)
                        </button>
                    )}
                </>
            )}
        </>
    );
}

const SYNC_INTERVAL_MS = 30 * 1000;

function ConnectionBar({ offline, savedAt, carsCount, queue, syncErrors, isSyncing, onSync }) {
    let text;
    if (offline) {
        text = queue.length
            ? `Offline · ${queue.length} ${queue.length === 1 ? "wjazd czeka" : "wjazdy czekają"} na wysłanie`
            : `Offline · lista aut z telefonu${savedAt ? ` (${formatTime(toApiTime(savedAt))})` : ""}`;
    } else {
        text = queue.length ? `Online · ${queue.length} do wysłania` : `Online · lista aut zapisana w telefonie (${carsCount})`;
    }
    return (
        <>
            <div className={`gate-connection${offline ? " is-offline" : ""}`} role="status">
                <i className={`bi bi-${offline ? "wifi-off" : "wifi"}`} aria-hidden="true" />
                <span>{text}</span>
                {queue.length > 0 && !offline && (
                    <button type="button" className="text-action" disabled={isSyncing} onClick={onSync}>
                        {isSyncing ? "Wysyłanie..." : "Wyślij teraz"}
                    </button>
                )}
            </div>
            {syncErrors.map((message) => (
                <p key={message} className="form-error gate-sync-error">
                    {message}
                </p>
            ))}
        </>
    );
}

export default function GateCheckin({ initialCode = "", onAction = () => {} }) {
    const [code, setCode] = useState(initialCode);
    const [result, setResult] = useState(null);
    const [invalid, setInvalid] = useState("");
    const [error, setError] = useState("");
    const [isScanning, setIsScanning] = useState(false);

    // safari wipes site data after 7 days unless persisted; prefetch jsQR so the sw caches it for offline
    useEffect(() => {
        navigator.storage?.persist?.().catch(() => {});
        if (!("BarcodeDetector" in window)) import("jsqr").catch(() => {});
    }, []);
    const [serverCars, setServerCars] = useState([]);
    const [edition, setEdition] = useState(null);
    const [queue, setQueue] = useState(loadQueue);
    const [offline, setOffline] = useState(false);
    const [savedAt, setSavedAt] = useState("");
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncErrors, setSyncErrors] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [showAll, setShowAll] = useState(false);
    const lastScanned = useRef("");
    const syncing = useRef(false);
    const codeInput = useRef<HTMLInputElement>(null);
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
            setEdition(data.edition || null);
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

    // stops on the first network error, rejected entries are dropped
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

    const lookupOffline = useCallback(async (value) => {
        const token = tokenFromCode(value);
        const hash = token && (await hashToken(token));
        const car =
            hash &&
            applyQueue(loadSavedCars()?.cars || [], loadQueue()).find(
                (row) => row.passHash === hash || row.shortHash === hash,
            );
        if (car) {
            setResult(car);
        } else {
            setResult(null);
            setInvalid(
                token
                    ? "Brak połączenia i nie ma tego kodu na liście w telefonie. Znajdź auto po rejestracji."
                    : "Nieprawidłowy kod wejściówki.",
            );
        }
    }, []);

    const lookup = useCallback(
        async (value) => {
            const trimmed = String(value || "").trim();
            if (!trimmed) return;
            setError("");
            setInvalid("");
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
                setInvalid(errorText(err, "Nie znaleziono wejściówki."));
            }
        },
        [lookupOffline],
    );

    useEffect(() => {
        loadCars().then(syncQueue);
    }, [loadCars, syncQueue]);

    // "online" event isn't reliable on every phone, so also retry on a timer
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
        // keep order: if anything is queued, queue this one too
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
        setResult((current) => (current?.id === car.id || checkedIn ? applyQueue([car], [entry])[0] : current));
    }

    function next() {
        setResult(null);
        setInvalid("");
        setCode("");
        setError("");
        lastScanned.current = "";
        if (canScanInPage) setIsScanning(true);
        else codeInput.current?.focus();
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
    const queuedIds = new Set(queue.map((item) => item.id));
    const recent = cars
        .filter((car) => car.checkedInAt)
        .sort((a, b) => String(b.checkedInAt).localeCompare(String(a.checkedInAt)))
        .slice(0, 5);

    return (
        <div className="gate">
            <div className="gate-bar">
                <span>Wjazd · Select {edition || ""}</span>
                <span title="Na miejscu / opłacone">
                    <strong>{inCount}</strong> / {paidCount}
                </span>
            </div>
            <ConnectionBar
                offline={offline}
                savedAt={savedAt}
                carsCount={cars.length}
                queue={queue}
                syncErrors={syncErrors}
                isSyncing={isSyncing}
                onSync={syncQueue}
            />
            <div className="gate-body">
                {error && (
                    <p className="form-error" role="alert">
                        {error}
                    </p>
                )}

                {result ? (
                    <ResultCard car={result} onToggle={toggleCheckin} onNext={next} />
                ) : invalid ? (
                    <>
                        <div className="gate-result is-bad" role="alert">
                            <p className="gate-result-head">
                                <i className="bi bi-x-octagon-fill" aria-hidden="true" />
                                Kod nieważny
                            </p>
                            <div className="gate-result-body">
                                <p className="gate-result-name">{invalid}</p>
                            </div>
                        </div>
                        <button type="button" className="gate-button is-dark" onClick={next}>
                            <i className="bi bi-qr-code-scan" aria-hidden="true" />
                            Skanuj kolejny
                        </button>
                    </>
                ) : (
                    <>
                        {isScanning ? (
                            <QrScanner onCode={handleScan} onClose={() => setIsScanning(false)} />
                        ) : canScanInPage ? (
                            <button
                                type="button"
                                className="gate-button is-dark"
                                onClick={() => {
                                    lastScanned.current = "";
                                    setIsScanning(true);
                                }}
                            >
                                <i className="bi bi-qr-code-scan" aria-hidden="true" />
                                Skanuj kod
                            </button>
                        ) : (
                            <p className="gate-hint">
                                Zeskanuj kod zwykłym aparatem telefonu — link otworzy tę stronę z wynikiem.
                            </p>
                        )}
                        <form
                            className="gate-code"
                            onSubmit={(event) => {
                                event.preventDefault();
                                lastScanned.current = "";
                                lookup(code);
                            }}
                        >
                            <label className="gate-label" htmlFor="gate-code">
                                Kod z wejściówki
                            </label>
                            <input
                                id="gate-code"
                                ref={codeInput}
                                className="field-input"
                                value={code}
                                onChange={(event) => setCode(event.target.value)}
                                placeholder="Kod SSP-…"
                                autoComplete="off"
                            />
                            <button type="submit" className="btn-street btn-street-dark">
                                Sprawdź
                            </button>
                        </form>
                    </>
                )}

                <div className="gate-lookup">
                    <label className="gate-label" htmlFor="gate-search">
                        Nie ma kodu?
                    </label>
                    <div className="gate-search">
                        <i className="bi bi-search" aria-hidden="true" />
                        <input
                            id="gate-search"
                            type="search"
                            className="field-input"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Szukaj po rejestracji lub nazwisku"
                        />
                    </div>
                    {(search || showAll) && (
                        <ul className="gate-list">
                            {visible.length === 0 && <li className="gate-list-empty">Nie ma takiego auta na liście.</li>}
                            {visible.map((car) => (
                                <li key={car.id}>
                                    <span className="gate-list-car">
                                        <strong>{car.licensePlate}</strong>
                                        <span>
                                            {car.carBrand} · {car.name}
                                        </span>
                                    </span>
                                    {car.checkedInAt ? (
                                        <button
                                            type="button"
                                            className="gate-list-action is-done"
                                            title="Cofnij wjazd"
                                            onClick={() => toggleCheckin(car, false)}
                                        >
                                            <i className="bi bi-check2" aria-hidden="true" /> {formatHour(car.checkedInAt)}
                                        </button>
                                    ) : car.paymentStatus === "paid" ? (
                                        <button type="button" className="gate-list-action" onClick={() => toggleCheckin(car, true)}>
                                            Wjechał
                                        </button>
                                    ) : (
                                        <span className={`status-badge payment-status-${car.paymentStatus}`}>
                                            {PAYMENT_LABELS[car.paymentStatus]}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    {!search && cars.length > 0 && (
                        <button type="button" className="text-action" onClick={() => setShowAll((value) => !value)}>
                            {showAll ? "Ukryj listę aut" : `Pokaż wszystkie auta (${cars.length})`}
                        </button>
                    )}
                </div>

                {!search && recent.length > 0 && (
                    <div className="gate-recent">
                        <p className="gate-label">Ostatnie wjazdy</p>
                        <ul>
                            {recent.map((car) => (
                                <li key={car.id}>
                                    <strong>{car.licensePlate}</strong>
                                    <span>
                                        {formatHour(car.checkedInAt)} ·{" "}
                                        <i
                                            className={`bi bi-${queuedIds.has(car.id) ? "cloud-arrow-up" : "check2"}`}
                                            title={queuedIds.has(car.id) ? "Czeka na wysłanie" : "Wysłane"}
                                        />
                                        <span className="visually-hidden">
                                            {queuedIds.has(car.id) ? "czeka na wysłanie" : "wysłane"}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
