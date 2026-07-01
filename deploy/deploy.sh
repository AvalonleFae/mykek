#!/bin/bash
# ============================================================
# MyKek Production Deploy Script
# Usage: bash deploy.sh [branch]
# Default branch: main
#
# Secrets (.env) are managed separately on the server at
# /var/www/mykek/.env and are never committed to git.
# ============================================================
set -e

REPO="https://github.com/AvalonleFae/mykek.git"
APP_DIR="/var/www/mykek"
BRANCH="${1:-main}"

echo "=== MyKek Deploy (branch: $BRANCH) ==="

# ── 1. Pull latest code ────────────────────────────────────
echo "[1/5] Pulling latest code from GitHub..."
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
fi
echo "  ✅ Code updated to $(git -C $APP_DIR rev-parse --short HEAD)"

# ── 2. Restore .env (never in git) ────────────────────────
echo "[2/5] Applying .env..."
# The canonical .env lives at /var/www/mykek/.env
# Copy it into the server directory for Node to load
cp "$APP_DIR/.env" "$APP_DIR/server/.env"
echo "  ✅ .env applied"

# ── 3. Install server deps & run migrations ───────────────
echo "[3/5] Installing server dependencies..."
npm ci --prefix "$APP_DIR/server" --omit=dev 2>&1 | grep -v "^npm warn"
echo "  ✅ Server deps installed"

echo "  Running database migrations..."
node "$APP_DIR/server/db/migrate.js"
echo "  ✅ Migrations done"

# ── 4. Build frontend ─────────────────────────────────────
echo "[4/5] Building frontend..."
# Use npm install (not ci) to handle lockfile drift across Node versions.
# Dev deps are needed here because vite/tailwind are devDependencies.
npm install --prefix "$APP_DIR/client" 2>&1 | grep -v "^npm warn"
npm run build --prefix "$APP_DIR/client"
# Caddy serves from /var/www/mykek/public
rm -rf "$APP_DIR/public"
cp -r "$APP_DIR/client/dist" "$APP_DIR/public"
echo "  ✅ Frontend built and copied to $APP_DIR/public"

# ── 5. Restart app ────────────────────────────────────────
echo "[5/5] Restarting app with PM2..."
if pm2 show mykek-server > /dev/null 2>&1; then
  pm2 restart mykek-server --update-env
else
  pm2 start "$APP_DIR/ecosystem.config.cjs"
fi
pm2 save
echo "  ✅ App restarted"

echo ""
echo "=== Deploy complete! ==="
echo "  Commit : $(git -C $APP_DIR rev-parse --short HEAD)"
echo "  Status : $(curl -s http://localhost:3001/api/health | grep -o 'ok')"
echo ""
echo "  Logs   : pm2 logs mykek-server"
echo "  Status : pm2 status"
