import { buildErrorResponse } from '../utils/errorResponse.js';
import { ERROR_CODES } from '../utils/constants.js';

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
