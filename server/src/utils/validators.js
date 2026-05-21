/**
 * Shared validation utility functions for MyKek system.
 */

/**
 * Validates Malaysian phone number format.
 * Must be 10-11 digits starting with "01".
 * @param {string} noTelefon - Phone number to validate
 * @returns {{ sah: boolean, mesej?: string }}
 */
export function validatePhoneNumber(noTelefon) {
  if (!noTelefon || typeof noTelefon !== 'string') {
    return { sah: false, mesej: 'Nombor telefon diperlukan' };
  }

  const trimmed = noTelefon.trim();

  if (trimmed.length === 0) {
    return { sah: false, mesej: 'Nombor telefon diperlukan' };
  }

  // Must be numeric only
  if (!/^\d+$/.test(trimmed)) {
    return { sah: false, mesej: 'Nombor telefon hanya boleh mengandungi digit' };
  }

  // Must start with "01"
  if (!trimmed.startsWith('01')) {
    return { sah: false, mesej: 'Nombor telefon mesti bermula dengan "01"' };
  }

  // Must be 10-11 digits
  if (trimmed.length < 10 || trimmed.length > 11) {
    return { sah: false, mesej: 'Nombor telefon mesti 10-11 digit' };
  }

  return { sah: true };
}

/**
 * Validates name for registration (1-100 characters).
 * @param {string} nama - Name to validate
 * @returns {{ sah: boolean, mesej?: string }}
 */
export function validateNameRegistration(nama) {
  if (!nama || typeof nama !== 'string') {
    return { sah: false, mesej: 'Nama diperlukan' };
  }

  const trimmed = nama.trim();

  if (trimmed.length === 0) {
    return { sah: false, mesej: 'Nama diperlukan' };
  }

  if (trimmed.length > 100) {
    return { sah: false, mesej: 'Nama tidak boleh melebihi 100 aksara' };
  }

  return { sah: true };
}

/**
 * Validates name for profile update (2-100 characters).
 * @param {string} nama - Name to validate
 * @returns {{ sah: boolean, mesej?: string }}
 */
export function validateNameProfile(nama) {
  if (!nama || typeof nama !== 'string') {
    return { sah: false, mesej: 'Nama diperlukan' };
  }

  const trimmed = nama.trim();

  if (trimmed.length < 2) {
    return { sah: false, mesej: 'Nama mesti sekurang-kurangnya 2 aksara' };
  }

  if (trimmed.length > 100) {
    return { sah: false, mesej: 'Nama tidak boleh melebihi 100 aksara' };
  }

  return { sah: true };
}

/**
 * Validates address length (≤500 characters).
 * Address is optional but if provided must not exceed 500 chars.
 * @param {string} alamat - Address to validate
 * @returns {{ sah: boolean, mesej?: string }}
 */
export function validateAddress(alamat) {
  if (alamat === null || alamat === undefined || alamat === '') {
    return { sah: true }; // Address is optional
  }

  if (typeof alamat !== 'string') {
    return { sah: false, mesej: 'Alamat mesti berupa teks' };
  }

  if (alamat.length > 500) {
    return { sah: false, mesej: 'Alamat tidak boleh melebihi 500 aksara' };
  }

  return { sah: true };
}

/**
 * Validates price range (RM 0.00 - RM 9999.99).
 * @param {number} harga - Price to validate
 * @returns {{ sah: boolean, mesej?: string }}
 */
export function validatePrice(harga) {
  if (harga === null || harga === undefined) {
    return { sah: false, mesej: 'Harga diperlukan' };
  }

  if (typeof harga !== 'number' || isNaN(harga)) {
    return { sah: false, mesej: 'Harga mesti berupa nombor' };
  }

  if (harga < 0) {
    return { sah: false, mesej: 'Harga tidak boleh kurang daripada RM 0.00' };
  }

  if (harga > 9999.99) {
    return { sah: false, mesej: 'Harga tidak boleh melebihi RM 9999.99' };
  }

  return { sah: true };
}
