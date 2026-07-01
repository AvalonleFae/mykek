#!/usr/bin/env python3
"""
One-time script: marks all already-applied migrations as done
in the _migrations tracking table, so future deploys only run new files.
"""
import subprocess, sys

# All migrations already applied in the first deploy
already_applied = [
    "001_pelanggan.sql",
    "002_peniaga.sql",
    "003_kategori_spesifikasi_kek.sql",
    "004_pilihan_spesifikasi_kek.sql",
    "005_tempahan.sql",
    "006_butiran_tempahan.sql",
    "007_imej_tempahan.sql",
    "008_tarikh_tutup.sql",
    "009_pelanggan_telefon_disahkan.sql",
    "010_imej_tempahan_resit.sql",
]

sql_lines = [
    "CREATE TABLE IF NOT EXISTS _migrations (id INT AUTO_INCREMENT PRIMARY KEY, filename VARCHAR(255) NOT NULL UNIQUE, appliedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"
]
for f in already_applied:
    sql_lines.append(f"INSERT IGNORE INTO _migrations (filename) VALUES ('{f}');")

sql = "\n".join(sql_lines)

result = subprocess.run(
    ["mariadb", "-u", "mykek", "-pDHOxFJoRLgP0KAuTpvm4JWSqiIL1Xmo4", "mykek", "-e", sql],
    capture_output=True, text=True
)
if result.returncode != 0:
    print("Error:", result.stderr)
    sys.exit(1)

print("✅ Migration tracking bootstrapped. All 10 migrations marked as applied.")
