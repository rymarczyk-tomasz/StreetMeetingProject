// Offline support for the gate screen: the last downloaded car list is kept on
// the phone, and check-ins made without signal wait in a queue until it's back.
// Everything here is best-effort — storage may be unavailable (private mode).

const CARS_KEY = "gate.cars.v1";
const QUEUE_KEY = "gate.queue.v1";

export type QueuedCheckin = {
    id: number;
    checkedIn: boolean;
    // ISO time of the tap at the gate, sent so the server keeps the real time.
    at: string;
    licensePlate: string;
};

function read(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
        return null;
    }
}

function write(key, value) {
    try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage full or blocked: offline mode just isn't available.
    }
}

export function saveCars(cars, savedAt = new Date().toISOString()) {
    write(CARS_KEY, { cars, savedAt });
}

export function loadSavedCars(): { cars: any[]; savedAt: string } | null {
    const saved = read(CARS_KEY);
    return saved && Array.isArray(saved.cars) ? saved : null;
}

export function clearSavedCars() {
    write(CARS_KEY, null);
}

export function loadQueue(): QueuedCheckin[] {
    const queue = read(QUEUE_KEY);
    return Array.isArray(queue) ? queue : [];
}

// One pending entry per car: only the state after the latest tap matters.
export function enqueueCheckin(entry: QueuedCheckin) {
    const queue = loadQueue().filter((item) => item.id !== entry.id);
    queue.push(entry);
    write(QUEUE_KEY, queue);
    return queue;
}

// Removes a sent entry — unless the car was tapped again meanwhile (newer `at`).
export function removeFromQueue(sent: QueuedCheckin) {
    const queue = loadQueue().filter((item) => item.id !== sent.id || item.at !== sent.at);
    write(QUEUE_KEY, queue.length ? queue : null);
    return queue;
}

// "YYYY-MM-DD HH:MM:SS" (UTC), the format the API uses for checkedInAt.
export function toApiTime(iso: string) {
    return iso.slice(0, 19).replace("T", " ");
}

// Cars as the server sent them, with not-yet-synced taps applied on top.
export function applyQueue(cars, queue: QueuedCheckin[]) {
    if (!queue.length) return cars;
    const pending = new Map(queue.map((item) => [item.id, item]));
    return cars.map((car) => {
        const item = pending.get(car.id);
        if (!item) return car;
        return { ...car, checkedInAt: item.checkedIn ? toApiTime(item.at) : null, pendingSync: true };
    });
}

// Same accepted forms as the server: the QR link (…?kod=SSP-…), "SSP-<token>",
// the bare 24-character token or the short code (SSP-7Q4K-2MXD). Returns the
// lower-case value whose hash is in the saved list (passHash / shortHash).
export function tokenFromCode(code) {
    let value = String(code || "").trim();
    const fromLink = value.match(/[?&]kod=([^&#\s]+)/i);
    if (fromLink) {
        try {
            value = decodeURIComponent(fromLink[1]);
        } catch {
            return null;
        }
    }
    const token = value.replace(/^SSP/i, "").replace(/[-\s]/g, "").toLowerCase();
    return /^[a-f0-9]{24}$/.test(token) || /^[2-9a-hjkmnp-z]{8}$/.test(token) ? token : null;
}

export async function hashToken(token: string) {
    if (!globalThis.crypto?.subtle) return null;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// No response at all = no connection (as opposed to an error from the server).
export function isNetworkError(err) {
    return Boolean(err) && !err.response;
}
