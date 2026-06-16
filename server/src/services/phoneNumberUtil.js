/**
 * Phone number utility functions for WhatsApp ID normalization.
 * Pure functions with no external dependencies.
 */

/**
 * Strip all non-digit characters from a string.
 * Removes spaces, dashes, parentheses, plus signs, and any other non-digit characters.
 * @param {string} input - Raw input string
 * @returns {string} Digits only
 */
export function stripNonDigits(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  return input.replace(/\D/g, '');
}

/**
 * Normalize a Malaysian phone number to WhatsApp ID format.
 * 1. Strips all non-digit characters
 * 2. Validates prefix is "0" or "60"
 * 3. Validates length (10-15 digits after stripping)
 * 4. Converts leading "0" to "60"
 * 5. Appends "@c.us"
 *
 * @param {string} phoneNumber - Raw phone number input
 * @returns {{ valid: boolean, whatsappId?: string, error?: string }}
 */
export function toWhatsAppId(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return { valid: false, error: 'Nombor telefon diperlukan' };
  }

  const digits = stripNonDigits(phoneNumber);

  if (digits.length === 0) {
    return { valid: false, error: 'Nombor telefon tidak mengandungi digit' };
  }

  // Validate prefix: must start with "0" or "60"
  if (!digits.startsWith('0') && !digits.startsWith('60')) {
    return { valid: false, error: 'Nombor telefon mesti bermula dengan "0" atau "60"' };
  }

  // Validate digit count (10-15 digits)
  if (digits.length < 10 || digits.length > 15) {
    return {
      valid: false,
      error: `Nombor telefon mesti 10-15 digit, didapati ${digits.length} digit`,
    };
  }

  // Normalize: convert leading "0" to "60"
  let normalized;
  if (digits.startsWith('0')) {
    normalized = '60' + digits.slice(1);
  } else {
    normalized = digits;
  }

  return { valid: true, whatsappId: normalized + '@c.us' };
}
