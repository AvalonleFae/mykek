import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index.js';
import pool from '../../src/config/db.js';

/**
 * Helper to create an authenticated merchant session agent.
 * Logs in as the default merchant and returns the supertest agent with session cookie.
 */
async function createMerchantAgent() {
  const agent = request.agent(app);
  await agent
    .post('/api/auth/peniaga/log-masuk')
    .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'admin123' });
  return agent;
}

describe('Cake Spec Category CRUD - /api/peniaga/kategori-spesifikasi', () => {
  let merchantAgent;

  beforeAll(async () => {
    // Ensure tables exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS KategoriSpesifikasiKek (
        kategoriId INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        penerangan VARCHAR(500),
        aktif BOOLEAN NOT NULL DEFAULT TRUE,
        tarikhCipta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS PilihanSpesifikasiKek (
        pilihanId INT AUTO_INCREMENT PRIMARY KEY,
        kategoriId INT NOT NULL,
        nama VARCHAR(100) NOT NULL,
        penerangan VARCHAR(500),
        hargaTambahan DECIMAL(8,2) NOT NULL DEFAULT 0.00,
        aktif BOOLEAN NOT NULL DEFAULT TRUE,
        tarikhCipta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_pilihan_kategori FOREIGN KEY (kategoriId) REFERENCES KategoriSpesifikasiKek(kategoriId) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    merchantAgent = await createMerchantAgent();
  });

  beforeEach(async () => {
    // Clean up test data
    await pool.execute('DELETE FROM PilihanSpesifikasiKek');
    await pool.execute('DELETE FROM KategoriSpesifikasiKek');
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM PilihanSpesifikasiKek');
    await pool.execute('DELETE FROM KategoriSpesifikasiKek');
    await pool.end();
  });

  // --- Authentication ---

  describe('Authentication & Authorization', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const res = await request(app).get('/api/peniaga/kategori-spesifikasi');
      expect(res.status).toBe(401);
      expect(res.body.ralat).toBe(true);
    });

    it('should return 403 for customer role accessing merchant endpoint', async () => {
      // Register and login as customer
      const customerAgent = request.agent(app);
      await customerAgent
        .post('/api/auth/pelanggan/daftar')
        .send({ noTelefon: '0191234567', nama: 'Pelanggan Test' });
      await customerAgent
        .post('/api/auth/pelanggan/log-masuk')
        .send({ noTelefon: '0191234567' });

      const res = await customerAgent.get('/api/peniaga/kategori-spesifikasi');
      expect(res.status).toBe(403);
      expect(res.body.ralat).toBe(true);

      // Cleanup
      await pool.execute('DELETE FROM Pelanggan WHERE noTelefon = ?', ['0191234567']);
    });
  });

  // --- GET /api/peniaga/kategori-spesifikasi ---

  describe('GET / - List all categories', () => {
    it('should return empty array when no categories exist', async () => {
      const res = await merchantAgent.get('/api/peniaga/kategori-spesifikasi');
      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.data).toEqual([]);
    });

    it('should return all categories including inactive ones', async () => {
      // Insert active and inactive categories
      await pool.execute(
        'INSERT INTO KategoriSpesifikasiKek (nama, penerangan, aktif) VALUES (?, ?, ?)',
        ['Saiz', 'Saiz kek', true]
      );
      await pool.execute(
        'INSERT INTO KategoriSpesifikasiKek (nama, penerangan, aktif) VALUES (?, ?, ?)',
        ['Warna', 'Warna kek', false]
      );

      const res = await merchantAgent.get('/api/peniaga/kategori-spesifikasi');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should return categories sorted by tarikhCipta DESC', async () => {
      await pool.execute(
        "INSERT INTO KategoriSpesifikasiKek (nama, penerangan, tarikhCipta) VALUES (?, ?, '2024-01-01 00:00:00')",
        ['Pertama', 'Kategori pertama']
      );
      await pool.execute(
        "INSERT INTO KategoriSpesifikasiKek (nama, penerangan, tarikhCipta) VALUES (?, ?, '2024-06-01 00:00:00')",
        ['Kedua', 'Kategori kedua']
      );

      const res = await merchantAgent.get('/api/peniaga/kategori-spesifikasi');
      expect(res.status).toBe(200);
      expect(res.body.data[0].nama).toBe('Kedua');
      expect(res.body.data[1].nama).toBe('Pertama');
    });
  });

  // --- POST /api/peniaga/kategori-spesifikasi ---

  describe('POST / - Create category', () => {
    it('should create a category with valid name and description', async () => {
      const res = await merchantAgent
        .post('/api/peniaga/kategori-spesifikasi')
        .send({ nama: 'Saiz Kek', penerangan: 'Pilih saiz kek anda' });

      expect(res.status).toBe(201);
      expect(res.body.ralat).toBe(false);
      expect(res.body.mesej).toBe('Kategori berjaya dicipta.');
      expect(res.body.kategoriId).toBeDefined();
    });

    it('should create a category with name only (no description)', async () => {
      const res = await merchantAgent
        .post('/api/peniaga/kategori-spesifikasi')
        .send({ nama: 'Perisa' });

      expect(res.status).toBe(201);
      expect(res.body.ralat).toBe(false);
      expect(res.body.kategoriId).toBeDefined();
    });

    it('should reject empty name', async () => {
      const res = await merchantAgent
        .post('/api/peniaga/kategori-spesifikasi')
        .send({ nama: '', penerangan: 'Test' });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('nama');
    });

    it('should reject whitespace-only name', async () => {
      const res = await merchantAgent
        .post('/api/peniaga/kategori-spesifikasi')
        .send({ nama: '   ', penerangan: 'Test' });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('nama');
    });

    it('should reject name exceeding 100 characters', async () => {
      const longName = 'A'.repeat(101);
      const res = await merchantAgent
        .post('/api/peniaga/kategori-spesifikasi')
        .send({ nama: longName });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('nama');
    });

    it('should accept name with exactly 100 characters', async () => {
      const name100 = 'A'.repeat(100);
      const res = await merchantAgent
        .post('/api/peniaga/kategori-spesifikasi')
        .send({ nama: name100 });

      expect(res.status).toBe(201);
      expect(res.body.ralat).toBe(false);
    });

    it('should reject description exceeding 500 characters', async () => {
      const longDesc = 'B'.repeat(501);
      const res = await merchantAgent
        .post('/api/peniaga/kategori-spesifikasi')
        .send({ nama: 'Valid Name', penerangan: longDesc });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('penerangan');
    });

    it('should reject duplicate name among active categories', async () => {
      await merchantAgent
        .post('/api/peniaga/kategori-spesifikasi')
        .send({ nama: 'Saiz' });

      const res = await merchantAgent
        .post('/api/peniaga/kategori-spesifikasi')
        .send({ nama: 'Saiz' });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('nama');
      expect(res.body.kod).toBe('PENDAFTARAN_DUPLIKAT');
    });

    it('should allow same name if existing category is inactive', async () => {
      // Create and soft-delete a category
      const createRes = await merchantAgent
        .post('/api/peniaga/kategori-spesifikasi')
        .send({ nama: 'Tema' });
      const kategoriId = createRes.body.kategoriId;

      await merchantAgent.delete(`/api/peniaga/kategori-spesifikasi/${kategoriId}`);

      // Create new category with same name
      const res = await merchantAgent
        .post('/api/peniaga/kategori-spesifikasi')
        .send({ nama: 'Tema' });

      expect(res.status).toBe(201);
      expect(res.body.ralat).toBe(false);
    });
  });

  // --- PUT /api/peniaga/kategori-spesifikasi/:id ---

  describe('PUT /:id - Update category', () => {
    it('should update category name and description', async () => {
      const createRes = await merchantAgent
        .post('/api/peniaga/kategori-spesifikasi')
        .send({ nama: 'Saiz', penerangan: 'Saiz asal' });
      const kategoriId = createRes.body.kategoriId;

      const res = await merchantAgent
        .put(`/api/peniaga/kategori-spesifikasi/${kategoriId}`)
        .send({ nama: 'Saiz Kek', penerangan: 'Saiz kek yang dikemaskini' });

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.mesej).toBe('Kategori berjaya dikemaskini.');
    });

    it('should return 404 for non-existent category', async () => {
      const res = await merchantAgent
        .put('/api/peniaga/kategori-spesifikasi/99999')
        .send({ nama: 'Test' });

      expect(res.status).toBe(404);
      expect(res.body.ralat).toBe(true);
      expect(res.body.kod).toBe('TIDAK_DITEMUI');
    });

    it('should reject invalid ID format', async () => {
      const res = await merchantAgent
        .put('/api/peniaga/kategori-spesifikasi/abc')
        .send({ nama: 'Test' });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
    });

    it('should reject duplicate name when updating', async () => {
      await merchantAgent
        .post('/api/peniaga/kategori-spesifikasi')
        .send({ nama: 'Saiz' });

      const createRes = await merchantAgent
        .post('/api/peniaga/kategori-spesifikasi')
        .send({ nama: 'Perisa' });
      const kategoriId = createRes.body.kategoriId;

      const res = await merchantAgent
        .put(`/api/peniaga/kategori-spesifikasi/${kategoriId}`)
        .send({ nama: 'Saiz' });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.kod).toBe('PENDAFTARAN_DUPLIKAT');
    });

    it('should allow updating category to keep same name', async () => {
      const createRes = await merchantAgent
        .post('/api/peniaga/kategori-spesifikasi')
        .send({ nama: 'Saiz', penerangan: 'Asal' });
      const kategoriId = createRes.body.kategoriId;

      const res = await merchantAgent
        .put(`/api/peniaga/kategori-spesifikasi/${kategoriId}`)
        .send({ nama: 'Saiz', penerangan: 'Dikemaskini' });

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
    });

    it('should reject empty name on update', async () => {
      const createRes = await merchantAgent
        .post('/api/peniaga/kategori-spesifikasi')
        .send({ nama: 'Saiz' });
      const kategoriId = createRes.body.kategoriId;

      const res = await merchantAgent
        .put(`/api/peniaga/kategori-spesifikasi/${kategoriId}`)
        .send({ nama: '' });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('nama');
    });
  });

  // --- DELETE /api/peniaga/kategori-spesifikasi/:id ---

  describe('DELETE /:id - Soft-delete category', () => {
    it('should soft-delete a category (set aktif=false)', async () => {
      const createRes = await merchantAgent
        .post('/api/peniaga/kategori-spesifikasi')
        .send({ nama: 'Saiz' });
      const kategoriId = createRes.body.kategoriId;

      const res = await merchantAgent
        .delete(`/api/peniaga/kategori-spesifikasi/${kategoriId}`);

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.mesej).toBe('Kategori berjaya dipadam.');

      // Verify it's soft-deleted (still in DB but aktif=false)
      const [rows] = await pool.execute(
        'SELECT aktif FROM KategoriSpesifikasiKek WHERE kategoriId = ?',
        [kategoriId]
      );
      expect(rows[0].aktif).toBe(0);
    });

    it('should soft-delete all associated options when category is deleted', async () => {
      // Create category
      const createRes = await merchantAgent
        .post('/api/peniaga/kategori-spesifikasi')
        .send({ nama: 'Perisa' });
      const kategoriId = createRes.body.kategoriId;

      // Add options to the category
      await pool.execute(
        'INSERT INTO PilihanSpesifikasiKek (kategoriId, nama, hargaTambahan) VALUES (?, ?, ?)',
        [kategoriId, 'Coklat', 5.00]
      );
      await pool.execute(
        'INSERT INTO PilihanSpesifikasiKek (kategoriId, nama, hargaTambahan) VALUES (?, ?, ?)',
        [kategoriId, 'Vanila', 3.00]
      );

      // Delete category
      await merchantAgent.delete(`/api/peniaga/kategori-spesifikasi/${kategoriId}`);

      // Verify options are also soft-deleted
      const [options] = await pool.execute(
        'SELECT aktif FROM PilihanSpesifikasiKek WHERE kategoriId = ?',
        [kategoriId]
      );
      expect(options).toHaveLength(2);
      expect(options[0].aktif).toBe(0);
      expect(options[1].aktif).toBe(0);
    });

    it('should return 404 for non-existent category', async () => {
      const res = await merchantAgent
        .delete('/api/peniaga/kategori-spesifikasi/99999');

      expect(res.status).toBe(404);
      expect(res.body.ralat).toBe(true);
      expect(res.body.kod).toBe('TIDAK_DITEMUI');
    });

    it('should reject invalid ID format', async () => {
      const res = await merchantAgent
        .delete('/api/peniaga/kategori-spesifikasi/abc');

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
    });
  });
});
