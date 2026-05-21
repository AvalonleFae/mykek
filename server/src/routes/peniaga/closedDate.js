import { Router } from 'express';
import { authMiddleware, roleGuard } from '../../middleware/auth.js';
import { getAllClosedDates, addClosedDate, removeClosedDate } from '../../services/closedDateService.js';
import { buildErrorResponse } from '../../utils/errorResponse.js';

const router = Router();

// All merchant closed date routes require authentication + peniaga role
router.use(authMiddleware, roleGuard('peniaga'));

/**
 * GET /api/peniaga/tarikh-tutup
 * List all closed dates for the merchant calendar view.
 */
router.get('/', async (req, res) => {
  try {
    const closedDates = await getAllClosedDates();
    return res.status(200).json({
      ralat: false,
      data: closedDates,
    });
  } catch (error) {
    console.error('Error fetching closed dates:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

/**
 * POST /api/peniaga/tarikh-tutup
 * Add a new closed date.
 */
router.post('/', async (req, res) => {
  try {
    const { tarikh, catatan } = req.body;
    const result = await addClosedDate({ tarikh, catatan });

    if (result.ralat) {
      return res.status(400).json(result);
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error('Error adding closed date:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

/**
 * DELETE /api/peniaga/tarikh-tutup/:id
 * Remove a closed date.
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await removeClosedDate(id);

    if (result.ralat) {
      const statusCode = result.kod === 'TIDAK_DITEMUI' ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error removing closed date:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

export default router;
