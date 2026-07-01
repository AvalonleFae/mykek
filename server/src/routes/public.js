import { Router } from 'express';
import { buildErrorResponse } from '../utils/errorResponse.js';
import pool from '../config/db.js';
import { generateOTP, verifyOTP, _getStore } from '../services/otpService.js';
import { sendOTP, isRegisteredUser } from '../services/whatsappService.js';
import { registerCustomer } from '../services/authService.js';
import { validatePhoneNumber, validateNameRegistration } from '../utils/validators.js';
import { ERROR_CODES } from '../utils/constants.js';

const router = Router();

/**
 * GET /api/awam/profil-kedai
 * Public endpoint — returns shop info (namaKedai, noTelefonKedai, peneranganKedai).
 * No authentication required.
 */
router.get('/profil-kedai', async (req, res) => {
  try {
    // Get the first (and only) merchant's public business info
    const [rows] = await pool.execute(
      'SELECT namaKedai, noTelefonKedai, peneranganKedai FROM Peniaga LIMIT 1'
    );

    if (rows.length === 0) {
      return res.status(404).json(
        buildErrorResponse('Maklumat kedai tidak ditemui.')
      );
    }

    return res.status(200).json({
      ralat: false,
      data: rows[0],
    });
  } catch (error) {
    console.error('Error fetching public shop info:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

/**
 * POST /api/awam/whatsapp/hantar-otp
 * Send OTP to a phone number via WhatsApp for registration verification.
 * No authentication required (pre-registration endpoint).
 */
router.post('/whatsapp/hantar-otp', async (req, res) => {
  try {
    const { noTelefon, nama, alamat } = req.body;

    // Validate phone number format
    const phoneResult = validatePhoneNumber(noTelefon);
    if (!phoneResult.sah) {
      return res.status(400).json(
        buildErrorResponse(phoneResult.mesej, 'noTelefon', ERROR_CODES.FORMAT_TIDAK_SAH)
      );
    }

    // Validate nama
    const nameResult = validateNameRegistration(nama);
    if (!nameResult.sah) {
      return res.status(400).json(
        buildErrorResponse(nameResult.mesej, 'nama', ERROR_CODES.MEDAN_KOSONG)
      );
    }

    // Check if phone number is already registered
    const [existing] = await pool.execute(
      'SELECT pelangganId FROM Pelanggan WHERE noTelefon = ?',
      [noTelefon.trim()]
    );
    if (existing.length > 0) {
      return res.status(400).json(
        buildErrorResponse('Nombor telefon sudah didaftarkan. Sila log masuk.', 'noTelefon', ERROR_CODES.PENDAFTARAN_DUPLIKAT)
      );
    }

    // Check if number is registered on WhatsApp
    const isOnWhatsApp = await isRegisteredUser(noTelefon);
    if (!isOnWhatsApp) {
      return res.status(400).json({
        ralat: true,
        mesej: 'Nombor ini tidak berdaftar di WhatsApp.',
        medan: 'noTelefon',
      });
    }

    // Generate OTP (with rate limiting)
    const otpResult = generateOTP(noTelefon, { nama, alamat });
    if (otpResult.ralat) {
      return res.status(429).json(otpResult);
    }

    // Send OTP via WhatsApp
    const store = _getStore();
    const entry = store.get(noTelefon);
    await sendOTP(noTelefon, entry.code, nama);

    return res.status(200).json({
      berjaya: true,
      mesej: 'Kod pengesahan telah dihantar ke WhatsApp anda.',
    });
  } catch (error) {
    console.error('Error in hantar-otp:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

/**
 * POST /api/awam/whatsapp/sahkan-otp
 * Verify OTP and complete customer registration.
 * No authentication required (pre-registration endpoint).
 */
router.post('/whatsapp/sahkan-otp', async (req, res) => {
  try {
    const { noTelefon, kod } = req.body;

    // Verify OTP
    const verifyResult = verifyOTP(noTelefon, kod);
    if (!verifyResult.sah) {
      return res.status(400).json(verifyResult);
    }

    // OTP verified — register the customer
    const { registrationData } = verifyResult;
    const regResult = await registerCustomer({
      noTelefon,
      nama: registrationData.nama,
      alamat: registrationData.alamat,
    });

    // Check if registration failed (duplicate, etc.)
    if (regResult.ralat) {
      return res.status(400).json(regResult);
    }

    // Update Pelanggan record to set noTelefonDisahkan = TRUE
    await pool.execute(
      'UPDATE Pelanggan SET noTelefonDisahkan = TRUE WHERE pelangganId = ?',
      [regResult.pelangganId]
    );

    return res.status(201).json({
      berjaya: true,
      mesej: 'Pendaftaran berjaya.',
      pelangganId: regResult.pelangganId,
    });
  } catch (error) {
    console.error('Error in sahkan-otp:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

export default router;
