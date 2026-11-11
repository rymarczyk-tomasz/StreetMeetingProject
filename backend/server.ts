const path = require("path");
// process.cwd() is backend/ (npm scripts run from there); __dirname would point
// into dist/ once compiled and miss backend/config/.env.
require("dotenv").config({ path: path.join(process.cwd(), "config/.env") });

// a missing secret would otherwise only show up at the first login
if (process.env.NODE_ENV === "production") {
    const missing = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "APP_URL"].filter(
        (name) => !String(process.env[name] || "").trim(),
    );
    if (missing.length) {
        console.error(`Brak wymaganych zmiennych w config/.env: ${missing.join(", ")}`);
        process.exit(1);
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

app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
    scheduleDailyGallerySync();
    startMaintenance();
});
