import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import app from '../../src/index.js';
import pool from '../../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper to create an authenticated customer session agent.
 */
async function createCustomerAgent() {
  const agent = request.agent(app);
  await pool.execute(
    "INSERT IGNORE INTO Pelanggan (noTelefon, nama) VALUES ('0191234567', 'Pelanggan Upload Test')"
  );
  await agent
    .post('/api/auth/pelanggan/log-masuk')
    .send({ noTelefon: '0191234567' });
  return agent;
}

/**
 * Helper to create a test order for the customer.
 */
async function createTestOrder() {
  const [customers] = await pool.execute(
    "SELECT pelangganId FROM Pelanggan WHERE noTelefon = '0191234567'"
  );
  const pelangganId = customers[0].pelangganId;

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5);
  const dateStr = futureDate.toISOString().split('T')[0];

  const [result] = await pool.execute(
    `INSERT INTO Tempahan (pelangganId, tarikhAmbil, kaedahPenghantaran, kaedahBayaran, jumlahHarga, statusTempahan, statusBayaran)
     VALUES (?, ?, 'Ambil Sendiri', 'QR Code', 50.00, 'Menunggu Pengesahan', 'Belum Dibayar')`,
    [pelangganId, dateStr]
  );
  return result.insertId;
}

// Create a small test image buffer (1x1 pixel PNG)
const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // 8-bit RGB
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT chunk
  0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
  0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // IEND chunk
  0x44, 0xae, 0x42, 0x60, 0x82,
]);

// Create a test JPEG buffer (minimal valid JPEG)
const JPEG_HEADER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
  0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
  0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);

// Path for temporary test files
const testFilesDir = path.join(__dirname, 'test-files');

describe('Image Upload - POST /api/pelanggan/tempahan/muat-naik-imej', () => {
  let customerAgent;
  let tempahanId;

  beforeAll(async () => {
    // Create test files directory
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }

    // Create test PNG file
    fs.writeFileSync(path.join(testFilesDir, 'test.png'), PNG_HEADER);

    // Create test JPEG file
    fs.writeFileSync(path.join(testFilesDir, 'test.jpg'), JPEG_HEADER);

    // Create a file that's too large (>5MB) - just create a small file and we'll test with a buffer
    const largeBuf = Buffer.alloc(5 * 1024 * 1024 + 1, 0xff);
    // Add PNG header to make it look like a PNG
    PNG_HEADER.copy(largeBuf, 0);
    fs.writeFileSync(path.join(testFilesDir, 'large.png'), largeBuf);

    // Create a text file (invalid format)
    fs.writeFileSync(path.join(testFilesDir, 'test.txt'), 'not an image');

    customerAgent = await createCustomerAgent();
  });

  beforeEach(async () => {
    // Clean up image records
    await pool.execute('DELETE FROM ImejTempahan');
    await pool.execute('DELETE FROM ButiranTempahan');
    await pool.execute('DELETE FROM Tempahan');

    // Create a fresh test order
    tempahanId = await createTestOrder();
  });

  afterAll(async () => {
    // Clean up test data
    await pool.execute('DELETE FROM ImejTempahan');
    await pool.execute('DELETE FROM ButiranTempahan');
    await pool.execute('DELETE FROM Tempahan');
    await pool.execute("DELETE FROM Pelanggan WHERE noTelefon = '0191234567'");

    // Clean up test files
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true });
    }

    // Clean up uploaded test images
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'images');
    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
      if (file !== '.gitkeep') {
        fs.unlinkSync(path.join(uploadsDir, file));
      }
    }

    await pool.end();
  });

  // --- Authentication ---

  it('should return 401 for unauthenticated requests', async () => {
    const res = await request(app)
      .post('/api/pelanggan/tempahan/muat-naik-imej')
      .field('tempahanId', '1');
    expect(res.status).toBe(401);
    expect(res.body.ralat).toBe(true);
  });

  it('should return 403 for merchant role', async () => {
    const merchantAgent = request.agent(app);
    await merchantAgent
      .post('/api/auth/peniaga/log-masuk')
      .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'admin123' });

    const res = await merchantAgent
      .post('/api/pelanggan/tempahan/muat-naik-imej')
      .attach('imej', path.join(testFilesDir, 'test.png'))
      .field('tempahanId', String(tempahanId));
    expect(res.status).toBe(403);
    expect(res.body.ralat).toBe(true);
  });

  // --- Successful upload ---

  it('should upload a PNG image successfully', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan/muat-naik-imej')
      .attach('imej', path.join(testFilesDir, 'test.png'))
      .field('tempahanId', String(tempahanId));

    expect(res.status).toBe(200);
    expect(res.body.ralat).toBe(false);
    expect(res.body.mesej).toBe('Imej berjaya dimuat naik.');
    expect(res.body.imageUrl).toContain('/uploads/images/');
  });

  it('should upload a JPEG image successfully', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan/muat-naik-imej')
      .attach('imej', path.join(testFilesDir, 'test.jpg'))
      .field('tempahanId', String(tempahanId));

    expect(res.status).toBe(200);
    expect(res.body.ralat).toBe(false);
    expect(res.body.imageUrl).toContain('/uploads/images/');
  });

  it('should create ImejTempahan record in database', async () => {
    await customerAgent
      .post('/api/pelanggan/tempahan/muat-naik-imej')
      .attach('imej', path.join(testFilesDir, 'test.png'))
      .field('tempahanId', String(tempahanId));

    const [records] = await pool.execute(
      'SELECT * FROM ImejTempahan WHERE tempahanId = ? AND jenisImej = ?',
      [tempahanId, 'Muat Naik']
    );

    expect(records).toHaveLength(1);
    expect(records[0].urlImej).toContain('/uploads/images/');
    expect(records[0].jenisImej).toBe('Muat Naik');
  });

  it('should replace existing upload image (max 1 per order)', async () => {
    // First upload
    await customerAgent
      .post('/api/pelanggan/tempahan/muat-naik-imej')
      .attach('imej', path.join(testFilesDir, 'test.png'))
      .field('tempahanId', String(tempahanId));

    // Second upload — should replace
    const res = await customerAgent
      .post('/api/pelanggan/tempahan/muat-naik-imej')
      .attach('imej', path.join(testFilesDir, 'test.jpg'))
      .field('tempahanId', String(tempahanId));

    expect(res.status).toBe(200);
    expect(res.body.ralat).toBe(false);

    // Should still have only 1 record
    const [records] = await pool.execute(
      'SELECT * FROM ImejTempahan WHERE tempahanId = ? AND jenisImej = ?',
      [tempahanId, 'Muat Naik']
    );
    expect(records).toHaveLength(1);
  });

  // --- Validation errors ---

  it('should reject file exceeding 5MB', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan/muat-naik-imej')
      .attach('imej', path.join(testFilesDir, 'large.png'))
      .field('tempahanId', String(tempahanId));

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('SAIZ_FAIL_MELEBIHI');
  });

  it('should reject non-image file format', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan/muat-naik-imej')
      .attach('imej', path.join(testFilesDir, 'test.txt'))
      .field('tempahanId', String(tempahanId));

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('FORMAT_TIDAK_SAH');
  });

  it('should reject missing file', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan/muat-naik-imej')
      .field('tempahanId', String(tempahanId));

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('imej');
  });

  it('should reject missing tempahanId', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan/muat-naik-imej')
      .attach('imej', path.join(testFilesDir, 'test.png'));

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('tempahanId');
  });

  it('should reject non-existent order', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan/muat-naik-imej')
      .attach('imej', path.join(testFilesDir, 'test.png'))
      .field('tempahanId', '99999');

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('TIDAK_DITEMUI');
  });

  it('should reject invalid tempahanId format', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan/muat-naik-imej')
      .attach('imej', path.join(testFilesDir, 'test.png'))
      .field('tempahanId', 'abc');

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('FORMAT_TIDAK_SAH');
  });
});
