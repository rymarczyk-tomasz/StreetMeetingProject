// Small in-memory sliding-window rate limiter (no extra infra needed on mikrus/hostinger).
function createRateLimiter({ windowMs, maxRequests, message }) {
    const attempts = new Map();

    setInterval(() => {
        const now = Date.now();
        for (const [key, timestamps] of attempts.entries()) {
            const recent = timestamps.filter((t) => now - t < windowMs);
            if (recent.length) {
                attempts.set(key, recent);
            } else {
                attempts.delete(key);
            }
        }
    }, windowMs).unref();

    return function rateLimit(req, res, next) {
        const key =
            (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
            req.ip ||
            req.socket?.remoteAddress ||
            "unknown";
        const now = Date.now();
        const recent = (attempts.get(key) || []).filter(
            (t) => now - t < windowMs,
        );
        recent.push(now);
        attempts.set(key, recent);

        if (recent.length > maxRequests) {
            return res.status(429).json({
                message:
                    message || "Zbyt wiele prób. Spróbuj ponownie później.",
            });
        }

        next();
    };
}

module.exports = { createRateLimiter };
