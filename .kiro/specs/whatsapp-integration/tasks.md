# Implementation Plan: WhatsApp Integration

## Overview

This plan implements WhatsApp messaging into the MyKek system using whatsapp-web.js (wwebjs). The implementation follows a bottom-up approach: utilities first, then core services, database migration, API routes, frontend pages, and finally integration with existing order flows.

## Tasks

- [ ] 1. Implement phone number utility and message formatter
  - [ ] 1.1 Create `server/src/services/phoneNumberUtil.js`
    - Strip all non-digit characters (spaces, dashes, parentheses, plus sign)
    - Convert numbers starting with "0" to "60" prefix
    - Append "@c.us" suffix for WhatsApp ID format
    - Validate digit count (10-15 digits) and prefix ("0" or "60")
    - Return `{ valid: true, whatsappId }` or `{ valid: false, reason }` without throwing exceptions
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 1.2 Write unit tests for `phoneNumberUtil.js`
    - Test stripping of various non-digit characters
    - Test "0" prefix conversion to "60"
    - Test numbers already prefixed with "60"
    - Test rejection of numbers with <10 or >15 digits
    - Test rejection of numbers not starting with "0" or "60"
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 1.3 Create `server/src/services/messageFormatter.js`
    - Implement `formatOrderConfirmation(order)` — includes tempahanId, tarikhAmbil (DD/MM/YYYY), kaedahPenghantaran, jumlahHarga (RM X,XXX.XX), statusTempahan
    - Implement `formatMerchantNotification(order, customer)` — includes tempahanId, customer nama, tarikhAmbil, jumlahHarga, kaedahPenghantaran
    - Implement `formatStatusUpdate(order, newStatus, sebabTolak)` — handles Diterima, Ditolak (with sebabTolak or default), Siap (with pickup/delivery distinction)
    - Implement `formatOtpMessage(code)` — OTP message with code
    - All messages: "MyKek" header on first line, blank line, greeting with customer name, Malay language, RM currency with comma thousands separator, DD/MM/YYYY dates
    - Truncate to 4,096 characters if needed, preserving header and essential info
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 3.2, 4.2, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 1.4 Write unit tests for `messageFormatter.js`
    - Test MyKek header presence and blank line separator
    - Test RM currency formatting (comma thousands, 2 decimals)
    - Test DD/MM/YYYY date formatting
    - Test customer name in greeting
    - Test status update messages for Diterima, Ditolak, Siap
    - Test Ditolak with null/empty sebabTolak uses default text
    - Test Siap message distinguishes pickup vs delivery
    - Test truncation at 4,096 characters
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 2. Implement OTP service
  - [ ] 2.1 Create `server/src/services/otpService.js`
    - In-memory store: Map keyed by phone number → `{ code, expiresAt, attempts, lastRequestAt }`
    - `generateOtp(phoneNumber)` — generates 6-digit numeric code, stores with 5-minute expiry, enforces 60-second rate limit per phone number
    - `verifyOtp(phoneNumber, code)` — validates code within expiry, tracks attempts (max 3), invalidates on expiry or exhausted attempts
    - Return descriptive error messages: incorrect code with remaining attempts, expired code, rate-limited with wait time
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 2.2 Write unit tests for `otpService.js`
    - Test 6-digit code generation
    - Test 5-minute expiry window
    - Test successful verification
    - Test incorrect code with attempt tracking
    - Test code invalidation after 3 failed attempts
    - Test 60-second rate limiting between requests
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 3. Implement WhatsApp service (core wwebjs client)
  - [ ] 3.1 Create `server/src/services/whatsappService.js`
    - Singleton pattern: export single instance
    - Initialize wwebjs Client with LocalAuth strategy, session path from `WHATSAPP_SESSION_PATH` env var
    - Puppeteer args from `WHATSAPP_PUPPETEER_ARGS` env var (e.g., `--no-sandbox`)
    - Event handlers: `qr` (store latest QR string), `ready` (set state to connected, flush queue), `disconnected` (trigger reconnection logic), `authenticated` (log success)
    - Connection states: "connected", "disconnected", "qr_required"
    - Auto-reconnection: up to 3 attempts, 10-second interval between attempts
    - If all reconnection attempts fail: set state to "disconnected", log failure, discard queued messages older than 24 hours
    - In-memory message queue: max 100 messages, chronological FIFO processing
    - `sendMessage(phoneNumber, text)` — normalizes phone via phoneNumberUtil, queues if disconnected, sends if connected
    - `getStatus()` — returns current connection state
    - `getQrDataUrl()` — generates QR code as data URL using `qrcode` library
    - Feature flag: if `WHATSAPP_ENABLED` is "false", all send operations are no-ops with logging
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 3.5_

  - [ ]* 3.2 Write unit tests for `whatsappService.js`
    - Mock wwebjs Client and qrcode library
    - Test message queuing when disconnected
    - Test queue cap at 100 messages (rejects new messages when full)
    - Test queue flush on reconnection in chronological order
    - Test feature flag disables sending
    - Test reconnection attempt logic (3 attempts, 10s interval)
    - Test messages older than 24 hours are discarded on failed reconnection
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 3.5_

- [ ] 4. Checkpoint - Core services
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Database migration and API routes
  - [ ] 5.1 Create database migration `server/db/migrations/009_pelanggan_telefon_disahkan.sql`
    - Add `noTelefonDisahkan` BOOLEAN column (default FALSE) to Pelanggan table
    - `ALTER TABLE Pelanggan ADD COLUMN noTelefonDisahkan BOOLEAN NOT NULL DEFAULT FALSE;`
    - _Requirements: 2.3_

  - [ ] 5.2 Create `server/src/routes/peniaga/whatsapp.js`
    - `GET /api/peniaga/whatsapp/status` — returns `{ status: "connected"|"disconnected"|"qr_required" }`, requires authenticated peniaga session
    - `GET /api/peniaga/whatsapp/qr` — returns `{ qrDataUrl }` when status is qr_required, 404 otherwise, requires authenticated peniaga session
    - Apply auth middleware (role: peniaga) to both endpoints
    - _Requirements: 1.2, 1.8, 8.3_

  - [ ] 5.3 Create WhatsApp OTP routes in `server/src/routes/public.js` (extend existing)
    - `POST /api/awam/whatsapp/hantar-otp` — accepts `{ noTelefon }`, validates Malaysian format, generates OTP via otpService, sends via whatsappService, returns success/error
    - `POST /api/awam/whatsapp/sahkan-otp` — accepts `{ noTelefon, kod }`, verifies via otpService, on success marks phone as verified (updates `noTelefonDisahkan` in DB), returns result with remaining attempts on failure
    - Handle WhatsApp unreachable error (number not on WhatsApp)
    - No auth required (pre-registration endpoints)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 5.4 Register WhatsApp routes in `server/src/index.js`
    - Import and mount `peniagaWhatsappRoutes` at `/api/peniaga/whatsapp`
    - Initialize whatsappService on server startup (conditionally, based on WHATSAPP_ENABLED)
    - _Requirements: 1.1, 1.8_

  - [ ]* 5.5 Write unit tests for WhatsApp API routes
    - Test status endpoint returns correct state
    - Test QR endpoint returns data URL when qr_required
    - Test QR endpoint returns 404 when already connected
    - Test auth middleware blocks unauthenticated requests (401)
    - Test OTP send endpoint validates phone format
    - Test OTP send endpoint enforces rate limiting
    - Test OTP verify endpoint with correct/incorrect codes
    - _Requirements: 1.8, 2.1, 2.4, 2.6, 8.3_

- [ ] 6. Checkpoint - Backend API layer
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Frontend: WhatsApp settings page and registration OTP flow
  - [ ] 7.1 Create `client/src/pages/peniaga/WhatsAppSettingsPage.jsx`
    - Display connection status: "Tersambung", "Terputus", or "Menunggu Imbasan QR"
    - When status is "qr_required": fetch and display QR code image, auto-refresh every 60 seconds
    - When QR is scanned successfully: show "Sambungan Berjaya" message
    - Poll `/api/peniaga/whatsapp/status` every 5 seconds to detect state changes
    - Update status display within 5 seconds of state transition (connected↔disconnected)
    - Tailwind CSS styling consistent with existing peniaga pages
    - _Requirements: 8.1, 8.2, 8.4, 8.5_

  - [ ] 7.2 Add WhatsApp settings navigation to merchant layout
    - Add "WhatsApp" menu item in `client/src/components/MerchantLayout.jsx` sidebar
    - Add route in `client/src/App.jsx` for `/peniaga/whatsapp` → WhatsAppSettingsPage
    - _Requirements: 8.1_

  - [ ] 7.3 Modify customer registration flow to include OTP verification
    - Update registration form (in auth routes or registration page) to add OTP step
    - After phone number entry: "Hantar OTP" button calls `/api/awam/whatsapp/hantar-otp`
    - Show OTP input field after sending, with countdown timer for resend (60s)
    - On verify: call `/api/awam/whatsapp/sahkan-otp`, show remaining attempts on failure
    - On success: complete registration, preserve form data if code expires
    - Conditionally show OTP flow based on `WHATSAPP_VERIFY_PHONE` config (can be passed via a public config endpoint or env-injected)
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 7.4 Write unit tests for WhatsAppSettingsPage component
    - Test renders connection status correctly for each state
    - Test QR code display when qr_required
    - Test polling behavior
    - _Requirements: 8.1, 8.2, 8.4_

- [ ] 8. Integration with order creation and status change flows
  - [ ] 8.1 Hook WhatsApp notifications into order creation (`server/src/services/orderService.js`)
    - After successful `createOrder`: asynchronously send order confirmation to customer (fire-and-forget, no blocking)
    - After successful `createOrder`: asynchronously send new order notification to merchant's noTelefonKedai
    - Use messageFormatter for message content
    - Retry once after 5-second delay on failure for both notifications
    - Skip merchant notification if noTelefonKedai is null/empty (log warning with tempahanId)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 8.2 Hook WhatsApp notifications into order status changes
    - After `acceptOrder` (Diterima): send notification to customer
    - After `rejectOrder` (Ditolak): send notification with sebabTolak to customer
    - After `advanceStatus` to "Siap": send notification to customer
    - Do NOT send for Sedang Dibuat, Dibatalkan, Selesai transitions
    - All notifications are async/non-blocking, log failures without retry for status updates
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 8.3 Write integration tests for notification hooks
    - Mock whatsappService, verify correct messages sent on order creation
    - Verify merchant notification includes customer name and order details
    - Verify status update notifications sent only for Diterima, Ditolak, Siap
    - Verify no notification for Sedang Dibuat, Dibatalkan, Selesai
    - Verify retry logic on failure (once with 5s delay for order creation)
    - Verify no retry for status update notifications
    - _Requirements: 3.1, 3.3, 4.1, 5.1, 5.5, 5.7_

- [ ] 9. Environment configuration and final wiring
  - [ ] 9.1 Add environment variables to `server/.env` and document
    - Add `WHATSAPP_ENABLED=false` (default off for dev)
    - Add `WHATSAPP_VERIFY_PHONE=false` (default off for dev)
    - Add `WHATSAPP_SESSION_PATH=.wwebjs_auth`
    - Add `WHATSAPP_PUPPETEER_ARGS=--no-sandbox`
    - Add `.wwebjs_auth/` to `server/.gitignore`
    - _Requirements: 1.1, 3.5_

  - [ ] 9.2 Install npm dependencies
    - Add `whatsapp-web.js` and `qrcode` to server dependencies
    - _Requirements: Design technology additions_

- [ ] 10. Final checkpoint - Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The whatsappService uses a feature flag (`WHATSAPP_ENABLED`) so all other code can be developed and tested without Puppeteer/Chromium running
- Unit tests for whatsappService should mock the wwebjs Client to avoid needing a real WhatsApp session
- The OTP store is in-memory; server restart clears all pending OTPs (acceptable per design decisions)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "9.1", "9.2"] },
    { "id": 1, "tasks": ["1.2", "1.4", "2.1", "5.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "5.2", "5.3"] },
    { "id": 4, "tasks": ["5.4", "5.5"] },
    { "id": 5, "tasks": ["7.1", "7.2", "7.3"] },
    { "id": 6, "tasks": ["7.4", "8.1", "8.2"] },
    { "id": 7, "tasks": ["8.3"] }
  ]
}
```
