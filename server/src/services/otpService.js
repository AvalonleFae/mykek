/**
 * OTP Service - In-memory OTP generation, validation, and rate limiting.
 * No external dependencies required.
 */

/** @type {Map<string, { code: string, expiresAt: number, attempts: number, lastRequestAt: number, registrationData: object }>} */
const otpStore = new Map();

const OTP_EXPIRY_MS = 300_000; // 5 minutes
const RATE_LIMIT_MS = 60_000; // 60 seconds
const MAX_ATTEMPTS = 3;
const CLEANUP_INTERVAL_MS = 600_000; // 10 minutes

/**
 * Generate a 6-digit numeric OTP code (zero-padded).
 * @returns {string} 6-digit code string (000000–999999)
 */
function generateCode() {
  const code = Math.floor(Math.random() * 1_000_000);
  return code.toString().padStart(6, '0');
}

/**
 * Generate and store a new OTP for a phone number.
 * Enforces 60-second cooldown between requests for the same number.
 * @param {string} noTelefon - Phone number (key)
 * @param {object} registrationData - Data to preserve during verification (e.g., { nama, alamat })
 * @returns {{ berjaya: boolean } | { ralat: true, mesej: string, tunggSaat: number }}
 */
export function generateOTP(noTelefon, registrationData) {
  const now = Date.now();
  const existing = otpStore.get(noTelefon);

  // Enforce 60-second rate limit
  if (existing && existing.lastRequestAt) {
    const elapsed = now - existing.lastRequestAt;
    if (elapsed < RATE_LIMIT_MS) {
      const tunggSaat = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
      return {
        ralat: true,
        mesej: `Sila tunggu ${tunggSaat} saat sebelum meminta kod baharu.`,
        tunggSaat,
      };
    }
  }

  const code = generateCode();

  otpStore.set(noTelefon, {
    code,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: MAX_ATTEMPTS,
    lastRequestAt: now,
    registrationData,
  });

  return { berjaya: true };
}

/**
 * Verify an OTP code for a phone number.
 * @param {string} noTelefon - Phone number
 * @param {string} kod - 6-digit code submitted by user
 * @returns {{ sah: boolean, registrationData?: object, ralat?: boolean, mesej?: string, percubaanBaki?: number, perluKodBaharu?: boolean }}
 */
export function verifyOTP(noTelefon, kod) {
  const entry = otpStore.get(noTelefon);

  // No entry found
  if (!entry) {
    return {
      sah: false,
      ralat: true,
      mesej: 'Tiada kod pengesahan untuk nombor ini. Sila minta kod baharu.',
      perluKodBaharu: true,
    };
  }

  // Check expiry
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(noTelefon);
    return {
      sah: false,
      ralat: true,
      mesej: 'Kod telah tamat tempoh. Sila minta kod baharu.',
      perluKodBaharu: true,
    };
  }

  // Code matches
  if (entry.code === kod) {
    const { registrationData } = entry;
    otpStore.delete(noTelefon);
    return { sah: true, registrationData };
  }

  // Code doesn't match — decrement attempts
  entry.attempts -= 1;

  if (entry.attempts <= 0) {
    // All attempts exhausted — invalidate
    otpStore.delete(noTelefon);
    return {
      sah: false,
      ralat: true,
      mesej: 'Kod pengesahan tidak sah. Tiada percubaan lagi. Sila minta kod baharu.',
      perluKodBaharu: true,
    };
  }

  return {
    sah: false,
    ralat: true,
    mesej: 'Kod pengesahan tidak sah.',
    percubaanBaki: entry.attempts,
  };
}

/**
 * Remove all expired OTP entries from the store.
 */
export function cleanExpired() {
  const now = Date.now();
  for (const [phone, entry] of otpStore) {
    if (entry.expiresAt < now) {
      otpStore.delete(phone);
    }
  }
}

/**
 * Expose the internal store for testing purposes.
 * @returns {Map}
 */
export function _getStore() {
  return otpStore;
}

// Start cleanup interval on module load
const cleanupInterval = setInterval(cleanExpired, CLEANUP_INTERVAL_MS);

// Allow the process to exit cleanly without the interval keeping it alive
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}
