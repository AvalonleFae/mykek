import { Router } from 'express';
import { buildErrorResponse } from '../utils/errorResponse.js';
import pool from '../config/db.js';

const router = Router();

/**
 * GET /api/awam/profil-kedai
 * Public endpoint — returns shop info (namaKedai, noTelefonKedai, peneranganKedai).
 * No authentication required.
 */
router.get('/profil-kedai', async (req, res) => {
  try {
    // Get the first (and only) merchant's public business info
    const [rows] = await pool.execute(
      'SELECT namaKedai, noTelefonKedai, peneranganKedai FROM Peniaga LIMIT 1'
    );

    if (rows.length === 0) {
      return res.status(404).json(
        buildErrorResponse('Maklumat kedai tidak ditemui.')
      );
    }

    return res.status(200).json({
      ralat: false,
      data: rows[0],
    });
  } catch (error) {
    console.error('Error fetching public shop info:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

export default router;
