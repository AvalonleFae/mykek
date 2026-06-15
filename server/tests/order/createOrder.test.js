import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index.js';
import pool from '../../src/config/db.js';

/**
 * Helper to create an authenticated customer session agent.
 */
async function createCustomerAgent() {
  const agent = request.agent(app);
  await pool.execute(
    "INSERT IGNORE INTO Pelanggan (noTelefon, nama) VALUES ('0171234567', 'Pelanggan Order Test')"
  );
  await agent
    .post('/api/auth/pelanggan/log-masuk')
    .send({ noTelefon: '0171234567' });
  return agent;
}

/**
 * Helper to get a valid future date (at least 3 days from now).
 */
function getFutureDate(daysAhead = 3) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
}

describe('Order Creation - POST /api/pelanggan/tempahan', () => {
  let customerAgent;
  let kategoriId1;
  let kategoriId2;
  let pilihanId1;
  let pilihanId2;
  let pilihanId3;

  beforeAll(async () => {
    customerAgent = await createCustomerAgent();
  });

  beforeEach(async () => {
    // Clean up order-related data
    await pool.execute('DELETE FROM ButiranTempahan');
    await pool.execute('DELETE FROM Tempahan');
    await pool.execute('DELETE FROM TarikhTutup');
    await pool.execute('DELETE FROM PilihanSpesifikasiKek');
    await pool.execute('DELETE FROM KategoriSpesifikasiKek');

    // Create test categories and options
    const [cat1] = await pool.execute(
      'INSERT INTO KategoriSpesifikasiKek (nama, penerangan, aktif) VALUES (?, ?, ?)',
      ['Saiz', 'Saiz kek', true]
    );
    kategoriId1 = cat1.insertId;

    const [cat2] = await pool.execute(
      'INSERT INTO KategoriSpesifikasiKek (nama, penerangan, aktif) VALUES (?, ?, ?)',
      ['Perisa', 'Perisa kek', true]
    );
    kategoriId2 = cat2.insertId;

    const [opt1] = await pool.execute(
      'INSERT INTO PilihanSpesifikasiKek (kategoriId, nama, hargaTambahan, aktif) VALUES (?, ?, ?, ?)',
      [kategoriId1, '6 inci', 30.00, true]
    );
    pilihanId1 = opt1.insertId;

    const [opt2] = await pool.execute(
      'INSERT INTO PilihanSpesifikasiKek (kategoriId, nama, hargaTambahan, aktif) VALUES (?, ?, ?, ?)',
      [kategoriId2, 'Coklat', 5.00, true]
    );
    pilihanId2 = opt2.insertId;

    const [opt3] = await pool.execute(
      'INSERT INTO PilihanSpesifikasiKek (kategoriId, nama, hargaTambahan, aktif) VALUES (?, ?, ?, ?)',
      [kategoriId1, '8 inci', 50.00, true]
    );
    pilihanId3 = opt3.insertId;
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM ButiranTempahan');
    await pool.execute('DELETE FROM Tempahan');
    await pool.execute('DELETE FROM TarikhTutup');
    await pool.execute('DELETE FROM PilihanSpesifikasiKek');
    await pool.execute('DELETE FROM KategoriSpesifikasiKek');
    await pool.execute("DELETE FROM Pelanggan WHERE noTelefon = '0171234567'");
    await pool.end();
  });

  // --- Authentication ---

  it('should return 401 for unauthenticated requests', async () => {
    const res = await request(app)
      .post('/api/pelanggan/tempahan')
      .send({});
    expect(res.status).toBe(401);
    expect(res.body.ralat).toBe(true);
  });

  it('should return 403 for merchant role', async () => {
    const merchantAgent = request.agent(app);
    await merchantAgent
      .post('/api/auth/peniaga/log-masuk')
      .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'admin123' });

    const res = await merchantAgent
      .post('/api/pelanggan/tempahan')
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.ralat).toBe(true);
  });

  // --- Successful order creation ---

  it('should create an order with valid data (Ambil Sendiri)', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [
          { kategoriId: kategoriId1, pilihanId: pilihanId1 },
          { kategoriId: kategoriId2, pilihanId: pilihanId2 },
        ],
        tarikhAmbil: getFutureDate(5),
        kaedahPenghantaran: 'Ambil Sendiri',
        kaedahBayaran: 'QR Code',
      });

    expect(res.status).toBe(201);
    expect(res.body.ralat).toBe(false);
    expect(res.body.mesej).toBe('Tempahan berjaya dicipta.');
    expect(res.body.tempahanId).toBeDefined();
    expect(res.body.jumlahHarga).toBe(35); // 30 + 5
    expect(res.body.statusTempahan).toBe('Menunggu Pengesahan');
  });

  it('should create an order with delivery method and address', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [
          { kategoriId: kategoriId1, pilihanId: pilihanId1 },
          { kategoriId: kategoriId2, pilihanId: pilihanId2 },
        ],
        tarikhAmbil: getFutureDate(5),
        kaedahPenghantaran: 'Penghantaran',
        alamatPenghantaran: 'No 123, Jalan Mawar, Kuching',
        kaedahBayaran: 'QR Code',
      });

    expect(res.status).toBe(201);
    expect(res.body.ralat).toBe(false);
    expect(res.body.tempahanId).toBeDefined();
  });

  it('should store order with status Menunggu Pengesahan', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [
          { kategoriId: kategoriId1, pilihanId: pilihanId1 },
          { kategoriId: kategoriId2, pilihanId: pilihanId2 },
        ],
        tarikhAmbil: getFutureDate(5),
        kaedahPenghantaran: 'Ambil Sendiri',
        kaedahBayaran: 'QR Code',
      });

    const tempahanId = res.body.tempahanId;
    const [orders] = await pool.execute(
      'SELECT statusTempahan FROM Tempahan WHERE tempahanId = ?',
      [tempahanId]
    );
    expect(orders[0].statusTempahan).toBe('Menunggu Pengesahan');
  });

  it('should create denormalized ButiranTempahan records', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [
          { kategoriId: kategoriId1, pilihanId: pilihanId1 },
          { kategoriId: kategoriId2, pilihanId: pilihanId2 },
        ],
        tarikhAmbil: getFutureDate(5),
        kaedahPenghantaran: 'Ambil Sendiri',
        kaedahBayaran: 'QR Code',
      });

    const tempahanId = res.body.tempahanId;
    const [details] = await pool.execute(
      'SELECT * FROM ButiranTempahan WHERE tempahanId = ? ORDER BY butiranId ASC',
      [tempahanId]
    );

    expect(details).toHaveLength(2);
    expect(details[0].namaKategori).toBe('Saiz');
    expect(details[0].namaPilihan).toBe('6 inci');
    expect(Number(details[0].hargaTambahan)).toBe(30.00);
    expect(details[1].namaKategori).toBe('Perisa');
    expect(details[1].namaPilihan).toBe('Coklat');
    expect(Number(details[1].hargaTambahan)).toBe(5.00);
  });

  it('should calculate total price as sum of selected option prices', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [
          { kategoriId: kategoriId1, pilihanId: pilihanId3 }, // 8 inci = 50
          { kategoriId: kategoriId2, pilihanId: pilihanId2 }, // Coklat = 5
        ],
        tarikhAmbil: getFutureDate(5),
        kaedahPenghantaran: 'Ambil Sendiri',
        kaedahBayaran: 'QR Code',
      });

    expect(res.status).toBe(201);
    expect(res.body.jumlahHarga).toBe(55); // 50 + 5
  });

  it('should default payment method to QR Code', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [
          { kategoriId: kategoriId1, pilihanId: pilihanId1 },
          { kategoriId: kategoriId2, pilihanId: pilihanId2 },
        ],
        tarikhAmbil: getFutureDate(5),
        kaedahPenghantaran: 'Ambil Sendiri',
      });

    expect(res.status).toBe(201);
    const [orders] = await pool.execute(
      'SELECT kaedahBayaran FROM Tempahan WHERE tempahanId = ?',
      [res.body.tempahanId]
    );
    expect(orders[0].kaedahBayaran).toBe('QR Code');
  });

  it('should store optional notes', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [
          { kategoriId: kategoriId1, pilihanId: pilihanId1 },
          { kategoriId: kategoriId2, pilihanId: pilihanId2 },
        ],
        tarikhAmbil: getFutureDate(5),
        kaedahPenghantaran: 'Ambil Sendiri',
        nota: 'Sila tulis Happy Birthday',
      });

    expect(res.status).toBe(201);
    const [orders] = await pool.execute(
      'SELECT nota FROM Tempahan WHERE tempahanId = ?',
      [res.body.tempahanId]
    );
    expect(orders[0].nota).toBe('Sila tulis Happy Birthday');
  });

  // --- Validation errors ---

  it('should reject empty butiran', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [],
        tarikhAmbil: getFutureDate(5),
        kaedahPenghantaran: 'Ambil Sendiri',
      });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('butiran');
  });

  it('should reject missing butiran', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        tarikhAmbil: getFutureDate(5),
        kaedahPenghantaran: 'Ambil Sendiri',
      });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('butiran');
  });

  it('should reject when not all required categories are selected', async () => {
    // Only select from one category, missing the other
    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [
          { kategoriId: kategoriId1, pilihanId: pilihanId1 },
        ],
        tarikhAmbil: getFutureDate(5),
        kaedahPenghantaran: 'Ambil Sendiri',
      });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('butiran');
  });

  it('should reject missing tarikhAmbil', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [
          { kategoriId: kategoriId1, pilihanId: pilihanId1 },
          { kategoriId: kategoriId2, pilihanId: pilihanId2 },
        ],
        kaedahPenghantaran: 'Ambil Sendiri',
      });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('tarikhAmbil');
  });

  it('should reject date less than 2 days in the future', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [
          { kategoriId: kategoriId1, pilihanId: pilihanId1 },
          { kategoriId: kategoriId2, pilihanId: pilihanId2 },
        ],
        tarikhAmbil: tomorrowStr,
        kaedahPenghantaran: 'Ambil Sendiri',
      });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('tarikhAmbil');
    expect(res.body.kod).toBe('TARIKH_TIDAK_SAH');
  });

  it('should reject date that is a closed date', async () => {
    const futureDate = getFutureDate(5);
    await pool.execute(
      'INSERT INTO TarikhTutup (tarikh) VALUES (?)',
      [futureDate]
    );

    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [
          { kategoriId: kategoriId1, pilihanId: pilihanId1 },
          { kategoriId: kategoriId2, pilihanId: pilihanId2 },
        ],
        tarikhAmbil: futureDate,
        kaedahPenghantaran: 'Ambil Sendiri',
      });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('tarikhAmbil');
    expect(res.body.kod).toBe('TARIKH_TIDAK_SAH');
  });

  it('should reject missing delivery method', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [
          { kategoriId: kategoriId1, pilihanId: pilihanId1 },
          { kategoriId: kategoriId2, pilihanId: pilihanId2 },
        ],
        tarikhAmbil: getFutureDate(5),
      });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('kaedahPenghantaran');
  });

  it('should reject invalid delivery method', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [
          { kategoriId: kategoriId1, pilihanId: pilihanId1 },
          { kategoriId: kategoriId2, pilihanId: pilihanId2 },
        ],
        tarikhAmbil: getFutureDate(5),
        kaedahPenghantaran: 'Drone',
      });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('kaedahPenghantaran');
  });

  it('should reject Penghantaran without address', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [
          { kategoriId: kategoriId1, pilihanId: pilihanId1 },
          { kategoriId: kategoriId2, pilihanId: pilihanId2 },
        ],
        tarikhAmbil: getFutureDate(5),
        kaedahPenghantaran: 'Penghantaran',
      });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('alamatPenghantaran');
  });

  it('should reject address exceeding 255 characters', async () => {
    const longAddress = 'A'.repeat(256);
    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [
          { kategoriId: kategoriId1, pilihanId: pilihanId1 },
          { kategoriId: kategoriId2, pilihanId: pilihanId2 },
        ],
        tarikhAmbil: getFutureDate(5),
        kaedahPenghantaran: 'Penghantaran',
        alamatPenghantaran: longAddress,
      });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('alamatPenghantaran');
  });

  it('should reject notes exceeding 500 characters', async () => {
    const longNota = 'N'.repeat(501);
    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [
          { kategoriId: kategoriId1, pilihanId: pilihanId1 },
          { kategoriId: kategoriId2, pilihanId: pilihanId2 },
        ],
        tarikhAmbil: getFutureDate(5),
        kaedahPenghantaran: 'Ambil Sendiri',
        nota: longNota,
      });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('nota');
  });

  it('should reject invalid option IDs', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [
          { kategoriId: kategoriId1, pilihanId: 99999 },
          { kategoriId: kategoriId2, pilihanId: pilihanId2 },
        ],
        tarikhAmbil: getFutureDate(5),
        kaedahPenghantaran: 'Ambil Sendiri',
      });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
  });

  it('should reject option that does not belong to specified category', async () => {
    // pilihanId2 belongs to kategoriId2, not kategoriId1
    const res = await customerAgent
      .post('/api/pelanggan/tempahan')
      .send({
        butiran: [
          { kategoriId: kategoriId1, pilihanId: pilihanId2 },
          { kategoriId: kategoriId2, pilihanId: pilihanId1 },
        ],
        tarikhAmbil: getFutureDate(5),
        kaedahPenghantaran: 'Ambil Sendiri',
      });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
  });
});
