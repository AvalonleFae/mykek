import { Router } from 'express';
import { loginMerchant, loginCustomer, registerCustomer } from '../services/authService.js';
import { buildErrorResponse } from '../utils/errorResponse.js';
import { ERROR_CODES } from '../utils/constants.js';

const router = Router();

const MERCHANT_SESSION_MAX_AGE = 60 * 60 * 1000; // 60 minutes
const CUSTOMER_SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

/**
 * POST /api/auth/pelanggan/daftar
 * Customer registration endpoint.
 */
router.post('/pelanggan/daftar', async (req, res) => {
  try {
    const { noTelefon, nama, alamat } = req.body;

    const result = await registerCustomer({ noTelefon, nama, alamat });

    if (result.ralat) {
      return res.status(400).json(result);
    }

    return res.status(201).json({
      berjaya: true,
      mesej: 'Pendaftaran berjaya. Sila log masuk.',
      pelangganId: result.pelangganId,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

/**
 * POST /api/auth/pelanggan/log-masuk
 * Customer login with phone number only.
 */
router.post('/pelanggan/log-masuk', async (req, res) => {
  try {
    const { noTelefon } = req.body;

    const result = await loginCustomer({ noTelefon });

    if (!result.success) {
      const statusCode = result.error.kod === ERROR_CODES.TIDAK_DITEMUI ? 401 : 400;
      return res.status(statusCode).json(
        buildErrorResponse(result.error.mesej, 'noTelefon', result.error.kod)
      );
    }

    // Set session for customer with 24-hour maxAge
    req.session.userId = result.customer.pelangganId;
    req.session.role = 'pelanggan';
    req.session.noTelefon = result.customer.noTelefon;
    req.session.cookie.maxAge = CUSTOMER_SESSION_MAX_AGE;

    return res.status(200).json({
      ralat: false,
      mesej: 'Log masuk berjaya.',
      data: {
        pelangganId: result.customer.pelangganId,
        nama: result.customer.nama,
        noTelefon: result.customer.noTelefon,
      },
    });
  } catch (error) {
    console.error('Customer login error:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

/**
 * POST /api/auth/pelanggan/log-keluar
 * Customer logout.
 */
router.post('/pelanggan/log-keluar', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Customer logout error:', err);
      return res.status(500).json(
        buildErrorResponse('Ralat semasa log keluar. Sila cuba lagi.')
      );
    }

    res.clearCookie('mykek_session');
    return res.status(200).json({
      ralat: false,
      mesej: 'Log keluar berjaya.',
    });
  });
});

/**
 * POST /api/auth/peniaga/log-masuk
 * Merchant login with username and password.
 */
router.post('/peniaga/log-masuk', async (req, res) => {
  try {
    const { namaPenggunaAdmin, kataLaluan } = req.body;

    // Validate required fields
    if (!namaPenggunaAdmin || !kataLaluan) {
      return res.status(400).json(
        buildErrorResponse('Nama pengguna dan kata laluan diperlukan.', null, ERROR_CODES.MEDAN_KOSONG)
      );
    }

    const result = await loginMerchant({ namaPenggunaAdmin, kataLaluan });

    if (!result.success) {
      const statusCode = result.error.kod === 'AKAUN_DIKUNCI' ? 423 : 401;
      return res.status(statusCode).json(
        buildErrorResponse(result.error.mesej, null, result.error.kod || null)
      );
    }

    // Set session for merchant
    req.session.userId = result.merchant.peniagaId;
    req.session.role = 'peniaga';
    req.session.namaPenggunaAdmin = result.merchant.namaPenggunaAdmin;
    req.session.cookie.maxAge = MERCHANT_SESSION_MAX_AGE;

    return res.status(200).json({
      ralat: false,
      mesej: 'Log masuk berjaya.',
      data: {
        peniagaId: result.merchant.peniagaId,
        namaPenggunaAdmin: result.merchant.namaPenggunaAdmin,
        namaKedai: result.merchant.namaKedai,
      },
    });
  } catch (error) {
    console.error('Merchant login error:', error);
    return res.status(500).json(
      buildErrorResponse('Ralat sistem. Sila cuba lagi.')
    );
  }
});

/**
 * POST /api/auth/peniaga/log-keluar
 * Merchant logout.
 */
router.post('/peniaga/log-keluar', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json(
        buildErrorResponse('Ralat semasa log keluar. Sila cuba lagi.')
      );
    }

    res.clearCookie('mykek_session');
    return res.status(200).json({
      ralat: false,
      mesej: 'Log keluar berjaya.',
    });
  });
});

export default router;
