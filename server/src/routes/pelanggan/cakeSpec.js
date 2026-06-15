import { Router } from 'express';
import { authMiddleware, roleGuard } from '../../middleware/auth.js';
import { getActiveCategories } from '../../services/cakeSpecService.js';
import { buildErrorResponse } from '../../utils/errorResponse.js';

const router = Router();

// Customer cake spec route requires authentication + pelanggan role
router.use(authMiddleware, roleGuard('pelanggan'));

/**
 * GET /api/pelanggan/spesifikasi-kek
 * Return only active categories and their active options for the order form.
 */
router.get('/', async (req, res) => {
  try {
    const categories = await getActiveCategories();
    return res.status(200).json({
      ralat: false,
      data: categories,
    });
  } catch (error) {
    console.error('Error fetching active cake specs for customer:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

export default router;
