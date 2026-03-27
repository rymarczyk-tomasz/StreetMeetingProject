import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../config/.env") });

import { app } from "./app.js";
import { scheduleDailyGallerySync } from "./services/gallerySyncService.js";

const PORT = process.env.PORT || 33000;

app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
    scheduleDailyGallerySync();
});
