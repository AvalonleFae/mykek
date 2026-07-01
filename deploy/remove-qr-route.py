#!/usr/bin/env python3
path = '/var/www/mykek/server/src/index.js'

with open(path, 'r') as f:
    content = f.read()

# Remove the temp QR block we injected
import re
content = re.sub(
    r'\n// --- TEMP QR route \(remove after scanning\) ---\napp\.get\(\'/api/temp-qr\'.*?\}\);\n\n',
    '\n',
    content,
    flags=re.DOTALL
)

with open(path, 'w') as f:
    f.write(content)

print('Removed temp QR route.')
