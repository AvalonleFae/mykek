import pool from '../config/db.js';

/**
 * Generic ID generator for prefixed VARCHAR IDs.
 * Queries the MAX existing ID from the table, extracts the numeric part,
 * increments it, and returns the next formatted ID.
 *
 * @param {string} table - Table name
 * @param {string} column - Primary key column name
 * @param {string} prefix - ID prefix (e.g., 'C', 'N', 'K')
 * @returns {Promise<string>} Next ID (e.g., 'C001', 'N002')
 */
async function generateId(table, column, prefix) {
  const [rows] = await pool.execute(
    `SELECT ${column} FROM ${table} ORDER BY ${column} DESC LIMIT 1`
  );

  let nextNum = 1;

  if (rows.length > 0) {
    const lastId = rows[0][column];
    const numPart = parseInt(lastId.replace(prefix, ''), 10);
    if (!isNaN(numPart)) {
      nextNum = numPart + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

/**
 * Generate next Pelanggan ID (C001, C002, ...)
 */
export async function generatePelangganId() {
  return generateId('Pelanggan', 'pelangganId', 'C');
}

/**
 * Generate next Peniaga ID (N001, N002, ...)
 */
export async function generatePeniagaId() {
  return generateId('Peniaga', 'peniagaId', 'N');
}

/**
 * Generate next KategoriSpesifikasiKek ID (K001, K002, ...)
 */
export async function generateKategoriId() {
  return generateId('KategoriSpesifikasiKek', 'kategoriId', 'K');
}

/**
 * Generate next PilihanSpesifikasiKek ID (P001, P002, ...)
 */
export async function generatePilihanId() {
  return generateId('PilihanSpesifikasiKek', 'pilihanId', 'P');
}

/**
 * Generate next Tempahan ID (T001, T002, ...)
 */
export async function generateTempahanId() {
  return generateId('Tempahan', 'tempahanId', 'T');
}

/**
 * Generate next ButiranTempahan ID (B001, B002, ...)
 */
export async function generateButiranId() {
  return generateId('ButiranTempahan', 'butiranId', 'B');
}

/**
 * Generate next ImejTempahan ID (I001, I002, ...)
 */
export async function generateImejId() {
  return generateId('ImejTempahan', 'imejId', 'I');
}

/**
 * Generate next TarikhTutup ID (D001, D002, ...)
 */
export async function generateTarikhTutupId() {
  return generateId('TarikhTutup', 'tarikhTutupId', 'D');
}
