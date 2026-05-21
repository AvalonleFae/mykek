import bcrypt from 'bcrypt';
import pool from '../config/db.js';
import { validatePhoneNumber, validateNameRegistration } from '../utils/validators.js';
import { buildErrorResponse } from '../utils/errorResponse.js';
import { ERROR_CODES } from '../utils/constants.js';

/**
 * In-memory login attempt tracker.
 * Map<username, { attempts: number, lockedUntil: Date | null }>
 */
const loginAttempts = new Map();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check if a username is currently locked out.
 * @param {string} username
 * @returns {{ locked: boolean, remainingMinutes: number }}
 */
export function checkLoginAttempts(username) {
  const record = loginAttempts.get(username);

  if (!record || !record.lockedUntil) {
    return { locked: false, remainingMinutes: 0 };
  }

  const now = new Date();
  if (now >= record.lockedUntil) {
    // Lockout expired — reset
    loginAttempts.delete(username);
    return { locked: false, remainingMinutes: 0 };
  }

  const remainingMs = record.lockedUntil.getTime() - now.getTime();
  const remainingMinutes = Math.ceil(remainingMs / 60000);
  return { locked: true, remainingMinutes };
}

/**
 * Record a failed login attempt for a username.
 * @param {string} username
 */
function recordFailedAttempt(username) {
  const record = loginAttempts.get(username) || { attempts: 0, lockedUntil: null };
  record.attempts += 1;

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
  }

  loginAttempts.set(username, record);
}

/**
 * Reset login attempts on successful login.
 * @param {string} username
 */
function resetAttempts(username) {
  loginAttempts.delete(username);
}

/**
 * Authenticate a merchant with username and password.
 * @param {{ namaPenggunaAdmin: string, kataLaluan: string }} credentials
 * @returns {{ success: boolean, merchant?: object, error?: { mesej: string, kod?: string } }}
 */
export async function loginMerchant({ namaPenggunaAdmin, kataLaluan }) {
  // Check lockout status
  const lockStatus = checkLoginAttempts(namaPenggunaAdmin);
  if (lockStatus.locked) {
    return {
      success: false,
      error: {
        mesej: `Akaun dikunci sementara. Sila cuba lagi dalam ${lockStatus.remainingMinutes} minit.`,
        kod: 'AKAUN_DIKUNCI',
      },
    };
  }

  // Query merchant by username
  const [rows] = await pool.execute(
    'SELECT peniagaId, namaPenggunaAdmin, kataLaluan, namaKedai FROM Peniaga WHERE namaPenggunaAdmin = ?',
    [namaPenggunaAdmin]
  );

  if (rows.length === 0) {
    recordFailedAttempt(namaPenggunaAdmin);
    // Check if this attempt triggered a lockout
    const newLockStatus = checkLoginAttempts(namaPenggunaAdmin);
    if (newLockStatus.locked) {
      return {
        success: false,
        error: {
          mesej: `Akaun dikunci sementara. Sila cuba lagi dalam ${newLockStatus.remainingMinutes} minit.`,
          kod: 'AKAUN_DIKUNCI',
        },
      };
    }
    return {
      success: false,
      error: {
        mesej: 'Nama pengguna atau kata laluan tidak sah.',
      },
    };
  }

  const merchant = rows[0];

  // Compare password with bcrypt hash
  const passwordMatch = await bcrypt.compare(kataLaluan, merchant.kataLaluan);

  if (!passwordMatch) {
    recordFailedAttempt(namaPenggunaAdmin);
    // Check if this attempt triggered a lockout
    const newLockStatus = checkLoginAttempts(namaPenggunaAdmin);
    if (newLockStatus.locked) {
      return {
        success: false,
        error: {
          mesej: `Akaun dikunci sementara. Sila cuba lagi dalam ${newLockStatus.remainingMinutes} minit.`,
          kod: 'AKAUN_DIKUNCI',
        },
      };
    }
    return {
      success: false,
      error: {
        mesej: 'Nama pengguna atau kata laluan tidak sah.',
      },
    };
  }

  // Successful login — reset attempts
  resetAttempts(namaPenggunaAdmin);

  return {
    success: true,
    merchant: {
      peniagaId: merchant.peniagaId,
      namaPenggunaAdmin: merchant.namaPenggunaAdmin,
      namaKedai: merchant.namaKedai,
    },
  };
}

/**
 * Registers a new customer account.
 * @param {{ noTelefon: string, nama: string }} data - Registration data
 * @returns {Promise<{ berjaya: true, pelangganId: number } | { ralat: true, mesej: string, medan: string|null, kod: string|null }>}
 */
export async function registerCustomer({ noTelefon, nama }) {
  // Validate phone number
  const phoneResult = validatePhoneNumber(noTelefon);
  if (!phoneResult.sah) {
    return buildErrorResponse(
      phoneResult.mesej,
      'noTelefon',
      ERROR_CODES.FORMAT_TIDAK_SAH
    );
  }

  // Validate name
  const nameResult = validateNameRegistration(nama);
  if (!nameResult.sah) {
    return buildErrorResponse(
      nameResult.mesej,
      'nama',
      nama && nama.trim().length > 100
        ? ERROR_CODES.PANJANG_TIDAK_SAH
        : ERROR_CODES.MEDAN_KOSONG
    );
  }

  // Check for duplicate phone number
  const [existing] = await pool.execute(
    'SELECT pelangganId FROM Pelanggan WHERE noTelefon = ?',
    [noTelefon.trim()]
  );

  if (existing.length > 0) {
    return buildErrorResponse(
      'Nombor telefon sudah didaftarkan',
      'noTelefon',
      ERROR_CODES.PENDAFTARAN_DUPLIKAT
    );
  }

  // Insert new customer
  const [result] = await pool.execute(
    'INSERT INTO Pelanggan (noTelefon, nama) VALUES (?, ?)',
    [noTelefon.trim(), nama.trim()]
  );

  return {
    berjaya: true,
    pelangganId: result.insertId,
  };
}

/**
 * Authenticate a customer with phone number only.
 * @param {{ noTelefon: string }} credentials
 * @returns {{ success: boolean, customer?: object, error?: { mesej: string, kod?: string } }}
 */
export async function loginCustomer({ noTelefon }) {
  // Validate phone number format
  const phoneResult = validatePhoneNumber(noTelefon);
  if (!phoneResult.sah) {
    return {
      success: false,
      error: {
        mesej: phoneResult.mesej,
        kod: ERROR_CODES.FORMAT_TIDAK_SAH,
      },
    };
  }

  // Query customer by phone number
  const [rows] = await pool.execute(
    'SELECT pelangganId, noTelefon, nama FROM Pelanggan WHERE noTelefon = ?',
    [noTelefon.trim()]
  );

  if (rows.length === 0) {
    return {
      success: false,
      error: {
        mesej: 'Nombor telefon tidak ditemui. Sila daftar akaun.',
        kod: ERROR_CODES.TIDAK_DITEMUI,
      },
    };
  }

  const customer = rows[0];

  return {
    success: true,
    customer: {
      pelangganId: customer.pelangganId,
      noTelefon: customer.noTelefon,
      nama: customer.nama,
    },
  };
}

/**
 * Expose loginAttempts map for testing purposes.
 */
export function _getLoginAttemptsMap() {
  return loginAttempts;
}
