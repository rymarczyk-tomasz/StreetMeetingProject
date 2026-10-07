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
const vehiclesRoutes = require("./src/vehicles/routes");
const messagesRoutes = require("./src/messages/routes");
const gateRoutes = require("./src/gate/routes");
const { router: showcaseRoutes } = require("./src/showcase/routes");
const dateSubscribersRoutes = require("./src/notifications/dateSubscribersRoutes");
const siteContentDb = require("./src/db/siteContent");
const { PUBLIC_CONTENT_KEYS } = require("./src/content/defaults");
const {
    CONTENT_UPLOAD_ROOT,
    GALLERY_UPLOAD_ROOT,
} = require("./src/utils/paths");
const { scheduleDailyGallerySync } = require("./src/gallery/sync");
const { publicRouter: galleryPublicRoutes } = require("./src/gallery/routes");
const { startMaintenance } = require("./src/maintenance");

const app = express();
const PORT = process.env.PORT || 33000;

// "loopback" = nginx on the same server; use a hop count if there's another proxy in front
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
        setHeaders(res, filePath) {
            // The browser's built-in PDF viewer doesn't work under "default-src 'none'".
            // PDFs here are admin uploads verified to be real PDFs.
            if (filePath.endsWith(".pdf")) res.removeHeader("Content-Security-Policy");
        },
    }),
);

// Gallery thumbnails are immutable per version (?v=...), so cache them for long.
app.use(
    "/uploads/gallery",
    express.static(GALLERY_UPLOAD_ROOT, {
        dotfiles: "deny",
        index: false,
        maxAge: "365d",
        immutable: true,
    }),
);

app.use("/api/auth", authRoutes);

// Public page content: GET /api/content?keys=home,event,contact returns several
// sections in one request; GET /api/content/:key returns one.
app.get("/api/content", (req, res) => {
    const keys = String(req.query.keys || "")
        .split(",")
        .map((key) => key.trim())
        .filter((key) => PUBLIC_CONTENT_KEYS.includes(key));
    if (!keys.length) {
        return res.status(400).json({ message: "Podaj sekcje (keys)." });
    }

    const content = Object.fromEntries(
        keys.map((key) => [key, siteContentDb.getContent(key)]),
    );
    res.set("Cache-Control", "no-cache");
    res.json({ content });
});
app.get("/api/content/:key", (req, res) => {
    if (!PUBLIC_CONTENT_KEYS.includes(req.params.key)) {
        return res.status(404).json({ message: "Nie znaleziono." });
    }
    res.set("Cache-Control", "no-cache");
    res.json({ content: siteContentDb.getContent(req.params.key) });
});
// Whether Select submissions are open and the per-account limit, for the home
// page (the logged-in panel gets the same plus the user's remaining slots).
app.get("/api/select-status", (req, res) => {
    const settings = siteContentDb.getSettings();
    const availability = siteContentDb.getSubmissionsAvailability(settings);
    res.set("Cache-Control", "no-cache");
    res.json({
        ...availability,
        deadline: settings.submissionsDeadline || "",
        maxVehicles: settings.maxVehiclesPerUser,
        edition: siteContentDb.getCurrentEdition(),
    });
});
app.use("/api/notify", dateSubscribersRoutes);
app.use("/api/gallery", galleryPublicRoutes);
app.use("/api/showcase", showcaseRoutes);
app.get("/api/health", (req, res) => {
    res.json({ status: "OK" });
});
app.get("/health", (req, res) => {
    res.json({ status: "OK" });
});
app.use("/api/admin", adminRoutes);
app.use("/api/submissions", submissionsRoutes);
app.use("/api/vehicles", vehiclesRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/gate", gateRoutes);

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
