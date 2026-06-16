import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { stripNonDigits, toWhatsAppId } from '../../src/services/phoneNumberUtil.js';

describe('phoneNumberUtil', () => {
  describe('stripNonDigits', () => {
    it('strips spaces from input', () => {
      expect(stripNonDigits('012 345 6789')).toBe('0123456789');
    });

    it('strips dashes from input', () => {
      expect(stripNonDigits('012-345-6789')).toBe('0123456789');
    });

    it('strips parentheses from input', () => {
      expect(stripNonDigits('(012)3456789')).toBe('0123456789');
    });

    it('strips plus sign from input', () => {
      expect(stripNonDigits('+60121234567')).toBe('60121234567');
    });

    it('strips mixed non-digit characters', () => {
      expect(stripNonDigits('+60 12-123 4567')).toBe('60121234567');
    });

    it('returns empty string for null input', () => {
      expect(stripNonDigits(null)).toBe('');
    });

    it('returns empty string for undefined input', () => {
      expect(stripNonDigits(undefined)).toBe('');
    });

    it('returns empty string for non-string input', () => {
      expect(stripNonDigits(12345)).toBe('');
    });
  });

  describe('toWhatsAppId', () => {
    it('converts "0" prefix to "60" prefix', () => {
      const result = toWhatsAppId('0121234567');
      expect(result).toEqual({ valid: true, whatsappId: '60121234567@c.us' });
    });

    it('handles numbers already prefixed with "60"', () => {
      const result = toWhatsAppId('60121234567');
      expect(result).toEqual({ valid: true, whatsappId: '60121234567@c.us' });
    });

    it('strips non-digit characters before processing', () => {
      const result = toWhatsAppId('+60 12-123 4567');
      expect(result).toEqual({ valid: true, whatsappId: '60121234567@c.us' });
    });

    it('rejects numbers with fewer than 10 digits', () => {
      const result = toWhatsAppId('012345678'); // 9 digits
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects numbers with more than 15 digits', () => {
      const result = toWhatsAppId('0123456789012345'); // 16 digits
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects numbers not starting with "0" or "60"', () => {
      const result = toWhatsAppId('1234567890');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns { valid: false } for null input', () => {
      const result = toWhatsAppId(null);
      expect(result.valid).toBe(false);
    });

    it('returns { valid: false } for empty string input', () => {
      const result = toWhatsAppId('');
      expect(result.valid).toBe(false);
    });

    it('returns { valid: false } for undefined input', () => {
      const result = toWhatsAppId(undefined);
      expect(result.valid).toBe(false);
    });

    it('never throws exceptions for any string input', () => {
      const inputs = [null, undefined, '', '   ', 'abc', '!!!', '0', '60', '999999999999999999'];
      for (const input of inputs) {
        expect(() => toWhatsAppId(input)).not.toThrow();
      }
    });
  });

  describe('Property-based tests', () => {
    /**
     * **Validates: Requirements 7.1, 7.2, 7.3**
     *
     * For any valid Malaysian number (10-15 digits starting with 0 or 60),
     * toWhatsAppId always returns { valid: true } with a whatsappId ending in "@c.us"
     */
    it('valid Malaysian numbers always produce a valid whatsappId ending in @c.us', () => {
      // Generator: Malaysian numbers starting with "0" (10-15 digits total)
      const validMalaysianWithZero = fc.integer({ min: 8, max: 13 }).chain((extraDigits) =>
        fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
          minLength: extraDigits,
          maxLength: extraDigits,
        }).map((suffix) => '0' + '1' + suffix)
      );

      // Generator: Malaysian numbers starting with "60" (10-15 digits total)
      const validMalaysianWith60 = fc.integer({ min: 7, max: 12 }).chain((extraDigits) =>
        fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
          minLength: extraDigits,
          maxLength: extraDigits,
        }).map((suffix) => '60' + '1' + suffix)
      );

      const validMalaysianNumber = fc.oneof(validMalaysianWithZero, validMalaysianWith60);

      fc.assert(
        fc.property(validMalaysianNumber, (phoneNumber) => {
          const result = toWhatsAppId(phoneNumber);
          expect(result.valid).toBe(true);
          expect(result.whatsappId).toBeDefined();
          expect(result.whatsappId.endsWith('@c.us')).toBe(true);
          // After normalization, should start with "60"
          expect(result.whatsappId.startsWith('60')).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 7.4, 7.5**
     *
     * For any string with <10 or >15 digits after stripping,
     * toWhatsAppId returns { valid: false }
     */
    it('strings with fewer than 10 digits after stripping return { valid: false }', () => {
      // Generate strings that have fewer than 10 digit characters
      const shortDigitString = fc.integer({ min: 0, max: 9 }).chain((numDigits) => {
        // Mix digits with non-digit chars, but ensure total digits < 10
        const digits = fc.stringOf(
          fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
          { minLength: numDigits, maxLength: numDigits }
        );
        const nonDigits = fc.stringOf(
          fc.constantFrom(' ', '-', '(', ')', '+', 'a', 'b'),
          { minLength: 0, maxLength: 5 }
        );
        return fc.tuple(digits, nonDigits).map(([d, nd]) => nd + d + nd);
      });

      fc.assert(
        fc.property(shortDigitString, (input) => {
          const result = toWhatsAppId(input);
          expect(result.valid).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('strings with more than 15 digits after stripping return { valid: false }', () => {
      // Generate strings that have more than 15 digit characters
      const longDigitString = fc.integer({ min: 16, max: 25 }).chain((numDigits) => {
        const digits = fc.stringOf(
          fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
          { minLength: numDigits, maxLength: numDigits }
        );
        const nonDigits = fc.stringOf(
          fc.constantFrom(' ', '-', '+'),
          { minLength: 0, maxLength: 3 }
        );
        return fc.tuple(digits, nonDigits).map(([d, nd]) => nd + d);
      });

      fc.assert(
        fc.property(longDigitString, (input) => {
          const result = toWhatsAppId(input);
          expect(result.valid).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });
});
