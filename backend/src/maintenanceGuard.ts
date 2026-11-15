const siteContentDb = require("./db/siteContent");
const { optionalAuthenticate } = require("./auth/middleware");

// While maintenance mode is on only admins get through (gate staff keep /api/gate).
// Login, content for the notice screen and /api/health are mounted before this guard.
function maintenanceGuard(req, res, next) {
    if (!siteContentDb.isMaintenanceOn()) return next();

    optionalAuthenticate(req, res, () => {
        const user = req.user;
        if (user?.role === "admin") return next();
        if (user?.canCheckIn && req.originalUrl.startsWith("/api/gate")) return next();
        res.status(503).json({ maintenance: true, message: "Strona jest w przebudowie. Wróć za jakiś czas." });
    });
}

module.exports = { maintenanceGuard };
