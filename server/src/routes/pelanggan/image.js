import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { authMiddleware, roleGuard } from '../../middleware/auth.js';
import { generateAIImage, uploadImage } from '../../services/imageService.js';
import { buildErrorResponse } from '../../utils/errorResponse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// All image routes require authentication + pelanggan role
router.use(authMiddleware, roleGuard('pelanggan'));

// --- Multer configuration for image uploads ---

const uploadDir = path.join(__dirname, '..', '..', '..', 'uploads', 'images');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('FORMAT_TIDAK_SAH'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

/**
 * POST /api/pelanggan/tempahan/jana-imej
 * Generate an AI cake design image from a text description.
 */
router.post('/jana-imej', async (req, res) => {
  try {
    const { penerangan } = req.body;

    const result = await generateAIImage(penerangan);

    if (result.ralat) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('AI image generation error:', error);
    return res.status(503).json(
      buildErrorResponse(
        'Perkhidmatan AI tidak tersedia buat masa ini. Sila cuba lagi kemudian atau muat naik imej rujukan.',
        null,
        'AI_TIDAK_TERSEDIA'
      )
    );
  }
});

/**
 * POST /api/pelanggan/tempahan/muat-naik-imej
 * Upload a reference image for an order.
 */
router.post('/muat-naik-imej', (req, res) => {
  upload.single('imej')(req, res, async (err) => {
    // Handle Multer errors
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json(
          buildErrorResponse(
            'Saiz fail melebihi had maksimum 5MB.',
            'imej',
            'SAIZ_FAIL_MELEBIHI'
          )
        );
      }
      if (err.message === 'FORMAT_TIDAK_SAH') {
        return res.status(400).json(
          buildErrorResponse(
            'Format fail tidak disokong. Sila gunakan format JPEG atau PNG.',
            'imej',
            'FORMAT_TIDAK_SAH'
          )
        );
      }
      console.error('Upload error:', err);
      return res.status(500).json(
        buildErrorResponse('Ralat semasa memuat naik imej. Sila cuba lagi.')
      );
    }

    try {
      const { tempahanId } = req.body;
      const result = await uploadImage(req.file, tempahanId);

      if (result.ralat) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('Image upload service error:', error);
      return res.status(500).json(
        buildErrorResponse('Ralat semasa memuat naik imej. Sila cuba lagi.')
      );
    }
  });
});

/**
 * POST /api/pelanggan/tempahan/simpan-imej-ai
 * Save an AI-generated image URL to the order's ImejTempahan record.
 */
router.post('/simpan-imej-ai', async (req, res) => {
  try {
    const { tempahanId, urlImej, promptAI } = req.body;

    if (!tempahanId || !urlImej) {
      return res.status(400).json(
        buildErrorResponse('ID tempahan dan URL imej diperlukan.', null, 'MEDAN_KOSONG')
      );
    }

    const orderId = parseInt(tempahanId, 10);
    if (isNaN(orderId)) {
      return res.status(400).json(
        buildErrorResponse('ID tempahan tidak sah.', 'tempahanId', 'FORMAT_TIDAK_SAH')
      );
    }

    // Import pool directly for this endpoint
    const { default: pool } = await import('../../config/db.js');

    // Verify order exists and belongs to this customer
    const [orders] = await pool.execute(
      'SELECT tempahanId FROM Tempahan WHERE tempahanId = ? AND pelangganId = ?',
      [orderId, req.session.userId]
    );

    if (orders.length === 0) {
      return res.status(404).json(
        buildErrorResponse('Tempahan tidak ditemui.', 'tempahanId', 'TIDAK_DITEMUI')
      );
    }

    // Check if AI image already exists for this order — replace it
    const [existing] = await pool.execute(
      "SELECT imejId FROM ImejTempahan WHERE tempahanId = ? AND jenisImej = 'AI'",
      [orderId]
    );

    if (existing.length > 0) {
      await pool.execute(
        'UPDATE ImejTempahan SET urlImej = ?, promptAI = ?, tarikhMuatNaik = NOW() WHERE imejId = ?',
        [urlImej, promptAI || null, existing[0].imejId]
      );
    } else {
      await pool.execute(
        "INSERT INTO ImejTempahan (tempahanId, jenisImej, urlImej, promptAI, tarikhMuatNaik) VALUES (?, 'AI', ?, ?, NOW())",
        [orderId, urlImej, promptAI || null]
      );
    }

    return res.status(200).json({
      ralat: false,
      mesej: 'Imej AI berjaya disimpan.',
    });
  } catch (error) {
    console.error('Save AI image error:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat semasa menyimpan imej AI.')
    );
  }
});

export default router;
