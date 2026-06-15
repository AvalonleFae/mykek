import pool from '../config/db.js';
import { buildErrorResponse } from '../utils/errorResponse.js';
import { ERROR_CODES, ORDER_STATUS } from '../utils/constants.js';
import { generateTarikhTutupId } from '../utils/idGenerator.js';

/**
 * ClosedDateService — handles business logic for unavailability calendar management.
 */

/**
 * Get all closed dates, ordered by date ascending.
 * @returns {Promise<Array>} List of closed dates
 */
export async function getAllClosedDates() {
  const [rows] = await pool.execute(
    'SELECT tarikhTutupId, tarikh, catatan, tarikhCipta FROM TarikhTutup ORDER BY tarikh ASC'
  );
  return rows;
}

/**
 * Get closed dates from today onwards (for customer date picker).
 * @returns {Promise<Array>} List of future/current closed dates
 */
export async function getClosedDatesForCustomer() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [rows] = await pool.execute(
    'SELECT tarikhTutupId, tarikh, catatan FROM TarikhTutup WHERE tarikh >= ? ORDER BY tarikh ASC',
    [today]
  );
  return rows;
}

/**
 * Add a closed date with validation.
 * @param {{ tarikh: string, catatan?: string }} data
 * @returns {Promise<object>} Result with tarikhTutupId or error
 */
export async function addClosedDate({ tarikh, catatan }) {
  // Validate tarikh is provided
  if (!tarikh || typeof tarikh !== 'string' || tarikh.trim().length === 0) {
    return buildErrorResponse('Tarikh diperlukan.', 'tarikh', ERROR_CODES.MEDAN_KOSONG);
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(tarikh.trim())) {
    return buildErrorResponse('Format tarikh tidak sah. Gunakan format YYYY-MM-DD.', 'tarikh', ERROR_CODES.TARIKH_TIDAK_SAH);
  }

  const dateValue = new Date(tarikh.trim() + 'T00:00:00');
  if (isNaN(dateValue.getTime())) {
    return buildErrorResponse('Tarikh tidak sah.', 'tarikh', ERROR_CODES.TARIKH_TIDAK_SAH);
  }

  // Validate date is today or future (not past)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dateValue < today) {
    return buildErrorResponse(
      'Hanya tarikh hari ini atau masa hadapan boleh ditanda sebagai tidak tersedia.',
      'tarikh',
      ERROR_CODES.TARIKH_TIDAK_SAH
    );
  }

  // Validate catatan length (max 200 chars, optional)
  if (catatan !== undefined && catatan !== null && catatan !== '') {
    if (typeof catatan !== 'string') {
      return buildErrorResponse('Catatan mesti berupa teks.', 'catatan', ERROR_CODES.FORMAT_TIDAK_SAH);
    }
    if (catatan.length > 200) {
      return buildErrorResponse('Catatan tidak boleh melebihi 200 aksara.', 'catatan', ERROR_CODES.PANJANG_TIDAK_SAH);
    }
  }

  // Check if date is already closed
  const [existing] = await pool.execute(
    'SELECT tarikhTutupId FROM TarikhTutup WHERE tarikh = ?',
    [tarikh.trim()]
  );

  if (existing.length > 0) {
    return buildErrorResponse(
      'Tarikh ini sudah ditanda sebagai tidak tersedia.',
      'tarikh',
      ERROR_CODES.TARIKH_TIDAK_SAH
    );
  }

  // Check for pending orders on this date
  const [pendingOrders] = await pool.execute(
    'SELECT COUNT(*) AS jumlah FROM Tempahan WHERE tarikhAmbil = ? AND statusTempahan = ?',
    [tarikh.trim(), ORDER_STATUS.MENUNGGU_PENGESAHAN]
  );

  const pendingCount = pendingOrders[0].jumlah;

  // Insert the closed date
  const catatanValue = (catatan && catatan.trim().length > 0) ? catatan.trim() : null;
  const tarikhTutupId = await generateTarikhTutupId();
  await pool.execute(
    'INSERT INTO TarikhTutup (tarikhTutupId, tarikh, catatan) VALUES (?, ?, ?)',
    [tarikhTutupId, tarikh.trim(), catatanValue]
  );

  const response = {
    berjaya: true,
    mesej: 'Tarikh tutup berjaya ditambah.',
    tarikhTutupId,
  };

  // Add warning if pending orders exist
  if (pendingCount > 0) {
    response.amaran = `Terdapat ${pendingCount} tempahan dengan status "Menunggu Pengesahan" pada tarikh ini.`;
    response.bilanganTempahanMenunggu = pendingCount;
  }

  return response;
}

/**
 * Remove a closed date by ID.
 * @param {number} tarikhTutupId
 * @returns {Promise<object>} Result
 */
export async function removeClosedDate(tarikhTutupId) {
  if (!tarikhTutupId || String(tarikhTutupId).trim() === '') {
    return buildErrorResponse('ID tarikh tutup tidak sah.', null, ERROR_CODES.FORMAT_TIDAK_SAH);
  }

  const [existing] = await pool.execute(
    'SELECT tarikhTutupId FROM TarikhTutup WHERE tarikhTutupId = ?',
    [tarikhTutupId]
  );

  if (existing.length === 0) {
    return buildErrorResponse('Tarikh tutup tidak ditemui.', null, ERROR_CODES.TIDAK_DITEMUI);
  }

  await pool.execute('DELETE FROM TarikhTutup WHERE tarikhTutupId = ?', [tarikhTutupId]);

  return {
    berjaya: true,
    mesej: 'Tarikh tutup berjaya dipadam.',
  };
}
