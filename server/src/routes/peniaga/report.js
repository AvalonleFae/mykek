import { Router } from 'express';
import { authMiddleware, roleGuard } from '../../middleware/auth.js';
import { getSalesReport, generatePDF } from '../../services/reportService.js';
import { buildErrorResponse } from '../../utils/errorResponse.js';

const router = Router();

// All report routes require authentication + peniaga role
router.use(authMiddleware, roleGuard('peniaga'));

/**
 * GET /api/peniaga/laporan-jualan
 * Get sales report data for a given month/year.
 * Query params: bulan (1-12), tahun (e.g. 2025)
 */
router.get('/', async (req, res) => {
  try {
    const bulan = parseInt(req.query.bulan, 10);
    const tahun = parseInt(req.query.tahun, 10);

    // Validate month
    if (!bulan || bulan < 1 || bulan > 12) {
      return res.status(400).json(
        buildErrorResponse('Bulan tidak sah. Sila masukkan nilai 1-12.', 'bulan')
      );
    }

    // Validate year
    if (!tahun || tahun < 2000 || tahun > 2100) {
      return res.status(400).json(
        buildErrorResponse('Tahun tidak sah.', 'tahun')
      );
    }

    const reportData = await getSalesReport(bulan, tahun);

    return res.status(200).json({
      ralat: false,
      data: reportData,
    });
  } catch (error) {
    console.error('Error fetching sales report:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

/**
 * GET /api/peniaga/laporan-jualan/pdf
 * Download sales report as PDF for a given month/year.
 * Query params: bulan (1-12), tahun (e.g. 2025)
 */
router.get('/pdf', async (req, res) => {
  try {
    const bulan = parseInt(req.query.bulan, 10);
    const tahun = parseInt(req.query.tahun, 10);

    // Validate month
    if (!bulan || bulan < 1 || bulan > 12) {
      return res.status(400).json(
        buildErrorResponse('Bulan tidak sah. Sila masukkan nilai 1-12.', 'bulan')
      );
    }

    // Validate year
    if (!tahun || tahun < 2000 || tahun > 2100) {
      return res.status(400).json(
        buildErrorResponse('Tahun tidak sah.', 'tahun')
      );
    }

    const reportData = await getSalesReport(bulan, tahun);

    // Set PDF response headers
    const filename = `laporan-jualan-${tahun}-${String(bulan).padStart(2, '0')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await generatePDF(reportData, res);
  } catch (error) {
    console.error('Error generating sales report PDF:', error);
    // Only send error if headers haven't been sent yet
    if (!res.headersSent) {
      return res.status(500).json(
        buildErrorResponse('Ralat sistem. Sila cuba lagi.')
      );
    }
  }
});

export default router;
