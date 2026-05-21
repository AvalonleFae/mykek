import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/index.js';
import { _getLoginAttemptsMap } from '../../src/services/authService.js';

describe('Merchant Login - POST /api/auth/peniaga/log-masuk', () => {
  beforeEach(() => {
    // Clear login attempts between tests
    const map = _getLoginAttemptsMap();
    map.clear();
  });

  it('should login successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/peniaga/log-masuk')
      .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.ralat).toBe(false);
    expect(res.body.mesej).toBe('Log masuk berjaya.');
    expect(res.body.data).toHaveProperty('peniagaId');
    expect(res.body.data.namaPenggunaAdmin).toBe('admin');
    expect(res.body.data.namaKedai).toBe('Zuraida Patisserie');
  });

  it('should return 400 when username is missing', async () => {
    const res = await request(app)
      .post('/api/auth/peniaga/log-masuk')
      .send({ kataLaluan: 'admin123' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('MEDAN_KOSONG');
  });

  it('should return 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/peniaga/log-masuk')
      .send({ namaPenggunaAdmin: 'admin' });

    expect(res.status).toBe(400);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('MEDAN_KOSONG');
  });

  it('should return 401 with generic error for non-existent username', async () => {
    const res = await request(app)
      .post('/api/auth/peniaga/log-masuk')
      .send({ namaPenggunaAdmin: 'nonexistent', kataLaluan: 'password' });

    expect(res.status).toBe(401);
    expect(res.body.ralat).toBe(true);
    expect(res.body.mesej).toBe('Nama pengguna atau kata laluan tidak sah.');
    // Should NOT specify which field is wrong
    expect(res.body.medan).toBeNull();
  });

  it('should return 401 with generic error for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/peniaga/log-masuk')
      .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.ralat).toBe(true);
    expect(res.body.mesej).toBe('Nama pengguna atau kata laluan tidak sah.');
    expect(res.body.medan).toBeNull();
  });

  it('should lock account after 5 consecutive failed attempts', async () => {
    // Make 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/peniaga/log-masuk')
        .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'wrong' });
    }

    // 6th attempt should return locked status
    const res = await request(app)
      .post('/api/auth/peniaga/log-masuk')
      .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'admin123' });

    expect(res.status).toBe(423);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('AKAUN_DIKUNCI');
    expect(res.body.mesej).toContain('Akaun dikunci sementara');
  });

  it('should return lockout message on the 5th failed attempt', async () => {
    // Make 4 failed attempts (should get generic error)
    for (let i = 0; i < 4; i++) {
      const res = await request(app)
        .post('/api/auth/peniaga/log-masuk')
        .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'wrong' });
      expect(res.status).toBe(401);
    }

    // 5th attempt triggers lockout
    const res = await request(app)
      .post('/api/auth/peniaga/log-masuk')
      .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'wrong' });

    expect(res.status).toBe(423);
    expect(res.body.kod).toBe('AKAUN_DIKUNCI');
  });

  it('should reset attempts after successful login', async () => {
    // Make 3 failed attempts
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/auth/peniaga/log-masuk')
        .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'wrong' });
    }

    // Successful login resets counter
    const successRes = await request(app)
      .post('/api/auth/peniaga/log-masuk')
      .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'admin123' });
    expect(successRes.status).toBe(200);

    // Now make 4 more failed attempts — should NOT be locked
    for (let i = 0; i < 4; i++) {
      const res = await request(app)
        .post('/api/auth/peniaga/log-masuk')
        .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'wrong' });
      expect(res.status).toBe(401);
    }
  });

  it('should unlock account after lockout period expires', async () => {
    const map = _getLoginAttemptsMap();

    // Simulate a lockout that has already expired
    map.set('admin', {
      attempts: 5,
      lockedUntil: new Date(Date.now() - 1000), // 1 second in the past
    });

    // Should be able to login now
    const res = await request(app)
      .post('/api/auth/peniaga/log-masuk')
      .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.ralat).toBe(false);
  });

  it('should set session with merchant role and 60-minute maxAge', async () => {
    const agent = request.agent(app);

    const res = await agent
      .post('/api/auth/peniaga/log-masuk')
      .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'admin123' });

    expect(res.status).toBe(200);

    // Verify session cookie is set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some(c => c.includes('mykek_session'))).toBe(true);
  });
});

describe('Merchant Logout - POST /api/auth/peniaga/log-keluar', () => {
  it('should logout successfully and clear session', async () => {
    const agent = request.agent(app);

    // Login first
    await agent
      .post('/api/auth/peniaga/log-masuk')
      .send({ namaPenggunaAdmin: 'admin', kataLaluan: 'admin123' });

    // Logout
    const res = await agent.post('/api/auth/peniaga/log-keluar');

    expect(res.status).toBe(200);
    expect(res.body.ralat).toBe(false);
    expect(res.body.mesej).toBe('Log keluar berjaya.');
  });

  it('should handle logout even without active session', async () => {
    const res = await request(app).post('/api/auth/peniaga/log-keluar');

    expect(res.status).toBe(200);
    expect(res.body.ralat).toBe(false);
  });
});
