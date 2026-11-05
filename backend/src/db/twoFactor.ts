const crypto = require("crypto");
const db = require("./database");
const totp = require("../auth/totp");

const RECOVERY_CODE_COUNT = 10;
// no 0/O/1/I/L, same as pass short codes
const RECOVERY_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

const setPendingStmt = db.prepare("UPDATE users SET totp_pending_secret = ? WHERE id = ?");
const enableStmt = db.prepare(`
    UPDATE users
    SET totp_secret = totp_pending_secret, totp_pending_secret = NULL,
        totp_enabled_at = datetime('now'), totp_last_step = ?
    WHERE id = ?
`);
const setLastStepStmt = db.prepare("UPDATE users SET totp_last_step = ? WHERE id = ?");
const resetStmt = db.prepare(`
    UPDATE users
    SET totp_secret = NULL, totp_pending_secret = NULL, totp_enabled_at = NULL, totp_last_step = NULL
    WHERE id = ?
`);
const deleteCodesStmt = db.prepare("DELETE FROM recovery_codes WHERE user_id = ?");
const insertCodeStmt = db.prepare("INSERT INTO recovery_codes (user_id, code_hash) VALUES (?, ?)");
const findCodeStmt = db.prepare(
    "SELECT id FROM recovery_codes WHERE user_id = ? AND code_hash = ? AND used_at IS NULL",
);
const useCodeStmt = db.prepare("UPDATE recovery_codes SET used_at = datetime('now') WHERE id = ? AND used_at IS NULL");
const countCodesStmt = db.prepare(
    "SELECT COUNT(*) AS count FROM recovery_codes WHERE user_id = ? AND used_at IS NULL",
);

function isEnabled(user) {
    return Boolean(user?.totp_enabled_at && user.totp_secret);
}

function normalizeRecoveryCode(code) {
    return String(code || "").toUpperCase().replace(/[\s-]/g, "");
}

function hashRecoveryCode(code) {
    return crypto.createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
}

function newRecoveryCode() {
    const chars = Array.from(crypto.randomBytes(8), (byte: number) => RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length]);
    return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

const replaceRecoveryCodes = db.transaction((userId, codes) => {
    deleteCodesStmt.run(userId);
    for (const code of codes) insertCodeStmt.run(userId, hashRecoveryCode(code));
});

// plain codes are returned once and never stored
function generateRecoveryCodes(userId) {
    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode);
    replaceRecoveryCodes(userId, codes);
    return codes;
}

function recoveryCodesLeft(userId) {
    return countCodesStmt.get(userId).count;
}

function startSetup(userId) {
    const secret = totp.generateSecret();
    setPendingStmt.run(secret, userId);
    return secret;
}

// confirms the scanned secret with a first code; returns recovery codes or null
function enable(user, code) {
    const step = totp.verifyCode(user.totp_pending_secret, code);
    if (step === null) return null;
    enableStmt.run(step, user.id);
    return generateRecoveryCodes(user.id);
}

// a 6-digit app code, or a one-time recovery code
function verifySecondFactor(user, code) {
    if (!isEnabled(user)) return { ok: false };

    const step = totp.verifyCode(user.totp_secret, code, { lastStep: user.totp_last_step ?? null });
    if (step !== null) {
        setLastStepStmt.run(step, user.id);
        return { ok: true, usedRecoveryCode: false };
    }

    const normalized = normalizeRecoveryCode(code);
    if (normalized.length === 8) {
        const row = findCodeStmt.get(user.id, hashRecoveryCode(normalized));
        if (row && useCodeStmt.run(row.id).changes === 1) {
            return { ok: true, usedRecoveryCode: true, codesLeft: recoveryCodesLeft(user.id) };
        }
    }
    return { ok: false };
}

const reset = db.transaction((userId) => {
    resetStmt.run(userId);
    deleteCodesStmt.run(userId);
});

module.exports = {
    isEnabled,
    startSetup,
    enable,
    verifySecondFactor,
    generateRecoveryCodes,
    recoveryCodesLeft,
    reset,
    RECOVERY_CODE_COUNT,
};
