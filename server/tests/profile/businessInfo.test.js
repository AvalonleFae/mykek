import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../../src/index.js';
import pool from '../../src/config/db.js';

describe('Business Information Endpoints', () => {
  let merchantAgent;
  let customerAgent;
  const merchantUsername = 'admin_ujian_bi';
  const merchantPassword = 'KataLaluan123';
  const customerPhone = '0198765432';

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
      CREATE TABLE IF NOT EXISTS Pelanggan (
        pelangganId INT AUTO_INCREMENT PRIMARY KEY,
        noTelefon VARCHAR(15) NOT NULL UNIQUE,
        nama VARCHAR(100) NOT NULL,
        alamat VARCHAR(500),
        tarikhDaftar DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  });

  beforeEach(async () => {
    // Clean up test data
    await pool.execute('DELETE FROM Peniaga WHERE namaPenggunaAdmin = ?', [merchantUsername]);
    await pool.execute('DELETE FROM Pelanggan WHERE noTelefon = ?', [customerPhone]);

    // Create test merchant
    const hashedPassword = await bcrypt.hash(merchantPassword, 10);
    await pool.execute(
      'INSERT INTO Peniaga (namaPenggunaAdmin, kataLaluan, namaKedai, noTelefonKedai, peneranganKedai) VALUES (?, ?, ?, ?, ?)',
      [merchantUsername, hashedPassword, 'Kedai Kek Zuraida', '0123456789', 'Kek sedap di Sarawak']
    );

    // Create test customer
    await pool.execute(
      'INSERT INTO Pelanggan (noTelefon, nama) VALUES (?, ?)',
      [customerPhone, 'Pelanggan Ujian']
    );

    // Log in as merchant
    merchantAgent = request.agent(app);
    await merchantAgent
      .post('/api/auth/peniaga/log-masuk')
      .send({ namaPenggunaAdmin: merchantUsername, kataLaluan: merchantPassword });

    // Log in as customer
    customerAgent = request.agent(app);
    await customerAgent
      .post('/api/auth/pelanggan/log-masuk')
      .send({ noTelefon: customerPhone });
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM Peniaga WHERE namaPenggunaAdmin = ?', [merchantUsername]);
    await pool.execute('DELETE FROM Pelanggan WHERE noTelefon = ?', [customerPhone]);
    await pool.end();
  });

  // --- GET /api/peniaga/profil-perniagaan ---

  describe('GET /api/peniaga/profil-perniagaan', () => {
    it('should return merchant business info', async () => {
      const res = await merchantAgent.get('/api/peniaga/profil-perniagaan');

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.data.namaKedai).toBe('Kedai Kek Zuraida');
      expect(res.body.data.noTelefonKedai).toBe('0123456789');
      expect(res.body.data.peneranganKedai).toBe('Kek sedap di Sarawak');
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/peniaga/profil-perniagaan');

      expect(res.status).toBe(401);
      expect(res.body.ralat).toBe(true);
    });

    it('should return 403 for customer trying to access merchant endpoint', async () => {
      const res = await customerAgent.get('/api/peniaga/profil-perniagaan');

      expect(res.status).toBe(403);
      expect(res.body.ralat).toBe(true);
    });
  });

  // --- PUT /api/peniaga/profil-perniagaan ---

  describe('PUT /api/peniaga/profil-perniagaan', () => {
    it('should update business info successfully', async () => {
      const res = await merchantAgent
        .put('/api/peniaga/profil-perniagaan')
        .send({
          namaKedai: 'Kedai Baru',
          noTelefonKedai: '0112345678',
          peneranganKedai: 'Penerangan baru',
        });

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.mesej).toBe('Maklumat perniagaan berjaya dikemaskini.');

      // Verify the update
      const getRes = await merchantAgent.get('/api/peniaga/profil-perniagaan');
      expect(getRes.body.data.namaKedai).toBe('Kedai Baru');
      expect(getRes.body.data.noTelefonKedai).toBe('0112345678');
      expect(getRes.body.data.peneranganKedai).toBe('Penerangan baru');
    });

    it('should reject shop name exceeding 100 characters', async () => {
      const longName = 'A'.repeat(101);
      const res = await merchantAgent
        .put('/api/peniaga/profil-perniagaan')
        .send({
          namaKedai: longName,
          noTelefonKedai: '0123456789',
          peneranganKedai: 'Penerangan',
        });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('namaKedai');
      expect(res.body.kod).toBe('PANJANG_TIDAK_SAH');
    });

    it('should reject invalid phone number format', async () => {
      const res = await merchantAgent
        .put('/api/peniaga/profil-perniagaan')
        .send({
          namaKedai: 'Kedai',
          noTelefonKedai: '123456',
          peneranganKedai: 'Penerangan',
        });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('noTelefonKedai');
      expect(res.body.kod).toBe('FORMAT_TIDAK_SAH');
    });

    it('should reject phone number not starting with 01', async () => {
      const res = await merchantAgent
        .put('/api/peniaga/profil-perniagaan')
        .send({
          namaKedai: 'Kedai',
          noTelefonKedai: '0987654321',
          peneranganKedai: 'Penerangan',
        });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('noTelefonKedai');
    });

    it('should reject description exceeding 500 characters', async () => {
      const longDesc = 'A'.repeat(501);
      const res = await merchantAgent
        .put('/api/peniaga/profil-perniagaan')
        .send({
          namaKedai: 'Kedai',
          noTelefonKedai: '0123456789',
          peneranganKedai: longDesc,
        });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('peneranganKedai');
      expect(res.body.kod).toBe('PANJANG_TIDAK_SAH');
    });

    it('should reject empty shop name', async () => {
      const res = await merchantAgent
        .put('/api/peniaga/profil-perniagaan')
        .send({
          namaKedai: '',
          noTelefonKedai: '0123456789',
          peneranganKedai: 'Penerangan',
        });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('namaKedai');
    });

    it('should accept shop name with exactly 100 characters', async () => {
      const name100 = 'K'.repeat(100);
      const res = await merchantAgent
        .put('/api/peniaga/profil-perniagaan')
        .send({
          namaKedai: name100,
          noTelefonKedai: '0123456789',
          peneranganKedai: 'Penerangan',
        });

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
    });

    it('should accept description with exactly 500 characters', async () => {
      const desc500 = 'P'.repeat(500);
      const res = await merchantAgent
        .put('/api/peniaga/profil-perniagaan')
        .send({
          namaKedai: 'Kedai',
          noTelefonKedai: '0123456789',
          peneranganKedai: desc500,
        });

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .put('/api/peniaga/profil-perniagaan')
        .send({
          namaKedai: 'Kedai',
          noTelefonKedai: '0123456789',
          peneranganKedai: 'Penerangan',
        });

      expect(res.status).toBe(401);
      expect(res.body.ralat).toBe(true);
    });
  });

  // --- GET /api/awam/profil-kedai ---

  describe('GET /api/awam/profil-kedai', () => {
    it('should return public shop info without authentication', async () => {
      const res = await request(app).get('/api/awam/profil-kedai');

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.data).toHaveProperty('namaKedai');
      expect(res.body.data).toHaveProperty('noTelefonKedai');
      expect(res.body.data).toHaveProperty('peneranganKedai');
    });

    it('should be accessible by authenticated customer', async () => {
      const res = await customerAgent.get('/api/awam/profil-kedai');

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
    });

    it('should be accessible by authenticated merchant', async () => {
      const res = await merchantAgent.get('/api/awam/profil-kedai');

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
    });
  });
});
