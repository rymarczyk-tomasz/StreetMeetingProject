const { verifyAccessToken } = require("./tokens");
const usersDb = require("../db/users");
const twoFactorDb = require("../db/twoFactor");

// role/active are re-read on every request so blocking works immediately
function resolveUser(token) {
    const payload = verifyAccessToken(token);
    const user = usersDb.findUserById(payload.sub);
    if (!user || !user.is_active) return null;
    const issuedAt = Number(payload.ts) || Number(payload.iat) * 1000;
    if (user.sessions_revoked_at && issuedAt < user.sessions_revoked_at) return null;
    return {
        sub: user.id,
        email: user.email,
        role: user.role,
        canCheckIn: usersDb.canCheckIn(user),
        twoFactorEnabled: twoFactorDb.isEnabled(user),
    };
}

function authenticate(req, res, next) {
    const token = req.cookies?.access_token;

    if (!token) {
        return res.status(401).json({ message: "Wymagane logowanie." });
    }

    try {
        const user = resolveUser(token);
        if (!user) {
            return res
                .status(401)
                .json({ message: "Sesja wygasła lub konto jest niedostępne." });
        }
        req.user = user;
        return next();
    } catch {
        return res
            .status(401)
            .json({ message: "Sesja wygasła lub jest nieprawidłowa." });
    }
}

function optionalAuthenticate(req, res, next) {
    const token = req.cookies?.access_token;

    if (token) {
        try {
            req.user = resolveUser(token) || undefined;
        } catch {
            // ignore invalid/expired token for optional auth
        }
    }

    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Wymagane logowanie." });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Brak uprawnień." });
        }

        // the admin panel is closed until two-step login is set up
        if (req.user.role === "admin" && !req.user.twoFactorEnabled) {
            return res.status(403).json({
                code: "two_factor_setup_required",
                message: "Włącz logowanie dwuetapowe, aby korzystać z panelu administratora.",
            });
        }

        return next();
    };
}

// an admin account without two-step login gets no admin rights anywhere
function isFullAdmin(user) {
    return Boolean(user && user.role === "admin" && user.twoFactorEnabled);
}

function requireCheckInAccess(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ message: "Wymagane logowanie." });
    }
    if (!req.user.canCheckIn) {
        return res.status(403).json({ message: "Brak uprawnień do obsługi wjazdu." });
    }
    return next();
}

module.exports = { authenticate, optionalAuthenticate, requireRole, requireCheckInAccess, isFullAdmin };
