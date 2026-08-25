const { verifyAccessToken } = require("./tokens");

function authenticate(req, res, next) {
    const token = req.cookies?.access_token;

    if (!token) {
        return res.status(401).json({ message: "Wymagane logowanie." });
    }

    try {
        req.user = verifyAccessToken(token);
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
            req.user = verifyAccessToken(token);
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
