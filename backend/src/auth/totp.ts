// RFC 6238 time-based one-time codes (Google Authenticator, Authy, 1Password…):
// HMAC-SHA1, 30 s steps, 6 digits.
const crypto = require("crypto");

const STEP_SECONDS = 30;
const DIGITS = 6;
// accept the previous and next code too - phone clocks drift a little
const WINDOW = 1;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer) {
    let bits = 0;
    let value = 0;
    let output = "";
    for (const byte of buffer) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += BASE32[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
    return output;
}

function base32Decode(text) {
    const clean = String(text || "").toUpperCase().replace(/[\s=-]/g, "");
    let bits = 0;
    let value = 0;
    const bytes = [];
    for (const char of clean) {
        const index = BASE32.indexOf(char);
        if (index === -1) throw new Error("Invalid base32");
        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(bytes);
}

function generateSecret() {
    return base32Encode(crypto.randomBytes(20));
}

function currentStep(now = Date.now()) {
    return Math.floor(now / 1000 / STEP_SECONDS);
}

function codeForStep(secret, step, digits = DIGITS) {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(step));
    const hmac = crypto.createHmac("sha1", base32Decode(secret)).update(counter).digest();
    const offset = hmac[hmac.length - 1] & 15;
    const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
    return String(binary % 10 ** digits).padStart(digits, "0");
}

function generateCode(secret, now = Date.now()) {
    return codeForStep(secret, currentStep(now));
}

// the matching step, or null; a step at or before lastStep is a replay
function verifyCode(secret, code, { lastStep = null, now = Date.now() } = {}) {
    const clean = String(code || "").replace(/\s/g, "");
    if (!/^\d{6}$/.test(clean) || !secret) return null;
    const step = currentStep(now);
    for (let offset = -WINDOW; offset <= WINDOW; offset++) {
        const candidate = step + offset;
        if (lastStep !== null && candidate <= lastStep) continue;
        const expected = codeForStep(secret, candidate);
        if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) return candidate;
    }
    return null;
}

function otpauthUri({ secret, account, issuer = "Street Show" }) {
    const label = encodeURIComponent(`${issuer}:${account}`);
    const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(DIGITS), period: String(STEP_SECONDS) });
    return `otpauth://totp/${label}?${params}`;
}

module.exports = {
    base32Encode,
    base32Decode,
    generateSecret,
    generateCode,
    codeForStep,
    verifyCode,
    otpauthUri,
};
