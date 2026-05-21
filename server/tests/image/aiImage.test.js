import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index.js';
import pool from '../../src/config/db.js';

/**
 * Helper to create an authenticated customer session agent.
 */
async function createCustomerAgent() {
  const agent = request.agent(app);
  await pool.execute(
    "INSERT IGNORE INTO Pelanggan (noTelefon, nama) VALUES ('0181112233', 'Pelanggan Imej Test')"
  );
  await agent
    .post('/api/auth/pelanggan/log-masuk')
    .send({ noTelefon: '0181112233' });
  return agent;
}

describe('AI Image Generation - POST /api/pelanggan/tempahan/jana-imej', () => {
  let customerAgent;

  beforeAll(async () => {
    customerAgent = await createCustomerAgent();
  });

  afterAll(async () => {
    await pool.execute("DELETE FROM Pelanggan WHERE noTelefon = '0181112233'");
    await pool.end();
  });

  // --- Authentication ---

  it('should return 401 for unauthenticated requests', async () => {
    const res = await request(app)
      .post('/api/pelanggan/tempahan/jana-imej')
      .send({ penerangan: 'Kek coklat dengan bunga merah' });
    expect(res.status).toBe(401);
    expect(res.body.ralat).toBe(true);
  });

  it('should return 403 for merchant role', async () => {
    const merchantAgent = request.agent(app);
    await merchantAgent
      .post('/api/auth/peniaga/log-masuk')
      .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'admin123' });

    const res = await merchantAgent
      .post('/api/pelanggan/tempahan/jana-imej')
      .send({ penerangan: 'Kek coklat dengan bunga merah' });
    expect(res.status).toBe(403);
    expect(res.body.ralat).toBe(true);
  });

  // --- Successful generation ---

  it('should generate an AI image with valid description (10 chars)', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan/jana-imej')
      .send({ penerangan: 'Kek coklat' }); // exactly 10 chars

    expect(res.status).toBe(200);
    expect(res.body.ralat).toBe(false);
    expect(res.body.mesej).toBe('Imej AI berjaya dijana.');
    expect(res.body.imageUrl).toBeDefined();
    expect(res.body.prompt).toBe('Kek coklat');
  });

  it('should generate an AI image with valid description (500 chars)', async () => {
    const longDesc = 'K'.repeat(500);
    const res = await customerAgent
      .post('/api/pelanggan/tempahan/jana-imej')
      .send({ penerangan: longDesc });

    expect(res.status).toBe(200);
    expect(res.body.ralat).toBe(false);
    expect(res.body.imageUrl).toBeDefined();
  });

  it('should return a placeholder image URL', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan/jana-imej')
      .send({ penerangan: 'Kek coklat dengan hiasan bunga merah dan biru' });

    expect(res.status).toBe(200);
    expect(res.body.imageUrl).toContain('placehold.co');
  });

  // --- Validation errors ---

  it('should reject empty description', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan/jana-imej')
      .send({ penerangan: '' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('penerangan');
  });

  it('should reject missing description', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan/jana-imej')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('penerangan');
  });

  it('should reject description shorter than 10 characters', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan/jana-imej')
      .send({ penerangan: 'Kek cokla' }); // 9 chars

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('penerangan');
    expect(res.body.kod).toBe('PANJANG_TIDAK_SAH');
  });

  it('should reject description longer than 500 characters', async () => {
    const longDesc = 'K'.repeat(501);
    const res = await customerAgent
      .post('/api/pelanggan/tempahan/jana-imej')
      .send({ penerangan: longDesc });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('penerangan');
    expect(res.body.kod).toBe('PANJANG_TIDAK_SAH');
  });

  it('should reject non-string description', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan/jana-imej')
      .send({ penerangan: 12345 });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.medan).toBe('penerangan');
  });

  it('should trim whitespace and validate length', async () => {
    const res = await customerAgent
      .post('/api/pelanggan/tempahan/jana-imej')
      .send({ penerangan: '   abc   ' }); // trimmed = 3 chars

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('PANJANG_TIDAK_SAH');
  });
});
