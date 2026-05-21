import { Router } from 'express';
import { authMiddleware, roleGuard } from '../../middleware/auth.js';
import { validateNameProfile, validateAddress } from '../../utils/validators.js';
import { buildErrorResponse } from '../../utils/errorResponse.js';
import { ERROR_CODES } from '../../utils/constants.js';
import pool from '../../config/db.js';

const router = Router();

// All customer profile routes require authentication + pelanggan role
router.use(authMiddleware, roleGuard('pelanggan'));

/**
 * GET /api/pelanggan/profil
 * Return authenticated customer's profile (nama, noTelefon read-only, alamat).
 */
router.get('/', async (req, res) => {
  try {
    const pelangganId = req.session.userId;

    const [rows] = await pool.execute(
      'SELECT nama, noTelefon, alamat FROM Pelanggan WHERE pelangganId = ?',
      [pelangganId]
    );

    if (rows.length === 0) {
      return res.status(404).json(
        buildErrorResponse('Profil tidak ditemui.', null, ERROR_CODES.TIDAK_DITEMUI)
      );
    }

    return res.status(200).json({
      ralat: false,
      data: rows[0],
    });
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

/**
 * PUT /api/pelanggan/profil
 * Update customer name (2-100 chars) and address (≤500 chars).
 */
router.put('/', async (req, res) => {
  try {
    const pelangganId = req.session.userId;
    const { nama, alamat } = req.body;

    // Validate name
    const nameResult = validateNameProfile(nama);
    if (!nameResult.sah) {
      return res.status(400).json(
        buildErrorResponse(nameResult.mesej, 'nama', ERROR_CODES.PANJANG_TIDAK_SAH)
      );
    }

    // Validate address
    const addressResult = validateAddress(alamat);
    if (!addressResult.sah) {
      return res.status(400).json(
        buildErrorResponse(addressResult.mesej, 'alamat', ERROR_CODES.PANJANG_TIDAK_SAH)
      );
    }

    // Update profile
    const [result] = await pool.execute(
      'UPDATE Pelanggan SET nama = ?, alamat = ? WHERE pelangganId = ?',
      [nama.trim(), alamat || null, pelangganId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json(
        buildErrorResponse('Profil tidak ditemui.', null, ERROR_CODES.TIDAK_DITEMUI)
      );
    }

    return res.status(200).json({
      ralat: false,
      mesej: 'Profil berjaya dikemaskini.',
    });
  } catch (error) {
    console.error('Error updating customer profile:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

export default router;
