import pool from '../config/db.js';
import PDFDocument from 'pdfkit';
import { ORDER_STATUS, PAYMENT_STATUS } from '../utils/constants.js';

/**
 * Get sales report data for a given month and year.
 * @param {number} bulan - Month (1-12)
 * @param {number} tahun - Year (e.g. 2025)
 * @returns {Promise<object>} Sales report data
 */
export async function getSalesReport(bulan, tahun) {
  // Build date range for the given month
  const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01 00:00:00`;
  // Get last day of month by going to next month day 0
  const lastDay = new Date(tahun, bulan, 0).getDate();
  const endDate = `${tahun}-${String(bulan).padStart(2, '0')}-${String(lastDay).padStart(2, '0')} 23:59:59`;

  // Total orders in the period
  const [totalResult] = await pool.execute(
    `SELECT COUNT(*) AS jumlahTempahan FROM Tempahan
     WHERE tarikhTempahan >= ? AND tarikhTempahan <= ?`,
    [startDate, endDate]
  );
  const jumlahTempahan = totalResult[0].jumlahTempahan;

  // Total revenue (exclude Dibatalkan and Ditolak)
  const [revenueResult] = await pool.execute(
    `SELECT COALESCE(SUM(jumlahHarga), 0) AS jumlahHasil FROM Tempahan
     WHERE tarikhTempahan >= ? AND tarikhTempahan <= ?
     AND statusTempahan NOT IN (?, ?)`,
    [startDate, endDate, ORDER_STATUS.DIBATALKAN, ORDER_STATUS.DITOLAK]
  );
  const jumlahHasil = Number(revenueResult[0].jumlahHasil);

  // Status breakdown
  const [statusRows] = await pool.execute(
    `SELECT statusTempahan, COUNT(*) AS bilangan FROM Tempahan
     WHERE tarikhTempahan >= ? AND tarikhTempahan <= ?
     GROUP BY statusTempahan`,
    [startDate, endDate]
  );

  // Build status breakdown with all possible statuses
  const pecahanStatus = {};
  for (const status of Object.values(ORDER_STATUS)) {
    pecahanStatus[status] = 0;
  }
  for (const row of statusRows) {
    pecahanStatus[row.statusTempahan] = row.bilangan;
  }

  // Payment status breakdown
  const [paymentRows] = await pool.execute(
    `SELECT statusBayaran, COUNT(*) AS bilangan FROM Tempahan
     WHERE tarikhTempahan >= ? AND tarikhTempahan <= ?
     GROUP BY statusBayaran`,
    [startDate, endDate]
  );

  // Build payment breakdown with all possible statuses
  const pecahanBayaran = {};
  for (const status of Object.values(PAYMENT_STATUS)) {
    pecahanBayaran[status] = 0;
  }
  for (const row of paymentRows) {
    pecahanBayaran[row.statusBayaran] = row.bilangan;
  }

  return {
    bulan,
    tahun,
    jumlahTempahan,
    jumlahHasil,
    pecahanStatus,
    pecahanBayaran,
  };
}

/**
 * Generate a PDF sales report and write it to the provided writable stream.
 * @param {object} reportData - Sales report data from getSalesReport()
 * @param {import('stream').Writable} stream - Writable stream (e.g. Express response)
 * @returns {Promise<void>}
 */
export function generatePDF(reportData, stream) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });

    doc.on('error', reject);
    doc.on('end', resolve);

    doc.pipe(stream);

    const namaBulan = [
      '', 'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
      'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember',
    ];

    // Title
    doc.fontSize(20).text('Laporan Jualan MyKek', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).text(
      `${namaBulan[reportData.bulan]} ${reportData.tahun}`,
      { align: 'center' }
    );
    doc.moveDown(1.5);

    // Summary
    doc.fontSize(12).text('Ringkasan', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11)
      .text(`Jumlah Tempahan: ${reportData.jumlahTempahan}`)
      .text(`Jumlah Hasil: RM ${reportData.jumlahHasil.toFixed(2)}`);
    doc.moveDown(1);

    // Status breakdown
    doc.fontSize(12).text('Pecahan Status Tempahan', { underline: true });
    doc.moveDown(0.5);
    for (const [status, count] of Object.entries(reportData.pecahanStatus)) {
      doc.fontSize(11).text(`  ${status}: ${count}`);
    }
    doc.moveDown(1);

    // Payment breakdown
    doc.fontSize(12).text('Pecahan Status Bayaran', { underline: true });
    doc.moveDown(0.5);
    for (const [status, count] of Object.entries(reportData.pecahanBayaran)) {
      doc.fontSize(11).text(`  ${status}: ${count}`);
    }
    doc.moveDown(1.5);

    // Footer
    doc.fontSize(9).text(
      `Dijana pada: ${new Date().toLocaleString('ms-MY')}`,
      { align: 'right' }
    );

    doc.end();
  });
}
