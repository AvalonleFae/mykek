#!/bin/bash
set -e

DB_PASSWORD="DHOxFJoRLgP0KAuTpvm4JWSqiIL1Xmo4"

# Create database and user
mariadb <<SQL
CREATE DATABASE IF NOT EXISTS mykek CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'mykek'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON mykek.* TO 'mykek'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "Database setup complete."
