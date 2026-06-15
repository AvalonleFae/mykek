/**
 * Chatbot route — POST /api/pelanggan/chatbot/mesej
 * Handles customer messages to the order form chatbot.
 * Protected with authMiddleware + roleGuard('pelanggan').
 */

import { Router } from 'express';
import { authMiddleware, roleGuard } from '../../middleware/auth.js';
import { processMessage } from '../../services/chatbotService.js';
import { buildErrorResponse } from '../../utils/errorResponse.js';
import { ERROR_CODES } from '../../utils/constants.js';

const router = Router();

// Require authentication + pelanggan role
router.use(authMiddleware, roleGuard('pelanggan'));

/**
 * POST /api/pelanggan/chatbot/mesej
 * Send a customer message and receive chatbot response.
 *
 * Request body:
 *   - mesej: string (1-500 chars, required)
 *   - sejarah: array (max 10 items, required)
 *   - konteksBoring: object (required)
 *
 * Response:
 *   - balasan: string
 *   - cadangan: array|null
 *   - tindakan: object|null
 */
router.post('/mesej', async (req, res) => {
  try {
    const { mesej, sejarah, konteksBoring } = req.body;

    // Validate mesej
    if (!mesej || typeof mesej !== 'string') {
      return res.status(400).json(
        buildErrorResponse('Mesej diperlukan.', 'mesej', ERROR_CODES.MEDAN_KOSONG)
      );
    }

    const trimmedMesej = mesej.trim();
    if (trimmedMesej.length < 1 || trimmedMesej.length > 500) {
      return res.status(400).json(
        buildErrorResponse('Mesej mestilah antara 1 hingga 500 aksara.', 'mesej', ERROR_CODES.PANJANG_TIDAK_SAH)
      );
    }

    // Validate sejarah
    if (!Array.isArray(sejarah)) {
      return res.status(400).json(
        buildErrorResponse('Sejarah perbualan diperlukan.', 'sejarah', ERROR_CODES.FORMAT_TIDAK_SAH)
      );
    }

    if (sejarah.length > 10) {
      return res.status(400).json(
        buildErrorResponse('Sejarah perbualan tidak boleh melebihi 10 mesej.', 'sejarah', ERROR_CODES.PANJANG_TIDAK_SAH)
      );
    }

    // Validate each history message
    for (const msg of sejarah) {
      if (!msg || typeof msg !== 'object') {
        return res.status(400).json(
          buildErrorResponse('Format sejarah tidak sah.', 'sejarah', ERROR_CODES.FORMAT_TIDAK_SAH)
        );
      }
      if (!['customer', 'bot'].includes(msg.peranan)) {
        return res.status(400).json(
          buildErrorResponse('Peranan sejarah mestilah "customer" atau "bot".', 'sejarah', ERROR_CODES.FORMAT_TIDAK_SAH)
        );
      }
      if (!msg.kandungan || typeof msg.kandungan !== 'string' || msg.kandungan.length < 1 || msg.kandungan.length > 500) {
        return res.status(400).json(
          buildErrorResponse('Kandungan sejarah mestilah antara 1 hingga 500 aksara.', 'sejarah', ERROR_CODES.PANJANG_TIDAK_SAH)
        );
      }
    }

    // Validate konteksBoring
    if (!konteksBoring || typeof konteksBoring !== 'object') {
      return res.status(400).json(
        buildErrorResponse('Konteks borang diperlukan.', 'konteksBoring', ERROR_CODES.MEDAN_KOSONG)
      );
    }

    // Process message
    const result = await processMessage({
      mesej: trimmedMesej,
      sejarah,
      konteksBoring,
      pelangganId: req.session.userId,
      sessionId: req.session.id,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Chatbot route error:', error);
    return res.status(500).json({
      balasan: 'Maaf, pembantu pesanan tidak tersedia buat masa ini. Sila cuba lagi sebentar.',
      cadangan: null,
      tindakan: null,
    });
  }
});

export default router;
