import { Router } from 'express';
import { authMiddleware, roleGuard } from '../../middleware/auth.js';
import {
  getMerchantOrders,
  getMerchantOrderDetail,
  acceptOrder,
  rejectOrder,
  advanceStatus,
  updatePaymentStatus,
} from '../../services/orderService.js';
import { buildErrorResponse } from '../../utils/errorResponse.js';
import { ERROR_CODES } from '../../utils/constants.js';
import { notifyStatusChange } from '../../services/whatsappService.js';
import pool from '../../config/db.js';

const router = Router();

// All merchant order routes require authentication + peniaga role
router.use(authMiddleware, roleGuard('peniaga'));

/**
 * GET /api/peniaga/tempahan
 * Paginated list of all orders with optional filters.
 * Query params: page, status, tarikhMula, tarikhAkhir, statusBayaran
 */
router.get('/', async (req, res) => {
  try {
    const { page, status, tarikhMula, tarikhAkhir, statusBayaran } = req.query;

    const pageNum = parseInt(page, 10) || 1;

    const result = await getMerchantOrders({
      page: pageNum,
      status: status || undefined,
      tarikhMula: tarikhMula || undefined,
      tarikhAkhir: tarikhAkhir || undefined,
      statusBayaran: statusBayaran || undefined,
    });

    return res.status(200).json({
      ralat: false,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching merchant orders:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

/**
 * GET /api/peniaga/tempahan/:id
 * Get full order details with customer info.
 */
router.get('/:id', async (req, res) => {
  try {
    const tempahanId = req.params.id;

    if (!tempahanId || tempahanId.trim() === '') {
      return res.status(400).json(
        buildErrorResponse('ID tempahan tidak sah.', null, ERROR_CODES.FORMAT_TIDAK_SAH)
      );
    }

    const order = await getMerchantOrderDetail(tempahanId);

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
    console.error('Error fetching merchant order detail:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

/**
 * PUT /api/peniaga/tempahan/:id/terima
 * Accept an order. Records tarikhTerima.
 */
router.put('/:id/terima', async (req, res) => {
  try {
    const tempahanId = req.params.id;

    if (!tempahanId || tempahanId.trim() === '') {
      return res.status(400).json(
        buildErrorResponse('ID tempahan tidak sah.', null, ERROR_CODES.FORMAT_TIDAK_SAH)
      );
    }

    const result = await acceptOrder(tempahanId);

    if (result.ralat) {
      const statusCode = result.kod === ERROR_CODES.TIDAK_DITEMUI ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    // Fire-and-forget WhatsApp notification
    try {
      const [orderRows] = await pool.execute(
        `SELECT t.tempahanId, t.statusTempahan, t.kaedahPenghantaran, t.sebabTolak, p.nama, p.noTelefon
         FROM Tempahan t JOIN Pelanggan p ON t.pelangganId = p.pelangganId
         WHERE t.tempahanId = ?`,
        [tempahanId]
      );
      if (orderRows.length > 0) {
        const row = orderRows[0];
        notifyStatusChange(
          { tempahanId: row.tempahanId, statusTempahan: 'Diterima', kaedahPenghantaran: row.kaedahPenghantaran, sebabTolak: row.sebabTolak },
          { nama: row.nama, noTelefon: row.noTelefon }
        );
      }
    } catch (waErr) {
      console.error('[WhatsApp] Error sending accept notification:', waErr.message);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error accepting order:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

/**
 * PUT /api/peniaga/tempahan/:id/tolak
 * Reject an order with a reason (1-500 chars).
 */
router.put('/:id/tolak', async (req, res) => {
  try {
    const tempahanId = req.params.id;

    if (!tempahanId || tempahanId.trim() === '') {
      return res.status(400).json(
        buildErrorResponse('ID tempahan tidak sah.', null, ERROR_CODES.FORMAT_TIDAK_SAH)
      );
    }

    const { sebabTolak } = req.body;
    const result = await rejectOrder(tempahanId, sebabTolak);

    if (result.ralat) {
      const statusCode = result.kod === ERROR_CODES.TIDAK_DITEMUI ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    // Fire-and-forget WhatsApp notification
    try {
      const [orderRows] = await pool.execute(
        `SELECT t.tempahanId, t.statusTempahan, t.kaedahPenghantaran, t.sebabTolak, p.nama, p.noTelefon
         FROM Tempahan t JOIN Pelanggan p ON t.pelangganId = p.pelangganId
         WHERE t.tempahanId = ?`,
        [tempahanId]
      );
      if (orderRows.length > 0) {
        const row = orderRows[0];
        notifyStatusChange(
          { tempahanId: row.tempahanId, statusTempahan: 'Ditolak', kaedahPenghantaran: row.kaedahPenghantaran, sebabTolak: sebabTolak },
          { nama: row.nama, noTelefon: row.noTelefon }
        );
      }
    } catch (waErr) {
      console.error('[WhatsApp] Error sending reject notification:', waErr.message);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error rejecting order:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

/**
 * PUT /api/peniaga/tempahan/:id/status
 * Advance order status to the next phase.
 */
router.put('/:id/status', async (req, res) => {
  try {
    const tempahanId = req.params.id;

    if (!tempahanId || tempahanId.trim() === '') {
      return res.status(400).json(
        buildErrorResponse('ID tempahan tidak sah.', null, ERROR_CODES.FORMAT_TIDAK_SAH)
      );
    }

    const result = await advanceStatus(tempahanId);

    if (result.ralat) {
      const statusCode = result.kod === ERROR_CODES.TIDAK_DITEMUI ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    // Fire-and-forget WhatsApp notification (only for 'Siap')
    if (result.statusBaru === 'Siap') {
      try {
        const [orderRows] = await pool.execute(
          `SELECT t.tempahanId, t.statusTempahan, t.kaedahPenghantaran, t.sebabTolak, p.nama, p.noTelefon
           FROM Tempahan t JOIN Pelanggan p ON t.pelangganId = p.pelangganId
           WHERE t.tempahanId = ?`,
          [tempahanId]
        );
        if (orderRows.length > 0) {
          const row = orderRows[0];
          notifyStatusChange(
            { tempahanId: row.tempahanId, statusTempahan: 'Siap', kaedahPenghantaran: row.kaedahPenghantaran, sebabTolak: row.sebabTolak },
            { nama: row.nama, noTelefon: row.noTelefon }
          );
        }
      } catch (waErr) {
        console.error('[WhatsApp] Error sending status notification:', waErr.message);
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error advancing order status:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

/**
 * PUT /api/peniaga/tempahan/:id/status-bayaran
 * Update payment status of an order.
 */
router.put('/:id/status-bayaran', async (req, res) => {
  try {
    const tempahanId = req.params.id;

    if (!tempahanId || tempahanId.trim() === '') {
      return res.status(400).json(
        buildErrorResponse('ID tempahan tidak sah.', null, ERROR_CODES.FORMAT_TIDAK_SAH)
      );
    }

    const { statusBayaran } = req.body;
    const result = await updatePaymentStatus(tempahanId, statusBayaran);

    if (result.ralat) {
      const statusCode = result.kod === ERROR_CODES.TIDAK_DITEMUI ? 404 : 400;
      return res.status(statusCode).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error updating payment status:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

export default router;
