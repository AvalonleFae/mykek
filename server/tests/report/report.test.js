import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index.js';
import pool from '../../src/config/db.js';

/**
 * Helper to create an authenticated merchant session agent.
 */
async function createMerchantAgent() {
  const agent = request.agent(app);
  const [merchants] = await pool.execute('SELECT * FROM Peniaga WHERE namaPenggunaAdmin = ?', ['admin']);
  if (merchants.length === 0) {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.default.hash('admin123', 10);
    await pool.execute(
      'INSERT INTO Peniaga (namaPenggunaAdmin, kataLaluan, namaKedai) VALUES (?, ?, ?)',
      ['admin', hash, 'Zuraida Patisserie']
    );
  }
  await agent
    .post('/api/auth/peniaga/log-masuk')
    .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'admin123' });
  return agent;
}

/**
 * Helper to get or create a customer and return their ID.
 */
async function ensureCustomer(phone = '0191234567', name = 'Pelanggan Ujian') {
  const [rows] = await pool.execute('SELECT pelangganId FROM Pelanggan WHERE noTelefon = ?', [phone]);
  if (rows.length > 0) return rows[0].pelangganId;
  const [result] = await pool.execute(
    'INSERT INTO Pelanggan (noTelefon, nama) VALUES (?, ?)',
    [phone, name]
  );
  return result.insertId;
}

/**
 * Helper to create a test order with a specific date.
 */
async function createTestOrder(pelangganId, overrides = {}) {
  const defaults = {
    tarikhAmbil: '2026-06-15',
    kaedahPenghantaran: 'Ambil Sendiri',
    jumlahHarga: 100.00,
    statusTempahan: 'Selesai',
    statusBayaran: 'Telah Dibayar',
    tarikhTempahan: '2025-06-15 10:00:00',
  };
  const data = { ...defaults, ...overrides };

  const [result] = await pool.execute(
    `INSERT INTO Tempahan (pelangganId, tarikhAmbil, kaedahPenghantaran, jumlahHarga, statusTempahan, statusBayaran, tarikhTempahan)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      pelangganId,
      data.tarikhAmbil,
      data.kaedahPenghantaran,
      data.jumlahHarga,
      data.statusTempahan,
      data.statusBayaran,
      data.tarikhTempahan,
    ]
  );
  return result.insertId;
}

describe('Sales Report Endpoints', () => {
  let merchantAgent;
  let pelangganId;

  beforeAll(async () => {
    merchantAgent = await createMerchantAgent();
    pelangganId = await ensureCustomer();
  });

  beforeEach(async () => {
    await pool.execute('DELETE FROM ImejTempahan');
    await pool.execute('DELETE FROM ButiranTempahan');
    await pool.execute('DELETE FROM Tempahan');
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM ImejTempahan');
    await pool.execute('DELETE FROM ButiranTempahan');
    await pool.execute('DELETE FROM Tempahan');
  });

  // --- GET /api/peniaga/laporan-jualan ---
  describe('GET /api/peniaga/laporan-jualan', () => {
    it('should return sales report for a given month/year', async () => {
      // Create orders in June 2025
      await createTestOrder(pelangganId, {
        tarikhTempahan: '2025-06-01 09:00:00',
        statusTempahan: 'Selesai',
        statusBayaran: 'Telah Dibayar',
        jumlahHarga: 150.00,
      });
      await createTestOrder(pelangganId, {
        tarikhTempahan: '2025-06-15 14:00:00',
        statusTempahan: 'Diterima',
        statusBayaran: 'Deposit Dibayar',
        jumlahHarga: 200.00,
      });
      await createTestOrder(pelangganId, {
        tarikhTempahan: '2025-06-20 11:00:00',
        statusTempahan: 'Dibatalkan',
        statusBayaran: 'Belum Dibayar',
        jumlahHarga: 80.00,
      });

      const res = await merchantAgent.get('/api/peniaga/laporan-jualan?bulan=6&tahun=2025');

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.data.bulan).toBe(6);
      expect(res.body.data.tahun).toBe(2025);
      expect(res.body.data.jumlahTempahan).toBe(3);
      // Revenue excludes Dibatalkan (80) so: 150 + 200 = 350
      expect(res.body.data.jumlahHasil).toBe(350);
      expect(res.body.data.pecahanStatus['Selesai']).toBe(1);
      expect(res.body.data.pecahanStatus['Diterima']).toBe(1);
      expect(res.body.data.pecahanStatus['Dibatalkan']).toBe(1);
      expect(res.body.data.pecahanBayaran['Telah Dibayar']).toBe(1);
      expect(res.body.data.pecahanBayaran['Deposit Dibayar']).toBe(1);
      expect(res.body.data.pecahanBayaran['Belum Dibayar']).toBe(1);
    });

    it('should return zero data for empty period', async () => {
      const res = await merchantAgent.get('/api/peniaga/laporan-jualan?bulan=1&tahun=2020');

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.data.jumlahTempahan).toBe(0);
      expect(res.body.data.jumlahHasil).toBe(0);
    });

    it('should exclude revenue from Ditolak orders', async () => {
      await createTestOrder(pelangganId, {
        tarikhTempahan: '2025-03-10 10:00:00',
        statusTempahan: 'Ditolak',
        jumlahHarga: 500.00,
      });
      await createTestOrder(pelangganId, {
        tarikhTempahan: '2025-03-12 10:00:00',
        statusTempahan: 'Selesai',
        jumlahHarga: 200.00,
      });

      const res = await merchantAgent.get('/api/peniaga/laporan-jualan?bulan=3&tahun=2025');

      expect(res.status).toBe(200);
      expect(res.body.data.jumlahTempahan).toBe(2);
      // Revenue excludes Ditolak (500), only counts Selesai (200)
      expect(res.body.data.jumlahHasil).toBe(200);
      expect(res.body.data.pecahanStatus['Ditolak']).toBe(1);
      expect(res.body.data.pecahanStatus['Selesai']).toBe(1);
    });

    it('should not include orders from other months', async () => {
      // Order in June 2025
      await createTestOrder(pelangganId, {
        tarikhTempahan: '2025-06-15 10:00:00',
        statusTempahan: 'Selesai',
        jumlahHarga: 100.00,
      });
      // Order in July 2025
      await createTestOrder(pelangganId, {
        tarikhTempahan: '2025-07-01 10:00:00',
        statusTempahan: 'Selesai',
        jumlahHarga: 200.00,
      });

      const res = await merchantAgent.get('/api/peniaga/laporan-jualan?bulan=6&tahun=2025');

      expect(res.status).toBe(200);
      expect(res.body.data.jumlahTempahan).toBe(1);
      expect(res.body.data.jumlahHasil).toBe(100);
    });

    it('should return 400 for invalid month', async () => {
      const res = await merchantAgent.get('/api/peniaga/laporan-jualan?bulan=13&tahun=2025');
      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
    });

    it('should return 400 for missing month', async () => {
      const res = await merchantAgent.get('/api/peniaga/laporan-jualan?tahun=2025');
      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
    });

    it('should return 400 for invalid year', async () => {
      const res = await merchantAgent.get('/api/peniaga/laporan-jualan?bulan=6&tahun=abc');
      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/peniaga/laporan-jualan?bulan=6&tahun=2025');
      expect(res.status).toBe(401);
    });

    it('should return 403 for customer role', async () => {
      // Login as customer
      const customerAgent = request.agent(app);
      await ensureCustomer('0181111111', 'Pelanggan Test');
      await customerAgent
        .post('/api/auth/pelanggan/log-masuk')
        .send({ noTelefon: '0181111111' });

      const res = await customerAgent.get('/api/peniaga/laporan-jualan?bulan=6&tahun=2025');
      expect(res.status).toBe(403);
    });
  });

  // --- GET /api/peniaga/laporan-jualan/pdf ---
  describe('GET /api/peniaga/laporan-jualan/pdf', () => {
    it('should return a PDF file', async () => {
      await createTestOrder(pelangganId, {
        tarikhTempahan: '2025-06-10 10:00:00',
        statusTempahan: 'Selesai',
        jumlahHarga: 250.00,
      });

      const res = await merchantAgent.get('/api/peniaga/laporan-jualan/pdf?bulan=6&tahun=2025');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('laporan-jualan-2025-06.pdf');
      // PDF starts with %PDF
      expect(res.body).toBeInstanceOf(Buffer);
    });

    it('should return PDF even for empty period', async () => {
      const res = await merchantAgent.get('/api/peniaga/laporan-jualan/pdf?bulan=1&tahun=2020');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
    });

    it('should return 400 for invalid month', async () => {
      const res = await merchantAgent.get('/api/peniaga/laporan-jualan/pdf?bulan=0&tahun=2025');
      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/peniaga/laporan-jualan/pdf?bulan=6&tahun=2025');
      expect(res.status).toBe(401);
    });
  });
});
