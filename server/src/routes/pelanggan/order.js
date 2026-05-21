import { Router } from 'express';
import { authMiddleware, roleGuard } from '../../middleware/auth.js';
import { createOrder, getCustomerOrders, getCustomerOrderDetail, cancelOrder } from '../../services/orderService.js';
import { buildErrorResponse } from '../../utils/errorResponse.js';
import { ERROR_CODES } from '../../utils/constants.js';

const router = Router();

// All customer order routes require authentication + pelanggan role
router.use(authMiddleware, roleGuard('pelanggan'));

/**
 * POST /api/pelanggan/tempahan
 * Create a new cake order.
 */
router.post('/', async (req, res) => {
  try {
    const pelangganId = req.session.userId;
    const { butiran, tarikhAmbil, kaedahPenghantaran, alamatPenghantaran, kaedahBayaran, nota } = req.body;

    const result = await createOrder({
      pelangganId,
      butiran,
      tarikhAmbil,
      kaedahPenghantaran,
      alamatPenghantaran,
      kaedahBayaran,
      nota,
    });

    if (result.ralat) {
      return res.status(400).json(result);
    }

    return res.status(201).json({
      ralat: false,
      mesej: 'Tempahan berjaya dicipta.',
      tempahanId: result.tempahanId,
      jumlahHarga: result.jumlahHarga,
      statusTempahan: result.statusTempahan,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

/**
 * GET /api/pelanggan/tempahan
 * List all orders for the authenticated customer, sorted by tarikhTempahan DESC.
 */
router.get('/', async (req, res) => {
  try {
    const pelangganId = req.session.userId;
    const orders = await getCustomerOrders(pelangganId);

    return res.status(200).json({
      ralat: false,
      data: orders,
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

/**
 * GET /api/pelanggan/tempahan/:id
 * Get full order details for a specific order belonging to the authenticated customer.
 */
router.get('/:id', async (req, res) => {
  try {
    const pelangganId = req.session.userId;
    const tempahanId = parseInt(req.params.id, 10);

    if (isNaN(tempahanId)) {
      return res.status(400).json(
        buildErrorResponse('ID tempahan tidak sah.', null, ERROR_CODES.FORMAT_TIDAK_SAH)
      );
    }

    const order = await getCustomerOrderDetail(tempahanId, pelangganId);

    if (!order) {
      return res.status(404).json(
        buildErrorResponse('Tempahan tidak ditemui.', null, ERROR_CODES.TIDAK_DITEMUI)
      );
    }

    return res.status(200).json({
      ralat: false,
      data: order,
    });
  } catch (error) {
    console.error('Error fetching order detail:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

/**
 * PUT /api/pelanggan/tempahan/:id/batal
 * Cancel an order. Validates eligibility before cancellation.
 */
router.put('/:id/batal', async (req, res) => {
  try {
    const pelangganId = req.session.userId;
    const tempahanId = parseInt(req.params.id, 10);

    if (isNaN(tempahanId)) {
      return res.status(400).json(
        buildErrorResponse('ID tempahan tidak sah.', null, ERROR_CODES.FORMAT_TIDAK_SAH)
      );
    }

    const result = await cancelOrder(tempahanId, pelangganId);

    if (result.ralat) {
      const statusCode = result.kod === ERROR_CODES.TIDAK_DITEMUI ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error cancelling order:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

export default router;
