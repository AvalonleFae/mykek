import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index.js';
import pool from '../../src/config/db.js';

describe('Customer Profile Endpoints', () => {
  let agent;
  const testPhone = '0191234567';
  const testName = 'Pelanggan Ujian';

  beforeAll(async () => {
    // Ensure the Pelanggan table exists
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
    await pool.execute('DELETE FROM Pelanggan WHERE noTelefon = ?', [testPhone]);

    // Register a test customer
    await pool.execute(
      'INSERT INTO Pelanggan (noTelefon, nama, alamat) VALUES (?, ?, ?)',
      [testPhone, testName, 'Alamat Asal']
    );

    // Create a new agent (session-aware) and log in
    agent = request.agent(app);
    await agent
      .post('/api/auth/pelanggan/log-masuk')
      .send({ noTelefon: testPhone });
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM Pelanggan WHERE noTelefon = ?', [testPhone]);
    await pool.end();
  });

  // --- GET /api/pelanggan/profil ---

  describe('GET /api/pelanggan/profil', () => {
    it('should return the authenticated customer profile', async () => {
      const res = await agent.get('/api/pelanggan/profil');

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.data.nama).toBe(testName);
      expect(res.body.data.noTelefon).toBe(testPhone);
      expect(res.body.data.alamat).toBe('Alamat Asal');
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/pelanggan/profil');

      expect(res.status).toBe(401);
      expect(res.body.ralat).toBe(true);
    });
  });

  // --- PUT /api/pelanggan/profil ---

  describe('PUT /api/pelanggan/profil', () => {
    it('should update name and address successfully', async () => {
      const res = await agent
        .put('/api/pelanggan/profil')
        .send({ nama: 'Nama Baru', alamat: 'Alamat Baru 123' });

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.mesej).toBe('Profil berjaya dikemaskini.');

      // Verify the update
      const getRes = await agent.get('/api/pelanggan/profil');
      expect(getRes.body.data.nama).toBe('Nama Baru');
      expect(getRes.body.data.alamat).toBe('Alamat Baru 123');
    });

    it('should update name only (address optional)', async () => {
      const res = await agent
        .put('/api/pelanggan/profil')
        .send({ nama: 'Nama Sahaja', alamat: '' });

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
    });

    it('should reject name shorter than 2 characters', async () => {
      const res = await agent
        .put('/api/pelanggan/profil')
        .send({ nama: 'A', alamat: 'Alamat' });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('nama');
    });

    it('should reject name longer than 100 characters', async () => {
      const longName = 'A'.repeat(101);
      const res = await agent
        .put('/api/pelanggan/profil')
        .send({ nama: longName, alamat: 'Alamat' });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('nama');
    });

    it('should reject address longer than 500 characters', async () => {
      const longAddress = 'A'.repeat(501);
      const res = await agent
        .put('/api/pelanggan/profil')
        .send({ nama: 'Nama Sah', alamat: longAddress });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('alamat');
    });

    it('should reject empty name', async () => {
      const res = await agent
        .put('/api/pelanggan/profil')
        .send({ nama: '', alamat: 'Alamat' });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('nama');
    });

    it('should reject missing name field', async () => {
      const res = await agent
        .put('/api/pelanggan/profil')
        .send({ alamat: 'Alamat' });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('nama');
    });

    it('should accept name with exactly 2 characters', async () => {
      const res = await agent
        .put('/api/pelanggan/profil')
        .send({ nama: 'Ab', alamat: 'Alamat' });

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
    });

    it('should accept name with exactly 100 characters', async () => {
      const name100 = 'A'.repeat(100);
      const res = await agent
        .put('/api/pelanggan/profil')
        .send({ nama: name100, alamat: 'Alamat' });

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
    });

    it('should accept address with exactly 500 characters', async () => {
      const address500 = 'B'.repeat(500);
      const res = await agent
        .put('/api/pelanggan/profil')
        .send({ nama: 'Nama Sah', alamat: address500 });

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .put('/api/pelanggan/profil')
        .send({ nama: 'Nama Baru', alamat: 'Alamat Baru' });

      expect(res.status).toBe(401);
      expect(res.body.ralat).toBe(true);
    });
  });
});
