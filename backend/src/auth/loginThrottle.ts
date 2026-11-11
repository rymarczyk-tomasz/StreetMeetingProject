// Failed logins are counted twice:
// - per e-mail + ip: a few wrong passwords lock that address out, not the account -
//   otherwise anyone who knows an admin's e-mail could keep the account locked
// - per e-mail from all addresses: stops guessing spread over many ips
const MAX_FAILURES_PER_IP = 10;
const MAX_FAILURES_PER_EMAIL = 100;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

const failures = new Map();

const pairKey = (email, ip) => `${email}|${ip || "unknown"}`;
const emailKey = (email) => `${email}|*`;

function isLocked(key) {
    const entry = failures.get(key);
    return Boolean(entry && entry.lockedUntil > Date.now());
}

function record(key, limit) {
    const now = Date.now();
    const entry = failures.get(key);
    const recent = (entry?.times || []).filter((time) => now - time < WINDOW_MS);
    recent.push(now);
    failures.set(key, {
        times: recent,
        lockedUntil: recent.length >= limit ? now + LOCK_MS : entry?.lockedUntil || 0,
    });
}

function isLoginLocked(email, ip) {
    return isLocked(pairKey(email, ip)) || isLocked(emailKey(email));
}

function recordLoginFailure(email, ip) {
    record(pairKey(email, ip), MAX_FAILURES_PER_IP);
    record(emailKey(email), MAX_FAILURES_PER_EMAIL);
}

// a correct login clears this address only; the account-wide count runs out by itself
function clearLoginFailures(email, ip) {
    failures.delete(pairKey(email, ip));
}

// after a password reset: the owner proved access to the mailbox
function clearAllLoginFailures(email) {
    for (const key of failures.keys()) {
        if (key.startsWith(`${email}|`)) failures.delete(key);
    }
}

setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of failures) {
        const stillRelevant =
            entry.lockedUntil > now || entry.times.some((time) => now - time < WINDOW_MS);
        if (!stillRelevant) failures.delete(key);
    }
}, WINDOW_MS).unref();

module.exports = {
    isLoginLocked,
    recordLoginFailure,
    clearLoginFailures,
    clearAllLoginFailures,
    MAX_FAILURES_PER_EMAIL,
};
