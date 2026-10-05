// Per-account brake on password guessing. The per-IP rate limiter doesn't stop
// an attack spread over many addresses; this counts failed logins per e-mail
// (known or not, so it reveals nothing about which accounts exist) and pauses
// logins to that address for a while after too many misses.
const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

const failures = new Map();

function isLoginLocked(email) {
    const entry = failures.get(email);
    return Boolean(entry && entry.lockedUntil > Date.now());
}

function recordLoginFailure(email) {
    const now = Date.now();
    const entry = failures.get(email);
    const recent = (entry?.times || []).filter((time) => now - time < WINDOW_MS);
    recent.push(now);
    failures.set(email, {
        times: recent,
        lockedUntil: recent.length >= MAX_FAILURES ? now + LOCK_MS : 0,
    });
}

function clearLoginFailures(email) {
    failures.delete(email);
}

setInterval(() => {
    const now = Date.now();
    for (const [email, entry] of failures) {
        const stillRelevant =
            entry.lockedUntil > now || entry.times.some((time) => now - time < WINDOW_MS);
        if (!stillRelevant) failures.delete(email);
    }
}, WINDOW_MS).unref();

module.exports = { isLoginLocked, recordLoginFailure, clearLoginFailures };
