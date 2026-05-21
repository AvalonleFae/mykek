import pool from '../config/db.js';
import { buildErrorResponse } from '../utils/errorResponse.js';
import { IMAGE_TYPE, ERROR_CODES } from '../utils/constants.js';

/**
 * AI Image Generation — mock implementation.
 * Validates description length (10-500 chars), simulates AI API call,
 * returns a placeholder image URL.
 *
 * @param {string} description - Text description of the desired cake design
 * @returns {Promise<object>} Result with imageUrl or error
 */
export async function generateAIImage(description) {
  // Validate description is provided
  if (!description || typeof description !== 'string') {
    return buildErrorResponse(
      'Sila masukkan penerangan reka bentuk kek.',
      'penerangan',
      ERROR_CODES.MEDAN_KOSONG
    );
  }

  const trimmed = description.trim();

  // Validate description length (10-500 chars)
  if (trimmed.length < 10) {
    return buildErrorResponse(
      'Penerangan mestilah sekurang-kurangnya 10 aksara.',
      'penerangan',
      ERROR_CODES.PANJANG_TIDAK_SAH
    );
  }

  if (trimmed.length > 500) {
    return buildErrorResponse(
      'Penerangan tidak boleh melebihi 500 aksara.',
      'penerangan',
      ERROR_CODES.PANJANG_TIDAK_SAH
    );
  }

  // Mock AI API call — simulate the structure of a real API call
  try {
    // In production, this would call an external AI API (e.g., OpenAI DALL-E, Stability AI)
    // For now, return a placeholder image URL
    const imageUrl = `https://placehold.co/512x512/orange/white?text=Kek+AI`;

    return {
      ralat: false,
      mesej: 'Imej AI berjaya dijana.',
      imageUrl,
      prompt: trimmed,
    };
  } catch (error) {
    // Handle AI service unavailability
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return buildErrorResponse(
        'Perkhidmatan AI tidak tersedia buat masa ini. Sila cuba lagi kemudian atau muat naik imej rujukan.',
        null,
        'AI_TIDAK_TERSEDIA'
      );
    }

    // Handle rate limiting
    if (error.status === 429) {
      return buildErrorResponse(
        'Perkhidmatan AI sedang sibuk. Sila cuba lagi kemudian atau muat naik imej rujukan.',
        null,
        'AI_HAD_KADAR'
      );
    }

    throw error;
  }
}

/**
 * Upload a reference image for an order.
 * Stores the file path, creates or replaces the ImejTempahan record (max 1 upload per order).
 *
 * @param {object} file - Multer file object
 * @param {number} tempahanId - Order ID to associate the image with
 * @returns {Promise<object>} Result with imageUrl or error
 */
export async function uploadImage(file, tempahanId) {
  if (!file) {
    return buildErrorResponse(
      'Sila pilih fail imej untuk dimuat naik.',
      'imej',
      ERROR_CODES.MEDAN_KOSONG
    );
  }

  if (!tempahanId) {
    return buildErrorResponse(
      'ID tempahan diperlukan.',
      'tempahanId',
      ERROR_CODES.MEDAN_KOSONG
    );
  }

  // Validate tempahanId is a number
  const orderId = parseInt(tempahanId, 10);
  if (isNaN(orderId)) {
    return buildErrorResponse(
      'ID tempahan tidak sah.',
      'tempahanId',
      ERROR_CODES.FORMAT_TIDAK_SAH
    );
  }

  // Verify the order exists
  const [orders] = await pool.execute(
    'SELECT tempahanId FROM Tempahan WHERE tempahanId = ?',
    [orderId]
  );

  if (orders.length === 0) {
    return buildErrorResponse(
      'Tempahan tidak ditemui.',
      'tempahanId',
      ERROR_CODES.TIDAK_DITEMUI
    );
  }

  // Build the image URL path
  const imageUrl = `/uploads/images/${file.filename}`;

  // Check if an uploaded image already exists for this order — replace it
  const [existing] = await pool.execute(
    'SELECT imejId FROM ImejTempahan WHERE tempahanId = ? AND jenisImej = ?',
    [orderId, IMAGE_TYPE.MUAT_NAIK]
  );

  if (existing.length > 0) {
    // Replace existing record
    await pool.execute(
      'UPDATE ImejTempahan SET urlImej = ?, tarikhMuatNaik = NOW() WHERE imejId = ?',
      [imageUrl, existing[0].imejId]
    );
  } else {
    // Create new record
    await pool.execute(
      'INSERT INTO ImejTempahan (tempahanId, jenisImej, urlImej, tarikhMuatNaik) VALUES (?, ?, ?, NOW())',
      [orderId, IMAGE_TYPE.MUAT_NAIK, imageUrl]
    );
  }

  return {
    ralat: false,
    mesej: 'Imej berjaya dimuat naik.',
    imageUrl,
  };
}
