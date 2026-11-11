#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 VPS for Street Show. Safe to re-run.
#
#   sudo DOMAIN=www.streetshow.pl APEX=streetshow.pl bash setup.sh
#   sudo DOMAIN=nowa.streetshow.pl APEX=none bash setup.sh      # staging before the switch
#   sudo ORIGIN_PULLS=1 bash setup.sh    # refuse HTTPS that doesn't come through Cloudflare;
#                                        # first turn on "Authenticated Origin Pulls" in Cloudflare
#
# Before the nginx step can finish, put the Cloudflare Origin Certificate in
# /etc/ssl/cloudflare/origin.pem and origin.key (see DEPLOYMENT.md).
set -euo pipefail

DOMAIN=${DOMAIN:-www.streetshow.pl}
APEX=${APEX:-streetshow.pl}
APP_USER=${APP_USER:-streetshow}
REPO=${REPO:-https://github.com/rymarczyk-tomasz/StreetMeetingProject.git}
BRANCH=${BRANCH:-newProject}
API_PORT=${API_PORT:-4001}
ORIGIN_PULLS=${ORIGIN_PULLS:-0}

APP_HOME=/home/$APP_USER
APP_DIR=$APP_HOME/streetshow
ENV_FILE=$APP_DIR/backend/config/.env
# e-mail addresses in the .env template; a staging subdomain has no apex
MAIL_DOMAIN=$([ "$APEX" = none ] && echo "$DOMAIN" || echo "$APEX")

[ "$(id -u)" -eq 0 ] || { echo "Run as root (sudo)." >&2; exit 1; }

as_app() { sudo -u "$APP_USER" -H bash -lc "$*"; }
step() { echo; echo "==> $*"; }

step "Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -yq
apt-get install -yq git curl ca-certificates build-essential sqlite3 nginx ufw fail2ban unattended-upgrades cron
timedatectl set-timezone Europe/Warsaw

if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1)" != "v22" ]; then
    step "Node.js 22"
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -yq nodejs
fi
command -v pm2 >/dev/null || npm install -g pm2

if ! swapon --show | grep -q .; then
    step "Swap 2 GB"
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

step "User $APP_USER"
id "$APP_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$APP_USER"
install -d -m 700 -o "$APP_USER" -g "$APP_USER" "$APP_HOME/.ssh"
keys=$APP_HOME/.ssh/authorized_keys
touch "$keys"
for src in /root/.ssh/authorized_keys "${SUDO_USER:+/home/$SUDO_USER/.ssh/authorized_keys}"; do
    [ -n "$src" ] && [ -f "$src" ] && cat "$src" >> "$keys"
done
[ -n "${DEPLOY_PUBKEY:-}" ] && echo "$DEPLOY_PUBKEY" >> "$keys"
sort -u -o "$keys" "$keys"
chown "$APP_USER:$APP_USER" "$keys"
chmod 600 "$keys"

step "Repository"
if [ ! -d "$APP_DIR/.git" ]; then
    as_app "git clone --branch $BRANCH $REPO $APP_DIR"
fi

if [ ! -f "$ENV_FILE" ]; then
    step "backend/config/.env (template)"
    install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR/backend/config"
    cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=$API_PORT
HOST=127.0.0.1
TRUST_PROXY=loopback
APP_URL=https://$DOMAIN
CORS_ORIGINS=https://$DOMAIN$([ "$APEX" = none ] || echo ",https://$APEX")
JWT_ACCESS_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)

SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM="Street Show <no-reply@$MAIL_DOMAIN>"
SMTP_REPLY_TO=kontakt@$MAIL_DOMAIN
ADMIN_NOTIFY_EMAIL=

GOOGLE_PROJECT_ID=
GOOGLE_PRIVATE_KEY_ID=
GOOGLE_PRIVATE_KEY=
GOOGLE_CLIENT_EMAIL=
GOOGLE_CLIENT_ID=
DRIVE_GALLERY_FOLDER_ID=

BACKUP_KEEP=14
OFFSITE_REMOTE=
EOF
    chown "$APP_USER:$APP_USER" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
fi

step "Private data directories"
# database, uploads and backups hold personal data: readable by the app user only
for dir in data uploads backups config; do
    install -d -m 700 -o "$APP_USER" -g "$APP_USER" "$APP_DIR/backend/$dir"
done

step "Firewall, fail2ban, automatic security updates"
ufw allow OpenSSH
ufw allow "Nginx Full"
ufw --force enable
systemctl enable --now fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades

if [ -s "$keys" ]; then
    step "SSH: keys only, no root login"
    cat > /etc/ssh/sshd_config.d/99-streetshow.conf <<EOF
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
EOF
    sshd -t && systemctl reload ssh
else
    echo "!! $keys is empty - SSH hardening skipped so you don't lock yourself out."
fi

step "nginx"
install -m 644 "$APP_DIR/deploy/nginx/streetshow-proxy.conf" /etc/nginx/snippets/
install -m 644 "$APP_DIR/deploy/nginx/streetshow-headers.conf" /etc/nginx/snippets/
install -d -m 700 /etc/ssl/cloudflare
pulls_snippet=/etc/nginx/snippets/streetshow-origin-pulls.conf
if [ "$ORIGIN_PULLS" = 1 ]; then
    # Cloudflare proves itself with a client certificate; anyone else gets 400
    curl -fsS https://developers.cloudflare.com/ssl/static/authenticated_origin_pull_ca.pem         -o /etc/ssl/cloudflare/origin-pull-ca.pem
    grep -q "BEGIN CERTIFICATE" /etc/ssl/cloudflare/origin-pull-ca.pem
    printf 'ssl_client_certificate /etc/ssl/cloudflare/origin-pull-ca.pem;
ssl_verify_client on;
' > "$pulls_snippet"
elif [ ! -f "$pulls_snippet" ]; then
    # kept as it is on later runs, so a re-run without the variable doesn't open the server again
    echo "# Authenticated Origin Pulls off - run setup.sh with ORIGIN_PULLS=1" > "$pulls_snippet"
fi
site_src=$APP_DIR/deploy/nginx/streetshow.conf
if [ "$APEX" = none ]; then
    sed -e '/# apex-start/,/# apex-end/d' -e 's| __APEX__||' "$site_src"
else
    cat "$site_src"
fi | sed -e "s|__DOMAIN__|$DOMAIN|g" -e "s|__APEX__|$APEX|g" \
    -e "s|__APP_DIR__|$APP_DIR|g" -e "s|__API_PORT__|$API_PORT|g" \
    > /etc/nginx/sites-available/streetshow
# nginx (www-data) has to reach frontend/dist inside the user's home.
chmod 711 "$APP_HOME"
install -m 755 "$APP_DIR/deploy/cloudflare-realip.sh" /usr/local/sbin/cloudflare-realip
ln -sf /usr/local/sbin/cloudflare-realip /etc/cron.monthly/cloudflare-realip
install -d -m 700 /etc/ssl/cloudflare

if [ -f /etc/ssl/cloudflare/origin.pem ] && [ -f /etc/ssl/cloudflare/origin.key ]; then
    chmod 600 /etc/ssl/cloudflare/origin.key
    ln -sf /etc/nginx/sites-available/streetshow /etc/nginx/sites-enabled/streetshow
    rm -f /etc/nginx/sites-enabled/default
    systemctl enable nginx >/dev/null 2>&1
    /usr/local/sbin/cloudflare-realip
else
    echo "!! No Cloudflare Origin Certificate in /etc/ssl/cloudflare/ - site not enabled yet."
    echo "   Add origin.pem + origin.key and run this script again."
fi

step "PM2"
env PATH="$PATH" pm2 startup systemd -u "$APP_USER" --hp "$APP_HOME" >/dev/null
as_app "pm2 describe pm2-logrotate >/dev/null 2>&1 || pm2 install pm2-logrotate"

if grep -q '^SMTP_HOST=.\+' "$ENV_FILE"; then
    step "Build and start"
    as_app "cd $APP_DIR/backend && npm ci && npm run build"
    as_app "cd $APP_DIR/frontend && npm ci && npm run build"
    as_app "cd $APP_DIR && (pm2 describe streetshow-api >/dev/null 2>&1 && pm2 restart streetshow-api --update-env || pm2 start deploy/ecosystem.config.js) && pm2 save"
    sleep 3
    curl -fsS "http://127.0.0.1:$API_PORT/api/health" && echo
else
    echo "!! Fill in $ENV_FILE (at least SMTP), then run this script again to build and start the app."
fi

step "Done"
echo "Next: create the admin account:"
echo "  sudo -u $APP_USER -H bash -lc 'cd $APP_DIR/backend && node dist/scripts/create-admin.js <email> <password>'"
