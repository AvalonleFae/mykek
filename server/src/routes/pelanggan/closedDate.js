import { Router } from 'express';
import { authMiddleware, roleGuard } from '../../middleware/auth.js';
import { getClosedDatesForCustomer } from '../../services/closedDateService.js';
import { buildErrorResponse } from '../../utils/errorResponse.js';

const router = Router();

// Customer closed date route requires authentication + pelanggan role
router.use(authMiddleware, roleGuard('pelanggan'));

/**
 * GET /api/pelanggan/tarikh-tutup
 * List closed dates from today onwards for the customer date picker.
 */
router.get('/', async (req, res) => {
  try {
    const closedDates = await getClosedDatesForCustomer();
    return res.status(200).json({
      ralat: false,
      data: closedDates,
    });
  } catch (error) {
    console.error('Error fetching closed dates for customer:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

export default router;
