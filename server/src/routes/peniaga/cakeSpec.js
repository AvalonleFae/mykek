import { Router } from 'express';
import { authMiddleware, roleGuard } from '../../middleware/auth.js';
import { buildErrorResponse } from '../../utils/errorResponse.js';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listOptions,
  createOption,
  updateOption,
  deleteOption,
} from '../../services/cakeSpecService.js';

const router = Router();

// All routes require merchant authentication
router.use(authMiddleware, roleGuard('peniaga'));

// ─── Category Routes (task 4.1) ────────────────────────────────────────────────

/**
 * GET /api/peniaga/kategori-spesifikasi
 * List all categories (active and inactive).
 */
router.get('/', async (req, res) => {
  try {
    const categories = await listCategories();
    return res.status(200).json({ ralat: false, data: categories });
  } catch (error) {
    console.error('List categories error:', error);
    return res.status(500).json(buildErrorResponse('Ralat sistem. Sila cuba lagi.'));
  }
});

/**
 * POST /api/peniaga/kategori-spesifikasi
 * Create a new category.
 */
router.post('/', async (req, res) => {
  try {
    const { nama, penerangan } = req.body;
    const result = await createCategory({ nama, penerangan });

    if (result.ralat) {
      return res.status(400).json(result);
    }

    return res.status(201).json({
      ralat: false,
      mesej: 'Kategori berjaya dicipta.',
      kategoriId: result.kategoriId,
    });
  } catch (error) {
    console.error('Create category error:', error);
    return res.status(500).json(buildErrorResponse('Ralat sistem. Sila cuba lagi.'));
  }
});

/**
 * PUT /api/peniaga/kategori-spesifikasi/:id
 * Update an existing category.
 */
router.put('/:id', async (req, res) => {
  try {
    const kategoriId = parseInt(req.params.id, 10);
    if (isNaN(kategoriId)) {
      return res.status(400).json(buildErrorResponse('ID kategori tidak sah.'));
    }

    const { nama, penerangan } = req.body;
    const result = await updateCategory(kategoriId, { nama, penerangan });

    if (result.ralat) {
      const status = result.kod === 'TIDAK_DITEMUI' ? 404 : 400;
      return res.status(status).json(result);
    }

    return res.status(200).json({
      ralat: false,
      mesej: 'Kategori berjaya dikemaskini.',
    });
  } catch (error) {
    console.error('Update category error:', error);
    return res.status(500).json(buildErrorResponse('Ralat sistem. Sila cuba lagi.'));
  }
});

/**
 * DELETE /api/peniaga/kategori-spesifikasi/:id
 * Soft-delete a category and its options.
 */
router.delete('/:id', async (req, res) => {
  try {
    const kategoriId = parseInt(req.params.id, 10);
    if (isNaN(kategoriId)) {
      return res.status(400).json(buildErrorResponse('ID kategori tidak sah.'));
    }

    const result = await deleteCategory(kategoriId);

    if (result.ralat) {
      const status = result.kod === 'TIDAK_DITEMUI' ? 404 : 400;
      return res.status(status).json(result);
    }

    return res.status(200).json({
      ralat: false,
      mesej: 'Kategori berjaya dipadam.',
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return res.status(500).json(buildErrorResponse('Ralat sistem. Sila cuba lagi.'));
  }
});

export default router;

// ─── Option Routes (task 4.2) ──────────────────────────────────────────────────

export const optionRouter = Router();

// All option routes require merchant authentication
optionRouter.use(authMiddleware, roleGuard('peniaga'));

/**
 * GET /api/peniaga/pilihan-spesifikasi/:kategoriId
 * List options for a category.
 */
optionRouter.get('/:kategoriId', async (req, res) => {
  try {
    const kategoriId = parseInt(req.params.kategoriId, 10);
    if (isNaN(kategoriId)) {
      return res.status(400).json(buildErrorResponse('ID kategori tidak sah.'));
    }

    const result = await listOptions(kategoriId);

    if (result.ralat) {
      const status = result.kod === 'TIDAK_DITEMUI' ? 404 : 400;
      return res.status(status).json(result);
    }

    return res.status(200).json({ ralat: false, data: result.pilihan });
  } catch (error) {
    console.error('List options error:', error);
    return res.status(500).json(buildErrorResponse('Ralat sistem. Sila cuba lagi.'));
  }
});

/**
 * POST /api/peniaga/pilihan-spesifikasi
 * Create a new option.
 */
optionRouter.post('/', async (req, res) => {
  try {
    const { kategoriId, nama, penerangan, hargaTambahan } = req.body;
    const result = await createOption({ kategoriId, nama, penerangan, hargaTambahan });

    if (result.ralat) {
      return res.status(400).json(result);
    }

    return res.status(201).json({
      ralat: false,
      mesej: 'Pilihan berjaya dicipta.',
      pilihanId: result.pilihanId,
    });
  } catch (error) {
    console.error('Create option error:', error);
    return res.status(500).json(buildErrorResponse('Ralat sistem. Sila cuba lagi.'));
  }
});

/**
 * PUT /api/peniaga/pilihan-spesifikasi/:id
 * Update an existing option.
 */
optionRouter.put('/:id', async (req, res) => {
  try {
    const pilihanId = parseInt(req.params.id, 10);
    if (isNaN(pilihanId)) {
      return res.status(400).json(buildErrorResponse('ID pilihan tidak sah.'));
    }

    const { nama, penerangan, hargaTambahan } = req.body;
    const result = await updateOption(pilihanId, { nama, penerangan, hargaTambahan });

    if (result.ralat) {
      const status = result.kod === 'TIDAK_DITEMUI' ? 404 : 400;
      return res.status(status).json(result);
    }

    return res.status(200).json({
      ralat: false,
      mesej: 'Pilihan berjaya dikemaskini.',
    });
  } catch (error) {
    console.error('Update option error:', error);
    return res.status(500).json(buildErrorResponse('Ralat sistem. Sila cuba lagi.'));
  }
});

/**
 * DELETE /api/peniaga/pilihan-spesifikasi/:id
 * Soft-delete an option (set aktif=false).
 */
optionRouter.delete('/:id', async (req, res) => {
  try {
    const pilihanId = parseInt(req.params.id, 10);
    if (isNaN(pilihanId)) {
      return res.status(400).json(buildErrorResponse('ID pilihan tidak sah.'));
    }

    const result = await deleteOption(pilihanId);

    if (result.ralat) {
      const status = result.kod === 'TIDAK_DITEMUI' ? 404 : 400;
      return res.status(status).json(result);
    }

    return res.status(200).json({
      ralat: false,
      mesej: 'Pilihan berjaya dipadam.',
    });
  } catch (error) {
    console.error('Delete option error:', error);
    return res.status(500).json(buildErrorResponse('Ralat sistem. Sila cuba lagi.'));
  }
});
