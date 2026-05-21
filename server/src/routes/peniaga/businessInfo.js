import { Router } from 'express';
import { authMiddleware, roleGuard } from '../../middleware/auth.js';
import { validatePhoneNumber } from '../../utils/validators.js';
import { buildErrorResponse } from '../../utils/errorResponse.js';
import { ERROR_CODES } from '../../utils/constants.js';
import pool from '../../config/db.js';

const router = Router();

// All merchant business info routes require authentication + peniaga role
router.use(authMiddleware, roleGuard('peniaga'));

/**
 * GET /api/peniaga/profil-perniagaan
 * Get merchant business info (namaKedai, noTelefonKedai, peneranganKedai).
 */
router.get('/', async (req, res) => {
  try {
    const peniagaId = req.session.userId;

    const [rows] = await pool.execute(
      'SELECT namaKedai, noTelefonKedai, peneranganKedai FROM Peniaga WHERE peniagaId = ?',
      [peniagaId]
    );

    if (rows.length === 0) {
      return res.status(404).json(
        buildErrorResponse('Profil perniagaan tidak ditemui.', null, ERROR_CODES.TIDAK_DITEMUI)
      );
    }

    return res.status(200).json({
      ralat: false,
      data: rows[0],
    });
  } catch (error) {
    console.error('Error fetching business info:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

/**
 * PUT /api/peniaga/profil-perniagaan
 * Update shop name (≤100 chars), phone (valid Malaysian format 10-11 digits), description (≤500 chars).
 */
router.put('/', async (req, res) => {
  try {
    const peniagaId = req.session.userId;
    const { namaKedai, noTelefonKedai, peneranganKedai } = req.body;

    // Validate shop name
    if (namaKedai !== undefined && namaKedai !== null) {
      if (typeof namaKedai !== 'string' || namaKedai.trim().length === 0) {
        return res.status(400).json(
          buildErrorResponse('Nama kedai diperlukan.', 'namaKedai', ERROR_CODES.MEDAN_KOSONG)
        );
      }
      if (namaKedai.trim().length > 100) {
        return res.status(400).json(
          buildErrorResponse('Nama kedai tidak boleh melebihi 100 aksara.', 'namaKedai', ERROR_CODES.PANJANG_TIDAK_SAH)
        );
      }
    }

    // Validate phone number
    if (noTelefonKedai !== undefined && noTelefonKedai !== null) {
      const phoneResult = validatePhoneNumber(noTelefonKedai);
      if (!phoneResult.sah) {
        return res.status(400).json(
          buildErrorResponse(phoneResult.mesej, 'noTelefonKedai', ERROR_CODES.FORMAT_TIDAK_SAH)
        );
      }
    }

    // Validate description
    if (peneranganKedai !== undefined && peneranganKedai !== null) {
      if (typeof peneranganKedai !== 'string') {
        return res.status(400).json(
          buildErrorResponse('Penerangan kedai mesti berupa teks.', 'peneranganKedai', ERROR_CODES.FORMAT_TIDAK_SAH)
        );
      }
      if (peneranganKedai.length > 500) {
        return res.status(400).json(
          buildErrorResponse('Penerangan kedai tidak boleh melebihi 500 aksara.', 'peneranganKedai', ERROR_CODES.PANJANG_TIDAK_SAH)
        );
      }
    }

    // Update business info
    const [result] = await pool.execute(
      'UPDATE Peniaga SET namaKedai = ?, noTelefonKedai = ?, peneranganKedai = ? WHERE peniagaId = ?',
      [
        namaKedai ? namaKedai.trim() : null,
        noTelefonKedai ? noTelefonKedai.trim() : null,
        peneranganKedai || null,
        peniagaId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json(
        buildErrorResponse('Profil perniagaan tidak ditemui.', null, ERROR_CODES.TIDAK_DITEMUI)
      );
    }

    return res.status(200).json({
      ralat: false,
      mesej: 'Maklumat perniagaan berjaya dikemaskini.',
    });
  } catch (error) {
    console.error('Error updating business info:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

export default router;
