import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authMiddleware, roleGuard } from '../../src/middleware/auth.js';

/**
 * Helper to create a mock request object with session data.
 */
function createMockReq(sessionData = {}) {
  return {
    session: {
      userId: sessionData.userId || null,
      role: sessionData.role || null,
      lastAccess: sessionData.lastAccess || undefined,
      cookie: { _expires: null },
      destroy: sessionData.destroy || vi.fn((cb) => cb(null)),
      ...sessionData,
    },
  };
}

/**
 * Helper to create a mock response object.
 */
function createMockRes() {
  const res = {
    statusCode: null,
    body: null,
    cookieCleared: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.body = data;
      return res;
    },
    clearCookie(name) {
      res.cookieCleared = name;
      return res;
    },
  };
  return res;
}

describe('authMiddleware', () => {
  it('should return 401 when session is missing', () => {
    const req = { session: null };
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('SESI_TAMAT');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when session has no userId', () => {
    const req = createMockReq({ userId: null, role: 'pelanggan' });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('SESI_TAMAT');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when session has no role', () => {
    const req = createMockReq({ userId: 1, role: null });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('SESI_TAMAT');
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next() for valid authenticated session', () => {
    const req = createMockReq({ userId: 1, role: 'pelanggan' });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('should call next() for valid merchant session', () => {
    const req = createMockReq({ userId: 1, role: 'peniaga' });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('should update lastAccess on successful authentication', () => {
    const req = createMockReq({ userId: 1, role: 'pelanggan' });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(req.session.lastAccess).toBeDefined();
    expect(typeof req.session.lastAccess).toBe('number');
  });

  it('should return 401 when merchant session has been inactive for more than 60 minutes', () => {
    const sixtyOneMinutesAgo = Date.now() - (61 * 60 * 1000);
    const destroyFn = vi.fn((cb) => cb(null));
    const req = createMockReq({
      userId: 1,
      role: 'peniaga',
      lastAccess: sixtyOneMinutesAgo,
      destroy: destroyFn,
    });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(destroyFn).toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('SESI_TAMAT');
    expect(res.body.mesej).toContain('Sesi anda telah tamat');
    expect(res.cookieCleared).toBe('mykek_session');
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow merchant session within 60 minutes of inactivity', () => {
    const fiftyNineMinutesAgo = Date.now() - (59 * 60 * 1000);
    const req = createMockReq({
      userId: 1,
      role: 'peniaga',
      lastAccess: fiftyNineMinutesAgo,
    });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('should return 401 when customer session has been inactive for more than 24 hours', () => {
    const twentyFiveHoursAgo = Date.now() - (25 * 60 * 60 * 1000);
    const destroyFn = vi.fn((cb) => cb(null));
    const req = createMockReq({
      userId: 1,
      role: 'pelanggan',
      lastAccess: twentyFiveHoursAgo,
      destroy: destroyFn,
    });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(destroyFn).toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('SESI_TAMAT');
    expect(res.cookieCleared).toBe('mykek_session');
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow customer session within 24 hours of inactivity', () => {
    const twentyThreeHoursAgo = Date.now() - (23 * 60 * 60 * 1000);
    const req = createMockReq({
      userId: 1,
      role: 'pelanggan',
      lastAccess: twentyThreeHoursAgo,
    });
    const res = createMockRes();
    const next = vi.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });
});

describe('roleGuard', () => {
  it('should call next() when user has the required role (pelanggan)', () => {
    const req = createMockReq({ userId: 1, role: 'pelanggan' });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = roleGuard('pelanggan');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('should call next() when user has the required role (peniaga)', () => {
    const req = createMockReq({ userId: 1, role: 'peniaga' });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = roleGuard('peniaga');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('should return 403 when pelanggan tries to access peniaga resource', () => {
    const req = createMockReq({ userId: 1, role: 'pelanggan' });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = roleGuard('peniaga');
    middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('AKSES_DITOLAK');
    expect(res.body.mesej).toBe('Akses ditolak.');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 when peniaga tries to access pelanggan resource', () => {
    const req = createMockReq({ userId: 1, role: 'peniaga' });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = roleGuard('pelanggan');
    middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('AKSES_DITOLAK');
    expect(res.body.mesej).toBe('Akses ditolak.');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 for unknown role trying to access pelanggan resource', () => {
    const req = createMockReq({ userId: 1, role: 'unknown' });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = roleGuard('pelanggan');
    middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.ralat).toBe(true);
    expect(res.body.kod).toBe('AKSES_DITOLAK');
    expect(next).not.toHaveBeenCalled();
  });
});
