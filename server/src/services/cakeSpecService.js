import pool from '../config/db.js';
import { buildErrorResponse } from '../utils/errorResponse.js';
import { ERROR_CODES } from '../utils/constants.js';
import { validatePrice } from '../utils/validators.js';
import { generateKategoriId, generatePilihanId } from '../utils/idGenerator.js';

/**
 * CakeSpecService — handles CRUD for cake specification categories and options.
 */

// ─── Category Methods (task 4.1) ───────────────────────────────────────────────

/**
 * List all categories (active and inactive).
 */
export async function listCategories() {
  const [rows] = await pool.execute(
    'SELECT kategoriId, nama, penerangan, aktif, tarikhCipta FROM KategoriSpesifikasiKek ORDER BY tarikhCipta DESC'
  );
  return rows;
}

/**
 * Create a new cake spec category.
 */
export async function createCategory({ nama, penerangan }) {
  // Validate name
  if (!nama || typeof nama !== 'string' || nama.trim().length === 0) {
    return buildErrorResponse('Nama kategori diperlukan.', 'nama', ERROR_CODES.MEDAN_KOSONG);
  }

  const trimmedNama = nama.trim();
  if (trimmedNama.length > 100) {
    return buildErrorResponse('Nama kategori tidak boleh melebihi 100 aksara.', 'nama', ERROR_CODES.PANJANG_TIDAK_SAH);
  }

  // Validate description
  if (penerangan && typeof penerangan === 'string' && penerangan.length > 500) {
    return buildErrorResponse('Penerangan tidak boleh melebihi 500 aksara.', 'penerangan', ERROR_CODES.PANJANG_TIDAK_SAH);
  }

  // Check uniqueness among active categories
  const [existing] = await pool.execute(
    'SELECT kategoriId FROM KategoriSpesifikasiKek WHERE nama = ? AND aktif = TRUE',
    [trimmedNama]
  );

  if (existing.length > 0) {
    return buildErrorResponse('Nama kategori sudah wujud.', 'nama', ERROR_CODES.PENDAFTARAN_DUPLIKAT);
  }

  const trimmedPenerangan = penerangan ? penerangan.trim() : null;

  const kategoriId = await generateKategoriId();

  await pool.execute(
    'INSERT INTO KategoriSpesifikasiKek (kategoriId, nama, penerangan) VALUES (?, ?, ?)',
    [kategoriId, trimmedNama, trimmedPenerangan]
  );

  return { kategoriId };
}

/**
 * Update an existing cake spec category.
 */
export async function updateCategory(kategoriId, { nama, penerangan }) {
  // Check category exists
  const [categories] = await pool.execute(
    'SELECT kategoriId, aktif FROM KategoriSpesifikasiKek WHERE kategoriId = ?',
    [kategoriId]
  );

  if (categories.length === 0) {
    return buildErrorResponse('Kategori tidak ditemui.', null, ERROR_CODES.TIDAK_DITEMUI);
  }

  // Validate name
  if (!nama || typeof nama !== 'string' || nama.trim().length === 0) {
    return buildErrorResponse('Nama kategori diperlukan.', 'nama', ERROR_CODES.MEDAN_KOSONG);
  }

  const trimmedNama = nama.trim();
  if (trimmedNama.length > 100) {
    return buildErrorResponse('Nama kategori tidak boleh melebihi 100 aksara.', 'nama', ERROR_CODES.PANJANG_TIDAK_SAH);
  }

  // Validate description
  if (penerangan && typeof penerangan === 'string' && penerangan.length > 500) {
    return buildErrorResponse('Penerangan tidak boleh melebihi 500 aksara.', 'penerangan', ERROR_CODES.PANJANG_TIDAK_SAH);
  }

  // Check uniqueness among active categories (excluding self)
  const [existing] = await pool.execute(
    'SELECT kategoriId FROM KategoriSpesifikasiKek WHERE nama = ? AND aktif = TRUE AND kategoriId != ?',
    [trimmedNama, kategoriId]
  );

  if (existing.length > 0) {
    return buildErrorResponse('Nama kategori sudah wujud.', 'nama', ERROR_CODES.PENDAFTARAN_DUPLIKAT);
  }

  const trimmedPenerangan = penerangan ? penerangan.trim() : null;

  await pool.execute(
    'UPDATE KategoriSpesifikasiKek SET nama = ?, penerangan = ? WHERE kategoriId = ?',
    [trimmedNama, trimmedPenerangan, kategoriId]
  );

  return { berjaya: true };
}

/**
 * Soft-delete a category and all its associated options.
 */
export async function deleteCategory(kategoriId) {
  const [categories] = await pool.execute(
    'SELECT kategoriId FROM KategoriSpesifikasiKek WHERE kategoriId = ? AND aktif = TRUE',
    [kategoriId]
  );

  if (categories.length === 0) {
    return buildErrorResponse('Kategori tidak ditemui.', null, ERROR_CODES.TIDAK_DITEMUI);
  }

  // Soft-delete category and all its options
  await pool.execute(
    'UPDATE KategoriSpesifikasiKek SET aktif = FALSE WHERE kategoriId = ?',
    [kategoriId]
  );
  await pool.execute(
    'UPDATE PilihanSpesifikasiKek SET aktif = FALSE WHERE kategoriId = ?',
    [kategoriId]
  );

  return { berjaya: true };
}

// ─── Customer-facing Methods (task 4.4) ────────────────────────────────────────

/**
 * Get all active categories with their active options (for customer order form).
 * Returns only categories and options where aktif=true.
 */
export async function getActiveCategories() {
  const [categories] = await pool.execute(
    'SELECT kategoriId, nama, penerangan FROM KategoriSpesifikasiKek WHERE aktif = TRUE ORDER BY tarikhCipta ASC'
  );

  // Fetch active options for each active category
  for (const category of categories) {
    const [options] = await pool.execute(
      'SELECT pilihanId, nama, penerangan, hargaTambahan FROM PilihanSpesifikasiKek WHERE kategoriId = ? AND aktif = TRUE ORDER BY tarikhCipta ASC',
      [category.kategoriId]
    );
    category.pilihan = options;
  }

  return categories;
}

// ─── Option Methods (task 4.2) ─────────────────────────────────────────────────

/**
 * List options for a given category.
 */
export async function listOptions(kategoriId) {
  // Check category exists
  const [categories] = await pool.execute(
    'SELECT kategoriId FROM KategoriSpesifikasiKek WHERE kategoriId = ?',
    [kategoriId]
  );

  if (categories.length === 0) {
    return buildErrorResponse('Kategori tidak ditemui.', null, ERROR_CODES.TIDAK_DITEMUI);
  }

  const [rows] = await pool.execute(
    'SELECT pilihanId, kategoriId, nama, penerangan, hargaTambahan, aktif, tarikhCipta FROM PilihanSpesifikasiKek WHERE kategoriId = ? ORDER BY tarikhCipta DESC',
    [kategoriId]
  );

  return { pilihan: rows };
}

/**
 * Create a new cake spec option within a category.
 */
export async function createOption({ kategoriId, nama, penerangan, hargaTambahan }) {
  // Validate kategoriId
  if (!kategoriId) {
    return buildErrorResponse('Kategori diperlukan.', 'kategoriId', ERROR_CODES.MEDAN_KOSONG);
  }

  // Check category exists and is active
  const [categories] = await pool.execute(
    'SELECT kategoriId FROM KategoriSpesifikasiKek WHERE kategoriId = ? AND aktif = TRUE',
    [kategoriId]
  );

  if (categories.length === 0) {
    return buildErrorResponse('Kategori tidak ditemui.', 'kategoriId', ERROR_CODES.TIDAK_DITEMUI);
  }

  // Validate name
  if (!nama || typeof nama !== 'string' || nama.trim().length === 0) {
    return buildErrorResponse('Nama pilihan diperlukan.', 'nama', ERROR_CODES.MEDAN_KOSONG);
  }

  const trimmedNama = nama.trim();
  if (trimmedNama.length > 100) {
    return buildErrorResponse('Nama pilihan tidak boleh melebihi 100 aksara.', 'nama', ERROR_CODES.PANJANG_TIDAK_SAH);
  }

  // Validate description
  if (penerangan && typeof penerangan === 'string' && penerangan.length > 500) {
    return buildErrorResponse('Penerangan tidak boleh melebihi 500 aksara.', 'penerangan', ERROR_CODES.PANJANG_TIDAK_SAH);
  }

  // Validate price
  const priceValue = hargaTambahan !== undefined && hargaTambahan !== null ? Number(hargaTambahan) : null;
  if (priceValue === null) {
    return buildErrorResponse('Harga tambahan diperlukan.', 'hargaTambahan', ERROR_CODES.MEDAN_KOSONG);
  }

  const priceValidation = validatePrice(priceValue);
  if (!priceValidation.sah) {
    return buildErrorResponse(priceValidation.mesej, 'hargaTambahan', ERROR_CODES.HARGA_TIDAK_SAH);
  }

  // Check uniqueness within category (among active options)
  const [existing] = await pool.execute(
    'SELECT pilihanId FROM PilihanSpesifikasiKek WHERE kategoriId = ? AND nama = ? AND aktif = TRUE',
    [kategoriId, trimmedNama]
  );

  if (existing.length > 0) {
    return buildErrorResponse('Nama pilihan sudah wujud dalam kategori ini.', 'nama', ERROR_CODES.PENDAFTARAN_DUPLIKAT);
  }

  const trimmedPenerangan = penerangan ? penerangan.trim() : null;

  const pilihanId = await generatePilihanId();

  await pool.execute(
    'INSERT INTO PilihanSpesifikasiKek (pilihanId, kategoriId, nama, penerangan, hargaTambahan) VALUES (?, ?, ?, ?, ?)',
    [pilihanId, kategoriId, trimmedNama, trimmedPenerangan, priceValue]
  );

  return { pilihanId };
}

/**
 * Update an existing cake spec option.
 */
export async function updateOption(pilihanId, { nama, penerangan, hargaTambahan }) {
  // Check option exists
  const [options] = await pool.execute(
    'SELECT pilihanId, kategoriId, aktif FROM PilihanSpesifikasiKek WHERE pilihanId = ?',
    [pilihanId]
  );

  if (options.length === 0) {
    return buildErrorResponse('Pilihan tidak ditemui.', null, ERROR_CODES.TIDAK_DITEMUI);
  }

  const option = options[0];

  // Validate name
  if (!nama || typeof nama !== 'string' || nama.trim().length === 0) {
    return buildErrorResponse('Nama pilihan diperlukan.', 'nama', ERROR_CODES.MEDAN_KOSONG);
  }

  const trimmedNama = nama.trim();
  if (trimmedNama.length > 100) {
    return buildErrorResponse('Nama pilihan tidak boleh melebihi 100 aksara.', 'nama', ERROR_CODES.PANJANG_TIDAK_SAH);
  }

  // Validate description
  if (penerangan && typeof penerangan === 'string' && penerangan.length > 500) {
    return buildErrorResponse('Penerangan tidak boleh melebihi 500 aksara.', 'penerangan', ERROR_CODES.PANJANG_TIDAK_SAH);
  }

  // Validate price
  const priceValue = hargaTambahan !== undefined && hargaTambahan !== null ? Number(hargaTambahan) : null;
  if (priceValue === null) {
    return buildErrorResponse('Harga tambahan diperlukan.', 'hargaTambahan', ERROR_CODES.MEDAN_KOSONG);
  }

  const priceValidation = validatePrice(priceValue);
  if (!priceValidation.sah) {
    return buildErrorResponse(priceValidation.mesej, 'hargaTambahan', ERROR_CODES.HARGA_TIDAK_SAH);
  }

  // Check uniqueness within category (among active options, excluding self)
  const [existing] = await pool.execute(
    'SELECT pilihanId FROM PilihanSpesifikasiKek WHERE kategoriId = ? AND nama = ? AND aktif = TRUE AND pilihanId != ?',
    [option.kategoriId, trimmedNama, pilihanId]
  );

  if (existing.length > 0) {
    return buildErrorResponse('Nama pilihan sudah wujud dalam kategori ini.', 'nama', ERROR_CODES.PENDAFTARAN_DUPLIKAT);
  }

  const trimmedPenerangan = penerangan ? penerangan.trim() : null;

  await pool.execute(
    'UPDATE PilihanSpesifikasiKek SET nama = ?, penerangan = ?, hargaTambahan = ? WHERE pilihanId = ?',
    [trimmedNama, trimmedPenerangan, priceValue, pilihanId]
  );

  return { berjaya: true };
}

/**
 * Soft-delete an option (set aktif=false).
 */
export async function deleteOption(pilihanId) {
  const [options] = await pool.execute(
    'SELECT pilihanId FROM PilihanSpesifikasiKek WHERE pilihanId = ? AND aktif = TRUE',
    [pilihanId]
  );

  if (options.length === 0) {
    return buildErrorResponse('Pilihan tidak ditemui.', null, ERROR_CODES.TIDAK_DITEMUI);
  }

  await pool.execute(
    'UPDATE PilihanSpesifikasiKek SET aktif = FALSE WHERE pilihanId = ?',
    [pilihanId]
  );

  return { berjaya: true };
}
