#!/usr/bin/env python3
import re

path = '/var/www/mykek/server/src/index.js'

with open(path, 'r') as f:
    content = f.read()

qr_route = """
// --- TEMP QR route (remove after scanning) ---
app.get('/api/temp-qr', async (req, res) => {
  const { getQrDataUrl, getStatus } = await import('./services/whatsappService.js');
  const s = getStatus();
  const qr = await getQrDataUrl();
  const body = qr
    ? `<img src="${qr}" style="width:280px">`
    : '<p>Waiting for QR... (auto-refreshes)</p>';
  res.send(`<html><head><meta http-equiv="refresh" content="5"><style>body{font-family:sans-serif;text-align:center;padding:40px}h2{margin-bottom:20px}</style></head><body><h2>WhatsApp Status: ${s.status}</h2>${body}</body></html>`);
});

"""

# Insert before the health check route
target = '// --- Health check route ---'
content = content.replace(target, qr_route + target)

with open(path, 'w') as f:
    f.write(content)

print('Injected QR route successfully.')
