/**
 * Standardized error response builder for MyKek system.
 * All error responses follow the format: { ralat: true, mesej, medan, kod }
 */

/**
 * Builds a standardized error response object.
 * @param {string} mesej - Error message in Bahasa Melayu
 * @param {string|null} medan - Field name that caused the error (optional)
 * @param {string|null} kod - Error code constant (optional)
 * @returns {{ ralat: true, mesej: string, medan: string|null, kod: string|null }}
 */
export function buildErrorResponse(mesej, medan = null, kod = null) {
  return {
    ralat: true,
    mesej,
    medan,
    kod,
  };
}
