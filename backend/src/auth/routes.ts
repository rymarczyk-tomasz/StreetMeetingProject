const express = require("express");
const bcrypt = require("bcryptjs");

const usersDb = require("../db/users");
const refreshTokensDb = require("../db/refreshTokens");
const {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    getRefreshTokenExpiryDate,
    setAuthCookies,
    clearAuthCookies,
} = require("./tokens");
const { authenticate } = require("./middleware");
const { createRateLimiter } = require("../utils/rateLimiter");

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_REGEX = /^\+?[0-9]{9,15}$/;
const PASSWORD_MIN_LENGTH = 8;
const BCRYPT_ROUNDS = 12;

const authRateLimit = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: "Zbyt wiele prób. Spróbuj ponownie za chwilę.",
});

function normalizeEmail(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

function toPublicUser(user) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        licensePlate: user.license_plate,
        carBrand: user.car_brand,
        role: user.role,
    };
}

async function issueSession(res, user) {
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
    const firstName = String(req.body.firstName || "").trim();
    const lastName = String(req.body.lastName || "").trim();

    if (!EMAIL_REGEX.test(email)) {
        return res
            .status(400)
            .json({ message: "Podaj poprawny adres e-mail." });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        return res.status(400).json({
            message: `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`,
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
    });

    await issueSession(res, user);
    res.status(201).json({ user: toPublicUser(user) });
});

router.post("/login", authRateLimit, async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    const user = usersDb.findUserByEmail(email);
    const genericError = { message: "Nieprawidłowy e-mail lub hasło." };

    if (!user) {
        return res.status(401).json(genericError);
    }

    if (!user.is_active) {
        return res.status(403).json({ message: "Konto zostało zablokowane." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
        return res.status(401).json(genericError);
    }

    await issueSession(res, user);
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

router.get("/me", authenticate, (req, res) => {
    const user = usersDb.findUserById(req.user.sub);
    if (!user) {
        return res.status(401).json({ message: "Sesja nieprawidłowa." });
    }
    res.json({ user: toPublicUser(user) });
});

router.patch("/me", authenticate, (req, res) => {
    const firstName = String(req.body.firstName || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    const phone = String(req.body.phone || "")
        .trim()
        .replace(/\s+/g, "");
    const licensePlate = String(req.body.licensePlate || "").trim();
    const carBrand = String(req.body.carBrand || "").trim();

    if (phone && !PHONE_REGEX.test(phone)) {
        return res.status(400).json({
            message: "Podaj poprawny numer telefonu (9-15 cyfr).",
        });
    }

    if (licensePlate.length > 20 || carBrand.length > 100) {
        return res.status(400).json({
            message: "Numer rejestracyjny lub marka pojazdu są zbyt długie.",
        });
    }

    const user = usersDb.updateUserProfile(req.user.sub, {
        firstName,
        lastName,
        phone,
        licensePlate,
        carBrand,
    });

    res.json({ user: toPublicUser(user) });
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

        if (newPassword.length < PASSWORD_MIN_LENGTH) {
            return res.status(400).json({
                message: `Nowe hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`,
            });
        }

        if (newPassword === currentPassword) {
            return res.status(400).json({
                message: "Nowe hasło musi różnić się od aktualnego.",
            });
        }

        const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        usersDb.updateUserPassword(user.id, passwordHash);
        refreshTokensDb.revokeAllUserTokens(user.id);
        await issueSession(res, user);

        res.json({ message: "Hasło zostało zmienione." });
    },
);

module.exports = router;
