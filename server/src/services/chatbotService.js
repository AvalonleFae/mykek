/**
 * ChatbotService — Processes customer messages using Google Gemini AI.
 * Fetches active cake specs, builds prompts, calls Gemini, and validates responses.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getActiveCategories } from './cakeSpecService.js';
import { buildPrompt } from './promptBuilder.js';
import { validateResponse, FALLBACK_RESPONSE } from './responseValidator.js';

const GEMINI_TIMEOUT = 30000; // 30 seconds
const MODEL_NAME = 'gemini-2.0-flash';

// Rate limiting: in-memory map keyed by session ID
const sessionMessageCounts = new Map();
const MAX_MESSAGES_PER_SESSION = 20;

// Fallback response when service is unavailable
const UNAVAILABLE_RESPONSE = {
  balasan: 'Maaf, pembantu pesanan tidak tersedia buat masa ini. Sila cuba lagi sebentar.',
  cadangan: null,
  tindakan: null,
};

const NO_API_KEY_RESPONSE = {
  balasan: 'Maaf, pembantu pesanan memerlukan konfigurasi. Sila hubungi pihak kedai.',
  cadangan: null,
  tindakan: null,
};

/**
 * Process a customer message and return a chatbot response.
 * @param {Object} params
 * @param {string} params.mesej - Customer message (1-500 chars)
 * @param {Array} params.sejarah - Conversation history (max 10 messages)
 * @param {Object} params.konteksBoring - Current form context
 * @param {number} params.pelangganId - Authenticated customer ID
 * @param {string} params.sessionId - Session ID for rate limiting
 * @returns {Promise<{ balasan: string, cadangan: Array|null, tindakan: Object|null }>}
 */
export async function processMessage({ mesej, sejarah, konteksBoring, pelangganId, sessionId }) {
  // Check rate limit
  if (sessionId) {
    const count = sessionMessageCounts.get(sessionId) || 0;
    if (count >= MAX_MESSAGES_PER_SESSION) {
      return {
        balasan: 'Anda telah mencapai had mesej untuk sesi ini. Sila lengkapkan borang secara manual atau hubungi kedai.',
        cadangan: null,
        tindakan: null,
      };
    }
    sessionMessageCounts.set(sessionId, count + 1);
  }

  // Check API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return NO_API_KEY_RESPONSE;
  }

  // Fetch active cake specifications
  let spesifikasiKek = [];
  try {
    spesifikasiKek = await getActiveCategories();
  } catch (error) {
    console.error('ChatbotService: Failed to fetch cake specs:', error.message);
    return UNAVAILABLE_RESPONSE;
  }

  // Build prompt
  const { systemInstruction, contents } = buildPrompt({
    mesej,
    sejarah: sejarah || [],
    konteksBoring: konteksBoring || {},
    spesifikasiKek,
  });

  // Call Gemini API with timeout
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction,
    });

    const result = await Promise.race([
      model.generateContent({ contents }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), GEMINI_TIMEOUT)
      ),
    ]);

    const response = result.response;
    const text = response.text();

    if (!text || text.trim().length === 0) {
      return FALLBACK_RESPONSE;
    }

    // Validate and parse response
    return validateResponse(text, spesifikasiKek);
  } catch (error) {
    console.error('ChatbotService: Gemini API error:', error.message);

    if (error.message === 'TIMEOUT') {
      console.error('ChatbotService: Gemini API timeout after 30s');
    }

    return UNAVAILABLE_RESPONSE;
  }
}

/**
 * Get current message count for a session.
 * @param {string} sessionId
 * @returns {number}
 */
export function getSessionMessageCount(sessionId) {
  return sessionMessageCounts.get(sessionId) || 0;
}

/**
 * Reset message count for a session (for testing).
 * @param {string} sessionId
 */
export function resetSessionCount(sessionId) {
  sessionMessageCounts.delete(sessionId);
}

export { MAX_MESSAGES_PER_SESSION, UNAVAILABLE_RESPONSE, NO_API_KEY_RESPONSE };
