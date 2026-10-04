// Usage (from backend/): npm run backup
// Writes a consistent SQLite snapshot to backups/ (or BACKUP_DIR) and keeps the newest BACKUP_KEEP.
require("dotenv").config({
    path: require("path").join(process.cwd(), "config/.env"),
});

const { backupDatabase } = require("../src/maintenance");

backupDatabase()
    .then((target) => {
        console.log(`Zapisano kopię bazy: ${target}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("Błąd kopii bazy:", error);
        process.exit(1);
    });
