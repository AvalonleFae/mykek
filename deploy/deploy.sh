#!/bin/bash
# Run this on the SERVER after code is uploaded
set -e

APP_DIR=/var/www/mykek

echo "=== MyKek Deploy ==="

# Install server dependencies
echo "[1/4] Installing server dependencies..."
cd $APP_DIR/server
npm ci --omit=dev
echo "  ✅ Server deps installed"

# Run DB migrations
echo "[2/4] Running database migrations..."
cp $APP_DIR/.env $APP_DIR/server/.env
node db/migrate.js
echo "  ✅ Migrations done"

# Start/restart with PM2
echo "[3/4] Starting app with PM2..."
cd $APP_DIR
pm2 delete mykek-server 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
echo "  ✅ PM2 started"

# Setup PM2 startup (idempotent)
echo "[4/4] Enabling PM2 on boot..."
pm2 startup systemd -u root --hp /root | tail -1 | bash 2>/dev/null || true
pm2 save
echo "  ✅ PM2 startup enabled"

echo ""
echo "=== Deploy complete! ==="
echo "Check status: pm2 status"
echo "Check logs:   pm2 logs mykek-server"
