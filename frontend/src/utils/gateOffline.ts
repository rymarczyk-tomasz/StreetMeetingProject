// offline gate: last car list + queue of check-ins in localStorage (best effort)

const CARS_KEY = "gate.cars.v1";
const QUEUE_KEY = "gate.queue.v1";

export type QueuedCheckin = {
    id: number;
    checkedIn: boolean;
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

// one entry per car, the latest tap wins
export function enqueueCheckin(entry: QueuedCheckin) {
    const queue = loadQueue().filter((item) => item.id !== entry.id);
    queue.push(entry);
    write(QUEUE_KEY, queue);
    return queue;
}

// unless the car was tapped again in the meantime
export function removeFromQueue(sent: QueuedCheckin) {
    const queue = loadQueue().filter((item) => item.id !== sent.id || item.at !== sent.at);
    write(QUEUE_KEY, queue.length ? queue : null);
    return queue;
}

export function toApiTime(iso: string) {
    return iso.slice(0, 19).replace("T", " ");
}

export function applyQueue(cars, queue: QueuedCheckin[]) {
    if (!queue.length) return cars;
    const pending = new Map(queue.map((item) => [item.id, item]));
    return cars.map((car) => {
        const item = pending.get(car.id);
        if (!item) return car;
        return { ...car, checkedInAt: item.checkedIn ? toApiTime(item.at) : null, pendingSync: true };
    });
}

// same formats as the server: qr link, SSP-<token>, token or short code
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

export function isNetworkError(err) {
    return Boolean(err) && !err.response;
}
