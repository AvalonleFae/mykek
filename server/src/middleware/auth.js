import { buildErrorResponse } from '../utils/errorResponse.js';
import { ERROR_CODES } from '../utils/constants.js';

/**
 * Session timeout constants (in milliseconds).
 */
const MERCHANT_SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutes
const CUSTOMER_SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Authentication middleware.
 * Checks that a valid session exists with userId and role.
 * Returns 401 if unauthenticated or session has expired.
 */
export function authMiddleware(req, res, next) {
  // Check if session exists with required fields
  if (!req.session || !req.session.userId || !req.session.role) {
    return res.status(401).json(
      buildErrorResponse('Sila log masuk.', null, ERROR_CODES.SESI_TAMAT)
    );
  }

  // Check session inactivity timeout based on role
  const now = Date.now();
  const lastAccess = req.session.lastAccess || req.session.cookie._expires?.getTime();

  if (lastAccess) {
    const timeout = req.session.role === 'peniaga'
      ? MERCHANT_SESSION_TIMEOUT
      : CUSTOMER_SESSION_TIMEOUT;

    const elapsed = now - lastAccess;

    if (elapsed > timeout) {
      // Session has expired due to inactivity
      return req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
        }
        res.clearCookie('mykek_session');
        return res.status(401).json(
          buildErrorResponse('Sesi anda telah tamat. Sila log masuk semula.', null, ERROR_CODES.SESI_TAMAT)
        );
      });
    }
  }

  // Update last access time for inactivity tracking
  req.session.lastAccess = now;

  next();
}

/**
 * Role-based access guard middleware factory.
 * Returns middleware that checks if the authenticated user has the required role.
 * Must be used AFTER authMiddleware.
 *
 * @param {string} requiredRole - The required role ('pelanggan' or 'peniaga')
 * @returns {Function} Express middleware function
 */
export function roleGuard(requiredRole) {
  return (req, res, next) => {
    if (req.session.role !== requiredRole) {
      return res.status(403).json(
        buildErrorResponse('Akses ditolak.', null, ERROR_CODES.AKSES_DITOLAK)
      );
    }

    next();
  };
}
