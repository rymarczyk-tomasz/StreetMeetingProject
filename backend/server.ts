const path = require("path");
// process.cwd() is backend/ (npm scripts run from there); __dirname would point
// into dist/ once compiled and miss backend/config/.env.
require("dotenv").config({ path: path.join(process.cwd(), "config/.env") });

const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const authRoutes = require("./src/auth/routes");
const adminRoutes = require("./src/admin/routes");
const { router: submissionsRoutes } = require("./src/submissions/routes");
const eventContentDb = require("./src/db/eventContent");
const siteContentDb = require("./src/db/siteContent");
const { CONTENT_UPLOAD_ROOT } = require("./src/utils/paths");
const { scheduleDailyGallerySync } = require("./src/gallery/sync");
const { startMaintenance } = require("./src/maintenance");

const app = express();
const PORT = process.env.PORT || 33000;

// Which proxies may set X-Forwarded-For. Default "loopback" = nginx on the same
// server: req.ip is then the address nginx appended, not whatever the client sent.
// Set TRUST_PROXY to a hop count (e.g. 2) if there is another proxy in front of nginx.
const trustProxyEnv = String(process.env.TRUST_PROXY || "loopback").trim();
app.set(
    "trust proxy",
    /^\d+$/.test(trustProxyEnv) ? Number(trustProxyEnv) : trustProxyEnv,
);

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    helmet({
        // The API only serves JSON and images; the SPA's own CSP belongs in nginx.
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'none'"],
                imgSrc: ["'self'"],
                frameAncestors: ["'none'"],
            },
        },
    }),
);
app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    }),
);
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());

// Public CMS images. Submission photos are NOT public: they are served by
// GET /api/submissions/photos/:userId/:filename (owner or admin only).
app.use(
    "/uploads/content",
    express.static(CONTENT_UPLOAD_ROOT, {
        dotfiles: "deny",
        index: false,
        maxAge: "30d",
        immutable: true,
    }),
);

app.use("/api/auth", authRoutes);
app.get("/api/event", (req, res) => {
    res.json({ event: eventContentDb.getEventContent() });
});
app.get("/api/home", (req, res) => {
    res.json({ home: siteContentDb.getContent("home") });
});
app.get("/api/gallery", (req, res) => {
    res.json({ gallery: siteContentDb.getContent("gallery") });
});
app.get("/api/contact", (req, res) => {
    res.json({ contact: siteContentDb.getContent("contact") });
});
app.get("/api/health", (req, res) => {
    res.json({ status: "OK" });
});
app.get("/health", (req, res) => {
    res.json({ status: "OK" });
});
app.use("/api/admin", adminRoutes);
app.use("/api/submissions", submissionsRoutes);

app.use("/api", (req, res) => {
    res.status(404).json({ message: "Nie znaleziono." });
});

// Last-resort handler: never leak stack traces or internal messages to clients.
app.use((error, req, res, next) => {
    if (error?.type === "entity.too.large") {
        return res.status(413).json({ message: "Przesłane dane są zbyt duże." });
    }
    if (error?.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Nieprawidłowe dane żądania." });
    }

    console.error(`[error] ${req.method} ${req.originalUrl}:`, error);
    if (res.headersSent) return next(error);
    res.status(500).json({ message: "Wystąpił błąd serwera." });
});

app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
    scheduleDailyGallerySync();
    startMaintenance();
});
