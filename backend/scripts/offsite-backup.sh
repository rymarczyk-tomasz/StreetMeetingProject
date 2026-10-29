#!/usr/bin/env bash
# Usage (from cron): OFFSITE_REMOTE="b2:streetshow-backups" backend/scripts/offsite-backup.sh
# Packs a fresh database snapshot (backups/) and uploads/ into one dated archive,
# sends it to OFFSITE_REMOTE with rclone and removes remote archives older than 14 days.
# Credentials live in rclone's own config (rclone config), never in this script.
set -euo pipefail

KEEP_DAYS=14
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BACKEND_DIR"

# cron has an almost empty environment, so fall back to config/.env
env_value() {
    [ -f config/.env ] || return 0
    grep -E "^$1=" config/.env | tail -n 1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//' || true
}

OFFSITE_REMOTE="${OFFSITE_REMOTE:-$(env_value OFFSITE_REMOTE)}"
BACKUP_DIR="${BACKUP_DIR:-$(env_value BACKUP_DIR)}"
BACKUP_DIR="${BACKUP_DIR:-$BACKEND_DIR/backups}"

if [ -z "$OFFSITE_REMOTE" ]; then
    echo "[offsite] Brak OFFSITE_REMOTE (np. b2:streetshow-backups)." >&2
    exit 1
fi
command -v rclone >/dev/null || { echo "[offsite] Brak rclone w PATH." >&2; exit 1; }
[ -d uploads ] || { echo "[offsite] Brak katalogu $BACKEND_DIR/uploads." >&2; exit 1; }

echo "[offsite] $(date '+%F %T') start"

npm run --silent backup

BACKUP_DIR="$(cd "$BACKUP_DIR" && pwd)"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

ARCHIVE_NAME="streetshow-$(date +%F).tar.gz"
ARCHIVE="$WORK_DIR/$ARCHIVE_NAME"

# exit code 1 from GNU tar only means a file changed while it was read (live uploads)
tar_status=0
tar --warning=no-file-changed -czf "$ARCHIVE" \
    -C "$(dirname "$BACKUP_DIR")" "$(basename "$BACKUP_DIR")" \
    -C "$BACKEND_DIR" uploads || tar_status=$?
if [ "$tar_status" -gt 1 ]; then
    echo "[offsite] Błąd tworzenia archiwum (tar: $tar_status)." >&2
    exit "$tar_status"
fi
gzip -t "$ARCHIVE"

rclone copyto "$ARCHIVE" "$OFFSITE_REMOTE/$ARCHIVE_NAME"
rclone delete "$OFFSITE_REMOTE" --max-depth 1 --min-age "${KEEP_DAYS}d" --include "streetshow-*.tar.gz"

echo "[offsite] $(date '+%F %T') wysłano $ARCHIVE_NAME ($(du -h "$ARCHIVE" | cut -f1)) do $OFFSITE_REMOTE"
