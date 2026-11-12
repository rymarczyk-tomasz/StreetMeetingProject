const path = require("path");
// process.cwd() is backend/ (npm scripts run from there); __dirname would point
// into dist/ once compiled and miss backend/config/.env.
require("dotenv").config({ path: path.join(process.cwd(), "config/.env") });

// a missing secret would otherwise only show up at the first login
if (process.env.NODE_ENV === "production") {
    const missing = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"].filter(
        (name) => !String(process.env[name] || "").trim(),
    );
    if (missing.length) {
        console.error(`Brak wymaganych zmiennych w config/.env: ${missing.join(", ")}`);
        process.exit(1);
    }
    // not fatal: links fall back to www.streetshow.pl, which is wrong only on a test server
    if (!String(process.env.APP_URL || "").trim()) {
        console.warn("Brak APP_URL w config/.env — linki w e-mailach i kody QR użyją https://www.streetshow.pl.");
    }
}

// one broken promise in a route must not take the whole API down
process.on("unhandledRejection", (reason) => {
    console.error("[error] unhandledRejection:", reason);
});

const app = require("./app");
const { scheduleDailyGallerySync } = require("./src/gallery/sync");
const { startMaintenance } = require("./src/maintenance");

const PORT = process.env.PORT || 33000;

// HOST=127.0.0.1 on a server keeps the API reachable only through nginx
const HOST = String(process.env.HOST || "").trim() || undefined;

app.listen(PORT, HOST, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
    scheduleDailyGallerySync();
    startMaintenance();
});
