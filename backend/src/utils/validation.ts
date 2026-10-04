const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_REGEX = /^\+?[0-9]{9,15}$/;
const PASSWORD_MIN_LENGTH = 8;
// bcrypt only looks at the first 72 bytes; anything longer just burns CPU.
const PASSWORD_MAX_LENGTH = 128;

function normalizeText(value) {
    return String(value || "").trim();
}

function normalizePhone(value) {
    return normalizeText(value).replace(/\s+/g, "");
}

function normalizeEmail(value) {
    return normalizeText(value).toLowerCase();
}

function validatePassword(password) {
    if (password.length < PASSWORD_MIN_LENGTH) {
        return `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`;
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
        return `Hasło może mieć maksymalnie ${PASSWORD_MAX_LENGTH} znaków.`;
    }
    return null;
}

// CMS links/images may be site-relative ("/formularz", "#contact") or absolute
// http(s) URLs. Anything else (javascript:, data:, protocol-relative "//") is rejected.
function isSafeUrl(value, { allowEmpty = false } = {}) {
    const url = normalizeText(value);
    if (!url) return allowEmpty;
    if (url.startsWith("#")) return true;
    if (url.startsWith("/") && !url.startsWith("//")) return true;

    try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

module.exports = {
    EMAIL_REGEX,
    PHONE_REGEX,
    PASSWORD_MIN_LENGTH,
    normalizeText,
    normalizePhone,
    normalizeEmail,
    validatePassword,
    isSafeUrl,
};
