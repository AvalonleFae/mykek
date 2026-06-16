import { Router } from 'express';
import { authMiddleware, roleGuard } from '../../middleware/auth.js';
import { getStatus, getQrDataUrl } from '../../services/whatsappService.js';

const router = Router();

// Apply auth to all routes in this router
router.use(authMiddleware);
router.use(roleGuard('peniaga'));

// GET /api/peniaga/whatsapp/status
router.get('/status', (req, res) => {
  const { status } = getStatus();
  
  // Map status to Malay label
  const statusLabels = {
    connected: 'Tersambung',
    disconnected: 'Terputus',
    qr_required: 'Menunggu Imbasan QR',
    initializing: 'Memulakan...',
  };

  return res.json({
    ralat: false,
    data: {
      status,
      statusLabel: statusLabels[status] || status,
    },
  });
});

// GET /api/peniaga/whatsapp/qr
router.get('/qr', async (req, res) => {
  const { status } = getStatus();
  
  if (status !== 'qr_required') {
    return res.status(404).json({
      ralat: true,
      mesej: 'Tiada QR code tersedia. Status semasa: ' + status,
    });
  }

  const qrDataUrl = await getQrDataUrl();
  
  if (!qrDataUrl) {
    return res.status(404).json({
      ralat: true,
      mesej: 'QR code belum sedia. Sila cuba lagi.',
    });
  }

  return res.json({
    ralat: false,
    data: { qr: qrDataUrl },
  });
});

export default router;
