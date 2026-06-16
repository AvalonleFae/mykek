import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { generateOTP, verifyOTP, cleanExpired, _getStore } from '../otpService.js';

describe('otpService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Clear the OTP store before each test
    _getStore().clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 1. 6-digit code generation
  describe('generateOTP - code format', () => {
    it('should store a 6-digit numeric code (000000-999999)', () => {
      const result = generateOTP('0121234567', { nama: 'Ahmad' });
      expect(result.berjaya).toBe(true);

      const entry = _getStore().get('0121234567');
      expect(entry).toBeDefined();
      expect(entry.code).toMatch(/^\d{6}$/);
    });
  });

  // 2. 5-minute expiry
  describe('generateOTP - expiry', () => {
    it('should be verifiable within 5 minutes', () => {
      generateOTP('0121234567', { nama: 'Ahmad' });
      const code = _getStore().get('0121234567').code;

      // Advance 4 minutes 59 seconds (still within 5 minutes)
      vi.advanceTimersByTime(299_000);

      const result = verifyOTP('0121234567', code);
      expect(result.sah).toBe(true);
    });

    it('should fail verification after 5 minutes', () => {
      generateOTP('0121234567', { nama: 'Ahmad' });
      const code = _getStore().get('0121234567').code;

      // Advance past 5 minutes
      vi.advanceTimersByTime(300_001);

      const result = verifyOTP('0121234567', code);
      expect(result.sah).toBe(false);
      expect(result.perluKodBaharu).toBe(true);
    });
  });

  // 3. Successful verification
  describe('verifyOTP - success', () => {
    it('should return { sah: true, registrationData } for correct code', () => {
      const regData = { nama: 'Ahmad', alamat: '123 Jalan Utama' };
      generateOTP('0121234567', regData);
      const code = _getStore().get('0121234567').code;

      const result = verifyOTP('0121234567', code);
      expect(result.sah).toBe(true);
      expect(result.registrationData).toEqual(regData);
    });

    it('should remove entry from store after successful verification', () => {
      generateOTP('0121234567', { nama: 'Ahmad' });
      const code = _getStore().get('0121234567').code;

      verifyOTP('0121234567', code);
      expect(_getStore().has('0121234567')).toBe(false);
    });
  });

  // 4. Incorrect code with attempt tracking
  describe('verifyOTP - incorrect code', () => {
    it('should return { sah: false, percubaanBaki: N } for wrong code', () => {
      generateOTP('0121234567', { nama: 'Ahmad' });

      const result = verifyOTP('0121234567', '000000');
      expect(result.sah).toBe(false);
      expect(result.percubaanBaki).toBeDefined();
      expect(typeof result.percubaanBaki).toBe('number');
    });

    it('should decrement remaining attempts on each wrong attempt', () => {
      generateOTP('0121234567', { nama: 'Ahmad' });
      // The code uses MAX_ATTEMPTS = 3, stored as initial attempts value
      // First wrong attempt
      const r1 = verifyOTP('0121234567', '999998');
      expect(r1.sah).toBe(false);
      expect(r1.percubaanBaki).toBe(2);

      // Second wrong attempt
      const r2 = verifyOTP('0121234567', '999998');
      expect(r2.sah).toBe(false);
      expect(r2.percubaanBaki).toBe(1);
    });
  });

  // 5. Code invalidation after 3 failed attempts
  describe('verifyOTP - max attempts exhausted', () => {
    it('should delete entry and return perluKodBaharu after 3 failed attempts', () => {
      generateOTP('0121234567', { nama: 'Ahmad' });

      verifyOTP('0121234567', '999991');
      verifyOTP('0121234567', '999992');
      const result = verifyOTP('0121234567', '999993');

      expect(result.sah).toBe(false);
      expect(result.perluKodBaharu).toBe(true);
      expect(_getStore().has('0121234567')).toBe(false);
    });
  });

  // 6. 60-second rate limiting
  describe('generateOTP - rate limiting', () => {
    it('should reject new code request within 60 seconds', () => {
      generateOTP('0121234567', { nama: 'Ahmad' });

      // Advance 30 seconds (still within rate limit)
      vi.advanceTimersByTime(30_000);

      const result = generateOTP('0121234567', { nama: 'Ahmad' });
      expect(result.ralat).toBe(true);
      expect(result.tunggSaat).toBeDefined();
      expect(result.tunggSaat).toBeGreaterThan(0);
      expect(result.tunggSaat).toBeLessThanOrEqual(60);
    });

    it('should allow new code request after 60 seconds', () => {
      generateOTP('0121234567', { nama: 'Ahmad' });

      // Advance past 60 seconds
      vi.advanceTimersByTime(60_001);

      const result = generateOTP('0121234567', { nama: 'Ahmad' });
      expect(result.berjaya).toBe(true);
    });
  });

  // 7. No entry found
  describe('verifyOTP - no entry', () => {
    it('should return perluKodBaharu when phone number has no OTP entry', () => {
      const result = verifyOTP('0199999999', '123456');
      expect(result.sah).toBe(false);
      expect(result.perluKodBaharu).toBe(true);
    });
  });

  // 8. cleanExpired removes expired entries
  describe('cleanExpired', () => {
    it('should remove entries with past expiresAt', () => {
      generateOTP('0121234567', { nama: 'Ahmad' });
      generateOTP('0191234567', { nama: 'Ali' });

      // Advance time past the expiry of both entries
      vi.advanceTimersByTime(300_001);

      cleanExpired();

      expect(_getStore().has('0121234567')).toBe(false);
      expect(_getStore().has('0191234567')).toBe(false);
    });

    it('should not remove entries that have not expired', () => {
      generateOTP('0121234567', { nama: 'Ahmad' });

      // Advance time but stay within expiry
      vi.advanceTimersByTime(60_001); // Past rate limit but within expiry

      cleanExpired();

      expect(_getStore().has('0121234567')).toBe(true);
    });
  });

  // 9. Registration data preservation
  describe('verifyOTP - registration data preservation', () => {
    it('should store registrationData and return it on successful verify', () => {
      const regData = { nama: 'Siti', alamat: '456 Jalan Besar' };
      generateOTP('0121234567', regData);
      const code = _getStore().get('0121234567').code;

      const result = verifyOTP('0121234567', code);
      expect(result.sah).toBe(true);
      expect(result.registrationData).toEqual(regData);
    });
  });

  // Property-based tests
  describe('Property-based tests', () => {
    /**
     * **Validates: Requirements 2.2**
     * For any phone number and registrationData, generateOTP always produces
     * a 6-digit code stored in the map.
     */
    it('generateOTP always produces a 6-digit code stored in the map', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 15 }).filter(s => /^\d+$/.test(s)),
          fc.record({ nama: fc.string({ minLength: 1 }), alamat: fc.string() }),
          (phone, regData) => {
            _getStore().clear();

            const result = generateOTP(phone, regData);
            expect(result.berjaya).toBe(true);

            const entry = _getStore().get(phone);
            expect(entry).toBeDefined();
            expect(entry.code).toMatch(/^\d{6}$/);
            // Code should be in range 000000–999999
            const codeNum = parseInt(entry.code, 10);
            expect(codeNum).toBeGreaterThanOrEqual(0);
            expect(codeNum).toBeLessThanOrEqual(999999);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.3**
     * For any stored code, verifying with the exact same code always succeeds
     * (if not expired).
     */
    it('verifying with the exact stored code always succeeds if not expired', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 15 }).filter(s => /^\d+$/.test(s)),
          fc.record({ nama: fc.string({ minLength: 1 }), alamat: fc.string() }),
          (phone, regData) => {
            _getStore().clear();

            generateOTP(phone, regData);
            const storedCode = _getStore().get(phone).code;

            const result = verifyOTP(phone, storedCode);
            expect(result.sah).toBe(true);
            expect(result.registrationData).toEqual(regData);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
