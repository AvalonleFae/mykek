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
  const pelangganId = 'C' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  await pool.execute(
    'INSERT INTO Pelanggan (pelangganId, noTelefon, nama) VALUES (?, ?, ?)',
    [pelangganId, phone, name]
  );
  return pelangganId;
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

describe('Merchant Order Management Endpoints', () => {
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

  // --- GET /api/peniaga/tempahan ---
  describe('GET /api/peniaga/tempahan', () => {
    it('should return paginated list of orders', async () => {
      await createTestOrder(pelangganId);
      await createTestOrder(pelangganId, { jumlahHarga: 75.00 });

      const res = await merchantAgent.get('/api/peniaga/tempahan');

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(20);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should filter by status', async () => {
      await createTestOrder(pelangganId, { statusTempahan: 'Menunggu Pengesahan' });
      await createTestOrder(pelangganId, { statusTempahan: 'Diterima', tarikhTerima: new Date().toISOString().slice(0, 19).replace('T', ' ') });

      const res = await merchantAgent.get('/api/peniaga/tempahan?status=Diterima');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].statusTempahan).toBe('Diterima');
    });

    it('should filter by payment status', async () => {
      await createTestOrder(pelangganId, { statusBayaran: 'Belum Dibayar' });
      await createTestOrder(pelangganId, { statusBayaran: 'Telah Dibayar' });

      const res = await merchantAgent.get('/api/peniaga/tempahan?statusBayaran=Telah Dibayar');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].statusBayaran).toBe('Telah Dibayar');
    });

    it('should return empty list when no orders exist', async () => {
      const res = await merchantAgent.get('/api/peniaga/tempahan');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });

    it('should include customer info in order list', async () => {
      await createTestOrder(pelangganId);

      const res = await merchantAgent.get('/api/peniaga/tempahan');

      expect(res.status).toBe(200);
      expect(res.body.data[0].namaPelanggan).toBe('Pelanggan Ujian');
      expect(res.body.data[0].noTelefon).toBe('0191234567');
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/peniaga/tempahan');
      expect(res.status).toBe(401);
    });
  });

  // --- GET /api/peniaga/tempahan/:id ---
  describe('GET /api/peniaga/tempahan/:id', () => {
    it('should return full order details with customer info', async () => {
      const tempahanId = await createTestOrder(pelangganId);

      const res = await merchantAgent.get(`/api/peniaga/tempahan/${tempahanId}`);

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.data.tempahanId).toBe(tempahanId);
      expect(res.body.data.namaPelanggan).toBe('Pelanggan Ujian');
      expect(res.body.data.butiran).toBeDefined();
      expect(res.body.data.imej).toBeDefined();
    });

    it('should return 404 for non-existent order', async () => {
      const res = await merchantAgent.get('/api/peniaga/tempahan/99999');

      expect(res.status).toBe(404);
      expect(res.body.ralat).toBe(true);
    });

    it('should return 400 for invalid ID', async () => {
      const res = await merchantAgent.get('/api/peniaga/tempahan/abc');

      expect(res.status).toBe(404);
      expect(res.body.ralat).toBe(true);
    });
  });

  // --- PUT /api/peniaga/tempahan/:id/terima ---
  describe('PUT /api/peniaga/tempahan/:id/terima', () => {
    it('should accept a pending order and record tarikhTerima', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Menunggu Pengesahan',
      });

      const res = await merchantAgent.put(`/api/peniaga/tempahan/${tempahanId}/terima`);

      expect(res.status).toBe(200);
      expect(res.body.berjaya).toBe(true);

      // Verify status and tarikhTerima
      const [rows] = await pool.execute('SELECT statusTempahan, tarikhTerima FROM Tempahan WHERE tempahanId = ?', [tempahanId]);
      expect(rows[0].statusTempahan).toBe('Diterima');
      expect(rows[0].tarikhTerima).not.toBeNull();
    });

    it('should reject accepting a non-pending order', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Diterima',
        tarikhTerima: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      const res = await merchantAgent.put(`/api/peniaga/tempahan/${tempahanId}/terima`);

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.kod).toBe('OPERASI_TIDAK_DIBENARKAN');
    });

    it('should return 404 for non-existent order', async () => {
      const res = await merchantAgent.put('/api/peniaga/tempahan/99999/terima');

      expect(res.status).toBe(404);
      expect(res.body.ralat).toBe(true);
    });
  });

  // --- PUT /api/peniaga/tempahan/:id/tolak ---
  describe('PUT /api/peniaga/tempahan/:id/tolak', () => {
    it('should reject a pending order with a reason', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Menunggu Pengesahan',
      });

      const res = await merchantAgent
        .put(`/api/peniaga/tempahan/${tempahanId}/tolak`)
        .send({ sebabTolak: 'Bahan tidak mencukupi' });

      expect(res.status).toBe(200);
      expect(res.body.berjaya).toBe(true);

      // Verify status and reason
      const [rows] = await pool.execute('SELECT statusTempahan, sebabTolak FROM Tempahan WHERE tempahanId = ?', [tempahanId]);
      expect(rows[0].statusTempahan).toBe('Ditolak');
      expect(rows[0].sebabTolak).toBe('Bahan tidak mencukupi');
    });

    it('should reject without a reason', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Menunggu Pengesahan',
      });

      const res = await merchantAgent
        .put(`/api/peniaga/tempahan/${tempahanId}/tolak`)
        .send({ sebabTolak: '' });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('sebabTolak');
    });

    it('should reject reason exceeding 500 characters', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Menunggu Pengesahan',
      });

      const res = await merchantAgent
        .put(`/api/peniaga/tempahan/${tempahanId}/tolak`)
        .send({ sebabTolak: 'A'.repeat(501) });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.kod).toBe('PANJANG_TIDAK_SAH');
    });

    it('should reject rejecting a non-pending order', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Diterima',
        tarikhTerima: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      const res = await merchantAgent
        .put(`/api/peniaga/tempahan/${tempahanId}/tolak`)
        .send({ sebabTolak: 'Sebab ujian' });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
    });

    it('should return 404 for non-existent order', async () => {
      const res = await merchantAgent
        .put('/api/peniaga/tempahan/99999/tolak')
        .send({ sebabTolak: 'Sebab ujian' });

      expect(res.status).toBe(404);
      expect(res.body.ralat).toBe(true);
    });
  });

  // --- PUT /api/peniaga/tempahan/:id/status ---
  describe('PUT /api/peniaga/tempahan/:id/status', () => {
    it('should advance from Diterima to Sedang Dibuat', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Diterima',
        tarikhTerima: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      const res = await merchantAgent.put(`/api/peniaga/tempahan/${tempahanId}/status`);

      expect(res.status).toBe(200);
      expect(res.body.berjaya).toBe(true);
      expect(res.body.statusBaru).toBe('Sedang Dibuat');
    });

    it('should advance from Sedang Dibuat to Siap', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Sedang Dibuat',
      });

      const res = await merchantAgent.put(`/api/peniaga/tempahan/${tempahanId}/status`);

      expect(res.status).toBe(200);
      expect(res.body.statusBaru).toBe('Siap');
    });

    it('should advance from Siap to Selesai', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Siap',
      });

      const res = await merchantAgent.put(`/api/peniaga/tempahan/${tempahanId}/status`);

      expect(res.status).toBe(200);
      expect(res.body.statusBaru).toBe('Selesai');
    });

    it('should reject advancing past Selesai', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Selesai',
      });

      const res = await merchantAgent.put(`/api/peniaga/tempahan/${tempahanId}/status`);

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.kod).toBe('OPERASI_TIDAK_DIBENARKAN');
    });

    it('should reject advancing from Menunggu Pengesahan (not in sequence)', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Menunggu Pengesahan',
      });

      const res = await merchantAgent.put(`/api/peniaga/tempahan/${tempahanId}/status`);

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.kod).toBe('STATUS_TIDAK_SAH');
    });

    it('should reject advancing from Dibatalkan', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Dibatalkan',
      });

      const res = await merchantAgent.put(`/api/peniaga/tempahan/${tempahanId}/status`);

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
    });

    it('should reject advancing from Ditolak', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Ditolak',
      });

      const res = await merchantAgent.put(`/api/peniaga/tempahan/${tempahanId}/status`);

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
    });

    it('should return 404 for non-existent order', async () => {
      const res = await merchantAgent.put('/api/peniaga/tempahan/99999/status');

      expect(res.status).toBe(404);
      expect(res.body.ralat).toBe(true);
    });
  });

  // --- PUT /api/peniaga/tempahan/:id/status-bayaran ---
  describe('PUT /api/peniaga/tempahan/:id/status-bayaran', () => {
    it('should update payment status to Deposit Dibayar', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Diterima',
        tarikhTerima: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      const res = await merchantAgent
        .put(`/api/peniaga/tempahan/${tempahanId}/status-bayaran`)
        .send({ statusBayaran: 'Deposit Dibayar' });

      expect(res.status).toBe(200);
      expect(res.body.berjaya).toBe(true);

      // Verify
      const [rows] = await pool.execute('SELECT statusBayaran FROM Tempahan WHERE tempahanId = ?', [tempahanId]);
      expect(rows[0].statusBayaran).toBe('Deposit Dibayar');
    });

    it('should update payment status to Telah Dibayar', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Selesai',
      });

      const res = await merchantAgent
        .put(`/api/peniaga/tempahan/${tempahanId}/status-bayaran`)
        .send({ statusBayaran: 'Telah Dibayar' });

      expect(res.status).toBe(200);
      expect(res.body.berjaya).toBe(true);
    });

    it('should reject update for cancelled order', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Dibatalkan',
      });

      const res = await merchantAgent
        .put(`/api/peniaga/tempahan/${tempahanId}/status-bayaran`)
        .send({ statusBayaran: 'Telah Dibayar' });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.kod).toBe('OPERASI_TIDAK_DIBENARKAN');
    });

    it('should reject update for rejected order', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Ditolak',
      });

      const res = await merchantAgent
        .put(`/api/peniaga/tempahan/${tempahanId}/status-bayaran`)
        .send({ statusBayaran: 'Telah Dibayar' });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.kod).toBe('OPERASI_TIDAK_DIBENARKAN');
    });

    it('should reject invalid payment status', async () => {
      const tempahanId = await createTestOrder(pelangganId, {
        statusTempahan: 'Diterima',
        tarikhTerima: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      const res = await merchantAgent
        .put(`/api/peniaga/tempahan/${tempahanId}/status-bayaran`)
        .send({ statusBayaran: 'Status Tidak Sah' });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.kod).toBe('STATUS_TIDAK_SAH');
    });

    it('should return 404 for non-existent order', async () => {
      const res = await merchantAgent
        .put('/api/peniaga/tempahan/99999/status-bayaran')
        .send({ statusBayaran: 'Telah Dibayar' });

      expect(res.status).toBe(404);
      expect(res.body.ralat).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .put('/api/peniaga/tempahan/1/status-bayaran')
        .send({ statusBayaran: 'Telah Dibayar' });
      expect(res.status).toBe(401);
    });
  });
});
