// Sensitive admin actions (payment details, new admins, mass e-mails) need the
// password and a fresh code again, so a stolen or left-open session isn't enough.
// The client retries with body.stepUp = { password, code } after a step_up_required answer.
const bcrypt = require("bcryptjs");
const usersDb = require("../db/users");
const twoFactorDb = require("../db/twoFactor");
const { isLoginLocked, recordLoginFailure } = require("./loginThrottle");

function required(res, user, message) {
    return res.status(403).json({
        code: "step_up_required",
        twoFactor: twoFactorDb.isEnabled(user),
        message,
    });
}

// resolves true when the action may go on; otherwise the response is already sent
async function confirmStepUp(req, res) {
    const user = usersDb.findUserById(req.user.sub);
    if (!user) {
        res.status(401).json({ message: "Wymagane logowanie." });
        return false;
    }
    if (isLoginLocked(user.email)) {
        res.status(429).json({ message: "Zbyt wiele nieudanych prób. Spróbuj za 15 minut." });
        return false;
    }

    const { password, code } = req.body?.stepUp || {};
    if (!password) {
        required(res, user, "Potwierdź tę operację hasłem i kodem z aplikacji.");
        return false;
    }

    const passwordOk = await bcrypt.compare(String(password).slice(0, 256), user.password_hash);
    const codeOk = !twoFactorDb.isEnabled(user) || twoFactorDb.verifySecondFactor(user, code).ok;
    if (!passwordOk || !codeOk) {
        recordLoginFailure(user.email);
        required(res, user, "Nieprawidłowe hasło lub kod. Spróbuj ponownie.");
        return false;
    }
    return true;
}

module.exports = { confirmStepUp };
