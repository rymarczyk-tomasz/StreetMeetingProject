const express = require("express");

const dateSubscribersDb = require("../db/dateSubscribers");
const siteContentDb = require("../db/siteContent");
const { EMAIL_REGEX, normalizeText } = require("../utils/validation");
const { createRateLimiter } = require("../utils/rateLimiter");

// Public half of the "Daj mi znać o dacie" list (the admin half is in
// admin/routes.ts): sign up from the home page, leave with the e-mail's link.
const router = express.Router();

const signupRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: "Zbyt wiele prób zapisu. Spróbuj ponownie później.",
});

router.post("/", signupRateLimit, (req, res) => {
    const email = normalizeText(req.body?.email).slice(0, 254);
    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ message: "Podaj poprawny adres e-mail." });
    }
    if (req.body?.consent !== true) {
        return res.status(400).json({ message: "Zaakceptuj politykę prywatności." });
    }

    dateSubscribersDb.addSubscriber(email, siteContentDb.getCurrentEdition());
    // Same answer whether or not the address was already on the list.
    res.status(201).json({
        message: "Zapisane! Napiszemy, gdy ogłosimy termin i ruszy sprzedaż biletów.",
    });
});

router.post("/unsubscribe", (req, res) => {
    dateSubscribersDb.removeByToken(String(req.body?.token || ""));
    // Also "done" for an unknown or already used token — the address is off the list.
    res.json({ message: "Wypisano Cię z listy powiadomień o dacie wydarzenia." });
});

module.exports = router;
