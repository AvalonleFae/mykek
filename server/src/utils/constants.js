/**
 * Shared ENUM constants and error codes for MyKek system.
 * All user-facing text is in Bahasa Melayu.
 */

// Order Status ENUM values
export const ORDER_STATUS = Object.freeze({
  MENUNGGU_PENGESAHAN: 'Menunggu Pengesahan',
  DITERIMA: 'Diterima',
  DITOLAK: 'Ditolak',
  DIBATALKAN: 'Dibatalkan',
  SEDANG_DIPROSES: 'Sedang Diproses',
  SEDANG_DIHIAS: 'Sedang Dihias',
  SEDIA: 'Sedia untuk Diambil/Dihantar',
  SELESAI: 'Selesai',
});

// Payment Status ENUM values
export const PAYMENT_STATUS = Object.freeze({
  BELUM_DIBAYAR: 'Belum Dibayar',
  DEPOSIT_DIBAYAR: 'Deposit Dibayar',
  TELAH_DIBAYAR: 'Telah Dibayar',
});

// Delivery Method ENUM values
export const DELIVERY_METHOD = Object.freeze({
  AMBIL_SENDIRI: 'Ambil Sendiri',
  PENGHANTARAN: 'Penghantaran',
});

// Payment Method ENUM values
export const PAYMENT_METHOD = Object.freeze({
  TUNAI: 'Tunai',
  PINDAHAN_BANK: 'Pindahan Bank',
});

// Image Type ENUM values
export const IMAGE_TYPE = Object.freeze({
  AI: 'AI',
  MUAT_NAIK: 'Muat Naik',
});

// Error codes
export const ERROR_CODES = Object.freeze({
  PENDAFTARAN_DUPLIKAT: 'PENDAFTARAN_DUPLIKAT',
  FORMAT_TIDAK_SAH: 'FORMAT_TIDAK_SAH',
  MEDAN_KOSONG: 'MEDAN_KOSONG',
  PANJANG_TIDAK_SAH: 'PANJANG_TIDAK_SAH',
  HARGA_TIDAK_SAH: 'HARGA_TIDAK_SAH',
  TIDAK_DITEMUI: 'TIDAK_DITEMUI',
  AKSES_DITOLAK: 'AKSES_DITOLAK',
  SESI_TAMAT: 'SESI_TAMAT',
  AKAUN_DIKUNCI: 'AKAUN_DIKUNCI',
  TARIKH_TIDAK_SAH: 'TARIKH_TIDAK_SAH',
  STATUS_TIDAK_SAH: 'STATUS_TIDAK_SAH',
  OPERASI_TIDAK_DIBENARKAN: 'OPERASI_TIDAK_DIBENARKAN',
});
