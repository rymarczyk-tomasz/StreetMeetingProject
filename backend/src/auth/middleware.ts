const { verifyAccessToken } = require("./tokens");
const usersDb = require("../db/users");

// The access token only proves identity; role and active flag are re-read from the
// database on every request, so blocking a user or revoking admin rights takes effect
// immediately instead of after the token's 15-minute lifetime.
function resolveUser(token) {
    const payload = verifyAccessToken(token);
    const user = usersDb.findUserById(payload.sub);
    if (!user || !user.is_active) return null;
    return { sub: user.id, email: user.email, role: user.role };
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

        return next();
    };
}

module.exports = { authenticate, optionalAuthenticate, requireRole };
