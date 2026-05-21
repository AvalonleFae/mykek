import pool from '../config/db.js';
import { buildErrorResponse } from '../utils/errorResponse.js';
import { IMAGE_TYPE, ERROR_CODES } from '../utils/constants.js';

/**
 * Rate limiter for AI image generation.
 * Limits to 1 request per 10 seconds, max 5 per minute.
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
 * AI Image Generation using PixAI API.
 * Falls back to placeholder if PIXAI_API_TOKEN is not set.
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

  try {
    const apiToken = process.env.PIXAI_API_TOKEN;
    const browserId = process.env.PIXAI_BROWSER_ID;

    if (!apiToken) {
      return {
        ralat: false,
        mesej: 'Imej AI berjaya dijana (mod demo).',
        imageUrl: 'https://placehold.co/512x512/orange/white?text=Kek+AI',
        prompt: trimmed,
      };
    }

    // Check rate limit
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      return buildErrorResponse(rateCheck.mesej, null, 'AI_HAD_KADAR');
    }
    recordRequest();

    // Call PixAI GraphQL API to create generation task
    const response = await fetch(
      'https://api.pixai.art/graphql',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${apiToken}`,
          'x-browser-id': browserId || '',
        },
        body: JSON.stringify({
          operationName: 'createGenerationTask',
          variables: {
            parameters: {
              extra: {
                naturalPrompts: trimmed,
              },
              priority: 1000,
              width: 1280,
              height: 768,
              prompts: trimmed,
              modelId: '1983308862240288769',
              negativePrompts: 'worst quality, bad anatomy, blur, low resolution',
              samplingMethod: 'Euler a',
              seed: '',
              inferenceProfile: 'lite',
              batchSize: 3,
              controlNets: [],
              lightning: false,
              promptHelper: {
                withStage: true,
                userWantToEnable: true,
                forcePromptHelperDetectionSide: 'server',
              },
            },
          },
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash: '7a92ee49fb71cc301ef72fac2537cdc2d2ca78fbd520ae4d2c5b3900e7108c5a',
            },
          },
        }),
      }
    );

    if (response.status === 429) {
      rateLimiter.minIntervalMs = Math.min(rateLimiter.minIntervalMs + 5000, 30000);
      return buildErrorResponse('Perkhidmatan AI sedang sibuk. Sila cuba lagi dalam 30 saat atau muat naik imej rujukan.', null, 'AI_HAD_KADAR');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PixAI API error:', response.status, errorText);
      return buildErrorResponse('Perkhidmatan AI tidak tersedia buat masa ini. Sila cuba lagi kemudian atau muat naik imej rujukan.', null, 'AI_TIDAK_TERSEDIA');
    }

    rateLimiter.minIntervalMs = 10000;
    const data = await response.json();
    console.log('PixAI createGenerationTask response:', JSON.stringify(data, null, 2));

    // PixAI returns a task ID — we need to poll for the result
    const taskId = data?.data?.createGenerationTask?.id;

    if (!taskId) {
      console.error('PixAI: No task ID returned', JSON.stringify(data));
      return buildErrorResponse('Perkhidmatan AI tidak tersedia buat masa ini. Sila cuba lagi kemudian atau muat naik imej rujukan.', null, 'AI_TIDAK_TERSEDIA');
    }

    // Poll for task completion (max 60 seconds, check every 5 seconds)
    const imageUrl = await pollForResult(taskId, apiToken, browserId);

    if (imageUrl) {
      return {
        ralat: false,
        mesej: 'Imej AI berjaya dijana.',
        imageUrl,
        prompt: trimmed,
      };
    }

    // Timeout or no result
    return buildErrorResponse('Penjanaan imej mengambil masa terlalu lama. Sila cuba lagi atau muat naik imej rujukan.', null, 'AI_TIDAK_TERSEDIA');
  } catch (error) {
    console.error('Image generation error:', error);
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.name === 'TypeError') {
      return buildErrorResponse('Perkhidmatan AI tidak tersedia buat masa ini. Sila cuba lagi kemudian atau muat naik imej rujukan.', null, 'AI_TIDAK_TERSEDIA');
    }
    throw error;
  }
}

/**
 * Poll PixAI for task completion using getTaskById query.
 * @param {string} taskId - The generation task ID
 * @param {string} apiToken - Bearer token
 * @param {string} browserId - Browser ID header
 * @returns {Promise<string|null>} Image URL or null if timeout
 */
async function pollForResult(taskId, apiToken, browserId) {
  const maxAttempts = 12; // 12 * 5s = 60 seconds max
  const pollInterval = 5000; // 5 seconds

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    try {
      const variables = JSON.stringify({ id: taskId });
      const extensions = JSON.stringify({
        clientLibrary: { name: '@apollo/client', version: '4.1.4' },
        persistedQuery: {
          version: 1,
          sha256Hash: 'b3b4495fe4f54a1db80618d91c31ddccaac0253fa40518ed045cd7ae2806e642',
        },
      });

      const url = `https://api.pixai.art/graphql?operationName=getTaskById&variables=${encodeURIComponent(variables)}&extensions=${encodeURIComponent(extensions)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${apiToken}`,
          'x-browser-id': browserId || '',
        },
      });

      if (!response.ok) {
        console.error(`PixAI poll attempt ${i + 1}: HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      console.log(`PixAI poll attempt ${i + 1}:`, JSON.stringify(data, null, 2));

      const task = data?.data?.task;

      if (!task) continue;

      // Check if task is completed
      if (task.status === 'completed') {
        // Extract image URL from task outputs/media
        const outputs = task.outputs || [];
        if (Array.isArray(outputs) && outputs.length > 0) {
          const firstOutput = outputs[0];
          if (typeof firstOutput === 'string') return firstOutput;
          if (firstOutput?.url) return firstOutput.url;
          if (firstOutput?.mediaUrl) return firstOutput.mediaUrl;
        }

        // Check media array
        const media = task.media || [];
        if (Array.isArray(media) && media.length > 0) {
          const firstMedia = media[0];
          if (typeof firstMedia === 'string') return firstMedia;
          if (firstMedia?.url) return firstMedia.url;
          if (firstMedia?.urls?.regular) return firstMedia.urls.regular;
          if (firstMedia?.urls?.original) return firstMedia.urls.original;
        }

        // Check direct URL fields
        if (task.url) return task.url;
        if (task.imageUrl) return task.imageUrl;
        if (task.mediaUrl) return task.mediaUrl;

        console.log('PixAI task completed but no image URL found in response');
        return null;
      }

      // If task failed, stop polling
      if (task.status === 'failed' || task.status === 'error') {
        console.error('PixAI task failed:', task.status, task.error || '');
        return null;
      }

      // Otherwise keep polling (status is 'pending' or 'processing' or 'queued')
      console.log(`PixAI task status: ${task.status}, continuing to poll...`);
    } catch (error) {
      console.error(`PixAI poll attempt ${i + 1} error:`, error.message);
    }
  }

  return null; // Timeout
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

  const orderId = parseInt(tempahanId, 10);
  if (isNaN(orderId)) {
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
    await pool.execute(
      'INSERT INTO ImejTempahan (tempahanId, jenisImej, urlImej, tarikhMuatNaik) VALUES (?, ?, ?, NOW())',
      [orderId, IMAGE_TYPE.MUAT_NAIK, imageUrl]
    );
  }

  return { ralat: false, mesej: 'Imej berjaya dimuat naik.', imageUrl };
}
