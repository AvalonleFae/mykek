import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index.js';
import pool from '../../src/config/db.js';

/**
 * Helper to create an authenticated customer session agent.
 */
async function createCustomerAgent() {
  const agent = request.agent(app);
  // Ensure customer exists
  await pool.execute(
    "INSERT IGNORE INTO Pelanggan (noTelefon, nama) VALUES ('0181112222', 'Pelanggan Spec Test')"
  );
  await agent
    .post('/api/auth/pelanggan/log-masuk')
    .send({ noTelefon: '0181112222' });
  return agent;
}

describe('Customer Cake Spec - GET /api/pelanggan/spesifikasi-kek', () => {
  let customerAgent;

  beforeAll(async () => {
    customerAgent = await createCustomerAgent();
  });

  beforeEach(async () => {
    await pool.execute('DELETE FROM PilihanSpesifikasiKek');
    await pool.execute('DELETE FROM KategoriSpesifikasiKek');
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM PilihanSpesifikasiKek');
    await pool.execute('DELETE FROM KategoriSpesifikasiKek');
    await pool.execute("DELETE FROM Pelanggan WHERE noTelefon = '0181112222'");
    await pool.end();
  });

  // --- Authentication ---

  it('should return 401 for unauthenticated requests', async () => {
    const res = await request(app).get('/api/pelanggan/spesifikasi-kek');
    expect(res.status).toBe(401);
    expect(res.body.ralat).toBe(true);
  });

  it('should return 403 for merchant role accessing customer endpoint', async () => {
    const merchantAgent = request.agent(app);
    await merchantAgent
      .post('/api/auth/peniaga/log-masuk')
      .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'admin123' });

    const res = await merchantAgent.get('/api/pelanggan/spesifikasi-kek');
    expect(res.status).toBe(403);
    expect(res.body.ralat).toBe(true);
  });

  // --- Active categories only ---

  it('should return empty array when no active categories exist', async () => {
    const res = await customerAgent.get('/api/pelanggan/spesifikasi-kek');
    expect(res.status).toBe(200);
    expect(res.body.ralat).toBe(false);
    expect(res.body.data).toEqual([]);
  });

  it('should return only active categories', async () => {
    await pool.execute(
      'INSERT INTO KategoriSpesifikasiKek (nama, penerangan, aktif) VALUES (?, ?, ?)',
      ['Saiz', 'Saiz kek', true]
    );
    await pool.execute(
      'INSERT INTO KategoriSpesifikasiKek (nama, penerangan, aktif) VALUES (?, ?, ?)',
      ['Warna', 'Warna kek (dipadam)', false]
    );

    const res = await customerAgent.get('/api/pelanggan/spesifikasi-kek');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].nama).toBe('Saiz');
  });

  it('should return categories with their active options only', async () => {
    // Create active category
    const [catResult] = await pool.execute(
      'INSERT INTO KategoriSpesifikasiKek (nama, penerangan, aktif) VALUES (?, ?, ?)',
      ['Perisa', 'Perisa kek', true]
    );
    const kategoriId = catResult.insertId;

    // Create active and inactive options
    await pool.execute(
      'INSERT INTO PilihanSpesifikasiKek (kategoriId, nama, hargaTambahan, aktif) VALUES (?, ?, ?, ?)',
      [kategoriId, 'Coklat', 5.00, true]
    );
    await pool.execute(
      'INSERT INTO PilihanSpesifikasiKek (kategoriId, nama, hargaTambahan, aktif) VALUES (?, ?, ?, ?)',
      [kategoriId, 'Vanila', 3.00, false]
    );
    await pool.execute(
      'INSERT INTO PilihanSpesifikasiKek (kategoriId, nama, hargaTambahan, aktif) VALUES (?, ?, ?, ?)',
      [kategoriId, 'Strawberi', 6.00, true]
    );

    const res = await customerAgent.get('/api/pelanggan/spesifikasi-kek');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].pilihan).toHaveLength(2);

    const optionNames = res.body.data[0].pilihan.map(p => p.nama);
    expect(optionNames).toContain('Coklat');
    expect(optionNames).toContain('Strawberi');
    expect(optionNames).not.toContain('Vanila');
  });

  it('should not include inactive categories even if they have active options', async () => {
    // Create inactive category with active options
    const [catResult] = await pool.execute(
      'INSERT INTO KategoriSpesifikasiKek (nama, penerangan, aktif) VALUES (?, ?, ?)',
      ['Tema', 'Tema kek', false]
    );
    const kategoriId = catResult.insertId;

    await pool.execute(
      'INSERT INTO PilihanSpesifikasiKek (kategoriId, nama, hargaTambahan, aktif) VALUES (?, ?, ?, ?)',
      [kategoriId, 'Hari Jadi', 10.00, true]
    );

    const res = await customerAgent.get('/api/pelanggan/spesifikasi-kek');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('should return category fields without aktif or tarikhCipta', async () => {
    await pool.execute(
      'INSERT INTO KategoriSpesifikasiKek (nama, penerangan, aktif) VALUES (?, ?, ?)',
      ['Saiz', 'Saiz kek', true]
    );

    const res = await customerAgent.get('/api/pelanggan/spesifikasi-kek');
    expect(res.status).toBe(200);
    const category = res.body.data[0];
    expect(category).toHaveProperty('kategoriId');
    expect(category).toHaveProperty('nama');
    expect(category).toHaveProperty('penerangan');
    expect(category).toHaveProperty('pilihan');
    // Should not expose internal fields
    expect(category).not.toHaveProperty('aktif');
    expect(category).not.toHaveProperty('tarikhCipta');
  });
});
