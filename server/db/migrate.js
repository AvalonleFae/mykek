import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mykek',
    multipleStatements: true,
  });

  try {
    console.log('🔗 Connected to MariaDB database: mykek');

    // Ensure migration tracking table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        appliedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Get already-applied migrations
    const [appliedRows] = await connection.query('SELECT filename FROM _migrations');
    const applied = new Set(appliedRows.map(r => r.filename));

    // Run pending migration files
    const migrationsDir = join(__dirname, 'migrations');
    const migrationFiles = (await readdir(migrationsDir))
      .filter(f => f.endsWith('.sql'))
      .sort();

    const pending = migrationFiles.filter(f => !applied.has(f));

    if (pending.length === 0) {
      console.log('\n✅ No new migrations to run.\n');
    } else {
      console.log(`\n📦 Running ${pending.length} new migration(s)...\n`);
      for (const file of pending) {
        const sql = await readFile(join(migrationsDir, file), 'utf-8');
        await connection.query(sql);
        await connection.query('INSERT INTO _migrations (filename) VALUES (?)', [file]);
        console.log(`  ✅ ${file}`);
      }
    }

    // Run seed files (seeds must be idempotent — use INSERT IGNORE or ON DUPLICATE KEY)
    const seedsDir = join(__dirname, 'seeds');
    const seedFiles = (await readdir(seedsDir))
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (seedFiles.length > 0) {
      console.log(`\n🌱 Running ${seedFiles.length} seed(s)...\n`);
      for (const file of seedFiles) {
        const sql = await readFile(join(seedsDir, file), 'utf-8');
        await connection.query(sql);
        console.log(`  ✅ ${file}`);
      }
    }

    console.log('\n🎉 Database up to date!\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigrations();
