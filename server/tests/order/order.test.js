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
 * Helper to create an authenticated customer session agent.
 */
async function createCustomerAgent(phone = '0191234567', name = 'Pelanggan Ujian') {
  const agent = request.agent(app);
  const [customers] = await pool.execute('SELECT * FROM Pelanggan WHERE noTelefon = ?', [phone]);
  if (customers.length === 0) {
    const tempId = 'C' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    await pool.execute(
      'INSERT INTO Pelanggan (pelangganId, noTelefon, nama) VALUES (?, ?, ?)',
      [tempId, phone, name]
    );
  }
  await agent
    .post('/api/auth/pelanggan/log-masuk')
    .send({ noTelefon: phone });
  return agent;
}

/**
 * Helper to get customer ID by phone.
 */
async function getCustomerId(phone = '0191234567') {
  const [rows] = await pool.execute('SELECT pelangganId FROM Pelanggan WHERE noTelefon = ?', [phone]);
  return rows[0]?.pelangganId;
}

/**
 * Helper to create a test order directly in the database.
 */
async function createTestOrder(pelangganId, overrides = {}) {
  const defaults = {
    tarikhAmbil: '2026-06-15',
    kaedahPenghantaran: 'Ambil Sendiri',
    jumlahHarga: 50.00,
    statusTempahan: 'Menunggu Pengesahan',
    statusBayaran: 'Belum Dibayar',
  };
  const data = { ...defaults, ...overrides };
  const tempahanId = 'T' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

  await pool.execute(
    `INSERT INTO Tempahan (tempahanId, pelangganId, tarikhAmbil, kaedahPenghantaran, jumlahHarga, statusTempahan, statusBayaran, tarikhTerima, nota, sebabTolak)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tempahanId,
      pelangganId,
      data.tarikhAmbil,
      data.kaedahPenghantaran,
      data.jumlahHarga,
      data.statusTempahan,
      data.statusBayaran,
      data.tarikhTerima || null,
      data.nota || null,
      data.sebabTolak || null,
    ]
  );
  return tempahanId;
}

describe('Customer Order Endpoints', () => {
  let customerAgent;
  let pelangganId;

  beforeAll(async () => {
    customerAgent = await createCustomerAgent();
    pelangganId = await getCustomerId();
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

  // --- GET /api/pelanggan/tempahan ---
  describe('GET /api/pelanggan/tempahan', () => {
    it('should return empty list when customer has no orders', async () => {
      const res = await customerAgent.get('/api/pelanggan/tempahan');

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.data).toEqual([]);
    });

    it('should return orders sorted by tarikhTempahan DESC', async () => {
      // Create orders with different dates
      const tId1 = 'T' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      const tId2 = 'T' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      await pool.execute(
        `INSERT INTO Tempahan (tempahanId, pelangganId, tarikhAmbil, kaedahPenghantaran, jumlahHarga, statusTempahan, tarikhTempahan)
         VALUES (?, ?, '2026-06-10', 'Ambil Sendiri', 30.00, 'Menunggu Pengesahan', '2025-01-01 10:00:00')`,
        [tId1, pelangganId]
      );
      await pool.execute(
        `INSERT INTO Tempahan (tempahanId, pelangganId, tarikhAmbil, kaedahPenghantaran, jumlahHarga, statusTempahan, tarikhTempahan)
         VALUES (?, ?, '2026-06-15', 'Ambil Sendiri', 50.00, 'Diterima', '2025-01-05 10:00:00')`,
        [tId2, pelangganId]
      );

      const res = await customerAgent.get('/api/pelanggan/tempahan');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      // Most recent first (DECIMAL returns as string from MySQL)
      expect(parseFloat(res.body.data[0].jumlahHarga)).toBe(50.00);
      expect(parseFloat(res.body.data[1].jumlahHarga)).toBe(30.00);
    });

    it('should only return the authenticated customer orders', async () => {
      // Create order for our customer
      await createTestOrder(pelangganId);

      // Create another customer and their order
      const [existing] = await pool.execute('SELECT pelangganId FROM Pelanggan WHERE noTelefon = ?', ['0187654321']);
      let otherPelangganId;
      if (existing.length === 0) {
        const otherId = 'C' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        await pool.execute(
          'INSERT INTO Pelanggan (pelangganId, noTelefon, nama) VALUES (?, ?, ?)',
          [otherId, '0187654321', 'Pelanggan Lain']
        );
        otherPelangganId = otherId;
      } else {
        otherPelangganId = existing[0].pelangganId;
      }
      await createTestOrder(otherPelangganId);

      const res = await customerAgent.get('/api/pelanggan/tempahan');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/pelanggan/tempahan');
      expect(res.status).toBe(401);
    });

    it('should return 403 for merchant trying to access customer endpoint', async () => {
      const merchantAgent = await createMerchantAgent();
      const res = await merchantAgent.get('/api/pelanggan/tempahan');
      expect(res.status).toBe(403);
    });
  });

  // --- GET /api/pelanggan/tempahan/:id ---
  describe('GET /api/pelanggan/tempahan/:id', () => {
    it('should return full order details with butiran and imej', async () => {
      const tempahanId = await createTestOrder(pelangganId);

      // Ensure category and option exist for FK constraint
      await pool.execute(
        `INSERT IGNORE INTO KategoriSpesifikasiKek (kategoriId, nama, penerangan, aktif) VALUES (1, 'Saiz', 'Saiz kek', 1)`
      );
      await pool.execute(
        `INSERT IGNORE INTO PilihanSpesifikasiKek (pilihanId, kategoriId, nama, penerangan, hargaTambahan, aktif) VALUES (1, 1, 'Besar', 'Saiz besar', 20.00, 1)`
      );

      // Add order details
      const bId = 'B' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      await pool.execute(
        `INSERT INTO ButiranTempahan (butiranId, tempahanId, kategoriId, pilihanId, namaKategori, namaPilihan, hargaTambahan)
         VALUES (?, ?, 1, 1, 'Saiz', 'Besar', 20.00)`,
        [bId, tempahanId]
      );

      // Add order image
      const iId = 'I' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      await pool.execute(
        `INSERT INTO ImejTempahan (imejId, tempahanId, jenisImej, urlImej, promptAI)
         VALUES (?, ?, 'AI', '/uploads/images/test.png', 'Kek coklat')`,
        [iId, tempahanId]
      );

      const res = await customerAgent.get(`/api/pelanggan/tempahan/${tempahanId}`);

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.data.tempahanId).toBe(tempahanId);
      expect(res.body.data.butiran).toHaveLength(1);
      expect(res.body.data.butiran[0].namaKategori).toBe('Saiz');
      expect(res.body.data.imej).toHaveLength(1);
      expect(res.body.data.imej[0].jenisImej).toBe('AI');
    });

    it('should return 404 for order belonging to another customer', async () => {
      // Create another customer's order
      const [existing] = await pool.execute('SELECT pelangganId FROM Pelanggan WHERE noTelefon = ?', ['0187654321']);
      let otherPelangganId;
      if (existing.length === 0) {
        const otherId = 'C' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        await pool.execute(
          'INSERT INTO Pelanggan (pelangganId, noTelefon, nama) VALUES (?, ?, ?)',
          [otherId, '0187654321', 'Pelanggan Lain']
        );
        otherPelangganId = otherId;
      } else {
        otherPelangganId = existing[0].pelangganId;
      }
      const tempahanId = await createTestOrder(otherPelangganId);

      const res = await customerAgent.get(`/api/pelanggan/tempahan/${tempahanId}`);

      expect(res.status).toBe(404);
      expect(res.body.ralat).toBe(true);
    });

    it('should return 404 for non-existent order', async () => {
      const res = await customerAgent.get('/api/pelanggan/tempahan/99999');

      expect(res.status).toBe(404);
      expect(res.body.ralat).toBe(true);
    });

    it('should return 400 for invalid ID', async () => {
      const res = await customerAgent.get('/api/pelanggan/tempahan/abc');

      expect(res.status).toBe(404);
      expect(res.body.ralat).toBe(true);
    });
  });

  // --- PUT /api/pelanggan/tempahan/:id/batal ---
  describe('PUT /api/pelanggan/tempahan/:id/batal', () => {
    it('should cancel order with status Menunggu Pengesahan', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Menunggu Pengesahan',
      });

      const res = await customerAgent.put(`/api/pelanggan/tempahan/${tempahanId}/batal`);

      expect(res.status).toBe(200);
      expect(res.body.berjaya).toBe(true);

      // Verify status changed
      const [rows] = await pool.execute('SELECT statusTempahan FROM Tempahan WHERE tempahanId = ?', [tempahanId]);
      expect(rows[0].statusTempahan).toBe('Dibatalkan');
    });

    it('should cancel order with status Diterima within 24 hours', async () => {
      const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Diterima',
        tarikhTerima: recentTime.toISOString().slice(0, 19).replace('T', ' '),
      });

      const res = await customerAgent.put(`/api/pelanggan/tempahan/${tempahanId}/batal`);

      expect(res.status).toBe(200);
      expect(res.body.berjaya).toBe(true);
    });

    it('should reject cancellation for Diterima order beyond 24 hours', async () => {
      const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Diterima',
        tarikhTerima: oldTime.toISOString().slice(0, 19).replace('T', ' '),
      });

      const res = await customerAgent.put(`/api/pelanggan/tempahan/${tempahanId}/batal`);

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.kod).toBe('OPERASI_TIDAK_DIBENARKAN');
    });

    it('should reject cancellation for order in production phase', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Sedang Diproses',
      });

      const res = await customerAgent.put(`/api/pelanggan/tempahan/${tempahanId}/batal`);

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
    });

    it('should reject cancellation for already cancelled order', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Dibatalkan',
      });

      const res = await customerAgent.put(`/api/pelanggan/tempahan/${tempahanId}/batal`);

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
    });

    it('should reject cancellation for completed order', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Selesai',
      });

      const res = await customerAgent.put(`/api/pelanggan/tempahan/${tempahanId}/batal`);

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
    });

    it('should return 404 for non-existent order', async () => {
      const res = await customerAgent.put('/api/pelanggan/tempahan/99999/batal');

      expect(res.status).toBe(404);
      expect(res.body.ralat).toBe(true);
    });

    it('should return 404 for order belonging to another customer', async () => {
      const [existing] = await pool.execute('SELECT pelangganId FROM Pelanggan WHERE noTelefon = ?', ['0187654321']);
      let otherPelangganId;
      if (existing.length === 0) {
        const otherId = 'C' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        await pool.execute(
          'INSERT INTO Pelanggan (pelangganId, noTelefon, nama) VALUES (?, ?, ?)',
          [otherId, '0187654321', 'Pelanggan Lain']
        );
        otherPelangganId = otherId;
      } else {
        otherPelangganId = existing[0].pelangganId;
      }
      const tempahanId = await createTestOrder(otherPelangganId);

      const res = await customerAgent.put(`/api/pelanggan/tempahan/${tempahanId}/batal`);

      expect(res.status).toBe(404);
      expect(res.body.ralat).toBe(true);
    });
  });
});
