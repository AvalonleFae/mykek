import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index.js';
import pool from '../../src/config/db.js';

/**
 * Helper to create an authenticated merchant session agent.
 */
async function createMerchantAgent() {
  const agent = request.agent(app);
  // Ensure merchant exists with known credentials
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
async function createCustomerAgent() {
  const agent = request.agent(app);
  // Ensure customer exists
  const [customers] = await pool.execute('SELECT * FROM Pelanggan WHERE noTelefon = ?', ['0191234567']);
  if (customers.length === 0) {
    await pool.execute(
      'INSERT INTO Pelanggan (noTelefon, nama) VALUES (?, ?)',
      ['0191234567', 'Pelanggan Ujian']
    );
  }
  await agent
    .post('/api/auth/pelanggan/log-masuk')
    .send({ noTelefon: '0191234567' });
  return agent;
}

/**
 * Helper to get a future date string (YYYY-MM-DD) in local time.
 */
function getFutureDate(daysAhead = 7) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper to get today's date string (YYYY-MM-DD) in local time.
 */
function getTodayDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper to get a past date string (YYYY-MM-DD) in local time.
 */
function getPastDate(daysAgo = 3) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper to extract YYYY-MM-DD from a date value (handles ISO strings and Date objects).
 */
function extractDate(dateValue) {
  if (!dateValue) return null;
  // If it's an ISO string like "2026-05-25T16:00:00.000Z", parse and get local date
  const d = new Date(dateValue);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('Closed Date Management - /api/peniaga/tarikh-tutup', () => {
  let merchantAgent;

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
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS TarikhTutup (
        tarikhTutupId INT AUTO_INCREMENT PRIMARY KEY,
        tarikh DATE NOT NULL UNIQUE,
        catatan VARCHAR(200),
        tarikhCipta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS Tempahan (
        tempahanId INT AUTO_INCREMENT PRIMARY KEY,
        pelangganId INT NOT NULL,
        tarikhAmbil DATE NOT NULL,
        kaedahPenghantaran ENUM('Ambil Sendiri','Penghantaran') NOT NULL,
        alamatPenghantaran VARCHAR(255),
        kaedahBayaran ENUM('QR Code') NOT NULL DEFAULT 'QR Code',
        jumlahHarga DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        statusTempahan ENUM('Menunggu Pengesahan','Diterima','Ditolak','Dibatalkan','Sedang Diproses','Sedang Dihias','Sedia untuk Diambil/Dihantar','Selesai') NOT NULL DEFAULT 'Menunggu Pengesahan',
        statusBayaran ENUM('Belum Dibayar','Deposit Dibayar','Telah Dibayar') NOT NULL DEFAULT 'Belum Dibayar',
        nota VARCHAR(500),
        sebabTolak VARCHAR(500),
        tarikhTempahan DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        tarikhTerima DATETIME,
        tarikhKemaskini DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_tempahan_pelanggan FOREIGN KEY (pelangganId) REFERENCES Pelanggan(pelangganId) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    merchantAgent = await createMerchantAgent();

    // Ensure a customer exists for order-related tests
    const [customers] = await pool.execute('SELECT * FROM Pelanggan WHERE noTelefon = ?', ['0191234567']);
    if (customers.length === 0) {
      await pool.execute(
        'INSERT INTO Pelanggan (noTelefon, nama) VALUES (?, ?)',
        ['0191234567', 'Pelanggan Ujian']
      );
    }
  });

  beforeEach(async () => {
    // Clean up closed dates and test orders before each test
    await pool.execute('DELETE FROM TarikhTutup');
    await pool.execute('DELETE FROM Tempahan');
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM TarikhTutup');
    await pool.execute('DELETE FROM Tempahan');
  });

  // --- GET /api/peniaga/tarikh-tutup ---

  describe('GET /api/peniaga/tarikh-tutup', () => {
    it('should return empty list when no closed dates exist', async () => {
      const res = await merchantAgent.get('/api/peniaga/tarikh-tutup');

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.data).toEqual([]);
    });

    it('should return all closed dates sorted by date ascending', async () => {
      const date1 = getFutureDate(10);
      const date2 = getFutureDate(5);
      await pool.execute('INSERT INTO TarikhTutup (tarikh, catatan) VALUES (?, ?)', [date1, 'Cuti']);
      await pool.execute('INSERT INTO TarikhTutup (tarikh, catatan) VALUES (?, ?)', [date2, null]);

      const res = await merchantAgent.get('/api/peniaga/tarikh-tutup');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      // date2 (5 days ahead) should come before date1 (10 days ahead)
      expect(extractDate(res.body.data[0].tarikh)).toBe(date2);
      expect(extractDate(res.body.data[1].tarikh)).toBe(date1);
      expect(res.body.data[1].catatan).toBe('Cuti');
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/peniaga/tarikh-tutup');
      expect(res.status).toBe(401);
    });
  });

  // --- POST /api/peniaga/tarikh-tutup ---

  describe('POST /api/peniaga/tarikh-tutup', () => {
    it('should add a closed date with a future date', async () => {
      const futureDate = getFutureDate(7);
      const res = await merchantAgent
        .post('/api/peniaga/tarikh-tutup')
        .send({ tarikh: futureDate, catatan: 'Cuti peribadi' });

      expect(res.status).toBe(201);
      expect(res.body.berjaya).toBe(true);
      expect(res.body.tarikhTutupId).toBeDefined();
      expect(res.body.mesej).toBe('Tarikh tutup berjaya ditambah.');
    });

    it('should add a closed date with today date', async () => {
      const today = getTodayDate();
      const res = await merchantAgent
        .post('/api/peniaga/tarikh-tutup')
        .send({ tarikh: today });

      expect(res.status).toBe(201);
      expect(res.body.berjaya).toBe(true);
    });

    it('should add a closed date without catatan', async () => {
      const futureDate = getFutureDate(3);
      const res = await merchantAgent
        .post('/api/peniaga/tarikh-tutup')
        .send({ tarikh: futureDate });

      expect(res.status).toBe(201);
      expect(res.body.berjaya).toBe(true);
    });

    it('should reject a past date', async () => {
      const pastDate = getPastDate(3);
      const res = await merchantAgent
        .post('/api/peniaga/tarikh-tutup')
        .send({ tarikh: pastDate });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('tarikh');
      expect(res.body.kod).toBe('TARIKH_TIDAK_SAH');
    });

    it('should reject a duplicate closed date', async () => {
      const futureDate = getFutureDate(5);
      // Add first
      await merchantAgent
        .post('/api/peniaga/tarikh-tutup')
        .send({ tarikh: futureDate });

      // Try duplicate
      const res = await merchantAgent
        .post('/api/peniaga/tarikh-tutup')
        .send({ tarikh: futureDate });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.mesej).toBe('Tarikh ini sudah ditanda sebagai tidak tersedia.');
    });

    it('should reject empty tarikh', async () => {
      const res = await merchantAgent
        .post('/api/peniaga/tarikh-tutup')
        .send({ tarikh: '' });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('tarikh');
    });

    it('should reject invalid date format', async () => {
      const res = await merchantAgent
        .post('/api/peniaga/tarikh-tutup')
        .send({ tarikh: '07-01-2025' });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.kod).toBe('TARIKH_TIDAK_SAH');
    });

    it('should reject catatan exceeding 200 characters', async () => {
      const futureDate = getFutureDate(5);
      const longNote = 'A'.repeat(201);
      const res = await merchantAgent
        .post('/api/peniaga/tarikh-tutup')
        .send({ tarikh: futureDate, catatan: longNote });

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
      expect(res.body.medan).toBe('catatan');
      expect(res.body.kod).toBe('PANJANG_TIDAK_SAH');
    });

    it('should accept catatan with exactly 200 characters', async () => {
      const futureDate = getFutureDate(5);
      const note200 = 'A'.repeat(200);
      const res = await merchantAgent
        .post('/api/peniaga/tarikh-tutup')
        .send({ tarikh: futureDate, catatan: note200 });

      expect(res.status).toBe(201);
      expect(res.body.berjaya).toBe(true);
    });

    it('should warn if pending orders exist on the closed date', async () => {
      const futureDate = getFutureDate(7);

      // Create a customer and a pending order on that date
      const [customers] = await pool.execute('SELECT pelangganId FROM Pelanggan LIMIT 1');
      const pelangganId = customers[0].pelangganId;

      await pool.execute(
        `INSERT INTO Tempahan (pelangganId, tarikhAmbil, kaedahPenghantaran, statusTempahan)
         VALUES (?, ?, 'Ambil Sendiri', 'Menunggu Pengesahan')`,
        [pelangganId, futureDate]
      );

      const res = await merchantAgent
        .post('/api/peniaga/tarikh-tutup')
        .send({ tarikh: futureDate });

      expect(res.status).toBe(201);
      expect(res.body.berjaya).toBe(true);
      expect(res.body.amaran).toBeDefined();
      expect(res.body.bilanganTempahanMenunggu).toBe(1);
    });

    it('should not warn if orders exist but are not pending', async () => {
      const futureDate = getFutureDate(8);

      const [customers] = await pool.execute('SELECT pelangganId FROM Pelanggan LIMIT 1');
      const pelangganId = customers[0].pelangganId;

      await pool.execute(
        `INSERT INTO Tempahan (pelangganId, tarikhAmbil, kaedahPenghantaran, statusTempahan)
         VALUES (?, ?, 'Ambil Sendiri', 'Diterima')`,
        [pelangganId, futureDate]
      );

      const res = await merchantAgent
        .post('/api/peniaga/tarikh-tutup')
        .send({ tarikh: futureDate });

      expect(res.status).toBe(201);
      expect(res.body.berjaya).toBe(true);
      expect(res.body.amaran).toBeUndefined();
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/peniaga/tarikh-tutup')
        .send({ tarikh: getFutureDate(5) });
      expect(res.status).toBe(401);
    });
  });

  // --- DELETE /api/peniaga/tarikh-tutup/:id ---

  describe('DELETE /api/peniaga/tarikh-tutup/:id', () => {
    it('should remove an existing closed date', async () => {
      const futureDate = getFutureDate(5);
      const addRes = await merchantAgent
        .post('/api/peniaga/tarikh-tutup')
        .send({ tarikh: futureDate });

      const id = addRes.body.tarikhTutupId;

      const res = await merchantAgent.delete(`/api/peniaga/tarikh-tutup/${id}`);

      expect(res.status).toBe(200);
      expect(res.body.berjaya).toBe(true);
      expect(res.body.mesej).toBe('Tarikh tutup berjaya dipadam.');

      // Verify it's gone
      const [rows] = await pool.execute('SELECT * FROM TarikhTutup WHERE tarikhTutupId = ?', [id]);
      expect(rows).toHaveLength(0);
    });

    it('should return 404 for non-existent closed date', async () => {
      const res = await merchantAgent.delete('/api/peniaga/tarikh-tutup/99999');

      expect(res.status).toBe(404);
      expect(res.body.ralat).toBe(true);
      expect(res.body.kod).toBe('TIDAK_DITEMUI');
    });

    it('should return 400 for invalid ID', async () => {
      const res = await merchantAgent.delete('/api/peniaga/tarikh-tutup/abc');

      expect(res.status).toBe(400);
      expect(res.body.ralat).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).delete('/api/peniaga/tarikh-tutup/1');
      expect(res.status).toBe(401);
    });
  });
});

describe('Closed Date for Customer - /api/pelanggan/tarikh-tutup', () => {
  let customerAgent;

  beforeAll(async () => {
    customerAgent = await createCustomerAgent();
  });

  beforeEach(async () => {
    await pool.execute('DELETE FROM TarikhTutup');
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM TarikhTutup');
    await pool.end();
  });

  describe('GET /api/pelanggan/tarikh-tutup', () => {
    it('should return only future/today closed dates', async () => {
      const futureDate = getFutureDate(5);
      const pastDate = getPastDate(3);

      await pool.execute('INSERT INTO TarikhTutup (tarikh, catatan) VALUES (?, ?)', [futureDate, 'Cuti']);
      await pool.execute('INSERT INTO TarikhTutup (tarikh, catatan) VALUES (?, ?)', [pastDate, 'Lama']);

      const res = await customerAgent.get('/api/pelanggan/tarikh-tutup');

      expect(res.status).toBe(200);
      expect(res.body.ralat).toBe(false);
      expect(res.body.data).toHaveLength(1);
      expect(extractDate(res.body.data[0].tarikh)).toBe(futureDate);
    });

    it('should return empty list when no future closed dates exist', async () => {
      const pastDate = getPastDate(3);
      await pool.execute('INSERT INTO TarikhTutup (tarikh) VALUES (?)', [pastDate]);

      const res = await customerAgent.get('/api/pelanggan/tarikh-tutup');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/pelanggan/tarikh-tutup');
      expect(res.status).toBe(401);
    });

    it('should return 403 for merchant trying to access customer endpoint', async () => {
      const merchantAgent = await createMerchantAgent();
      const res = await merchantAgent.get('/api/pelanggan/tarikh-tutup');
      expect(res.status).toBe(403);
    });
  });
});
