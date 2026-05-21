import { describe, it, expect } from 'vitest';
import {
  validatePhoneNumber,
  validateNameRegistration,
  validateNameProfile,
  validateAddress,
  validatePrice,
} from '../../src/utils/validators.js';
import { buildErrorResponse } from '../../src/utils/errorResponse.js';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  DELIVERY_METHOD,
  PAYMENT_METHOD,
  IMAGE_TYPE,
  ERROR_CODES,
} from '../../src/utils/constants.js';

describe('validatePhoneNumber', () => {
  it('should accept valid 10-digit phone number starting with 01', () => {
    const result = validatePhoneNumber('0123456789');
    expect(result.sah).toBe(true);
  });

  it('should accept valid 11-digit phone number starting with 01', () => {
    const result = validatePhoneNumber('01234567890');
    expect(result.sah).toBe(true);
  });

  it('should reject empty string', () => {
    const result = validatePhoneNumber('');
    expect(result.sah).toBe(false);
    expect(result.mesej).toBeDefined();
  });

  it('should reject null/undefined', () => {
    expect(validatePhoneNumber(null).sah).toBe(false);
    expect(validatePhoneNumber(undefined).sah).toBe(false);
  });

  it('should reject phone number not starting with 01', () => {
    const result = validatePhoneNumber('0987654321');
    expect(result.sah).toBe(false);
    expect(result.mesej).toContain('01');
  });

  it('should reject phone number with less than 10 digits', () => {
    const result = validatePhoneNumber('012345678');
    expect(result.sah).toBe(false);
  });

  it('should reject phone number with more than 11 digits', () => {
    const result = validatePhoneNumber('012345678901');
    expect(result.sah).toBe(false);
  });

  it('should reject phone number with non-numeric characters', () => {
    const result = validatePhoneNumber('012-3456789');
    expect(result.sah).toBe(false);
    expect(result.mesej).toContain('digit');
  });

  it('should reject phone number with letters', () => {
    const result = validatePhoneNumber('01234abcde');
    expect(result.sah).toBe(false);
  });
});

describe('validateNameRegistration', () => {
  it('should accept name with 1 character', () => {
    const result = validateNameRegistration('A');
    expect(result.sah).toBe(true);
  });

  it('should accept name with 100 characters', () => {
    const result = validateNameRegistration('A'.repeat(100));
    expect(result.sah).toBe(true);
  });

  it('should reject empty string', () => {
    const result = validateNameRegistration('');
    expect(result.sah).toBe(false);
  });

  it('should reject null/undefined', () => {
    expect(validateNameRegistration(null).sah).toBe(false);
    expect(validateNameRegistration(undefined).sah).toBe(false);
  });

  it('should reject name exceeding 100 characters', () => {
    const result = validateNameRegistration('A'.repeat(101));
    expect(result.sah).toBe(false);
    expect(result.mesej).toContain('100');
  });

  it('should reject whitespace-only string', () => {
    const result = validateNameRegistration('   ');
    expect(result.sah).toBe(false);
  });
});

describe('validateNameProfile', () => {
  it('should accept name with 2 characters', () => {
    const result = validateNameProfile('Ab');
    expect(result.sah).toBe(true);
  });

  it('should accept name with 100 characters', () => {
    const result = validateNameProfile('A'.repeat(100));
    expect(result.sah).toBe(true);
  });

  it('should reject name with 1 character', () => {
    const result = validateNameProfile('A');
    expect(result.sah).toBe(false);
    expect(result.mesej).toContain('2');
  });

  it('should reject empty string', () => {
    const result = validateNameProfile('');
    expect(result.sah).toBe(false);
  });

  it('should reject name exceeding 100 characters', () => {
    const result = validateNameProfile('A'.repeat(101));
    expect(result.sah).toBe(false);
  });
});

describe('validateAddress', () => {
  it('should accept empty/null address (optional field)', () => {
    expect(validateAddress('').sah).toBe(true);
    expect(validateAddress(null).sah).toBe(true);
    expect(validateAddress(undefined).sah).toBe(true);
  });

  it('should accept address within 500 characters', () => {
    const result = validateAddress('Jalan Utama, Kuching, Sarawak');
    expect(result.sah).toBe(true);
  });

  it('should accept address with exactly 500 characters', () => {
    const result = validateAddress('A'.repeat(500));
    expect(result.sah).toBe(true);
  });

  it('should reject address exceeding 500 characters', () => {
    const result = validateAddress('A'.repeat(501));
    expect(result.sah).toBe(false);
    expect(result.mesej).toContain('500');
  });
});

describe('validatePrice', () => {
  it('should accept RM 0.00', () => {
    const result = validatePrice(0);
    expect(result.sah).toBe(true);
  });

  it('should accept RM 9999.99', () => {
    const result = validatePrice(9999.99);
    expect(result.sah).toBe(true);
  });

  it('should accept price within range', () => {
    const result = validatePrice(50.5);
    expect(result.sah).toBe(true);
  });

  it('should reject negative price', () => {
    const result = validatePrice(-1);
    expect(result.sah).toBe(false);
  });

  it('should reject price exceeding RM 9999.99', () => {
    const result = validatePrice(10000);
    expect(result.sah).toBe(false);
  });

  it('should reject null/undefined', () => {
    expect(validatePrice(null).sah).toBe(false);
    expect(validatePrice(undefined).sah).toBe(false);
  });

  it('should reject NaN', () => {
    const result = validatePrice(NaN);
    expect(result.sah).toBe(false);
  });

  it('should reject non-number types', () => {
    const result = validatePrice('50');
    expect(result.sah).toBe(false);
  });
});

describe('buildErrorResponse', () => {
  it('should build error response with all fields', () => {
    const response = buildErrorResponse(
      'Nombor telefon sudah didaftarkan',
      'noTelefon',
      'PENDAFTARAN_DUPLIKAT'
    );
    expect(response).toEqual({
      ralat: true,
      mesej: 'Nombor telefon sudah didaftarkan',
      medan: 'noTelefon',
      kod: 'PENDAFTARAN_DUPLIKAT',
    });
  });

  it('should build error response with defaults for optional fields', () => {
    const response = buildErrorResponse('Ralat sistem');
    expect(response).toEqual({
      ralat: true,
      mesej: 'Ralat sistem',
      medan: null,
      kod: null,
    });
  });

  it('should always have ralat set to true', () => {
    const response = buildErrorResponse('Test');
    expect(response.ralat).toBe(true);
  });
});

describe('Constants', () => {
  it('should have all Order_Status values', () => {
    expect(ORDER_STATUS.MENUNGGU_PENGESAHAN).toBe('Menunggu Pengesahan');
    expect(ORDER_STATUS.DITERIMA).toBe('Diterima');
    expect(ORDER_STATUS.DITOLAK).toBe('Ditolak');
    expect(ORDER_STATUS.DIBATALKAN).toBe('Dibatalkan');
    expect(ORDER_STATUS.SEDANG_DIPROSES).toBe('Sedang Diproses');
    expect(ORDER_STATUS.SEDANG_DIHIAS).toBe('Sedang Dihias');
    expect(ORDER_STATUS.SEDIA).toBe('Sedia untuk Diambil/Dihantar');
    expect(ORDER_STATUS.SELESAI).toBe('Selesai');
  });

  it('should have all Payment_Status values', () => {
    expect(PAYMENT_STATUS.BELUM_DIBAYAR).toBe('Belum Dibayar');
    expect(PAYMENT_STATUS.DEPOSIT_DIBAYAR).toBe('Deposit Dibayar');
    expect(PAYMENT_STATUS.TELAH_DIBAYAR).toBe('Telah Dibayar');
  });

  it('should have all Delivery_Method values', () => {
    expect(DELIVERY_METHOD.AMBIL_SENDIRI).toBe('Ambil Sendiri');
    expect(DELIVERY_METHOD.PENGHANTARAN).toBe('Penghantaran');
  });

  it('should have all Payment_Method values', () => {
    expect(PAYMENT_METHOD.QR_CODE).toBe('QR Code');
  });

  it('should have all Image_Type values', () => {
    expect(IMAGE_TYPE.AI).toBe('AI');
    expect(IMAGE_TYPE.MUAT_NAIK).toBe('Muat Naik');
  });

  it('should have error code constants', () => {
    expect(ERROR_CODES.PENDAFTARAN_DUPLIKAT).toBe('PENDAFTARAN_DUPLIKAT');
    expect(ERROR_CODES.FORMAT_TIDAK_SAH).toBe('FORMAT_TIDAK_SAH');
    expect(ERROR_CODES.MEDAN_KOSONG).toBe('MEDAN_KOSONG');
    expect(ERROR_CODES.PANJANG_TIDAK_SAH).toBe('PANJANG_TIDAK_SAH');
    expect(ERROR_CODES.HARGA_TIDAK_SAH).toBe('HARGA_TIDAK_SAH');
  });

  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(ORDER_STATUS)).toBe(true);
    expect(Object.isFrozen(PAYMENT_STATUS)).toBe(true);
    expect(Object.isFrozen(DELIVERY_METHOD)).toBe(true);
    expect(Object.isFrozen(PAYMENT_METHOD)).toBe(true);
    expect(Object.isFrozen(IMAGE_TYPE)).toBe(true);
    expect(Object.isFrozen(ERROR_CODES)).toBe(true);
  });
});
