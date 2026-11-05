const path = require("path");
// process.cwd() is backend/ (npm scripts run from there); __dirname would point
// into dist/ once compiled and miss backend/config/.env.
require("dotenv").config({ path: path.join(process.cwd(), "config/.env") });

const app = require("./app");
const { scheduleDailyGallerySync } = require("./src/gallery/sync");
const { startMaintenance } = require("./src/maintenance");

const PORT = process.env.PORT || 33000;

app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
    scheduleDailyGallerySync();
    startMaintenance();
});
