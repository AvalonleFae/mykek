#!/bin/bash
set -e

REPO="https://github.com/AvalonleFae/mykek.git"
BRANCH="whatsapp-integration"
APP_DIR="/var/www/mykek"
ENV_BACKUP="/root/mykek.env.bak"

echo "=== Setting up git-based deployment ==="

# Backup .env from the current upload-based deployment
cp "$APP_DIR/.env" "$ENV_BACKUP"
echo "  ✅ .env backed up to $ENV_BACKUP"

# Stop the app
pm2 stop mykek-server 2>/dev/null || true

# Wipe the directory but keep WhatsApp session (which we worked hard to authenticate)
cp -r "$APP_DIR/server/.wwebjs_auth" /tmp/wwebjs_auth_bak 2>/dev/null || true
cp -r "$APP_DIR/server/uploads" /tmp/uploads_bak 2>/dev/null || true

rm -rf "$APP_DIR"
mkdir -p "$APP_DIR"

# Clone fresh from GitHub
git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
echo "  ✅ Cloned from GitHub (branch: $BRANCH)"

# Restore .env to the app root (deploy.sh copies it to server/ each run)
cp "$ENV_BACKUP" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"
echo "  ✅ .env restored"

# Restore WhatsApp session and uploads
if [ -d /tmp/wwebjs_auth_bak ]; then
  cp -r /tmp/wwebjs_auth_bak "$APP_DIR/server/.wwebjs_auth"
  echo "  ✅ WhatsApp session restored"
fi
if [ -d /tmp/uploads_bak ]; then
  cp -r /tmp/uploads_bak "$APP_DIR/server/uploads"
  echo "  ✅ Uploads restored"
fi

# Restore ecosystem config (not in git since it has server-specific paths)
cat > "$APP_DIR/ecosystem.config.cjs" <<'PM2'
module.exports = {
  apps: [{
    name: 'mykek-server',
    script: 'src/index.js',
    cwd: '/var/www/mykek/server',
    interpreter: 'node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
    },
    error_file: '/var/log/mykek/error.log',
    out_file: '/var/log/mykek/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
}
PM2
echo "  ✅ ecosystem.config.cjs written"

# Also install Node.js for the client (needed for building on server)
apt-get install -y nodejs 2>&1 | grep -E "(installed|already)" || true

echo ""
echo "=== Git setup done. Running deploy... ==="
bash "$APP_DIR/deploy/deploy.sh" "$BRANCH"
