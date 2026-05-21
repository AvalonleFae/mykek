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

    // Run migration files
    const migrationsDir = join(__dirname, 'migrations');
    const migrationFiles = (await readdir(migrationsDir))
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`\n📦 Running ${migrationFiles.length} migration(s)...\n`);

    for (const file of migrationFiles) {
      const sql = await readFile(join(migrationsDir, file), 'utf-8');
      await connection.query(sql);
      console.log(`  ✅ ${file}`);
    }

    // Run seed files
    const seedsDir = join(__dirname, 'seeds');
    const seedFiles = (await readdir(seedsDir))
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`\n🌱 Running ${seedFiles.length} seed(s)...\n`);

    for (const file of seedFiles) {
      const sql = await readFile(join(seedsDir, file), 'utf-8');
      await connection.query(sql);
      console.log(`  ✅ ${file}`);
    }

    console.log('\n🎉 All migrations and seeds completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigrations();
