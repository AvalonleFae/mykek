/**
 * WhatsApp Service (Singleton Module)
 *
 * Manages the wwebjs Client lifecycle: initialization, QR pairing,
 * reconnection, message queuing, and message sending.
 *
 * All notification functions are fire-and-forget and never throw to callers.
 */

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import QRCode from 'qrcode';
import { toWhatsAppId } from './phoneNumberUtil.js';
import {
  formatOrderConfirmation,
  formatNewOrderMerchant,
  formatStatusChange,
  formatOTPMessage,
  formatOrderCancelled,
  formatOrderCancelledMerchant,
} from './messageFormatter.js';
import pool from '../config/db.js';

// --- Connection States ---
export const CONNECTION_STATE = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  QR_REQUIRED: 'qr_required',
  INITIALIZING: 'initializing',
};

// --- Internal State ---
let client = null;
let connectionState = CONNECTION_STATE.DISCONNECTED;
let latestQR = null;
let reconnectAttempts = 0;
let reconnectTimer = null;

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_INTERVAL_MS = 10000;
const MAX_QUEUE_SIZE = 100;
const MESSAGE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/** @type {Array<{ whatsappId: string, message: string, queuedAt: number }>} */
let messageQueue = [];

// --- Feature Flag ---
function isEnabled() {
  return process.env.WHATSAPP_ENABLED === 'true';
}

// --- Queue Helpers ---

/**
 * Add a message to the queue.
 * @returns {{ queued: boolean, error?: string }}
 */
function enqueue(whatsappId, message) {
  if (messageQueue.length >= MAX_QUEUE_SIZE) {
    return { queued: false, error: 'Giliran mesej penuh (max 100). Sila cuba sebentar lagi.' };
  }
  messageQueue.push({ whatsappId, message, queuedAt: Date.now() });
  return { queued: true };
}

/**
 * Flush the queue by sending all messages in FIFO order.
 */
async function flushQueue() {
  const pending = [...messageQueue];
  messageQueue = [];

  for (const entry of pending) {
    try {
      await client.sendMessage(entry.whatsappId, entry.message);
    } catch (err) {
      console.error(`[WhatsApp] Gagal hantar mesej dari giliran ke ${entry.whatsappId}:`, err.message);
    }
  }
}

/**
 * Discard queued messages older than 24 hours.
 */
function discardOldMessages() {
  const now = Date.now();
  messageQueue = messageQueue.filter((entry) => now - entry.queuedAt < MESSAGE_MAX_AGE_MS);
}

// --- Reconnection Logic ---

function attemptReconnection() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error(`[WhatsApp] Semua ${MAX_RECONNECT_ATTEMPTS} percubaan penyambungan semula gagal.`);
    connectionState = CONNECTION_STATE.DISCONNECTED;
    discardOldMessages();
    reconnectAttempts = 0;
    return;
  }

  reconnectAttempts++;
  console.log(`[WhatsApp] Percubaan penyambungan semula ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);

  reconnectTimer = setTimeout(async () => {
    try {
      await client.initialize();
    } catch (err) {
      console.error(`[WhatsApp] Percubaan ${reconnectAttempts} gagal:`, err.message);
      attemptReconnection();
    }
  }, RECONNECT_INTERVAL_MS);
}

// --- Event Handlers ---

function setupEventHandlers() {
  client.on('qr', (qr) => {
    latestQR = qr;
    connectionState = CONNECTION_STATE.QR_REQUIRED;
    console.log('[WhatsApp] Kod QR dijana. Sila imbas.');
  });

  client.on('authenticated', () => {
    console.log('[WhatsApp] Pengesahan berjaya.');
  });

  client.on('auth_failure', (msg) => {
    console.error('[WhatsApp] Pengesahan gagal:', msg);
    connectionState = CONNECTION_STATE.QR_REQUIRED;
    latestQR = null;
    // Session is invalid — client will auto-generate a new QR
  });

  client.on('ready', async () => {
    connectionState = CONNECTION_STATE.CONNECTED;
    latestQR = null;
    reconnectAttempts = 0;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    console.log('[WhatsApp] Klien sedia dan tersambung.');

    // Flush queued messages
    if (messageQueue.length > 0) {
      console.log(`[WhatsApp] Menghantar ${messageQueue.length} mesej dari giliran...`);
      await flushQueue();
    }
  });

  client.on('disconnected', (reason) => {
    console.warn(`[WhatsApp] Terputus: ${reason}`);
    connectionState = CONNECTION_STATE.DISCONNECTED;
    latestQR = null;
    attemptReconnection();
  });
}

// --- Exported Functions ---

/**
 * Initialize the WhatsApp client. Call once at server startup.
 */
export async function initialize() {
  if (!isEnabled()) {
    console.log('[WhatsApp] Ciri WhatsApp dinyahaktifkan (WHATSAPP_ENABLED != true).');
    return;
  }

  const sessionPath = process.env.WHATSAPP_SESSION_PATH || '.wwebjs_auth';
  const puppeteerArgs = (process.env.WHATSAPP_PUPPETEER_ARGS || '--no-sandbox')
    .split(',')
    .map((arg) => arg.trim());

  connectionState = CONNECTION_STATE.INITIALIZING;

  const puppeteerOpts = {
    args: puppeteerArgs,
  };

  // Use system Chrome if WHATSAPP_CHROME_PATH is set (avoids needing bundled Chromium)
  if (process.env.WHATSAPP_CHROME_PATH) {
    puppeteerOpts.executablePath = process.env.WHATSAPP_CHROME_PATH;
  }

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: sessionPath }),
    puppeteer: puppeteerOpts,
  });

  setupEventHandlers();

  try {
    await client.initialize();
  } catch (err) {
    console.error('[WhatsApp] Gagal memulakan klien:', err.message);
    connectionState = CONNECTION_STATE.DISCONNECTED;
  }
}

/**
 * Get current connection status.
 * @returns {{ status: string, isReady: boolean }}
 */
export function getStatus() {
  return {
    status: connectionState,
    isReady: connectionState === CONNECTION_STATE.CONNECTED,
  };
}

/**
 * Get the latest QR code string, or null if none available.
 * @returns {string|null}
 */
export function getQRCode() {
  return latestQR;
}

/**
 * Convert the latest QR string to a data URL using qrcode package.
 * @returns {Promise<string|null>}
 */
export async function getQrDataUrl() {
  if (!latestQR) return null;
  try {
    return await QRCode.toDataURL(latestQR);
  } catch (err) {
    console.error('[WhatsApp] Gagal menjana QR data URL:', err.message);
    return null;
  }
}

/**
 * Send a WhatsApp message. Queues if disconnected.
 * @param {string} phoneNumber - Raw phone number (Malaysian format)
 * @param {string} message - Message content
 * @returns {Promise<{ sent: boolean, queued: boolean, error?: string }>}
 */
export async function sendMessage(phoneNumber, message) {
  if (!isEnabled()) {
    console.log('[WhatsApp] WhatsApp disabled, skipping message');
    return { sent: false, queued: false, error: 'WhatsApp disabled' };
  }

  const result = toWhatsAppId(phoneNumber);
  if (!result.valid) {
    return { sent: false, queued: false, error: result.error };
  }

  const { whatsappId } = result;

  if (connectionState !== CONNECTION_STATE.CONNECTED) {
    const queueResult = enqueue(whatsappId, message);
    if (!queueResult.queued) {
      return { sent: false, queued: false, error: queueResult.error };
    }
    return { sent: false, queued: true };
  }

  try {
    await client.sendMessage(whatsappId, message);
    console.log(`[WhatsApp] ✅ Mesej berjaya dihantar ke ${whatsappId}`);
    return { sent: true, queued: false };
  } catch (err) {
    console.error(`[WhatsApp] ❌ Gagal hantar mesej ke ${whatsappId}:`, err.message);
    // Queue on send failure
    const queueResult = enqueue(whatsappId, message);
    if (!queueResult.queued) {
      return { sent: false, queued: false, error: queueResult.error };
    }
    console.warn(`[WhatsApp] Mesej dimasukkan ke giliran untuk ${whatsappId} (${messageQueue.length} dalam giliran)`);
    // Schedule a queue flush attempt in 10 seconds (client is connected, transient failure)
    setTimeout(() => {
      if (connectionState === CONNECTION_STATE.CONNECTED && messageQueue.length > 0) {
        console.log(`[WhatsApp] Cuba semula giliran mesej (${messageQueue.length} mesej)...`);
        flushQueue().catch((e) => console.error('[WhatsApp] Gagal flush giliran:', e.message));
      }
    }, 10000);
    return { sent: false, queued: true };
  }
}

/**
 * Check if a phone number is registered on WhatsApp.
 * @param {string} phoneNumber - Raw phone number
 * @returns {Promise<boolean>}
 */
export async function isRegisteredUser(phoneNumber) {
  if (!isEnabled()) {
    console.log('[WhatsApp] WhatsApp disabled, skipping isRegisteredUser check');
    return false;
  }

  const result = toWhatsAppId(phoneNumber);
  if (!result.valid) {
    return false;
  }

  try {
    const isRegistered = await client.isRegisteredUser(result.whatsappId);
    return isRegistered;
  } catch (err) {
    console.error(`[WhatsApp] Gagal semak pengguna berdaftar:`, err.message);
    return false;
  }
}

/**
 * Send OTP message for phone verification.
 * @param {string} phoneNumber - Target phone number
 * @param {string} code - 6-digit OTP code
 * @param {string} namaPelanggan - Customer name
 * @returns {Promise<{ sent: boolean, queued: boolean, error?: string }>}
 */
export async function sendOTP(phoneNumber, code, namaPelanggan) {
  if (!isEnabled()) {
    console.log('[WhatsApp] WhatsApp disabled, skipping message');
    return { sent: false, queued: false, error: 'WhatsApp disabled' };
  }

  try {
    const message = formatOTPMessage(code, namaPelanggan);
    return await sendMessage(phoneNumber, message);
  } catch (err) {
    console.error('[WhatsApp] Gagal hantar OTP:', err.message);
    return { sent: false, queued: false, error: err.message };
  }
}

/**
 * Notify customer of order confirmation.
 * Fire-and-forget with 1 retry after 5 seconds.
 * @param {object} tempahan - Order object
 * @param {object} pelanggan - Customer object with nama, noTelefon
 */
export function notifyOrderCreated(tempahan, pelanggan) {
  if (!isEnabled()) {
    console.log('[WhatsApp] WhatsApp disabled, skipping message');
    return;
  }

  console.log(`[WhatsApp] notifyOrderCreated dipanggil untuk tempahan ${tempahan.tempahanId}, pelanggan ${pelanggan.noTelefon}`);

  (async () => {
    try {
      const message = formatOrderConfirmation(tempahan, pelanggan.nama);
      const result = await sendMessage(pelanggan.noTelefon, message);

      if (!result.sent && !result.queued) {
        // Retry once after 5 seconds
        setTimeout(async () => {
          try {
            await sendMessage(pelanggan.noTelefon, message);
          } catch (retryErr) {
            console.error('[WhatsApp] Gagal hantar notifikasi tempahan (percubaan semula):', retryErr.message);
          }
        }, 5000);
      }
    } catch (err) {
      console.error('[WhatsApp] Gagal hantar notifikasi tempahan:', err.message);
      // Retry once after 5 seconds
      setTimeout(async () => {
        try {
          const message = formatOrderConfirmation(tempahan, pelanggan.nama);
          await sendMessage(pelanggan.noTelefon, message);
        } catch (retryErr) {
          console.error('[WhatsApp] Gagal hantar notifikasi tempahan (percubaan semula):', retryErr.message);
        }
      }, 5000);
    }
  })();
}

/**
 * Notify merchant of new order.
 * Fire-and-forget with 1 retry after 5 seconds.
 * Gets merchant phone from DB.
 * @param {object} tempahan - Order object
 * @param {object} pelanggan - Customer object with nama
 */
export function notifyMerchantNewOrder(tempahan, pelanggan) {
  if (!isEnabled()) {
    console.log('[WhatsApp] WhatsApp disabled, skipping message');
    return;
  }

  console.log(`[WhatsApp] notifyMerchantNewOrder dipanggil untuk tempahan ${tempahan.tempahanId}`);

  (async () => {
    try {
      // Get merchant phone from DB
      const [rows] = await pool.query('SELECT noTelefonKedai FROM Peniaga LIMIT 1');
      if (!rows || rows.length === 0 || !rows[0].noTelefonKedai) {
        console.warn(`[WhatsApp] noTelefonKedai tidak ditemui untuk tempahan ${tempahan.tempahanId}. Langkau notifikasi peniaga.`);
        return;
      }

      const merchantPhone = rows[0].noTelefonKedai;
      const message = formatNewOrderMerchant(tempahan, pelanggan.nama);
      const result = await sendMessage(merchantPhone, message);

      if (!result.sent && !result.queued) {
        // Retry once after 5 seconds
        setTimeout(async () => {
          try {
            await sendMessage(merchantPhone, message);
          } catch (retryErr) {
            console.error('[WhatsApp] Gagal hantar notifikasi peniaga (percubaan semula):', retryErr.message);
          }
        }, 5000);
      }
    } catch (err) {
      console.error('[WhatsApp] Gagal hantar notifikasi peniaga:', err.message);
      // Retry once after 5 seconds
      setTimeout(async () => {
        try {
          const [rows] = await pool.query('SELECT noTelefonKedai FROM Peniaga LIMIT 1');
          if (!rows || rows.length === 0 || !rows[0].noTelefonKedai) return;
          const merchantPhone = rows[0].noTelefonKedai;
          const message = formatNewOrderMerchant(tempahan, pelanggan.nama);
          await sendMessage(merchantPhone, message);
        } catch (retryErr) {
          console.error('[WhatsApp] Gagal hantar notifikasi peniaga (percubaan semula):', retryErr.message);
        }
      }, 5000);
    }
  })();
}

/**
 * Notify customer of status change.
 * Fire-and-forget, NO retry.
 * Only sends for Diterima/Ditolak/Siap statuses.
 * @param {object} tempahan - Order object with statusTempahan, sebabTolak, kaedahPenghantaran
 * @param {object} pelanggan - Customer object with nama, noTelefon
 */
export function notifyStatusChange(tempahan, pelanggan) {
  if (!isEnabled()) {
    console.log('[WhatsApp] WhatsApp disabled, skipping message');
    return;
  }

  const allowedStatuses = ['Diterima', 'Ditolak', 'Siap'];
  if (!allowedStatuses.includes(tempahan.statusTempahan)) {
    return;
  }

  (async () => {
    try {
      const message = formatStatusChange(tempahan, pelanggan.nama);
      if (!message) return; // formatStatusChange returns '' for unsupported statuses
      await sendMessage(pelanggan.noTelefon, message);
    } catch (err) {
      console.error(`[WhatsApp] Gagal hantar notifikasi status (${tempahan.statusTempahan}) untuk tempahan ${tempahan.tempahanId}:`, err.message);
    }
  })();
}

/**
 * Notify customer that their order has been cancelled.
 * Fire-and-forget, NO retry.
 * @param {object} tempahan - Order object with tempahanId
 * @param {object} pelanggan - Customer object with nama, noTelefon
 */
export function notifyOrderCancelled(tempahan, pelanggan) {
  if (!isEnabled()) {
    console.log('[WhatsApp] WhatsApp disabled, skipping message');
    return;
  }

  (async () => {
    try {
      const message = formatOrderCancelled(tempahan, pelanggan.nama);
      await sendMessage(pelanggan.noTelefon, message);
    } catch (err) {
      console.error(`[WhatsApp] Gagal hantar notifikasi pembatalan untuk tempahan ${tempahan.tempahanId}:`, err.message);
    }
  })();
}

/**
 * Notify merchant that a customer has cancelled their order.
 * Fire-and-forget, NO retry.
 * Gets merchant phone from DB.
 * @param {object} tempahan - Order object with tempahanId
 * @param {string} namaPelanggan - Customer name
 */
export function notifyMerchantOrderCancelled(tempahan, namaPelanggan) {
  if (!isEnabled()) {
    console.log('[WhatsApp] WhatsApp disabled, skipping message');
    return;
  }

  (async () => {
    try {
      const [rows] = await pool.query('SELECT noTelefonKedai FROM Peniaga LIMIT 1');
      if (!rows || rows.length === 0 || !rows[0].noTelefonKedai) {
        console.warn(`[WhatsApp] noTelefonKedai tidak ditemui. Langkau notifikasi pembatalan peniaga.`);
        return;
      }
      const message = formatOrderCancelledMerchant(tempahan, namaPelanggan);
      await sendMessage(rows[0].noTelefonKedai, message);
    } catch (err) {
      console.error(`[WhatsApp] Gagal hantar notifikasi pembatalan kepada peniaga untuk tempahan ${tempahan.tempahanId}:`, err.message);
    }
  })();
}

// --- Exports for testing ---
export { messageQueue as _messageQueue };
