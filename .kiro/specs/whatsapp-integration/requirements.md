# Requirements Document

## Introduction

This feature integrates WhatsApp messaging into the MyKek cake ordering web application using the whatsapp-web.js (wwebjs) library. The integration provides phone number verification during customer registration, order notifications to customers, and new order alerts to the merchant (peniaga). The design prioritizes minimal WhatsApp API usage by sending only essential, high-value messages at critical points in the order lifecycle.

## Glossary

- **WhatsApp_Service**: The server-side module that manages the wwebjs client session and provides methods for sending WhatsApp messages.
- **Pelanggan**: A registered customer of the MyKek system, identified by phone number (noTelefon).
- **Peniaga**: The cake merchant who receives and fulfils orders, identified by noTelefonKedai.
- **Tempahan**: A cake order placed by a Pelanggan, containing specifications, delivery details, and status.
- **OTP**: A one-time password (6-digit numeric code) sent via WhatsApp for phone number verification.
- **Session_Manager**: The component responsible for initializing, authenticating, and maintaining the wwebjs WhatsApp Web session via QR code pairing.
- **Verification_Code**: A temporary 6-digit numeric code stored server-side with an expiry time for phone verification.
- **wwebjs_Client**: The whatsapp-web.js Client instance that connects to WhatsApp Web and sends messages.

## Requirements

### Requirement 1: WhatsApp Session Management

**User Story:** As a system administrator, I want the server to maintain a persistent WhatsApp Web session, so that the application can send messages without manual re-authentication on each restart.

#### Acceptance Criteria

1. WHEN the server starts, THE Session_Manager SHALL initialize the wwebjs_Client and attempt to restore a previously saved session within 30 seconds of server startup.
2. IF no saved session exists, THEN THE Session_Manager SHALL generate a QR code and expose it via an endpoint accessible only to authenticated Peniaga sessions for pairing, where the QR code remains valid for 60 seconds before the Session_Manager generates a new one automatically.
3. WHEN the wwebjs_Client authenticates successfully, THE Session_Manager SHALL persist the session data to the local file system.
4. IF the wwebjs_Client disconnects unexpectedly, THEN THE Session_Manager SHALL attempt automatic reconnection up to 3 times with a 10-second interval between attempts.
5. IF all 3 reconnection attempts fail, THEN THE Session_Manager SHALL set the connection state to "disconnected", log the failure, and discard any queued messages that have been waiting longer than 24 hours while retaining newer queued messages for when connection is manually re-established.
6. WHILE the wwebjs_Client is not authenticated, THE WhatsApp_Service SHALL queue outgoing messages up to a maximum of 100 messages and process the queue in chronological order once connection is re-established.
7. IF the message queue reaches 100 messages while the wwebjs_Client is not authenticated, THEN THE WhatsApp_Service SHALL reject new outgoing messages until the queue has capacity.
8. THE Session_Manager SHALL expose a status endpoint that returns the current connection state (connected, disconnected, or qr_required) accessible only to authenticated Peniaga sessions.

### Requirement 2: Phone Number Verification During Registration

**User Story:** As a customer (Pelanggan), I want to verify my phone number via WhatsApp OTP during registration, so that the system confirms I own the number I registered with.

#### Acceptance Criteria

1. WHEN a Pelanggan submits the registration form with a phone number that matches the Malaysian format (between 10 and 15 digits including country code prefix), THE WhatsApp_Service SHALL send a Verification_Code to that phone number via WhatsApp message within 30 seconds of the request.
2. WHEN a Verification_Code is requested, THE WhatsApp_Service SHALL generate a 6-digit numeric Verification_Code with a 5-minute expiry period starting from the moment of generation.
3. WHEN the Pelanggan submits the correct Verification_Code within the expiry period, THE WhatsApp_Service SHALL mark the phone number as verified, complete the registration, and return a success response confirming the registration is complete.
4. IF the Pelanggan submits an incorrect Verification_Code, THEN THE WhatsApp_Service SHALL return an error message indicating the code is incorrect and display the number of remaining attempts out of a maximum of 3 verification attempts per code.
5. IF the Verification_Code expires or all 3 attempts are exhausted, THEN THE WhatsApp_Service SHALL invalidate the current code, preserve the Pelanggan's submitted registration data, and require the Pelanggan to request a new code.
6. IF the Pelanggan requests a new Verification_Code within 60 seconds of the previous request for the same phone number, THEN THE WhatsApp_Service SHALL reject the request and return an error message indicating the remaining wait time in seconds before a new code can be requested.
7. IF the phone number is not reachable on WhatsApp, THEN THE WhatsApp_Service SHALL return a descriptive error indicating the number is not registered on WhatsApp and prevent the registration from proceeding until a WhatsApp-registered number is provided.

### Requirement 3: Order Confirmation Notification to Customer

**User Story:** As a customer (Pelanggan), I want to receive a WhatsApp message confirming my order details after I place an order, so that I have a record of what I ordered.

#### Acceptance Criteria

1. WHEN a new Tempahan is successfully created, THE WhatsApp_Service SHALL send one order confirmation message to the Pelanggan's verified phone number asynchronously without blocking the order creation API response to the Pelanggan.
2. THE WhatsApp_Service SHALL include the following details in the order confirmation message: tempahanId, tarikhAmbil (formatted as DD/MM/YYYY), kaedahPenghantaran, jumlahHarga (formatted as RM with 2 decimal places), and statusTempahan.
3. IF the WhatsApp message fails to send, THEN THE WhatsApp_Service SHALL log the failure and retry exactly once after a 5-second delay without blocking the order creation response.
4. IF the retry attempt also fails, THEN THE WhatsApp_Service SHALL log the final failure and discard the message without further retry attempts.
5. IF WHATSAPP_ENABLED is set to false, THEN THE WhatsApp_Service SHALL skip sending the order confirmation message and log that the notification was skipped due to the service being disabled.

### Requirement 4: New Order Notification to Merchant

**User Story:** As a merchant (Peniaga), I want to receive a WhatsApp notification when a new order is placed, so that I can promptly review and accept or reject it.

#### Acceptance Criteria

1. WHEN a new Tempahan record is successfully inserted into the database with statusTempahan 'Menunggu Pengesahan', THE WhatsApp_Service SHALL send one notification message to the Peniaga's registered noTelefonKedai within 10 seconds of the insert, without blocking the order creation API response to the customer.
2. THE WhatsApp_Service SHALL include the following details in the merchant notification: tempahanId, customer nama (from the associated Pelanggan record), tarikhAmbil, jumlahHarga (formatted to 2 decimal places in RM), and kaedahPenghantaran.
3. IF the Peniaga's noTelefonKedai is NULL or an empty string, THEN THE WhatsApp_Service SHALL log a warning containing the tempahanId and skip the merchant notification without returning an error to the customer.
4. IF the WhatsApp message fails to send, THEN THE WhatsApp_Service SHALL log the failure with the tempahanId and retry once after a 5-second delay.
5. IF the retry attempt also fails, THEN THE WhatsApp_Service SHALL log the final failure with the tempahanId and abandon the notification without affecting the Tempahan record or notifying the customer of the failure.

### Requirement 5: Order Status Update Notification to Customer

**User Story:** As a customer (Pelanggan), I want to receive WhatsApp notifications only for critical order status changes, so that I am informed without being spammed.

#### Acceptance Criteria

1. WHEN the statusTempahan of a Tempahan changes to "Diterima", THE WhatsApp_Service SHALL send one notification to the Pelanggan's verified phone number (noTelefon) including the tempahanId and a message that the order has been accepted.
2. WHEN the statusTempahan of a Tempahan changes to "Ditolak", THE WhatsApp_Service SHALL send one notification to the Pelanggan's verified phone number (noTelefon) including the tempahanId and the sebabTolak (rejection reason).
3. IF the statusTempahan changes to "Ditolak" and the sebabTolak field is empty or null, THEN THE WhatsApp_Service SHALL include a default indication that no specific reason was provided by the merchant.
4. WHEN the statusTempahan of a Tempahan changes to "Siap", THE WhatsApp_Service SHALL send one notification to the Pelanggan's verified phone number (noTelefon) including the tempahanId and indicating the order is ready, specifying whether it is for pickup or delivery based on the Tempahan's kaedahPenghantaran value.
5. THE WhatsApp_Service SHALL NOT send notifications for status changes other than "Diterima", "Ditolak", and "Siap" (including "Sedang Dibuat", "Dibatalkan", and "Selesai").
6. THE WhatsApp_Service SHALL send status update notifications asynchronously without blocking the status change API response to the Peniaga.
7. IF the WhatsApp message fails to send, THEN THE WhatsApp_Service SHALL log the failure including the tempahanId and error reason, without retrying for status update notifications.

### Requirement 6: Message Formatting and Language

**User Story:** As a customer (Pelanggan), I want WhatsApp notifications to be in Malay language with a clear format, so that I can easily understand the content.

#### Acceptance Criteria

1. THE WhatsApp_Service SHALL format all notification messages in Malay (Bahasa Melayu).
2. THE WhatsApp_Service SHALL include "MyKek" as the first line of every outgoing message, followed by a blank line before the message body, for brand recognition.
3. THE WhatsApp_Service SHALL format currency values in Malaysian Ringgit with the prefix "RM", a comma as the thousand separator, and exactly 2 decimal places (e.g., "RM 1,500.00").
4. THE WhatsApp_Service SHALL format all dates in DD/MM/YYYY format (e.g., "15/01/2025").
5. IF the total formatted message content exceeds 4,096 characters, THEN THE WhatsApp_Service SHALL truncate the message body to fit within the 4,096-character limit while preserving the MyKek header and essential order information.
6. THE WhatsApp_Service SHALL use the customer's registered name in the greeting line of the message body (e.g., "Hai [nama pelanggan],").

### Requirement 7: Phone Number Formatting and Validation

**User Story:** As a developer, I want all phone numbers to be correctly formatted to the WhatsApp ID standard before sending, so that messages reach the intended recipients.

#### Acceptance Criteria

1. THE WhatsApp_Service SHALL strip all non-digit characters (spaces, dashes, parentheses, plus sign) from the input phone number before processing.
2. THE WhatsApp_Service SHALL convert Malaysian phone numbers starting with "0" (e.g., "0121234567") to WhatsApp ID format by replacing the leading "0" with "60" and appending "@c.us" (e.g., "60121234567@c.us").
3. THE WhatsApp_Service SHALL convert phone numbers already prefixed with "60" (e.g., "60121234567") to WhatsApp ID format by appending "@c.us" directly.
4. IF the phone number after stripping non-digit characters contains fewer than 10 digits or more than 15 digits, THEN THE WhatsApp_Service SHALL log the error including the invalid number length and skip the message without throwing an exception.
5. IF the phone number does not start with "0" or "60" after normalization, THEN THE WhatsApp_Service SHALL log the error and skip the message without throwing an exception.

### Requirement 8: Admin QR Code Pairing Interface

**User Story:** As a merchant (Peniaga), I want a simple interface to scan the WhatsApp QR code for pairing, so that I can set up the WhatsApp integration without technical knowledge.

#### Acceptance Criteria

1. WHILE the wwebjs_Client status is "qr_required", THE System SHALL display the QR code image on the Peniaga admin panel, refreshing the QR code automatically every 60 seconds until pairing is successful or the Peniaga navigates away.
2. WHEN the QR code is successfully scanned and authenticated, THE System SHALL update the display to show "Sambungan Berjaya" (Connection Successful) status within 5 seconds of successful authentication.
3. THE System SHALL restrict the QR code pairing interface to authenticated Peniaga sessions only, returning a 401 Unauthorized response for unauthenticated requests.
4. WHEN the Peniaga navigates to the WhatsApp settings page, THE System SHALL display the current connection status using one of three states: "Tersambung" (connected), "Terputus" (disconnected), or "Menunggu Imbasan QR" (awaiting QR scan).
5. IF the wwebjs_Client transitions from "connected" to "disconnected" while the Peniaga is viewing the WhatsApp settings page, THEN THE System SHALL update the displayed status to "Terputus" within 5 seconds without requiring a page refresh.
