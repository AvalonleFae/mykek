#!/bin/bash
set -e

echo "=== MyKek Production Setup ==="

# ── 1. Database ────────────────────────────────────────────────────────────────
echo "[1/6] Setting up MariaDB..."
DB_PASSWORD="DHOxFJoRLgP0KAuTpvm4JWSqiIL1Xmo4"

mariadb <<SQL
CREATE DATABASE IF NOT EXISTS mykek CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'mykek'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON mykek.* TO 'mykek'@'localhost';
FLUSH PRIVILEGES;
SQL
echo "  ✅ Database ready"

# ── 2. App directory ───────────────────────────────────────────────────────────
echo "[2/6] Creating app directory..."
mkdir -p /var/www/mykek
echo "  ✅ /var/www/mykek ready"

# ── 3. Production .env ────────────────────────────────────────────────────────
echo "[3/6] Writing production .env..."
cat > /var/www/mykek/.env <<'ENV'
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=mykek
DB_PASSWORD=DHOxFJoRLgP0KAuTpvm4JWSqiIL1Xmo4
DB_NAME=mykek

# Server
PORT=3001
NODE_ENV=production
CLIENT_ORIGIN=https://avalonlefae.dev

# Session
SESSION_SECRET=24ab561ec8d1a3fbdc8f521be2c8dd238d6df2a25caf2d7dbc81f7bd9be034747a1d867819a606fca76d4e50b0472b9b58d0488188c6e07fb063180e9b310fcb

# Google Gemini
GEMINI_API_KEY=AIzaSyDF3uOcI4tDADX98AbSrRQTGTMk3d2NHzw
GEMINI_CHATBOT_API_KEY=AIzaSyBaDPCrXszu23Ngc6Wj8tSd7tMfSQKXV_c

# PixAI
PIXAI_API_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJsZ2EiOjE3NzkzOTQ5NTQsImV4cCI6MTc3OTk5OTc1NCwiaWF0IjoxNzc5Mzk0OTU0LCJpc3MiOiJwaXhhaSIsInN1YiI6IjIwMTQyOTU3Nzk0ODUxOTU2NTIiLCJqdGkiOiIyMDE0Mjk1Nzc5NTU2NDk4ODI5In0.3bGjA4tZzMAegAcZoUGxa7S2LQIivDcSr6GICuqCu6Qu2FEzKZYvNmmZzkOdh41wl7yLtTlxBdPhukuVbnI8Cg
PIXAI_BROWSER_ID=ac67bed11c30bb709628479a199837f2

# WhatsApp
WHATSAPP_ENABLED=true
WHATSAPP_VERIFY_PHONE=true
WHATSAPP_SESSION_PATH=.wwebjs_auth
WHATSAPP_PUPPETEER_ARGS=--no-sandbox
WHATSAPP_CHROME_PATH=/usr/bin/chromium-browser
ENV
chmod 600 /var/www/mykek/.env
echo "  ✅ .env written"

# ── 4. Caddy configuration ────────────────────────────────────────────────────
echo "[4/6] Writing Caddyfile..."
cat > /etc/caddy/Caddyfile <<'CADDY'
avalonlefae.dev, www.avalonlefae.dev {
    # Proxy API and uploads to Node.js
    handle /api/* {
        reverse_proxy localhost:3001
    }
    handle /uploads/* {
        reverse_proxy localhost:3001
    }

    # Serve React frontend static files
    handle {
        root * /var/www/mykek/public
        try_files {path} /index.html
        file_server
    }

    # Security headers
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }

    encode gzip
}
CADDY
echo "  ✅ Caddyfile written"

# ── 5. PM2 ecosystem file ─────────────────────────────────────────────────────
echo "[5/6] Writing PM2 ecosystem config..."
cat > /var/www/mykek/ecosystem.config.cjs <<'PM2'
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
mkdir -p /var/log/mykek
echo "  ✅ PM2 config written"

# ── 6. Enable and restart Caddy ───────────────────────────────────────────────
echo "[6/6] Restarting Caddy..."
systemctl enable caddy
systemctl restart caddy
echo "  ✅ Caddy restarted"

echo ""
echo "=== Setup complete! Now upload and deploy the app. ==="
