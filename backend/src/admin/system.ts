const fs = require("fs");
const path = require("path");

const db = require("../db/database");
const { BACKUP_DIR } = require("../maintenance");
const { isEmailConfigured } = require("../notifications/email");
const drive = require("../gallery/drive");
const { getSyncStatus } = require("../gallery/sync");

// Health overview for Admin → System: things that silently break on a server
// (backups, e-mail, gallery sync, disk space) in one list of checks.

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const DAY_MS = 24 * 60 * 60 * 1000;
const LOW_DISK_BYTES = 2 * 1024 * 1024 * 1024;

async function fileSize(file) {
    try {
        return (await fs.promises.stat(file)).size;
    } catch {
        return 0;
    }
}

// Total size of a directory tree (uploads can hold thousands of files, so
// this walks asynchronously and skips anything unreadable).
async function directorySize(dir) {
    let total = 0;
    let entries;
    try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
        return 0;
    }
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) total += await directorySize(full);
        else if (entry.isFile()) total += await fileSize(full);
    }
    return total;
}

async function latestBackup() {
    try {
        const names = (await fs.promises.readdir(BACKUP_DIR))
            .filter((name) => /^app-\d{4}-\d{2}-\d{2}\.sqlite$/.test(name))
            .sort();
        if (!names.length) return { count: 0 };
        const name = names[names.length - 1];
        const stat = await fs.promises.stat(path.join(BACKUP_DIR, name));
        return { count: names.length, name, size: stat.size, modifiedAt: stat.mtime.toISOString() };
    } catch {
        return { count: 0 };
    }
}

async function diskSpace() {
    try {
        const stats = await fs.promises.statfs(DATA_DIR);
        return { free: stats.bavail * stats.bsize, total: stats.blocks * stats.bsize };
    } catch {
        return null;
    }
}

function galleryState() {
    const row = db
        .prepare(
            `SELECT COUNT(*) AS albums, MAX(last_synced_at) AS lastSyncedAt,
                    SUM(CASE WHEN last_sync_error IS NOT NULL AND last_sync_error != '' THEN 1 ELSE 0 END) AS failing
             FROM gallery_albums`,
        )
        .get();
    return { ...row, configured: drive.hasDriveCredentials(), sync: getSyncStatus() };
}

function check(id, label, level, detail) {
    return { id, label, level, detail };
}

async function getSystemStatus() {
    const backupsDisabled = String(process.env.BACKUP_DISABLED || "").toLowerCase() === "true";
    const [backup, disk, databaseSize, walSize, uploads] = await Promise.all([
        latestBackup(),
        diskSpace(),
        fileSize(path.join(DATA_DIR, "app.sqlite")),
        fileSize(path.join(DATA_DIR, "app.sqlite-wal")),
        Promise.all(
            ["submissions", "vehicles", "content", "gallery", "showcase"].map(async (name) => ({
                name,
                size: await directorySize(path.join(UPLOADS_DIR, name)),
            })),
        ),
    ]);
    const gallery = galleryState();
    const backupAge = backup.modifiedAt ? Date.now() - new Date(backup.modifiedAt).getTime() : null;

    const checks = [
        backupsDisabled
            ? check("backup", "Kopia bazy", "warn", "Wyłączona (BACKUP_DISABLED=true).")
            : !backup.count
              ? check("backup", "Kopia bazy", "error", `Brak kopii w ${BACKUP_DIR}. Pierwsza powstaje minutę po starcie serwera.`)
              : check(
                    "backup",
                    "Kopia bazy",
                    backupAge > 2 * DAY_MS ? "error" : "ok",
                    `Ostatnia: ${backup.name} (liczba kopii: ${backup.count}, katalog ${BACKUP_DIR}). Pamiętaj o kopii poza serwerem.`,
                ),
        isEmailConfigured()
            ? check("smtp", "Wysyłka e-maili (SMTP)", "ok", `Nadawca: ${process.env.SMTP_FROM || process.env.SMTP_USER}. Sprawdź przyciskiem „Wyślij testowy e-mail”.`)
            : check("smtp", "Wysyłka e-maili (SMTP)", "error", "Nie skonfigurowano — nie działają reset hasła, decyzje, przypomnienia i wiadomości e-mail."),
        process.env.APP_URL
            ? check("app-url", "Adres strony w e-mailach (APP_URL)", "ok", process.env.APP_URL)
            : check("app-url", "Adres strony w e-mailach (APP_URL)", "warn", "Nie ustawiono — linki w e-mailach i kodach QR mogą prowadzić pod zły adres."),
        process.env.ADMIN_NOTIFY_EMAIL
            ? check("admin-notify", "Powiadomienia dla organizatorów", "ok", process.env.ADMIN_NOTIFY_EMAIL)
            : check("admin-notify", "Powiadomienia dla organizatorów", "warn", "ADMIN_NOTIFY_EMAIL nie jest ustawiony — nie przychodzą e-maile o nowych zgłoszeniach, rezygnacjach i wiadomościach."),
        !gallery.configured
            ? check("gallery", "Galeria (Dysk Google)", "warn", "Brak danych konta serwisowego Google — synchronizacja wyłączona.")
            : check(
                  "gallery",
                  "Galeria (Dysk Google)",
                  gallery.failing || gallery.sync.lastError ? "error" : "ok",
                  [
                      `${gallery.albums} albumów`,
                      gallery.lastSyncedAt ? `ostatnia synchronizacja ${gallery.lastSyncedAt} UTC` : "jeszcze nie synchronizowano",
                      gallery.failing ? `błędy w ${gallery.failing} albumach` : "",
                      gallery.sync.lastError || "",
                  ]
                      .filter(Boolean)
                      .join(" · "),
              ),
        disk
            ? check(
                  "disk",
                  "Miejsce na dysku",
                  disk.free < LOW_DISK_BYTES ? "error" : "ok",
                  `Wolne ${formatBytes(disk.free)} z ${formatBytes(disk.total)}.`,
              )
            : check("disk", "Miejsce na dysku", "warn", "Nie udało się odczytać."),
    ];

    return {
        checks,
        server: {
            uptimeSeconds: Math.round(process.uptime()),
            node: process.version,
            startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
        },
        storage: {
            database: databaseSize + walSize,
            uploads,
        },
    };
}

function formatBytes(bytes) {
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} kB`;
}

module.exports = { getSystemStatus };
