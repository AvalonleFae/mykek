import pool from '../config/db.js';
import { buildErrorResponse } from '../utils/errorResponse.js';
import { IMAGE_TYPE, ERROR_CODES } from '../utils/constants.js';
import { generateImejId } from '../utils/idGenerator.js';

/**
 * Rate limiter for AI image generation.
 */
const rateLimiter = {
  lastRequestTime: 0,
  minIntervalMs: 10000,
  queueCount: 0,
  maxQueuePerMinute: 5,
  minuteStart: 0,
};

function checkRateLimit() {
  const now = Date.now();
  if (now - rateLimiter.minuteStart > 60000) {
    rateLimiter.queueCount = 0;
    rateLimiter.minuteStart = now;
  }
  if (rateLimiter.queueCount >= rateLimiter.maxQueuePerMinute) {
    const waitSeconds = Math.ceil((60000 - (now - rateLimiter.minuteStart)) / 1000);
    return { allowed: false, mesej: `Had penjanaan imej dicapai. Sila cuba lagi dalam ${waitSeconds} saat.` };
  }
  const elapsed = now - rateLimiter.lastRequestTime;
  if (elapsed < rateLimiter.minIntervalMs) {
    const waitSeconds = Math.ceil((rateLimiter.minIntervalMs - elapsed) / 1000);
    return { allowed: false, mesej: `Sila tunggu ${waitSeconds} saat sebelum menjana imej lagi.` };
  }
  return { allowed: true };
}

function recordRequest() {
  rateLimiter.lastRequestTime = Date.now();
  rateLimiter.queueCount += 1;
  if (rateLimiter.minuteStart === 0) rateLimiter.minuteStart = Date.now();
}

/**
 * AI Image Generation (placeholder — actual generation done client-side via Puter.js).
 * This endpoint validates the description and returns a placeholder if no API key.
 */
export async function generateAIImage(description) {
  if (!description || typeof description !== 'string') {
    return buildErrorResponse('Sila masukkan penerangan reka bentuk kek.', 'penerangan', ERROR_CODES.MEDAN_KOSONG);
  }

  const trimmed = description.trim();

  if (trimmed.length < 10) {
    return buildErrorResponse('Penerangan mestilah sekurang-kurangnya 10 aksara.', 'penerangan', ERROR_CODES.PANJANG_TIDAK_SAH);
  }
  if (trimmed.length > 500) {
    return buildErrorResponse('Penerangan tidak boleh melebihi 500 aksara.', 'penerangan', ERROR_CODES.PANJANG_TIDAK_SAH);
  }

  // Check rate limit
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    return buildErrorResponse(rateCheck.mesej, null, 'AI_HAD_KADAR');
  }
  recordRequest();

  // Return placeholder — actual image generation is done client-side via Puter.js
  return {
    ralat: false,
    mesej: 'Imej AI berjaya dijana.',
    imageUrl: 'https://placehold.co/512x512/orange/white?text=Kek+AI',
    prompt: trimmed,
  };
}

/**
 * Upload a reference image for an order.
 */
export async function uploadImage(file, tempahanId) {
  if (!file) {
    return buildErrorResponse('Sila pilih fail imej untuk dimuat naik.', 'imej', ERROR_CODES.MEDAN_KOSONG);
  }
  if (!tempahanId) {
    return buildErrorResponse('ID tempahan diperlukan.', 'tempahanId', ERROR_CODES.MEDAN_KOSONG);
  }

  const orderId = String(tempahanId).trim();
  if (orderId === '') {
    return buildErrorResponse('ID tempahan tidak sah.', 'tempahanId', ERROR_CODES.FORMAT_TIDAK_SAH);
  }

  const [orders] = await pool.execute('SELECT tempahanId FROM Tempahan WHERE tempahanId = ?', [orderId]);
  if (orders.length === 0) {
    return buildErrorResponse('Tempahan tidak ditemui.', 'tempahanId', ERROR_CODES.TIDAK_DITEMUI);
  }

  const imageUrl = `/uploads/images/${file.filename}`;

  const [existing] = await pool.execute(
    'SELECT imejId FROM ImejTempahan WHERE tempahanId = ? AND jenisImej = ?',
    [orderId, IMAGE_TYPE.MUAT_NAIK]
  );

  if (existing.length > 0) {
    await pool.execute('UPDATE ImejTempahan SET urlImej = ?, tarikhMuatNaik = NOW() WHERE imejId = ?', [imageUrl, existing[0].imejId]);
  } else {
    const imejId = await generateImejId();
    await pool.execute(
      'INSERT INTO ImejTempahan (imejId, tempahanId, jenisImej, urlImej, tarikhMuatNaik) VALUES (?, ?, ?, ?, NOW())',
      [imejId, orderId, IMAGE_TYPE.MUAT_NAIK, imageUrl]
    );
  }

  return { ralat: false, mesej: 'Imej berjaya dimuat naik.', imageUrl };
}
