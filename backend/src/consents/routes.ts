const express = require("express");

const consentsDb = require("../db/consents");
const { createRateLimiter } = require("../utils/rateLimiter");

const router = express.Router();

const CATEGORIES = ["necessary", "analytics", "marketing"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const consentRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 30,
    message: "Zbyt wiele zapisów. Spróbuj ponownie później.",
});

router.post("/", consentRateLimit, (req, res) => {
    const { consentId, categories, revision } = req.body || {};
    const valid =
        UUID.test(String(consentId || "")) &&
        Array.isArray(categories) &&
        categories.length <= CATEGORIES.length &&
        categories.every((category) => CATEGORIES.includes(category)) &&
        Number.isInteger(revision) &&
        revision >= 0 &&
        revision < 1000;
    if (!valid) return res.status(400).json({ message: "Nieprawidłowe dane zgody." });

    consentsDb.logConsent({
        consentId: String(consentId).toLowerCase(),
        categories: [...new Set(categories)].sort(),
        revision,
    });
    res.status(204).end();
});

module.exports = router;
