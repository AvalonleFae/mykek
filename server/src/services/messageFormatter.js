/**
 * Message Formatter Module
 *
 * Pure functions for building Malay-language WhatsApp notification messages.
 * All messages follow: "MyKek" header → blank line → body.
 * Currency format: "RM X,XXX.XX"
 * Date format: DD/MM/YYYY
 * Max message length: 4,096 characters
 */

const MAX_MESSAGE_LENGTH = 4096;
const HEADER = 'MyKek';

/**
 * Format a number as Malaysian Ringgit currency.
 * @param {number} amount - The numeric amount
 * @returns {string} Formatted string like "RM 1,500.00"
 */
export function formatCurrency(amount) {
  const num = Number(amount);
  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const isNegative = intPart.startsWith('-');
  const digits = isNegative ? intPart.slice(1) : intPart;

  // Add comma thousands separator
  let result = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) {
      result += ',';
    }
    result += digits[i];
  }

  return `RM ${isNegative ? '-' : ''}${result}.${decPart}`;
}

/**
 * Format a Date or date string as DD/MM/YYYY (zero-padded).
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date like "15/01/2025"
 */
export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Truncate a message to 4,096 characters, preserving the MyKek header.
 * @param {string} message - Full message content
 * @returns {string} Truncated message (if needed)
 */
export function truncateMessage(message) {
  if (message.length <= MAX_MESSAGE_LENGTH) {
    return message;
  }
  // Preserve header and truncate body
  const truncated = message.slice(0, MAX_MESSAGE_LENGTH - 3) + '...';
  return truncated;
}

/**
 * Format order confirmation message for customer.
 * @param {object} tempahan - Order object with tempahanId, tarikhAmbil, kaedahPenghantaran, jumlahHarga, statusTempahan
 * @param {string} namaPelanggan - Customer name
 * @returns {string} Formatted message
 */
export function formatOrderConfirmation(tempahan, namaPelanggan) {
  const message = [
    HEADER,
    '',
    `Hai ${namaPelanggan},`,
    '',
    'Tempahan anda telah berjaya dihantar! 🎂',
    '',
    `📋 No. Tempahan: ${tempahan.tempahanId}`,
    `📅 Tarikh Ambil: ${formatDate(tempahan.tarikhAmbil)}`,
    `🚗 Kaedah: ${tempahan.kaedahPenghantaran}`,
    `💰 Jumlah: ${formatCurrency(tempahan.jumlahHarga)}`,
    `📌 Status: ${tempahan.statusTempahan}`,
    '',
    'Kami akan maklumkan apabila tempahan anda diterima. Terima kasih!',
  ].join('\n');

  return truncateMessage(message);
}

/**
 * Format new order notification message for merchant.
 * @param {object} tempahan - Order object with tempahanId, tarikhAmbil, jumlahHarga, kaedahPenghantaran
 * @param {string} namaPelanggan - Customer name
 * @returns {string} Formatted message
 */
export function formatNewOrderMerchant(tempahan, namaPelanggan) {
  const message = [
    HEADER,
    '',
    'Tempahan Baharu! 🔔',
    '',
    `📋 No. Tempahan: ${tempahan.tempahanId}`,
    `👤 Pelanggan: ${namaPelanggan}`,
    `📅 Tarikh Ambil: ${formatDate(tempahan.tarikhAmbil)}`,
    `💰 Jumlah: ${formatCurrency(tempahan.jumlahHarga)}`,
    `🚗 Kaedah: ${tempahan.kaedahPenghantaran}`,
    '',
    'Sila semak dan terima/tolak tempahan ini.',
  ].join('\n');

  return truncateMessage(message);
}

/**
 * Format status change notification for customer.
 * @param {object} tempahan - Order object with tempahanId, statusTempahan, kaedahPenghantaran, sebabTolak
 * @param {string} namaPelanggan - Customer name
 * @returns {string} Formatted message
 */
export function formatStatusChange(tempahan, namaPelanggan) {
  const status = tempahan.statusTempahan;
  let body;

  if (status === 'Diterima') {
    body = [
      `Hai ${namaPelanggan},`,
      '',
      `Tempahan anda (${tempahan.tempahanId}) telah diterima! ✅`,
      '',
      'Peniaga akan mula menyediakan kek anda. Kami akan maklumkan apabila siap.',
    ];
  } else if (status === 'Ditolak') {
    const sebab = tempahan.sebabTolak && tempahan.sebabTolak.trim()
      ? tempahan.sebabTolak.trim()
      : 'Tiada sebab khusus diberikan';

    // Avoid double punctuation if sebab already ends with . or ! or ?
    const sebabFormatted = /[.!?]$/.test(sebab) ? sebab : `${sebab}.`;

    body = [
      `Hai ${namaPelanggan},`,
      '',
      `Maaf, tempahan anda (${tempahan.tempahanId}) tidak dapat diterima. ❌`,
      '',
      `Sebab: ${sebabFormatted}`,
      '',
      'Sila buat tempahan baharu dengan tarikh lain.',
    ];
  } else if (status === 'Siap') {
    const isPickup = tempahan.kaedahPenghantaran === 'Ambil Sendiri';

    body = [
      `Hai ${namaPelanggan},`,
      '',
      `Tempahan anda (${tempahan.tempahanId}) sudah siap! 🎉`,
      '',
      isPickup
        ? 'Sila datang untuk mengambil kek anda.'
        : 'Kek anda akan dihantar mengikut alamat yang diberikan.',
    ];
  } else {
    // Should not be called for other statuses, but handle gracefully
    return '';
  }

  const message = [HEADER, '', ...body].join('\n');
  return truncateMessage(message);
}

/**
 * Format OTP verification message for customer.
 * @param {string} code - 6-digit OTP code
 * @param {string} namaPelanggan - Customer name
 * @returns {string} Formatted message
 */
export function formatOTPMessage(code, namaPelanggan) {
  const message = [
    HEADER,
    '',
    `Hai ${namaPelanggan},`,
    '',
    `Kod pengesahan anda ialah: ${code}`,
    '',
    'Kod ini sah untuk 5 minit. Jangan kongsi kod ini dengan sesiapa.',
  ].join('\n');

  return truncateMessage(message);
}
