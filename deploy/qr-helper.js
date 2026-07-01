/**
 * Temporary QR helper — run once to display WhatsApp QR in browser.
 * Delete after scanning.
 */
import { createServer } from 'http';
import { getQrDataUrl, getStatus, initialize } from '/var/www/mykek/server/src/services/whatsappService.js';
import dotenv from 'dotenv';
dotenv.config({ path: '/var/www/mykek/.env' });

const PORT = 9999;

await initialize().catch(() => {});

const server = createServer(async (req, res) => {
  const status = getStatus();
  const qr = await getQrDataUrl();

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!DOCTYPE html>
<html>
<head><title>WhatsApp QR</title>
<meta http-equiv="refresh" content="5">
<style>body{font-family:sans-serif;text-align:center;padding:40px}img{max-width:300px}</style>
</head>
<body>
<h2>WhatsApp Status: <b>${status.status}</b></h2>
${qr ? `<p>Scan this QR with your WhatsApp:</p><img src="${qr}">` : '<p>No QR available yet. Refreshing in 5s...</p>'}
<p><small>Auto-refreshes every 5 seconds</small></p>
</body>
</html>`);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`QR server running at http://0.0.0.0:${PORT}`);
});
