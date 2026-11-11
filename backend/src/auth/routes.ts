const express = require("express");
const bcrypt = require("bcryptjs");
const fs = require("fs");

const usersDb = require("../db/users");
const refreshTokensDb = require("../db/refreshTokens");
const passwordResetTokensDb = require("../db/passwordResetTokens");
const submissionsDb = require("../db/submissions");
const {
    signAccessToken,
    signRefreshToken,
    signTwoFactorChallenge,
    verifyTwoFactorChallenge,
    verifyRefreshToken,
    getRefreshTokenExpiryDate,
    setAuthCookies,
    clearAuthCookies,
} = require("./tokens");
const { authenticate } = require("./middleware");
const {
    isLoginLocked,
    recordLoginFailure,
    clearLoginFailures,
    clearAllLoginFailures,
} = require("./loginThrottle");
const { createRateLimiter } = require("../utils/rateLimiter");
const {
    EMAIL_REGEX,
    PHONE_REGEX,
    normalizeText,
    normalizePhone,
    normalizeEmail,
    validatePassword,
} = require("../utils/validation");
const { getUserSubmissionsDir, getUserVehiclesDir } = require("../utils/paths");
const emailTokensDb = require("../db/emailTokens");
const siteContentDb = require("../db/siteContent");
const vehiclesDb = require("../db/vehicles");
const { removeShowcaseCopies } = require("../showcase/routes");
const threadsDb = require("../db/threads");
const auditLogDb = require("../db/auditLog");
const twoFactorDb = require("../db/twoFactor");
const { otpauthUri } = require("./totp");
const { confirmStepUp } = require("./stepUp");
const {
    isEmailConfigured,
    sendSecurityAlertEmail,
    sendPasswordResetEmail,
    sendPasswordChangedEmail,
    sendAccountDeletedEmail,
    sendAccountDeletedAdminEmail,
    sendVerificationEmail,
    sendEmailChangeEmail,
} = require("../notifications/email");

const router = express.Router();

const BCRYPT_ROUNDS = 12;
// same timing for unknown e-mails (no user enumeration)
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("street-show-dummy-password", BCRYPT_ROUNDS);

const authRateLimit = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: "Zbyt wiele prób. Spróbuj ponownie za chwilę.",
});

const passwordResetRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: "Zbyt wiele prób resetu hasła. Spróbuj ponownie później.",
});

function toPublicUser(user) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        canCheckIn: usersDb.canCheckIn(user),
        emailVerified: Boolean(user.email_verified_at),
        termsAcceptedAt: user.terms_accepted_at,
        notifications: usersDb.notificationPrefs(user),
        twoFactorEnabled: twoFactorDb.isEnabled(user),
    };
}

function sendVerification(user) {
    const { token, ttlHours } = emailTokensDb.createEmailToken(user.id, "verify");
    return sendVerificationEmail({ user, token, ttlHours });
}

function logEmailError(label) {
    return (error) =>
        console.error(`[email] ${label}:`, error?.message || error);
}

function issueSession(res, user) {
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    refreshTokensDb.storeRefreshToken(
        user.id,
        refreshToken,
        getRefreshTokenExpiryDate(),
    );
    setAuthCookies(res, { accessToken, refreshToken });
}

router.post("/register", authRateLimit, async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const firstName = normalizeText(req.body.firstName).slice(0, 100);
    const lastName = normalizeText(req.body.lastName).slice(0, 100);

    if (!EMAIL_REGEX.test(email) || email.length > 254) {
        return res
            .status(400)
            .json({ message: "Podaj poprawny adres e-mail." });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
        return res.status(400).json({ message: passwordError });
    }

    if (req.body.acceptTerms !== true) {
        return res.status(400).json({
            message:
                "Aby założyć konto, zaakceptuj regulamin i zgodę na przetwarzanie danych.",
        });
    }

    if (usersDb.findUserByEmail(email)) {
        return res
            .status(409)
            .json({ message: "Konto z tym adresem e-mail już istnieje." });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = usersDb.createUser({
        email,
        passwordHash,
        firstName,
        lastName,
        role: "user",
        termsVersion: siteContentDb.getContentVersion("regulamin"),
    });

    issueSession(res, user);
    void sendVerification(user).catch(logEmailError("potwierdzenie adresu"));
    res.status(201).json({ user: toPublicUser(user) });
});

router.post("/login", authRateLimit, async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "").slice(0, 256);

    if (isLoginLocked(email, req.ip)) {
        return res.status(429).json({
            message:
                "Zbyt wiele nieudanych prób logowania na to konto. Spróbuj za 15 minut albo ustaw nowe hasło („Nie pamiętasz hasła?”).",
        });
    }

    const user = usersDb.findUserByEmail(email);
    const passwordMatches = await bcrypt.compare(
        password,
        user?.password_hash || DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
        recordLoginFailure(email, req.ip);
        return res
            .status(401)
            .json({ message: "Nieprawidłowy e-mail lub hasło." });
    }

    clearLoginFailures(email, req.ip);

    // Only revealed to someone who already knows the password.
    if (!user.is_active) {
        return res.status(403).json({ message: "Konto zostało zablokowane." });
    }

    // the password was right, but the session only starts after the app code
    if (twoFactorDb.isEnabled(user)) {
        return res.json({ twoFactorRequired: true, challenge: signTwoFactorChallenge(user) });
    }

    issueSession(res, user);
    res.json({ user: toPublicUser(user) });
});

router.post("/login/2fa", authRateLimit, (req, res) => {
    let payload;
    try {
        payload = verifyTwoFactorChallenge(req.body?.challenge);
    } catch {
        return res.status(401).json({
            code: "challenge_expired",
            message: "Logowanie wygasło. Wpisz e-mail i hasło jeszcze raz.",
        });
    }

    const user = usersDb.findUserById(payload.sub);
    if (!user || !user.is_active || !twoFactorDb.isEnabled(user)) {
        return res.status(401).json({ message: "Konto jest niedostępne." });
    }
    if (isLoginLocked(user.email, req.ip)) {
        return res.status(429).json({
            message: "Zbyt wiele nieudanych prób logowania na to konto. Spróbuj za 15 minut.",
        });
    }

    const result = twoFactorDb.verifySecondFactor(user, req.body?.code);
    if (!result.ok) {
        recordLoginFailure(user.email, req.ip);
        return res.status(401).json({ message: "Nieprawidłowy kod. Wpisz aktualny kod z aplikacji." });
    }

    clearLoginFailures(user.email, req.ip);
    issueSession(res, user);
    if (result.usedRecoveryCode) {
        auditLogDb.createAuditEntry({
            adminId: user.id,
            action: "user.recovery_code_used",
            targetType: "user",
            targetId: user.id,
            details: { codesLeft: result.codesLeft },
        });
        void sendSecurityAlertEmail({
            recipients: [user.email],
            title: "logowanie kodem zapasowym",
            lines: [
                `Ktoś zalogował się na konto ${user.email} jednorazowym kodem zapasowym zamiast kodu z aplikacji.`,
                `Zostało ${result.codesLeft} nieużytych kodów. Gdy zostanie ich mało, wygeneruj nowe w Ustawieniach konta.`,
            ],
            ip: req.ip,
        }).catch(logEmailError("alert: kod zapasowy"));
    }
    res.json({ user: toPublicUser(user) });
});

router.post("/refresh", (req, res) => {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
        return res.status(401).json({ message: "Brak sesji do odświeżenia." });
    }

    const storedToken = refreshTokensDb.findRefreshToken(refreshToken);
    if (!storedToken) {
        clearAuthCookies(res);
        return res
            .status(401)
            .json({ message: "Sesja wygasła. Zaloguj się ponownie." });
    }

    try {
        const payload = verifyRefreshToken(refreshToken);
        const user = usersDb.findUserById(payload.sub);

        if (!user || !user.is_active) {
            refreshTokensDb.revokeRefreshToken(refreshToken);
            clearAuthCookies(res);
            return res.status(401).json({ message: "Konto niedostępne." });
        }

        // rotate refresh token to reduce reuse window
        refreshTokensDb.revokeRefreshToken(refreshToken);
        issueSession(res, user);

        res.json({ user: toPublicUser(user) });
    } catch {
        refreshTokensDb.revokeRefreshToken(refreshToken);
        clearAuthCookies(res);
        return res
            .status(401)
            .json({ message: "Sesja wygasła. Zaloguj się ponownie." });
    }
});

router.post("/logout", (req, res) => {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
        refreshTokensDb.revokeRefreshToken(refreshToken);
    }
    clearAuthCookies(res);
    res.json({ message: "Wylogowano." });
});

router.post("/forgot-password", passwordResetRateLimit, (req, res) => {
    const email = normalizeEmail(req.body.email);
    const response = {
        message:
            "Jeśli konto z tym adresem istnieje, wysłaliśmy na nie link do ustawienia nowego hasła.",
    };

    if (!EMAIL_REGEX.test(email)) {
        return res.json(response);
    }

    const user = usersDb.findUserByEmail(email);
    if (user && user.is_active) {
        const token = passwordResetTokensDb.createResetToken(user.id);
        void sendPasswordResetEmail({
            user,
            token,
            ttlMinutes: passwordResetTokensDb.RESET_TOKEN_TTL_MINUTES,
        }).catch(logEmailError("reset hasła"));
    }

    res.json(response);
});

router.post("/reset-password", passwordResetRateLimit, async (req, res) => {
    const token = String(req.body.token || "");
    const password = String(req.body.password || "");

    const resetToken = token
        ? passwordResetTokensDb.findValidResetToken(token)
        : null;
    if (!resetToken) {
        return res.status(400).json({
            message:
                "Link do resetu hasła jest nieprawidłowy lub wygasł. Poproś o nowy.",
        });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
        return res.status(400).json({ message: passwordError });
    }

    const user = usersDb.findUserById(resetToken.user_id);
    if (!user || !user.is_active) {
        passwordResetTokensDb.deleteResetTokensForUser(resetToken.user_id);
        return res.status(400).json({ message: "Konto jest niedostępne." });
    }

    const adminPasswordError = validatePassword(password, { admin: user.role === "admin" });
    if (adminPasswordError) {
        return res.status(400).json({ message: adminPasswordError });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    usersDb.updateUserPassword(user.id, passwordHash);
    passwordResetTokensDb.deleteResetTokensForUser(user.id);
    // Log out every other device that may be using the old password.
    refreshTokensDb.revokeAllUserTokens(user.id);
    // The owner proved access to the mailbox, so a lockout no longer applies.
    clearAllLoginFailures(user.email);
    clearAuthCookies(res);
    void sendPasswordChangedEmail({ user }).catch(logEmailError("zmiana hasła"));

    res.json({
        message: "Hasło zostało zmienione. Możesz się teraz zalogować.",
    });
});

router.get("/me", authenticate, (req, res) => {
    const user = usersDb.findUserById(req.user.sub);
    if (!user) {
        return res.status(401).json({ message: "Sesja nieprawidłowa." });
    }
    res.json({ user: toPublicUser(user) });
});

router.patch("/me", authenticate, (req, res) => {
    const firstName = normalizeText(req.body.firstName);
    const lastName = normalizeText(req.body.lastName);
    const phone = normalizePhone(req.body.phone);

    if (phone && !PHONE_REGEX.test(phone)) {
        return res.status(400).json({
            message: "Podaj poprawny numer telefonu (9-15 cyfr).",
        });
    }

    if (firstName.length > 100 || lastName.length > 100) {
        return res
            .status(400)
            .json({ message: "Imię lub nazwisko jest zbyt długie." });
    }

    const user = usersDb.updateUserProfile(req.user.sub, {
        firstName,
        lastName,
        phone,
    });

    res.json({ user: toPublicUser(user) });
});

router.patch("/me/notifications", authenticate, (req, res) => {
    const user = usersDb.updateNotificationPrefs(req.user.sub, req.body || {});
    res.json({ user: toPublicUser(user), message: "Zapisano ustawienia powiadomień." });
});

router.post("/verify-email", authRateLimit, (req, res) => {
    const row = emailTokensDb.consumeEmailToken(req.body?.token, "verify");
    if (!row) {
        return res.status(400).json({
            message: "Link jest nieprawidłowy lub wygasł. Wyślij nowy z ustawień konta.",
        });
    }

    usersDb.setEmailVerified(row.user_id);
    res.json({ message: "Adres e-mail został potwierdzony. Dziękujemy!" });
});

router.post("/resend-verification", authenticate, passwordResetRateLimit, async (req, res) => {
    const user = usersDb.findUserById(req.user.sub);
    if (user.email_verified_at) {
        return res.json({ message: "Adres e-mail jest już potwierdzony." });
    }
    if (!isEmailConfigured()) {
        return res.status(503).json({
            message: "Wysyłka e-maili jest chwilowo niedostępna. Spróbuj później.",
        });
    }

    try {
        await sendVerification(user);
    } catch (error) {
        logEmailError("potwierdzenie adresu")(error);
        return res.status(502).json({
            message: "Nie udało się wysłać e-maila. Spróbuj ponownie za chwilę.",
        });
    }
    res.json({ message: `Wysłaliśmy link potwierdzający na ${user.email}.` });
});

// link goes to the new address so a typo can't lock the user out
router.post("/change-email", authenticate, passwordResetRateLimit, async (req, res) => {
    const newEmail = normalizeEmail(req.body?.newEmail);
    const password = String(req.body?.password || "");
    const user = usersDb.findUserById(req.user.sub);

    if (!(await bcrypt.compare(password, user.password_hash))) {
        return res.status(400).json({ message: "Hasło jest nieprawidłowe." });
    }
    if (!EMAIL_REGEX.test(newEmail) || newEmail.length > 254) {
        return res.status(400).json({ message: "Podaj poprawny nowy adres e-mail." });
    }
    if (newEmail === user.email) {
        return res.status(400).json({ message: "To jest Twój obecny adres." });
    }
    if (usersDb.findUserByEmail(newEmail)) {
        return res.status(409).json({ message: "Ten adres jest już używany przez inne konto." });
    }
    if (!isEmailConfigured()) {
        return res.status(503).json({
            message: "Zmiana adresu wymaga wysyłki e-maili, która jest chwilowo niedostępna.",
        });
    }

    const { token, ttlHours } = emailTokensDb.createEmailToken(user.id, "change", newEmail);
    try {
        await sendEmailChangeEmail({ user, newEmail, token, ttlHours });
    } catch (error) {
        logEmailError("zmiana adresu")(error);
        return res.status(502).json({
            message: "Nie udało się wysłać e-maila na nowy adres. Spróbuj ponownie za chwilę.",
        });
    }
    res.json({
        message: `Wysłaliśmy link na ${newEmail}. Adres zmieni się po kliknięciu w link.`,
    });
});

router.post("/confirm-email-change", authRateLimit, (req, res) => {
    const row = emailTokensDb.consumeEmailToken(req.body?.token, "change");
    if (!row) {
        return res.status(400).json({ message: "Link jest nieprawidłowy lub wygasł." });
    }
    if (usersDb.findUserByEmail(row.new_email)) {
        return res.status(409).json({ message: "Ten adres jest już używany przez inne konto." });
    }

    const user = usersDb.updateUserEmail(row.user_id, row.new_email);
    res.json({ message: `Adres e-mail zmieniony na ${user.email}.` });
});

router.post("/logout-all", authenticate, (req, res) => {
    const user = usersDb.findUserById(req.user.sub);
    refreshTokensDb.revokeAllUserTokens(user.id);
    issueSession(res, user);
    res.json({ message: "Wylogowano ze wszystkich innych urządzeń." });
});

router.get("/me/export", authenticate, (req, res) => {
    const user = usersDb.findUserById(req.user.sub);
    const submissions = submissionsDb
        .listSubmissionsByUser(req.user.sub)
        .map((row) => ({
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            phone: row.phone,
            licensePlate: row.license_plate,
            carBrand: row.car_brand,
            carDescription: row.car_description,
            photos: JSON.parse(row.photos || "[]").length,
            edition: row.edition,
            status: row.status,
            paymentStatus: row.payment_status,
            adminNote: row.admin_note,
            consentAt: row.consent_at,
            consentVersion: row.consent_version,
            photoPublishConsent: Boolean(row.photo_publish_consent),
            checkedInAt: row.checked_in_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            messages: threadsDb.listThread(row.id).map((message) => ({
                from: message.from_admin ? "organizator" : "uczestnik",
                body: message.body,
                createdAt: message.created_at,
            })),
        }));
    const vehicles = vehiclesDb.listVehicles(req.user.sub).map((row) => ({
        carBrand: row.car_brand,
        licensePlate: row.license_plate,
        carDescription: row.car_description,
        photos: JSON.parse(row.photos || "[]").length,
    }));

    res.setHeader(
        "Content-Disposition",
        'attachment; filename="street-show-moje-dane.json"',
    );
    res.json({
        exportedAt: new Date().toISOString(),
        account: {
            ...toPublicUser(user),
            termsVersion: user.terms_version,
            createdAt: user.created_at,
        },
        submissions,
        vehicles,
    });
});

router.delete("/me", authenticate, authRateLimit, async (req, res) => {
    const password = String(req.body?.password || "");
    const user = usersDb.findUserById(req.user.sub);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(400).json({ message: "Hasło jest nieprawidłowe." });
    }

    if (user.role === "admin" && usersDb.countAdmins() <= 1) {
        return res.status(400).json({
            message: "Nie można usunąć konta ostatniego administratora.",
        });
    }

    const submissions = submissionsDb.listSubmissionsByUser(user.id);
    const currentEdition = siteContentDb.getCurrentEdition();

    // a paid (or being verified) place needs the organizer first - refund, reserve list
    const paidPlace = submissions.find(
        (row) =>
            row.edition === currentEdition &&
            row.status === "approved" &&
            ["paid", "verification"].includes(row.payment_status) &&
            !row.checked_in_at,
    );
    if (paidPlace) {
        return res.status(409).json({
            code: "paid_submission",
            message: `Masz opłacone miejsce w strefie Select ${currentEdition} (${paidPlace.car_brand}, ${paidPlace.license_plate}). Zanim usuniesz konto, zrezygnuj z udziału w panelu albo napisz do organizatora w sprawie zwrotu opłaty.`,
        });
    }

    // what the organizer still needs to know about once the rows are gone
    const relevant = submissions.filter(
        (row) =>
            row.edition === currentEdition &&
            (["pending", "approved", "waitlist"].includes(row.status) ||
                ["paid", "verification"].includes(row.payment_status)),
    );
    const snapshot = {
        email: user.email,
        firstName: user.first_name,
        name: [user.first_name, user.last_name].filter(Boolean).join(" "),
    };

    // before deleteUser, so the entry keeps the e-mail of its author
    auditLogDb.createAuditEntry({
        adminId: user.id,
        action: "user.self_deleted",
        targetType: "user",
        targetId: user.id,
        details: {
            email: user.email,
            submissions: relevant.map((row) => ({
                licensePlate: row.license_plate,
                carBrand: row.car_brand,
                edition: row.edition,
                status: row.status,
                paymentStatus: row.payment_status,
            })),
        },
    });

    // ids first, the rows are deleted with the user
    const submissionIds = submissions.map((row) => row.id);
    usersDb.deleteUser(user.id);
    submissionIds.forEach(removeShowcaseCopies);
    for (const dir of [getUserSubmissionsDir(user.id), getUserVehiclesDir(user.id)]) {
        fs.promises.rm(dir, { recursive: true, force: true }).catch((error) =>
            console.error(
                `[account] Nie udało się usunąć plików użytkownika ${user.id}:`,
                error.message,
            ),
        );
    }
    clearAuthCookies(res);
    void sendAccountDeletedEmail(snapshot).catch(logEmailError("usunięcie konta"));
    void sendAccountDeletedAdminEmail({ ...snapshot, submissions: relevant }).catch(
        logEmailError("usunięcie konta (organizator)"),
    );

    res.json({ message: "Konto zostało usunięte." });
});

router.post(
    "/change-password",
    authenticate,
    authRateLimit,
    async (req, res) => {
        const currentPassword = String(req.body.currentPassword || "");
        const newPassword = String(req.body.newPassword || "");
        const user = usersDb.findUserById(req.user.sub);

        if (
            !user ||
            !(await bcrypt.compare(currentPassword, user.password_hash))
        ) {
            return res
                .status(400)
                .json({ message: "Aktualne hasło jest nieprawidłowe." });
        }

        const passwordError = validatePassword(newPassword, { admin: user.role === "admin" });
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        if (newPassword === currentPassword) {
            return res.status(400).json({
                message: "Nowe hasło musi różnić się od aktualnego.",
            });
        }

        const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        usersDb.updateUserPassword(user.id, passwordHash);
        refreshTokensDb.revokeAllUserTokens(user.id);
        passwordResetTokensDb.deleteResetTokensForUser(user.id);
        issueSession(res, user);
        void sendPasswordChangedEmail({ user }).catch(logEmailError("zmiana hasła"));

        res.json({ message: "Hasło zostało zmienione." });
    },
);

// ---- Two-step login (admins) ----

function adminOnly(req, res, next) {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Logowanie dwuetapowe jest dostępne dla administratorów." });
    }
    next();
}

router.get("/2fa", authenticate, adminOnly, (req, res) => {
    const user = usersDb.findUserById(req.user.sub);
    res.json({
        enabled: twoFactorDb.isEnabled(user),
        recoveryCodesLeft: twoFactorDb.isEnabled(user) ? twoFactorDb.recoveryCodesLeft(user.id) : 0,
    });
});

// step 1: password again, then a new secret to scan (not active until confirmed)
router.post("/2fa/setup", authenticate, adminOnly, authRateLimit, async (req, res) => {
    const user = usersDb.findUserById(req.user.sub);
    if (twoFactorDb.isEnabled(user)) {
        return res.status(400).json({ message: "Logowanie dwuetapowe jest już włączone." });
    }
    if (!(await bcrypt.compare(String(req.body?.password || "").slice(0, 256), user.password_hash))) {
        recordLoginFailure(user.email, req.ip);
        return res.status(400).json({ message: "Hasło jest nieprawidłowe." });
    }

    const secret = twoFactorDb.startSetup(user.id);
    res.json({ secret, uri: otpauthUri({ secret, account: user.email }) });
});

// step 2: the first code from the app proves the scan worked
router.post("/2fa/enable", authenticate, adminOnly, authRateLimit, (req, res) => {
    const user = usersDb.findUserById(req.user.sub);
    if (twoFactorDb.isEnabled(user)) {
        return res.status(400).json({ message: "Logowanie dwuetapowe jest już włączone." });
    }
    if (!user.totp_pending_secret) {
        return res.status(400).json({ message: "Zacznij konfigurację od początku." });
    }

    const recoveryCodes = twoFactorDb.enable(user, req.body?.code);
    if (!recoveryCodes) {
        return res.status(400).json({
            message: "Nieprawidłowy kod. Sprawdź, czy zegar w telefonie jest ustawiony automatycznie.",
        });
    }

    // sessions started before 2FA was on are dropped; this one is renewed
    refreshTokensDb.revokeAllUserTokens(user.id);
    issueSession(res, user);
    auditLogDb.createAuditEntry({
        adminId: user.id,
        action: "user.two_factor_enabled",
        targetType: "user",
        targetId: user.id,
        details: {},
    });
    void sendSecurityAlertEmail({
        recipients: [user.email],
        title: "włączono logowanie dwuetapowe",
        lines: [`Na koncie ${user.email} włączono logowanie dwuetapowe. Pozostałe urządzenia zostały wylogowane.`],
        ip: req.ip,
    }).catch(logEmailError("alert: 2FA włączone"));

    res.json({ recoveryCodes, user: toPublicUser(usersDb.findUserById(user.id)) });
});

// new set of backup codes, the old ones stop working
router.post("/2fa/recovery-codes", authenticate, adminOnly, async (req, res) => {
    const user = usersDb.findUserById(req.user.sub);
    if (!twoFactorDb.isEnabled(user)) {
        return res.status(400).json({ message: "Najpierw włącz logowanie dwuetapowe." });
    }
    if (!(await confirmStepUp(req, res))) return;

    const recoveryCodes = twoFactorDb.generateRecoveryCodes(user.id);
    auditLogDb.createAuditEntry({
        adminId: user.id,
        action: "user.recovery_codes_regenerated",
        targetType: "user",
        targetId: user.id,
        details: {},
    });
    res.json({ recoveryCodes });
});

module.exports = router;
