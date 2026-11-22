const express = require("express");

const accreditationsDb = require("../db/accreditations");
const siteContentDb = require("../db/siteContent");
const { EMAIL_REGEX, PHONE_REGEX, normalizeText, normalizeEmail } = require("../utils/validation");
const { createRateLimiter } = require("../utils/rateLimiter");
const { sendNewAccreditationAdminEmail } = require("../notifications/email");

const router = express.Router();

const requestRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: "Zbyt wiele prób. Spróbuj ponownie za kilkanaście minut.",
});

// the decision is e-mailed here, so nothing a mail header reads as a list or a group
const ADDRESS_SEPARATORS = /[,;:<>()[\]"\\]/;
const INSTAGRAM_HOSTS = ["instagram.com", "www.instagram.com", "m.instagram.com"];
const HANDLE_REGEX = /^[a-z0-9._]{1,30}$/;
const NOT_PROFILES = ["p", "reel", "reels", "stories", "explore", "accounts", "tv", "share"];

// a profile link or @handle -> https://www.instagram.com/<handle>/, "" when it's neither
function instagramProfileUrl(value) {
    const input = normalizeText(value);
    let handle = input.replace(/^@/, "");
    if (input.includes("/")) {
        try {
            const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
            if (!INSTAGRAM_HOSTS.includes(url.hostname)) return "";
            handle = url.pathname.split("/")[1] || "";
        } catch {
            return "";
        }
    } else if (/^(www\.|m\.)?instagram\.com/i.test(input)) {
        return "";
    }
    handle = handle.toLowerCase();
    if (!HANDLE_REGEX.test(handle) || NOT_PROFILES.includes(handle)) return "";
    return `https://www.instagram.com/${handle}/`;
}

router.post("/", requestRateLimit, (req, res) => {
    const body = req.body || {};
    const name = normalizeText(body.name).replace(/\s+/g, " ");
    const email = normalizeEmail(body.email);
    const phone = normalizeText(body.phone).replace(/[\s().-]/g, "");
    const instagramUrl = instagramProfileUrl(body.instagram);

    const fail = (message) => res.status(400).json({ message });
    if (!name.includes(" ") || name.length > 100) return fail("Podaj imię i nazwisko (do 100 znaków).");
    if (email.length > 254 || !EMAIL_REGEX.test(email) || ADDRESS_SEPARATORS.test(email)) {
        return fail("Podaj poprawny adres e-mail.");
    }
    if (!PHONE_REGEX.test(phone)) return fail("Podaj poprawny numer telefonu.");
    if (!instagramUrl) return fail("Podaj link do profilu na Instagramie albo nazwę @profilu.");
    if (body.consent !== true) return fail("Zaznacz zgodę na przetwarzanie danych.");

    const accreditation = accreditationsDb.createAccreditation({
        edition: siteContentDb.getCurrentEdition(),
        name,
        email,
        phone,
        instagramUrl,
        consentVersion: siteContentDb.getContentVersion("privacy"),
    });
    if (accreditation) {
        void sendNewAccreditationAdminEmail({ accreditation }).catch((error) =>
            console.error("[email] Nowy wniosek o akredytację:", error.message),
        );
    }
    // same answer for a repeated address, so the form doesn't reveal who applied
    res.status(201).json({
        message: "Dziękujemy! Decyzję wyślemy na podany adres e-mail.",
    });
});

module.exports = router;
