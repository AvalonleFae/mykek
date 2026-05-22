import pool from '../config/db.js';
import { buildErrorResponse } from '../utils/errorResponse.js';
import { ORDER_STATUS, PAYMENT_STATUS, DELIVERY_METHOD, PAYMENT_METHOD, ERROR_CODES } from '../utils/constants.js';
import { generateTempahanId, generateButiranId } from '../utils/idGenerator.js';

/**
 * The fixed forward-only status transition sequence.
 */
const STATUS_SEQUENCE = [
  ORDER_STATUS.DITERIMA,
  ORDER_STATUS.SEDANG_DIBUAT,
  ORDER_STATUS.SIAP,
  ORDER_STATUS.SELESAI,
];

/**
 * Get all orders for a specific customer, sorted by tarikhTempahan DESC.
 * @param {number} pelangganId
 * @returns {Promise<Array>}
 */
export async function getCustomerOrders(pelangganId) {
  const [rows] = await pool.execute(
    `SELECT t.tempahanId, t.tarikhTempahan, t.statusTempahan, t.jumlahHarga, t.tarikhAmbil, t.kaedahPenghantaran, t.statusBayaran,
            (SELECT urlImej FROM ImejTempahan WHERE tempahanId = t.tempahanId LIMIT 1) AS imejUrl
     FROM Tempahan t
     WHERE t.pelangganId = ?
     ORDER BY t.tarikhTempahan DESC`,
    [pelangganId]
  );
  // Format to include imej array for frontend compatibility
  return rows.map(row => ({
    ...row,
    imej: row.imejUrl ? [{ urlImej: row.imejUrl }] : [],
  }));
}

/**
 * Get full order details for a specific order belonging to a customer.
 * Includes ButiranTempahan and ImejTempahan.
 * @param {number} tempahanId
 * @param {number} pelangganId
 * @returns {Promise<object|null>}
 */
export async function getCustomerOrderDetail(tempahanId, pelangganId) {
  // Get the order
  const [orders] = await pool.execute(
    `SELECT * FROM Tempahan WHERE tempahanId = ? AND pelangganId = ?`,
    [tempahanId, pelangganId]
  );

  if (orders.length === 0) {
    return null;
  }

  const order = orders[0];

  // Get order details (ButiranTempahan)
  const [butiran] = await pool.execute(
    `SELECT butiranId, kategoriId, pilihanId, namaKategori, namaPilihan, hargaTambahan
     FROM ButiranTempahan
     WHERE tempahanId = ?`,
    [tempahanId]
  );

  // Get order images (ImejTempahan)
  const [imej] = await pool.execute(
    `SELECT imejId, jenisImej, urlImej, promptAI, tarikhMuatNaik
     FROM ImejTempahan
     WHERE tempahanId = ?`,
    [tempahanId]
  );

  return {
    ...order,
    butiran,
    imej,
  };
}

/**
 * Cancel an order. Validates eligibility:
 * - Status is "Menunggu Pengesahan", OR
 * - Status is "Diterima" AND within 24 hours of tarikhTerima
 * @param {number} tempahanId
 * @param {number} pelangganId
 * @returns {Promise<object>}
 */
export async function cancelOrder(tempahanId, pelangganId) {
  // Get the order
  const [orders] = await pool.execute(
    `SELECT tempahanId, pelangganId, statusTempahan, tarikhTerima
     FROM Tempahan
     WHERE tempahanId = ? AND pelangganId = ?`,
    [tempahanId, pelangganId]
  );

  if (orders.length === 0) {
    return buildErrorResponse(
      'Tempahan tidak ditemui.',
      null,
      ERROR_CODES.TIDAK_DITEMUI
    );
  }

  const order = orders[0];

  // Check eligibility
  const canCancel = isCancellable(order);

  if (!canCancel) {
    return buildErrorResponse(
      'Tempahan tidak boleh dibatalkan.',
      null,
      ERROR_CODES.OPERASI_TIDAK_DIBENARKAN
    );
  }

  // Update status to Dibatalkan
  await pool.execute(
    `UPDATE Tempahan SET statusTempahan = ? WHERE tempahanId = ?`,
    [ORDER_STATUS.DIBATALKAN, tempahanId]
  );

  return {
    berjaya: true,
    mesej: 'Tempahan berjaya dibatalkan.',
  };
}

/**
 * Check if an order is eligible for cancellation.
 * @param {object} order - Order with statusTempahan and tarikhTerima
 * @returns {boolean}
 */
function isCancellable(order) {
  if (order.statusTempahan === ORDER_STATUS.MENUNGGU_PENGESAHAN) {
    return true;
  }

  if (order.statusTempahan === ORDER_STATUS.DITERIMA && order.tarikhTerima) {
    const now = new Date();
    const tarikhTerima = new Date(order.tarikhTerima);
    const diffMs = now.getTime() - tarikhTerima.getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    return diffMs <= twentyFourHoursMs;
  }

  return false;
}

// ==================== Merchant Order Management ====================

/**
 * Get paginated list of all orders for merchant with optional filters.
 * @param {object} options - { page, status, tarikhMula, tarikhAkhir, statusBayaran }
 * @returns {Promise<object>}
 */
export async function getMerchantOrders({ page = 1, status, tarikhMula, tarikhAkhir, statusBayaran } = {}) {
  const limit = 20;
  const offset = (page - 1) * limit;

  let whereClause = '';
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('t.statusTempahan = ?');
    params.push(status);
  }

  if (tarikhMula) {
    conditions.push('t.tarikhTempahan >= ?');
    params.push(tarikhMula);
  }

  if (tarikhAkhir) {
    conditions.push('t.tarikhTempahan <= ?');
    params.push(tarikhAkhir + ' 23:59:59');
  }

  if (statusBayaran) {
    conditions.push('t.statusBayaran = ?');
    params.push(statusBayaran);
  }

  if (conditions.length > 0) {
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }

  // Get total count
  const [countResult] = await pool.execute(
    `SELECT COUNT(*) as total FROM Tempahan t ${whereClause}`,
    params
  );
  const total = countResult[0].total;

  // Get paginated orders
  const [rows] = await pool.execute(
    `SELECT t.tempahanId, t.pelangganId, t.tarikhTempahan, t.tarikhAmbil, t.statusTempahan,
            t.statusBayaran, t.jumlahHarga, t.kaedahPenghantaran, p.nama AS namaPelanggan, p.noTelefon
     FROM Tempahan t
     JOIN Pelanggan p ON t.pelangganId = p.pelangganId
     ${whereClause}
     ORDER BY t.tarikhTempahan DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get full order details for merchant view (includes customer info).
 * @param {number} tempahanId
 * @returns {Promise<object|null>}
 */
export async function getMerchantOrderDetail(tempahanId) {
  const [orders] = await pool.execute(
    `SELECT t.*, p.nama AS namaPelanggan, p.noTelefon, p.alamat AS alamatPelanggan
     FROM Tempahan t
     JOIN Pelanggan p ON t.pelangganId = p.pelangganId
     WHERE t.tempahanId = ?`,
    [tempahanId]
  );

  if (orders.length === 0) {
    return null;
  }

  const order = orders[0];

  // Get order details (ButiranTempahan)
  const [butiran] = await pool.execute(
    `SELECT butiranId, kategoriId, pilihanId, namaKategori, namaPilihan, hargaTambahan
     FROM ButiranTempahan
     WHERE tempahanId = ?`,
    [tempahanId]
  );

  // Get order images (ImejTempahan)
  const [imej] = await pool.execute(
    `SELECT imejId, jenisImej, urlImej, promptAI, tarikhMuatNaik
     FROM ImejTempahan
     WHERE tempahanId = ?`,
    [tempahanId]
  );

  return {
    ...order,
    butiran,
    imej,
  };
}

/**
 * Accept an order (merchant). Sets status to "Diterima" and records tarikhTerima.
 * @param {number} tempahanId
 * @returns {Promise<object>}
 */
export async function acceptOrder(tempahanId) {
  const [orders] = await pool.execute(
    `SELECT tempahanId, statusTempahan FROM Tempahan WHERE tempahanId = ?`,
    [tempahanId]
  );

  if (orders.length === 0) {
    return buildErrorResponse(
      'Tempahan tidak ditemui.',
      null,
      ERROR_CODES.TIDAK_DITEMUI
    );
  }

  const order = orders[0];

  if (order.statusTempahan !== ORDER_STATUS.MENUNGGU_PENGESAHAN) {
    return buildErrorResponse(
      'Hanya tempahan dengan status "Menunggu Pengesahan" boleh diterima.',
      null,
      ERROR_CODES.OPERASI_TIDAK_DIBENARKAN
    );
  }

  const now = new Date();
  await pool.execute(
    `UPDATE Tempahan SET statusTempahan = ?, tarikhTerima = ? WHERE tempahanId = ?`,
    [ORDER_STATUS.DITERIMA, now, tempahanId]
  );

  return {
    berjaya: true,
    mesej: 'Tempahan berjaya diterima.',
  };
}

/**
 * Reject an order (merchant). Sets status to "Ditolak" and stores rejection reason.
 * @param {number} tempahanId
 * @param {string} sebabTolak - Rejection reason (1-500 chars)
 * @returns {Promise<object>}
 */
export async function rejectOrder(tempahanId, sebabTolak) {
  // Validate reason
  if (!sebabTolak || sebabTolak.trim().length === 0) {
    return buildErrorResponse(
      'Sebab penolakan diperlukan.',
      'sebabTolak',
      ERROR_CODES.MEDAN_KOSONG
    );
  }

  if (sebabTolak.trim().length > 500) {
    return buildErrorResponse(
      'Sebab penolakan tidak boleh melebihi 500 aksara.',
      'sebabTolak',
      ERROR_CODES.PANJANG_TIDAK_SAH
    );
  }

  const [orders] = await pool.execute(
    `SELECT tempahanId, statusTempahan FROM Tempahan WHERE tempahanId = ?`,
    [tempahanId]
  );

  if (orders.length === 0) {
    return buildErrorResponse(
      'Tempahan tidak ditemui.',
      null,
      ERROR_CODES.TIDAK_DITEMUI
    );
  }

  const order = orders[0];

  if (order.statusTempahan !== ORDER_STATUS.MENUNGGU_PENGESAHAN) {
    return buildErrorResponse(
      'Hanya tempahan dengan status "Menunggu Pengesahan" boleh ditolak.',
      null,
      ERROR_CODES.OPERASI_TIDAK_DIBENARKAN
    );
  }

  await pool.execute(
    `UPDATE Tempahan SET statusTempahan = ?, sebabTolak = ? WHERE tempahanId = ?`,
    [ORDER_STATUS.DITOLAK, sebabTolak.trim(), tempahanId]
  );

  return {
    berjaya: true,
    mesej: 'Tempahan berjaya ditolak.',
  };
}

/**
 * Advance order status to the next phase in the fixed sequence.
 * Enforces forward-only single-step transitions.
 * @param {number} tempahanId
 * @returns {Promise<object>}
 */
export async function advanceStatus(tempahanId) {
  const [orders] = await pool.execute(
    `SELECT tempahanId, statusTempahan FROM Tempahan WHERE tempahanId = ?`,
    [tempahanId]
  );

  if (orders.length === 0) {
    return buildErrorResponse(
      'Tempahan tidak ditemui.',
      null,
      ERROR_CODES.TIDAK_DITEMUI
    );
  }

  const order = orders[0];
  const currentStatus = order.statusTempahan;

  // Find current position in the sequence
  const currentIndex = STATUS_SEQUENCE.indexOf(currentStatus);

  if (currentIndex === -1) {
    return buildErrorResponse(
      'Status tempahan tidak boleh dimajukan.',
      null,
      ERROR_CODES.STATUS_TIDAK_SAH
    );
  }

  // Check if already at the end (Selesai)
  if (currentIndex === STATUS_SEQUENCE.length - 1) {
    return buildErrorResponse(
      'Tempahan sudah selesai. Status tidak boleh dimajukan lagi.',
      null,
      ERROR_CODES.OPERASI_TIDAK_DIBENARKAN
    );
  }

  // Advance to next status
  const nextStatus = STATUS_SEQUENCE[currentIndex + 1];

  await pool.execute(
    `UPDATE Tempahan SET statusTempahan = ? WHERE tempahanId = ?`,
    [nextStatus, tempahanId]
  );

  return {
    berjaya: true,
    mesej: `Status tempahan berjaya dikemaskini kepada "${nextStatus}".`,
    statusBaru: nextStatus,
  };
}

/**
 * Update payment status of an order.
 * Validates order is not cancelled/rejected and new status is valid.
 * @param {number} tempahanId
 * @param {string} statusBayaranBaru - New payment status
 * @returns {Promise<object>}
 */
export async function updatePaymentStatus(tempahanId, statusBayaranBaru) {
  // Validate new payment status is a valid enum value
  const validStatuses = Object.values(PAYMENT_STATUS);
  if (!validStatuses.includes(statusBayaranBaru)) {
    return buildErrorResponse(
      'Status bayaran tidak sah.',
      'statusBayaran',
      ERROR_CODES.STATUS_TIDAK_SAH
    );
  }

  const [orders] = await pool.execute(
    `SELECT tempahanId, statusTempahan, statusBayaran FROM Tempahan WHERE tempahanId = ?`,
    [tempahanId]
  );

  if (orders.length === 0) {
    return buildErrorResponse(
      'Tempahan tidak ditemui.',
      null,
      ERROR_CODES.TIDAK_DITEMUI
    );
  }

  const order = orders[0];

  // Cannot update payment status for cancelled or rejected orders
  if (order.statusTempahan === ORDER_STATUS.DIBATALKAN || order.statusTempahan === ORDER_STATUS.DITOLAK) {
    return buildErrorResponse(
      'Status bayaran tidak boleh dikemaskini untuk tempahan yang dibatalkan atau ditolak.',
      null,
      ERROR_CODES.OPERASI_TIDAK_DIBENARKAN
    );
  }

  await pool.execute(
    `UPDATE Tempahan SET statusBayaran = ? WHERE tempahanId = ?`,
    [statusBayaranBaru, tempahanId]
  );

  return {
    berjaya: true,
    mesej: 'Status bayaran berjaya dikemaskini.',
  };
}

// ==================== Order Creation (Task 6.1) ====================

/**
 * Calculate total price from selected options.
 * @param {number[]} pilihanIds - Array of selected option IDs
 * @returns {Promise<{ jumlahHarga: number, pilihan: Array }>} Total price and option details
 */
export async function calculateTotal(pilihanIds) {
  if (!pilihanIds || pilihanIds.length === 0) {
    return { jumlahHarga: 0, pilihan: [] };
  }

  console.log('calculateTotal - pilihanIds:', pilihanIds);

  const placeholders = pilihanIds.map(() => '?').join(',');
  const [options] = await pool.execute(
    `SELECT p.pilihanId, p.kategoriId, p.nama AS namaPilihan, p.hargaTambahan, k.nama AS namaKategori
     FROM PilihanSpesifikasiKek p
     JOIN KategoriSpesifikasiKek k ON p.kategoriId = k.kategoriId
     WHERE p.pilihanId IN (${placeholders}) AND p.aktif = TRUE`,
    pilihanIds
  );

  console.log('calculateTotal - found options:', options.length, 'of', pilihanIds.length);

  const jumlahHarga = options.reduce((sum, opt) => sum + Number(opt.hargaTambahan), 0);

  return { jumlahHarga, pilihan: options };
}

/**
 * Create a new order with full validation.
 * @param {object} data - Order data
 * @param {number} data.pelangganId - Customer ID
 * @param {Array<{kategoriId: number, pilihanId: number}>} data.butiran - Selected options per category
 * @param {string} data.tarikhAmbil - Pickup/delivery date (YYYY-MM-DD)
 * @param {string} data.kaedahPenghantaran - Delivery method
 * @param {string} [data.alamatPenghantaran] - Delivery address (required if delivery)
 * @param {string} [data.kaedahBayaran] - Payment method (defaults to 'QR Code')
 * @param {string} [data.nota] - Optional notes (max 500 chars)
 * @returns {Promise<object>} Result with tempahanId or error
 */
export async function createOrder({ pelangganId, butiran, tarikhAmbil, kaedahPenghantaran, alamatPenghantaran, kaedahBayaran, nota }) {
  // Validate butiran (selected options)
  if (!butiran || !Array.isArray(butiran) || butiran.length === 0) {
    return buildErrorResponse('Sila pilih sekurang-kurangnya satu spesifikasi kek.', 'butiran', ERROR_CODES.MEDAN_KOSONG);
  }

  // Validate all required categories have a selection
  const requiredCategoriesResult = await validateRequiredCategories(butiran);
  if (requiredCategoriesResult && requiredCategoriesResult.ralat) {
    return requiredCategoriesResult;
  }

  // Validate tarikhAmbil
  if (!tarikhAmbil || typeof tarikhAmbil !== 'string' || tarikhAmbil.trim().length === 0) {
    return buildErrorResponse('Tarikh ambil/penghantaran diperlukan.', 'tarikhAmbil', ERROR_CODES.MEDAN_KOSONG);
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(tarikhAmbil.trim())) {
    return buildErrorResponse('Format tarikh tidak sah. Gunakan format YYYY-MM-DD.', 'tarikhAmbil', ERROR_CODES.TARIKH_TIDAK_SAH);
  }

  const dateValue = new Date(tarikhAmbil.trim() + 'T00:00:00');
  if (isNaN(dateValue.getTime())) {
    return buildErrorResponse('Tarikh tidak sah.', 'tarikhAmbil', ERROR_CODES.TARIKH_TIDAK_SAH);
  }

  // Validate date is at least 2 days in the future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 2);

  if (dateValue < minDate) {
    return buildErrorResponse(
      'Tarikh ambil/penghantaran mestilah sekurang-kurangnya 2 hari dari hari ini.',
      'tarikhAmbil',
      ERROR_CODES.TARIKH_TIDAK_SAH
    );
  }

  // Validate date is not a closed date
  const [closedDates] = await pool.execute(
    'SELECT tarikhTutupId FROM TarikhTutup WHERE tarikh = ?',
    [tarikhAmbil.trim()]
  );

  if (closedDates.length > 0) {
    return buildErrorResponse(
      'Tarikh yang dipilih tidak tersedia. Sila pilih tarikh lain.',
      'tarikhAmbil',
      ERROR_CODES.TARIKH_TIDAK_SAH
    );
  }

  // Validate delivery method
  if (!kaedahPenghantaran || typeof kaedahPenghantaran !== 'string' || kaedahPenghantaran.trim().length === 0) {
    return buildErrorResponse('Kaedah penghantaran diperlukan.', 'kaedahPenghantaran', ERROR_CODES.MEDAN_KOSONG);
  }

  const validDeliveryMethods = Object.values(DELIVERY_METHOD);
  if (!validDeliveryMethods.includes(kaedahPenghantaran.trim())) {
    return buildErrorResponse('Kaedah penghantaran tidak sah.', 'kaedahPenghantaran', ERROR_CODES.FORMAT_TIDAK_SAH);
  }

  // Validate address if delivery method is 'Penghantaran'
  if (kaedahPenghantaran.trim() === DELIVERY_METHOD.PENGHANTARAN) {
    if (!alamatPenghantaran || typeof alamatPenghantaran !== 'string' || alamatPenghantaran.trim().length === 0) {
      return buildErrorResponse('Alamat penghantaran diperlukan untuk kaedah penghantaran.', 'alamatPenghantaran', ERROR_CODES.MEDAN_KOSONG);
    }
    if (alamatPenghantaran.trim().length > 255) {
      return buildErrorResponse('Alamat penghantaran tidak boleh melebihi 255 aksara.', 'alamatPenghantaran', ERROR_CODES.PANJANG_TIDAK_SAH);
    }
  }

  // Payment method defaults to 'QR Code'
  const finalKaedahBayaran = PAYMENT_METHOD.QR_CODE;

  // Validate notes (optional, max 500 chars)
  if (nota !== undefined && nota !== null && nota !== '') {
    if (typeof nota !== 'string') {
      return buildErrorResponse('Nota mesti berupa teks.', 'nota', ERROR_CODES.FORMAT_TIDAK_SAH);
    }
    if (nota.length > 500) {
      return buildErrorResponse('Nota tidak boleh melebihi 500 aksara.', 'nota', ERROR_CODES.PANJANG_TIDAK_SAH);
    }
  }

  // Validate all selected options exist and are active, and get their details
  const pilihanIds = butiran.map(b => b.pilihanId);
  const { jumlahHarga, pilihan } = await calculateTotal(pilihanIds);

  // Verify all requested options were found
  if (pilihan.length !== pilihanIds.length) {
    return buildErrorResponse('Satu atau lebih pilihan tidak sah atau tidak aktif.', 'butiran', ERROR_CODES.TIDAK_DITEMUI);
  }

  // Verify each butiran matches the correct category
  for (const item of butiran) {
    const matchingOption = pilihan.find(p => p.pilihanId === item.pilihanId);
    if (!matchingOption || matchingOption.kategoriId !== item.kategoriId) {
      return buildErrorResponse('Pilihan tidak sepadan dengan kategori.', 'butiran', ERROR_CODES.FORMAT_TIDAK_SAH);
    }
  }

  // Create the order
  const notaValue = (nota && nota.trim().length > 0) ? nota.trim() : null;
  const alamatValue = (kaedahPenghantaran.trim() === DELIVERY_METHOD.PENGHANTARAN)
    ? alamatPenghantaran.trim()
    : null;

  const tempahanId = await generateTempahanId();

  await pool.execute(
    `INSERT INTO Tempahan (tempahanId, pelangganId, tarikhAmbil, kaedahPenghantaran, alamatPenghantaran, kaedahBayaran, jumlahHarga, statusTempahan, nota)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tempahanId,
      pelangganId,
      tarikhAmbil.trim(),
      kaedahPenghantaran.trim(),
      alamatValue,
      finalKaedahBayaran,
      jumlahHarga,
      ORDER_STATUS.MENUNGGU_PENGESAHAN,
      notaValue,
    ]
  );

  // Create ButiranTempahan records (denormalized)
  for (const item of butiran) {
    const optionDetail = pilihan.find(p => p.pilihanId === item.pilihanId);
    const butiranId = await generateButiranId();
    await pool.execute(
      `INSERT INTO ButiranTempahan (butiranId, tempahanId, kategoriId, pilihanId, namaKategori, namaPilihan, hargaTambahan)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        butiranId,
        tempahanId,
        optionDetail.kategoriId,
        optionDetail.pilihanId,
        optionDetail.namaKategori,
        optionDetail.namaPilihan,
        optionDetail.hargaTambahan,
      ]
    );
  }

  return {
    tempahanId,
    jumlahHarga,
    statusTempahan: ORDER_STATUS.MENUNGGU_PENGESAHAN,
  };
}

/**
 * Validate that all required (active) categories have a selected option.
 * @param {Array<{kategoriId: number, pilihanId: number}>} butiran
 * @returns {Promise<object|null>} Error response or null if valid
 */
async function validateRequiredCategories(butiran) {
  // Get all active categories
  const [activeCategories] = await pool.execute(
    'SELECT kategoriId, nama FROM KategoriSpesifikasiKek WHERE aktif = TRUE'
  );

  // Check that every active category has a selection
  const selectedCategoryIds = butiran.map(b => b.kategoriId);
  const missingCategories = activeCategories.filter(
    cat => !selectedCategoryIds.includes(cat.kategoriId)
  );

  if (missingCategories.length > 0) {
    const missingNames = missingCategories.map(c => c.nama).join(', ');
    return buildErrorResponse(
      `Sila pilih pilihan untuk semua kategori: ${missingNames}`,
      'butiran',
      ERROR_CODES.MEDAN_KOSONG
    );
  }

  return null;
}
