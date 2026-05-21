import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index.js';
import pool from '../../src/config/db.js';

/**
 * Helper to create an authenticated merchant session agent.
 */
async function createMerchantAgent() {
  const agent = request.agent(app);

  // Ensure merchant exists
  const [merchants] = await pool.execute(
    'SELECT peniagaId FROM Peniaga WHERE namaPenggunaAdmin = ?',
    ['admin']
  );

  if (merchants.length === 0) {
    const bcrypt = await import('bcrypt');
    const hashed = await bcrypt.hash('admin123', 10);
    await pool.execute(
      'INSERT INTO Peniaga (namaPenggunaAdmin, kataLaluan, namaKedai) VALUES (?, ?, ?)',
      ['admin', hashed, 'Zuraida Patisserie']
    );
  }

  // Login as merchant
  await agent
    .post('/api/auth/peniaga/log-masuk')
    .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'admin123' });

  return agent;
}

describe('Cake Spec Option CRUD - /api/peniaga/pilihan-spesifikasi', () => {
  let agent;
  let testKategoriId;

  beforeAll(async () => {
    // Ensure tables exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS Peniaga (
        peniagaId INT AUTO_INCREMENT PRIMARY KEY,
        namaPenggunaAdmin VARCHAR(50) NOT NULL UNIQUE,
        kataLaluan VARCHAR(255) NOT NULL,
        namaKedai VARCHAR(100),
        noTelefonKedai VARCHAR(15),
        peneranganKedai VARCHAR(500),
        tarikhKemaskini DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

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

    agent = await createMerchantAgent();
  });

  beforeEach(async () => {
    // Clean up test options and categories
    await pool.execute('DELETE FROM PilihanSpesifikasiKek');
    await pool.execute('DELETE FROM KategoriSpesifikasiKek');

    // Create a test category for option tests
    const [result] = await pool.execute(
      'INSERT INTO KategoriSpesifikasiKek (nama, penerangan) VALUES (?, ?)',
      ['Saiz', 'Saiz kek']
    );
    testKategoriId = result.insertId;
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM PilihanSpesifikasiKek');
    await pool.execute('DELETE FROM KategoriSpesifikasiKek');
    await pool.end();
  });

  // ─── GET /api/peniaga/pilihan-spesifikasi/:kategoriId ──────────────────────

  describe('GET /api/peniaga/pilihan-spesifikasi/:kategoriId', () => {
    it('should return empty list for category with no options', async () => {
      const res = await agent.get(`/api/peniaga/pilihan-spesifikasi/${testKategoriId}`);

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.data).toEqual([]);
    });

    it('should return options for a category', async () => {
      // Insert test options
      await pool.execute(
        'INSERT INTO PilihanSpesifikasiKek (kategoriId, nama, hargaTambahan) VALUES (?, ?, ?)',
        [testKategoriId, '6 inci', 50.00]
      );
      await pool.execute(
        'INSERT INTO PilihanSpesifikasiKek (kategoriId, nama, hargaTambahan) VALUES (?, ?, ?)',
        [testKategoriId, '8 inci', 80.00]
      );

      const res = await agent.get(`/api/peniaga/pilihan-spesifikasi/${testKategoriId}`);

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('pilihanId');
      expect(res.body.data[0]).toHaveProperty('nama');
      expect(res.body.data[0]).toHaveProperty('hargaTambahan');
    });

    it('should return 404 for non-existent category', async () => {
      const res = await agent.get('/api/peniaga/pilihan-spesifikasi/99999');

      expect(res.status).toBe(404);
      expect(res.body.ralat).toBe(true);
    });

    it('should return 400 for invalid category ID', async () => {
      const res = await agent.get('/api/peniaga/pilihan-spesifikasi/abc');

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await request(app).get(`/api/peniaga/pilihan-spesifikasi/${testKategoriId}`);

      expect(res.status).toBe(401);
    });
  });

  // ─── POST /api/peniaga/pilihan-spesifikasi ─────────────────────────────────

  describe('POST /api/peniaga/pilihan-spesifikasi', () => {
    it('should create an option with valid data', async () => {
      const res = await agent
        .post('/api/peniaga/pilihan-spesifikasi')
        .send({
          kategoriId: testKategoriId,
          nama: '6 inci',
          penerangan: 'Kek saiz 6 inci',
          hargaTambahan: 50.00,
        });

      expect(res.status).toBe(201);
      expect(res.body.ralat).toBe(false);
      expect(res.body.mesej).toBe('Pilihan berjaya dicipta.');
      expect(res.body.pilihanId).toBeDefined();
    });

    it('should create an option with zero price', async () => {
      const res = await agent
        .post('/api/peniaga/pilihan-spesifikasi')
        .send({
          kategoriId: testKategoriId,
          nama: 'Standard',
          hargaTambahan: 0,
        });

      expect(res.status).toBe(201);
      expect(res.body.ralat).toBe(false);
    });

    it('should create an option with max price (9999.99)', async () => {
      const res = await agent
        .post('/api/peniaga/pilihan-spesifikasi')
        .send({
          kategoriId: testKategoriId,
          nama: 'Premium',
          hargaTambahan: 9999.99,
        });

      expect(res.status).toBe(201);
      expect(res.body.ralat).toBe(false);
    });

    it('should reject empty name', async () => {
      const res = await agent
        .post('/api/peniaga/pilihan-spesifikasi')
        .send({
          kategoriId: testKategoriId,
          nama: '',
          hargaTambahan: 50.00,
        });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('nama');
      expect(res.body.kod).toBe('MEDAN_KOSONG');
    });

    it('should reject name exceeding 100 characters', async () => {
      const res = await agent
        .post('/api/peniaga/pilihan-spesifikasi')
        .send({
          kategoriId: testKategoriId,
          nama: 'A'.repeat(101),
          hargaTambahan: 50.00,
        });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('nama');
      expect(res.body.kod).toBe('PANJANG_TIDAK_SAH');
    });

    it('should reject description exceeding 500 characters', async () => {
      const res = await agent
        .post('/api/peniaga/pilihan-spesifikasi')
        .send({
          kategoriId: testKategoriId,
          nama: '6 inci',
          penerangan: 'A'.repeat(501),
          hargaTambahan: 50.00,
        });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('penerangan');
      expect(res.body.kod).toBe('PANJANG_TIDAK_SAH');
    });

    it('should reject price exceeding 9999.99', async () => {
      const res = await agent
        .post('/api/peniaga/pilihan-spesifikasi')
        .send({
          kategoriId: testKategoriId,
          nama: '6 inci',
          hargaTambahan: 10000.00,
        });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('hargaTambahan');
      expect(res.body.kod).toBe('HARGA_TIDAK_SAH');
    });

    it('should reject negative price', async () => {
      const res = await agent
        .post('/api/peniaga/pilihan-spesifikasi')
        .send({
          kategoriId: testKategoriId,
          nama: '6 inci',
          hargaTambahan: -1,
        });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('hargaTambahan');
      expect(res.body.kod).toBe('HARGA_TIDAK_SAH');
    });

    it('should reject duplicate name within same category', async () => {
      // Create first option
      await agent
        .post('/api/peniaga/pilihan-spesifikasi')
        .send({
          kategoriId: testKategoriId,
          nama: '6 inci',
          hargaTambahan: 50.00,
        });

      // Attempt duplicate
      const res = await agent
        .post('/api/peniaga/pilihan-spesifikasi')
        .send({
          kategoriId: testKategoriId,
          nama: '6 inci',
          hargaTambahan: 60.00,
        });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('nama');
      expect(res.body.kod).toBe('PENDAFTARAN_DUPLIKAT');
    });

    it('should allow same name in different categories', async () => {
      // Create another category
      const [catResult] = await pool.execute(
        'INSERT INTO KategoriSpesifikasiKek (nama) VALUES (?)',
        ['Perisa']
      );
      const otherKategoriId = catResult.insertId;

      // Create option in first category
      await agent
        .post('/api/peniaga/pilihan-spesifikasi')
        .send({
          kategoriId: testKategoriId,
          nama: 'Standard',
          hargaTambahan: 0,
        });

      // Create option with same name in different category
      const res = await agent
        .post('/api/peniaga/pilihan-spesifikasi')
        .send({
          kategoriId: otherKategoriId,
          nama: 'Standard',
          hargaTambahan: 0,
        });

      expect(res.status).toBe(201);
      expect(res.body.ralat).toBe(false);
    });

    it('should reject non-existent category', async () => {
      const res = await agent
        .post('/api/peniaga/pilihan-spesifikasi')
        .send({
          kategoriId: 99999,
          nama: '6 inci',
          hargaTambahan: 50.00,
        });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.kod).toBe('TIDAK_DITEMUI');
    });

    it('should reject missing hargaTambahan', async () => {
      const res = await agent
        .post('/api/peniaga/pilihan-spesifikasi')
        .send({
          kategoriId: testKategoriId,
          nama: '6 inci',
        });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('hargaTambahan');
    });
  });

  // ─── PUT /api/peniaga/pilihan-spesifikasi/:id ──────────────────────────────

  describe('PUT /api/peniaga/pilihan-spesifikasi/:id', () => {
    let testPilihanId;

    beforeEach(async () => {
      const [result] = await pool.execute(
        'INSERT INTO PilihanSpesifikasiKek (kategoriId, nama, hargaTambahan) VALUES (?, ?, ?)',
        [testKategoriId, '6 inci', 50.00]
      );
      testPilihanId = result.insertId;
    });

    it('should update an option with valid data', async () => {
      const res = await agent
        .put(`/api/peniaga/pilihan-spesifikasi/${testPilihanId}`)
        .send({
          nama: '8 inci',
          penerangan: 'Kek saiz 8 inci',
          hargaTambahan: 80.00,
        });

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.mesej).toBe('Pilihan berjaya dikemaskini.');
    });

    it('should reject update with empty name', async () => {
      const res = await agent
        .put(`/api/peniaga/pilihan-spesifikasi/${testPilihanId}`)
        .send({
          nama: '',
          hargaTambahan: 80.00,
        });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('nama');
    });

    it('should reject update with price exceeding max', async () => {
      const res = await agent
        .put(`/api/peniaga/pilihan-spesifikasi/${testPilihanId}`)
        .send({
          nama: '6 inci',
          hargaTambahan: 10000.00,
        });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('hargaTambahan');
      expect(res.body.kod).toBe('HARGA_TIDAK_SAH');
    });

    it('should reject update with duplicate name in same category', async () => {
      // Create another option
      await pool.execute(
        'INSERT INTO PilihanSpesifikasiKek (kategoriId, nama, hargaTambahan) VALUES (?, ?, ?)',
        [testKategoriId, '8 inci', 80.00]
      );

      // Try to rename first option to same name as second
      const res = await agent
        .put(`/api/peniaga/pilihan-spesifikasi/${testPilihanId}`)
        .send({
          nama: '8 inci',
          hargaTambahan: 50.00,
        });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.kod).toBe('PENDAFTARAN_DUPLIKAT');
    });

    it('should allow updating option to keep same name', async () => {
      const res = await agent
        .put(`/api/peniaga/pilihan-spesifikasi/${testPilihanId}`)
        .send({
          nama: '6 inci',
          hargaTambahan: 60.00,
        });

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
    });

    it('should return 404 for non-existent option', async () => {
      const res = await agent
        .put('/api/peniaga/pilihan-spesifikasi/99999')
        .send({
          nama: '6 inci',
          hargaTambahan: 50.00,
        });

      expect(res.status).toBe(404);
      expect(res.body.ralat).toBe(true);
    });
  });

  // ─── DELETE /api/peniaga/pilihan-spesifikasi/:id ───────────────────────────

  describe('DELETE /api/peniaga/pilihan-spesifikasi/:id', () => {
    let testPilihanId;

    beforeEach(async () => {
      const [result] = await pool.execute(
        'INSERT INTO PilihanSpesifikasiKek (kategoriId, nama, hargaTambahan) VALUES (?, ?, ?)',
        [testKategoriId, '6 inci', 50.00]
      );
      testPilihanId = result.insertId;
    });

    it('should soft-delete an option (set aktif=false)', async () => {
      const res = await agent.delete(`/api/peniaga/pilihan-spesifikasi/${testPilihanId}`);

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.mesej).toBe('Pilihan berjaya dipadam.');

      // Verify soft-delete
      const [rows] = await pool.execute(
        'SELECT aktif FROM PilihanSpesifikasiKek WHERE pilihanId = ?',
        [testPilihanId]
      );
      expect(rows[0].aktif).toBe(0);
    });

    it('should return 404 for non-existent option', async () => {
      const res = await agent.delete('/api/peniaga/pilihan-spesifikasi/99999');

      expect(res.status).toBe(404);
      expect(res.body.ralat).toBe(true);
    });

    it('should return 404 for already deleted option', async () => {
      // Delete once
      await agent.delete(`/api/peniaga/pilihan-spesifikasi/${testPilihanId}`);

      // Try to delete again
      const res = await agent.delete(`/api/peniaga/pilihan-spesifikasi/${testPilihanId}`);

      expect(res.status).toBe(404);
      expect(res.body.ralat).toBe(true);
    });

    it('should not physically remove the record', async () => {
      await agent.delete(`/api/peniaga/pilihan-spesifikasi/${testPilihanId}`);

      // Record should still exist in DB
      const [rows] = await pool.execute(
        'SELECT pilihanId, aktif FROM PilihanSpesifikasiKek WHERE pilihanId = ?',
        [testPilihanId]
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].aktif).toBe(0);
    });
  });
});
