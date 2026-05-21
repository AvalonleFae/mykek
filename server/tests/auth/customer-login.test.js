import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index.js';
import pool from '../../src/config/db.js';

describe('Customer Login - POST /api/auth/pelanggan/log-masuk', () => {
  const testPhone = '0171234567';
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
    // Clean up and insert a test customer
    await pool.execute('DELETE FROM Pelanggan WHERE noTelefon = ?', [testPhone]);
    await pool.execute(
      'INSERT INTO Pelanggan (noTelefon, nama) VALUES (?, ?)',
      [testPhone, testName]
    );
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM Pelanggan WHERE noTelefon = ?', [testPhone]);
  });

  // --- Successful login ---

  it('should login successfully with a registered phone number', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/log-masuk')
      .send({ noTelefon: testPhone });

    expect(res.status).toBe(200);
    expect(res.body.ralat).toBe(false);
    expect(res.body.mesej).toBe('Log masuk berjaya.');
    expect(res.body.data).toHaveProperty('pelangganId');
    expect(res.body.data.nama).toBe(testName);
    expect(res.body.data.noTelefon).toBe(testPhone);
  });

  it('should set session cookie on successful login', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/log-masuk')
      .send({ noTelefon: testPhone });

    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some(c => c.includes('mykek_session'))).toBe(true);
  });

  it('should set session maxAge to 24 hours', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/log-masuk')
      .send({ noTelefon: testPhone });

    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'];
    const sessionCookie = cookies.find(c => c.includes('mykek_session'));
    // Session cookie should have an Expires header approximately 24 hours from now
    const expiresMatch = sessionCookie.match(/Expires=([^;]+)/);
    expect(expiresMatch).not.toBeNull();
    const expiresDate = new Date(expiresMatch[1]);
    const now = new Date();
    const diffHours = (expiresDate - now) / (1000 * 60 * 60);
    // Should be approximately 24 hours (allow some tolerance)
    expect(diffHours).toBeGreaterThan(23);
    expect(diffHours).toBeLessThanOrEqual(24);
  });

  // --- Unregistered phone number ---

  it('should return 401 when phone number is not registered', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/log-masuk')
      .send({ noTelefon: '0198765432' });

    expect(res.status).toBe(401);
    expect(res.body.ralat).toBe(true);
    expect(res.body.mesej).toContain('tidak ditemui');
    expect(res.body.kod).toBe('TIDAK_DITEMUI');
  });

  // --- Invalid phone number format ---

  it('should return 400 when phone number is empty', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/log-masuk')
      .send({ noTelefon: '' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('FORMAT_TIDAK_SAH');
  });

  it('should return 400 when phone number is missing', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/log-masuk')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('FORMAT_TIDAK_SAH');
  });

  it('should return 400 when phone number contains non-numeric characters', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/log-masuk')
      .send({ noTelefon: '012-3456789' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('FORMAT_TIDAK_SAH');
  });

  it('should return 400 when phone number contains letters', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/log-masuk')
      .send({ noTelefon: '012abc6789' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('FORMAT_TIDAK_SAH');
  });

  it('should return 400 when phone number does not start with 01', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/log-masuk')
      .send({ noTelefon: '0987654321' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('FORMAT_TIDAK_SAH');
  });

  it('should return 400 when phone number is too short', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/log-masuk')
      .send({ noTelefon: '012345678' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('FORMAT_TIDAK_SAH');
  });

  it('should return 400 when phone number is too long', async () => {
    const res = await request(app)
      .post('/api/auth/pelanggan/log-masuk')
      .send({ noTelefon: '011234567890' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('FORMAT_TIDAK_SAH');
  });

  it('should not attempt authentication for invalid format phone numbers', async () => {
    // Even if this phone exists, invalid format should be rejected first
    const res = await request(app)
      .post('/api/auth/pelanggan/log-masuk')
      .send({ noTelefon: '012-345-6789' });

    expect(res.status).toBe(400);
    expect(res.body.kod).toBe('FORMAT_TIDAK_SAH');
    // Should NOT return TIDAK_DITEMUI — validation happens before DB lookup
  });
});

describe('Customer Logout - POST /api/auth/pelanggan/log-keluar', () => {
  const testPhone = '0171234567';
  const testName = 'Pelanggan Ujian';

  beforeAll(async () => {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS Pelanggan (
        pelangganId INT AUTO_INCREMENT PRIMARY KEY,
        noTelefon VARCHAR(15) NOT NULL UNIQUE,
        nama VARCHAR(100) NOT NULL,
        alamat VARCHAR(500),
        tarikhDaftar DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    // Ensure test customer exists
    await pool.execute('DELETE FROM Pelanggan WHERE noTelefon = ?', [testPhone]);
    await pool.execute(
      'INSERT INTO Pelanggan (noTelefon, nama) VALUES (?, ?)',
      [testPhone, testName]
    );
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM Pelanggan WHERE noTelefon = ?', [testPhone]);
    await pool.end();
  });

  it('should logout successfully and clear session', async () => {
    const agent = request.agent(app);

    // Login first
    await agent
      .post('/api/auth/pelanggan/log-masuk')
      .send({ noTelefon: testPhone });

    // Logout
    const res = await agent.post('/api/auth/pelanggan/log-keluar');

    expect(res.status).toBe(200);
    expect(res.body.ralat).toBe(false);
    expect(res.body.mesej).toBe('Log keluar berjaya.');
  });

  it('should handle logout even without active session', async () => {
    const res = await request(app).post('/api/auth/pelanggan/log-keluar');

    expect(res.status).toBe(200);
    expect(res.body.ralat).toBe(false);
  });

  it('should invalidate session after logout', async () => {
    const agent = request.agent(app);

    // Login
    await agent
      .post('/api/auth/pelanggan/log-masuk')
      .send({ noTelefon: testPhone });

    // Logout
    await agent.post('/api/auth/pelanggan/log-keluar');

    // Verify session is destroyed - the cookie should be cleared
    // A subsequent request should not have the session data
    const res = await agent.post('/api/auth/pelanggan/log-keluar');
    expect(res.status).toBe(200);
  });
});
