import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index.js';
import pool from '../../src/config/db.js';

describe('POST /api/auth/pelanggan/daftar - Customer Registration', () => {
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
    // Clean up test data before each test
    await pool.execute('DELETE FROM Pelanggan WHERE noTelefon LIKE ?', ['01%']);
  });

  afterAll(async () => {
    // Clean up after all tests
    await pool.execute('DELETE FROM Pelanggan WHERE noTelefon LIKE ?', ['01%']);
    await pool.end();
  });

  // --- Successful registration ---

  it('should register a customer with valid phone (10 digits) and name', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/daftar')
      .send({ noTelefon: '0123456789', nama: 'Ahmad' });

    expect(res.status).toBe(201);
    expect(res.body.berjaya).toBe(true);
    expect(res.body.mesej).toBe('Pendaftaran berjaya. Sila log masuk.');
    expect(res.body.pelangganId).toBeDefined();
  });

  it('should register a customer with valid phone (11 digits) and name', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/daftar')
      .send({ noTelefon: '01123456789', nama: 'Siti Aminah' });

    expect(res.status).toBe(201);
    expect(res.body.berjaya).toBe(true);
    expect(res.body.pelangganId).toBeDefined();
  });

  it('should trim whitespace from phone and name before storing', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/daftar')
      .send({ noTelefon: ' 0123456789 ', nama: '  Ahmad  ' });

    expect(res.status).toBe(201);
    expect(res.body.berjaya).toBe(true);
  });

  // --- Duplicate phone number ---

  it('should reject registration with duplicate phone number', async () => {
    // First registration
    await request(app)
      .post('/api/auth/pelanggan/daftar')
      .send({ noTelefon: '0123456789', nama: 'Ahmad' });

    // Duplicate attempt
    const res = await request(app)
      .post('/api/auth/pelanggan/daftar')
      .send({ noTelefon: '0123456789', nama: 'Ali' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.mesej).toBe('Nombor telefon sudah didaftarkan');
    expect(res.body.medan).toBe('noTelefon');
    expect(res.body.kod).toBe('PENDAFTARAN_DUPLIKAT');
  });

  // --- Invalid phone number ---

  it('should reject empty phone number', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/daftar')
      .send({ noTelefon: '', nama: 'Ahmad' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('noTelefon');
    expect(res.body.kod).toBe('FORMAT_TIDAK_SAH');
  });

  it('should reject phone number not starting with 01', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/daftar')
      .send({ noTelefon: '0987654321', nama: 'Ahmad' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('noTelefon');
    expect(res.body.kod).toBe('FORMAT_TIDAK_SAH');
  });

  it('should reject phone number with less than 10 digits', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/daftar')
      .send({ noTelefon: '012345678', nama: 'Ahmad' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('noTelefon');
    expect(res.body.kod).toBe('FORMAT_TIDAK_SAH');
  });

  it('should reject phone number with more than 11 digits', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/daftar')
      .send({ noTelefon: '011234567890', nama: 'Ahmad' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('noTelefon');
    expect(res.body.kod).toBe('FORMAT_TIDAK_SAH');
  });

  it('should reject phone number with non-numeric characters', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/daftar')
      .send({ noTelefon: '012-3456789', nama: 'Ahmad' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('noTelefon');
    expect(res.body.kod).toBe('FORMAT_TIDAK_SAH');
  });

  it('should reject missing phone number field', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/daftar')
      .send({ nama: 'Ahmad' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('noTelefon');
  });

  // --- Invalid name ---

  it('should reject empty name', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/daftar')
      .send({ noTelefon: '0123456789', nama: '' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('nama');
    expect(res.body.kod).toBe('MEDAN_KOSONG');
  });

  it('should reject name exceeding 100 characters', async () => {
    const longName = 'A'.repeat(101);
    const res = await request(app)
      .post('/api/auth/pelanggan/daftar')
      .send({ noTelefon: '0123456789', nama: longName });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('nama');
    expect(res.body.kod).toBe('PANJANG_TIDAK_SAH');
  });

  it('should reject missing name field', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/daftar')
      .send({ noTelefon: '0123456789' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('nama');
  });

  it('should reject whitespace-only name', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/daftar')
      .send({ noTelefon: '0123456789', nama: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('nama');
    expect(res.body.kod).toBe('MEDAN_KOSONG');
  });

  // --- Edge cases ---

  it('should accept name with exactly 1 character', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/daftar')
      .send({ noTelefon: '0123456789', nama: 'A' });

    expect(res.status).toBe(201);
    expect(res.body.berjaya).toBe(true);
  });

  it('should accept name with exactly 100 characters', async () => {
    const name100 = 'A'.repeat(100);
    const res = await request(app)
      .post('/api/auth/pelanggan/daftar')
      .send({ noTelefon: '0123456789', nama: name100 });

    expect(res.status).toBe(201);
    expect(res.body.berjaya).toBe(true);
  });
});
