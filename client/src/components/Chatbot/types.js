/**
 * @file Type definitions and constants for the Order Form Chatbot (Pembantu Pesanan).
 * All JSDoc type definitions for the chatbot system.
 */

/**
 * Configuration constants
 */
export const MAX_MESSAGES = 50
export const MAX_MESSAGE_LENGTH = 500
export const MAX_SENT_MESSAGES = 20
export const RESPONSE_TIMEOUT = 15000
export const PANEL_MAX_WIDTH = 380
export const PANEL_MAX_HEIGHT = 500
export const MOBILE_BREAKPOINT = 480

/**
 * @typedef {Object} ChatMessage
 * @property {string} id - Unique message ID
 * @property {'customer'|'bot'} sender - Message sender
 * @property {string} content - Message text
 * @property {Date} timestamp - When message was created
 * @property {Suggestion[]} [suggestions] - Optional cake suggestions (bot only)
 */

/**
 * @typedef {Object} ChatSession
 * @property {ChatMessage[]} messages - Max 50 messages, FIFO when exceeded
 * @property {boolean} isOpen - Panel open/closed
 * @property {boolean} isLoading - Waiting for response
 * @property {number} messageCount - Customer messages sent this session (max 20)
 * @property {string|null} error - Current error state
 * @property {boolean} isDisabled - Input disabled (rate limit or error)
 */

/**
 * @typedef {Object} Suggestion
 * @property {string} id - Unique suggestion ID
 * @property {string} penerangan - Description (max 200 chars)
 * @property {SuggestionOption[]} pilihan - Suggested options
 */

/**
 * @typedef {Object} SuggestionOption
 * @property {number} kategoriId
 * @property {number} pilihanId
 * @property {string} kategoriNama
 * @property {string} pilihanNama
 * @property {number} hargaTambahan
 */

/**
 * @typedef {Object} FormAction
 * @property {'pilih_opsyen'} jenis - Action type
 * @property {number} kategoriId
 * @property {number} pilihanId
 */

/**
 * @typedef {Object} FormContext
 * @property {{kategoriId: number, pilihanId: number}[]} pilihanDipilih
 * @property {string|null} kaedahPenghantaran
 * @property {string|null} tarikhAmbil
 * @property {number} jumlahHarga
 * @property {string[]} medanKosong
 */

/**
 * @typedef {Object} HistoryMessage
 * @property {'customer'|'bot'} peranan
 * @property {string} kandungan
 */
