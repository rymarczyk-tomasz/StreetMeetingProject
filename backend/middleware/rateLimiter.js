const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 5;
const tracker = new Map();

setInterval(() => {
    const now = Date.now();

    for (const [key, attempts] of tracker.entries()) {
        const recent = attempts.filter((timestamp) => now - timestamp < RATE_WINDOW_MS);

        if (recent.length) {
            tracker.set(key, recent);
        } else {
            tracker.delete(key);
        }
    }
}, RATE_WINDOW_MS).unref();

function getClientIp(req) {
    const forwardedFor = req.headers["x-forwarded-for"];

    if (typeof forwardedFor === "string" && forwardedFor.length) {
        return forwardedFor.split(",")[0].trim();
    }

    return req.ip || req.socket?.remoteAddress || "unknown";
}

function uploadRateLimit(req, res, next) {
    const clientIp = getClientIp(req);
    const now = Date.now();
    const existing = tracker.get(clientIp) || [];
    const recent = existing.filter((timestamp) => now - timestamp < RATE_WINDOW_MS);

    recent.push(now);
    tracker.set(clientIp, recent);

    if (recent.length > RATE_MAX_REQUESTS) {
        const secondsUntilReset = Math.max(
            1,
            Math.ceil((RATE_WINDOW_MS - (now - recent[0])) / 1000),
        );

        res.set("Retry-After", String(secondsUntilReset));
        return res.status(429).json({
            message: "Za dużo prób wysyłki. Spróbuj ponownie za chwilę.",
        });
    }

    next();
}

export { uploadRateLimit };
