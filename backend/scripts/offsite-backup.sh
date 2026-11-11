#!/usr/bin/env bash
# Usage (from cron): OFFSITE_REMOTE="b2:streetshow-backups" backend/scripts/offsite-backup.sh
#
# Sends to OFFSITE_REMOTE with rclone:
#   db/                  daily database snapshots (app-YYYY-MM-DD.sqlite.gz), kept KEEP_DAYS days
#   uploads/<dir>/       mirror of uploads/submissions, vehicles and content - only new files travel
#   deleted/YYYY-MM-DD/  files removed or replaced on the server since the last run, kept KEEP_DAYS days
#
# uploads/gallery and uploads/showcase are left out on purpose: the gallery is rebuilt
# from Google Drive by a sync, showcase copies are re-rendered on the first request.
# Credentials live in rclone's own config (rclone config), never in this script.
set -euo pipefail

KEEP_DAYS=30
UPLOAD_DIRS="submissions vehicles content"
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BACKEND_DIR"

# cron has an almost empty environment, so fall back to config/.env
env_value() {
    [ -f config/.env ] || return 0
    grep -E "^$1=" config/.env | tail -n 1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//' || true
}

OFFSITE_REMOTE="${OFFSITE_REMOTE:-$(env_value OFFSITE_REMOTE)}"
OFFSITE_REMOTE="${OFFSITE_REMOTE%/}"
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

TODAY="$(date +%F)"
SNAPSHOT="$BACKUP_DIR/app-$TODAY.sqlite"
[ -s "$SNAPSHOT" ] || { echo "[offsite] Brak dzisiejszej kopii bazy: $SNAPSHOT" >&2; exit 1; }

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
gzip -c "$SNAPSHOT" > "$WORK_DIR/app-$TODAY.sqlite.gz"
gzip -t "$WORK_DIR/app-$TODAY.sqlite.gz"
rclone copyto "$WORK_DIR/app-$TODAY.sqlite.gz" "$OFFSITE_REMOTE/db/app-$TODAY.sqlite.gz"

for dir in $UPLOAD_DIRS; do
    [ -d "uploads/$dir" ] || continue
    # sync deletes on the remote what was deleted here; --backup-dir keeps those files for KEEP_DAYS
    rclone sync "uploads/$dir" "$OFFSITE_REMOTE/uploads/$dir" \
        --backup-dir "$OFFSITE_REMOTE/deleted/$TODAY/$dir"
done

rclone delete "$OFFSITE_REMOTE/db" --min-age "${KEEP_DAYS}d" --include "app-*.sqlite.gz"
# deleted/ does not exist until something has been removed
if rclone lsf "$OFFSITE_REMOTE/deleted" >/dev/null 2>&1; then
    rclone delete "$OFFSITE_REMOTE/deleted" --min-age "${KEEP_DAYS}d"
    rclone rmdirs "$OFFSITE_REMOTE/deleted" --leave-root
fi

echo "[offsite] $(date '+%F %T') gotowe: baza $(du -h "$WORK_DIR/app-$TODAY.sqlite.gz" | cut -f1), uploads ($UPLOAD_DIRS) do $OFFSITE_REMOTE"
