# Implementation Plan: MyKek Cake Ordering System

## Overview

This implementation plan breaks down the MyKek cake ordering system into incremental coding tasks. The system uses Vite + React (JSX) frontend with Tailwind CSS, Node.js + Express backend, MariaDB database with raw mysql2 parameterized queries, and fast-check for property-based testing. All user-facing text is in Bahasa Melayu. Each task builds on previous tasks, ensuring no orphaned code.

## Tasks

- [x] 1. Set up project structure, database schema, and core configuration
  - [x] 1.1 Initialize project structure with Vite React frontend and Express backend
    - Create monorepo structure with `client/` (Vite + React) and `server/` directories
    - Configure Vite with React and Tailwind CSS
    - Set up Express server with basic middleware (cors, body-parser, express-session)
    - Configure mysql2 connection pool to MariaDB
    - Set up Vitest configuration for both client and server
    - Install dependencies: axios, react-router-dom, tailwindcss, express, mysql2, express-session, express-mysql-session, bcrypt, multer, fast-check, supertest
    - _Requirements: 17.1_

  - [x] 1.2 Create database migration SQL files and seed data
    - Write SQL migration for `Pelanggan` table (pelangganId, noTelefon, nama, alamat, tarikhDaftar)
    - Write SQL migration for `Peniaga` table (peniagaId, namaPenggunaAdmin, kataLaluan, namaKedai, noTelefonKedai, peneranganKedai, tarikhKemaskini)
    - Write SQL migration for `KategoriSpesifikasiKek` table (kategoriId, nama, penerangan, aktif, tarikhCipta)
    - Write SQL migration for `PilihanSpesifikasiKek` table (pilihanId, kategoriId FK, nama, penerangan, hargaTambahan, aktif, tarikhCipta)
    - Write SQL migration for `Tempahan` table with all ENUM columns (statusTempahan, statusBayaran, kaedahPenghantaran, kaedahBayaran)
    - Write SQL migration for `ButiranTempahan` table (denormalized with namaKategori, namaPilihan, hargaTambahan)
    - Write SQL migration for `ImejTempahan` table (imejId, tempahanId FK, jenisImej ENUM, urlImej, promptAI, tarikhMuatNaik)
    - Write SQL migration for `TarikhTutup` table (tarikhTutupId, tarikh UNIQUE, catatan, tarikhCipta)
    - Write seed SQL file for default Merchant account (hashed password)
    - Create a `db/migrate.js` script that runs all SQL migration files in order using mysql2
    - _Requirements: 1.1, 9.1, 13.1, 13.2, 14.1_

  - [x] 1.3 Create shared validation utilities and constants
    - Create validation functions: phone number format (10-11 digits starting with "01"), name length (1-100 chars), address length (≤500 chars), price range (RM 0.00-9999.99)
    - Define ENUM constants for Order_Status, Payment_Status, Delivery_Method, Payment_Method, Image_Type
    - Create error code constants (e.g., PENDAFTARAN_DUPLIKAT, FORMAT_TIDAK_SAH)
    - Create standardized error response builder: `{ ralat: true, mesej, medan, kod }`
    - _Requirements: 1.1, 1.3, 3.1, 4.3, 13.7_

  - [ ]* 1.4 Write property tests for validation utilities
    - **Property 1: Phone number validation determines registration outcome**
    - **Property 3: Profile data validation**
    - **Validates: Requirements 1.1, 1.2, 1.3, 3.1, 3.3**

- [x] 2. Implement authentication system
  - [x] 2.1 Implement customer registration endpoint and service
    - Create `POST /api/auth/pelanggan/daftar` route
    - Implement `AuthService.registerCustomer()` with phone format validation, duplicate check, and database insert
    - Return structured error responses for invalid input or duplicate phone
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.2 Implement customer login and session management
    - Create `POST /api/auth/pelanggan/log-masuk` route
    - Implement `AuthService.loginCustomer()` with phone lookup and session creation
    - Configure express-session with MariaDB session store (express-mysql-session)
    - Set customer session maxAge to 24 hours of inactivity
    - Create `POST /api/auth/pelanggan/log-keluar` route for logout (session destroy)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 2.3 Write property tests for customer authentication
    - **Property 2: Customer login validation**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [x] 2.4 Implement merchant login with lockout mechanism
    - Create `POST /api/auth/peniaga/log-masuk` route
    - Implement `AuthService.loginMerchant()` with bcrypt password comparison
    - Implement `AuthService.checkLoginAttempts()` — track failed attempts per username, lock after 5 consecutive failures for 15 minutes
    - Set merchant session maxAge to 60 minutes of inactivity
    - Create `POST /api/auth/peniaga/log-keluar` route for logout
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 2.5 Write property tests for merchant authentication
    - **Property 12: Merchant account lockout after failed attempts**
    - **Property 20: Password storage irreversibility**
    - **Validates: Requirements 9.4, 18.3**

  - [x] 2.6 Implement authentication and role-based access middleware
    - Create `authMiddleware` to check valid session exists
    - Create `roleGuard('pelanggan')` and `roleGuard('peniaga')` middleware
    - Return 401 for unauthenticated requests, 403 for wrong-role requests
    - Redirect logic for expired sessions
    - _Requirements: 18.1, 18.2, 18.4, 18.5, 18.6_

  - [ ]* 2.7 Write property tests for role-based access control
    - **Property 19: Role-based access control**
    - **Validates: Requirements 18.1, 18.2, 18.5**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 4. Implement cake specification management (Merchant)
  - [-] 4.1 Implement cake spec category CRUD endpoints
    - Create `GET /api/peniaga/kategori-spesifikasi` — list all categories (active and inactive)
    - Create `POST /api/peniaga/kategori-spesifikasi` — create category with name/description validation and uniqueness check
    - Create `PUT /api/peniaga/kategori-spesifikasi/:id` — update category
    - Create `DELETE /api/peniaga/kategori-spesifikasi/:id` — soft-delete category (set aktif=false) and all associated options
    - Implement `CakeSpecService` with validation logic
    - _Requirements: 13.1, 13.3, 13.4, 13.6, 13.7_

  - [-] 4.2 Implement cake spec option CRUD endpoints
    - Create `GET /api/peniaga/pilihan-spesifikasi/:kategoriId` — list options for a category
    - Create `POST /api/peniaga/pilihan-spesifikasi` — create option with name uniqueness within category, price validation (RM 0.00-9999.99)
    - Create `PUT /api/peniaga/pilihan-spesifikasi/:id` — update option
    - Create `DELETE /api/peniaga/pilihan-spesifikasi/:id` — soft-delete option (set aktif=false)
    - _Requirements: 13.2, 13.3, 13.5, 13.6, 13.7_

  - [ ]* 4.3 Write property tests for cake specification management
    - **Property 15: Cake specification CRUD validation**
    - **Property 16: Soft-deleted specifications preserved in historical orders**
    - **Validates: Requirements 13.1, 13.2, 13.6, 13.7**

  - [ ] 4.4 Implement public cake spec endpoint for customers
    - Create `GET /api/pelanggan/spesifikasi-kek` — return only active categories and options (aktif=true)
    - Implement `CakeSpecService.getActiveCategories()` filtering logic
    - _Requirements: 4.1_

  - [ ]* 4.5 Write property test for active spec filtering
    - **Property 4: Only active specifications appear in order form**
    - **Validates: Requirements 4.1**

- [~] 5. Implement unavailability calendar management
  - [-] 5.1 Implement closed date CRUD endpoints
    - Create `GET /api/peniaga/tarikh-tutup` — list all closed dates
    - Create `POST /api/peniaga/tarikh-tutup` — add closed date with validation (future/today only, not already closed)
    - Create `DELETE /api/peniaga/tarikh-tutup/:id` — remove closed date
    - Create `GET /api/pelanggan/tarikh-tutup` — list closed dates for customer date picker
    - Implement `ClosedDateService` with date validation and duplicate check
    - Warn if pending orders exist on the date being closed
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [ ]* 5.2 Write property tests for closed date management
    - **Property 17: Closed date round-trip**
    - **Validates: Requirements 14.1, 14.2, 14.4, 14.6**

- [~] 6. Implement order placement and management
  - [ ] 6.1 Implement order creation endpoint and service
    - Create `POST /api/pelanggan/tempahan` route
    - Implement `OrderService.createOrder()` with validation: all required categories selected, valid date (not closed, ≥2 days future), delivery method, payment method, address if delivery
    - Implement `OrderService.calculateTotal()` — sum of selected option prices
    - Store order with status "Menunggu Pengesahan", create ButiranTempahan records (denormalized)
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.7_

  - [ ]* 6.2 Write property tests for order creation
    - **Property 5: Order total price equals sum of selected option prices**
    - **Property 6: Order creation validation**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.7**

  - [ ] 6.3 Implement order listing and detail endpoints for customers
    - Create `GET /api/pelanggan/tempahan` — list customer's orders sorted by tarikhTempahan DESC
    - Create `GET /api/pelanggan/tempahan/:id` — get full order details with ButiranTempahan and ImejTempahan
    - Ensure only the authenticated customer's orders are returned
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 6.4 Write property test for order list sorting
    - **Property 10: Customer order list sorting invariant**
    - **Validates: Requirements 7.1**

  - [ ] 6.5 Implement order cancellation endpoint
    - Create `PUT /api/pelanggan/tempahan/:id/batal` route
    - Implement `OrderService.cancelOrder()` — validate eligibility: status is "Menunggu Pengesahan" OR (status is "Diterima" AND within 24 hours of tarikhTerima)
    - Update status to "Dibatalkan"
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 6.6 Write property test for order cancellation
    - **Property 11: Order cancellation eligibility**
    - **Validates: Requirements 8.1, 8.2, 8.4, 8.5**

  - [ ] 6.7 Implement merchant order management endpoints
    - Create `GET /api/peniaga/tempahan` — paginated list (20/page) with filters (status, date, payment)
    - Create `GET /api/peniaga/tempahan/:id` — full order details with customer info
    - Create `PUT /api/peniaga/tempahan/:id/terima` — accept order, record tarikhTerima
    - Create `PUT /api/peniaga/tempahan/:id/tolak` — reject order with reason (1-500 chars)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 6.8 Implement order status advancement endpoint
    - Create `PUT /api/peniaga/tempahan/:id/status` route
    - Implement `OrderService.advanceStatus()` — enforce forward-only single-step transitions through the fixed sequence
    - Prevent skipping phases, reverting, or advancing past "Selesai"
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 6.9 Write property test for order status state machine
    - **Property 13: Order status state machine — forward-only single-step transitions**
    - **Validates: Requirements 11.1, 11.4**

  - [ ] 6.10 Implement payment status update endpoint
    - Create `PUT /api/peniaga/tempahan/:id/status-bayaran` route
    - Implement `OrderService.updatePaymentStatus()` — validate order not cancelled/rejected, validate new status is valid enum value
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ]* 6.11 Write property test for payment status constraints
    - **Property 14: Payment status update constraints**
    - **Validates: Requirements 12.1, 12.3, 12.4**

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 8. Implement image handling (AI generation and upload)
  - [ ] 8.1 Implement AI image generation endpoint
    - Create `POST /api/pelanggan/tempahan/jana-imej` route
    - Implement `ImageService.generateAIImage()` — validate description length (10-500 chars), call external AI API, return generated image URL
    - Handle AI service unavailability and rate limiting with appropriate error messages
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 8.2 Write property test for AI image description validation
    - **Property 7: AI image description length validation**
    - **Validates: Requirements 5.2**

  - [ ] 8.3 Implement reference image upload endpoint
    - Create `POST /api/pelanggan/tempahan/muat-naik-imej` route
    - Configure Multer for JPEG/PNG only, max 5MB file size
    - Implement `ImageService.uploadImage()` — store file to `/uploads/images/`, create/replace ImejTempahan record (max 1 upload per order)
    - Serve uploaded images via Express static middleware
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 8.4 Write property tests for image upload
    - **Property 8: Image upload validation**
    - **Property 9: Image replacement invariant**
    - **Validates: Requirements 6.2, 6.4**

- [~] 9. Implement customer profile and business info management
  - [ ] 9.1 Implement customer profile endpoints
    - Create `GET /api/pelanggan/profil` — return authenticated customer's profile
    - Create `PUT /api/pelanggan/profil` — update name (2-100 chars) and address (≤500 chars) with validation
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 9.2 Implement business information endpoints
    - Create `GET /api/peniaga/profil-perniagaan` — get merchant business info
    - Create `PUT /api/peniaga/profil-perniagaan` — update shop name (≤100 chars), phone (valid format), description (≤500 chars)
    - Create `GET /api/awam/profil-kedai` — public endpoint for customer-facing shop info
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

- [~] 10. Implement sales report generation
  - [ ] 10.1 Implement sales report endpoint and PDF generation
    - Create `GET /api/peniaga/laporan-jualan` — accept month/year params, return totalOrders, totalRevenue, statusBreakdown, paymentBreakdown
    - Implement `ReportService.getSalesReport()` with aggregation queries
    - Implement `ReportService.generatePDF()` using jsPDF for server-side PDF generation
    - Handle empty data periods with appropriate message
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 10.2 Write property test for sales report aggregation
    - **Property 18: Sales report aggregation accuracy**
    - **Validates: Requirements 15.1**

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 12. Implement React frontend - shared components and routing
  - [ ] 12.1 Set up React Router with protected routes and auth context
    - Configure React Router with route groups: `/pelanggan/*` and `/peniaga/*`
    - Implement `AuthContext` with useReducer for session state management
    - Create `<ProtectedRoute>` component checking authentication and role
    - Implement login/logout state transitions and session expiry redirect
    - _Requirements: 18.1, 18.2, 18.4, 18.5_

  - [ ] 12.2 Create shared UI components
    - Build `<LoadingSpinner>`, `<ErrorMessage>`, `<SuccessMessage>` components
    - Build `<FormInput>` with validation display, `<ImagePreview>` with loading state
    - Build `<Pagination>` component, `<ConfirmDialog>` modal
    - Create API service layer with Axios instance, interceptors for retry logic (3 retries, 3s interval), and 401/403 handling
    - _Requirements: 17.2, 17.3, 19.1_

- [~] 13. Implement React frontend - customer pages
  - [ ] 13.1 Build customer registration and login pages
    - Create `<RegisterForm>` with phone validation (Malaysian format) and name input
    - Create `<LoginForm>` with phone number input and error display
    - Wire forms to auth API endpoints
    - Display Bahasa Melayu error/success messages
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3_

  - [ ] 13.2 Build customer profile page
    - Create `<ProfileForm>` displaying name, phone (read-only), and address
    - Implement form validation (name 2-100 chars, address ≤500 chars)
    - Wire to profile API endpoints with success/error feedback
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 13.3 Build cake order form with spec selection and price calculation
    - Create `<OrderForm>` with dynamic `<CakeSpecSelector>` loading active categories/options
    - Create `<PriceCalculator>` showing real-time total as selections change
    - Implement date picker blocking closed dates and dates less than 2 days ahead
    - Add delivery method toggle with conditional address field
    - Add payment method selection and optional notes field (≤500 chars)
    - Wire to order creation API endpoint
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ] 13.4 Implement form data persistence with localStorage
    - Create `useFormPersistence` hook saving form data to localStorage on input change (debounced 2s)
    - Implement 24-hour expiry check on stored data
    - Restore saved data on page load/refresh
    - Apply hook to the order form
    - _Requirements: 19.2, 19.3_

  - [ ]* 13.5 Write property test for form data persistence
    - **Property 21: Form data persistence round-trip**
    - **Validates: Requirements 19.2, 19.3**

  - [ ] 13.6 Build AI image generation and reference image upload UI
    - Create `<AIImageGenerator>` with text input (10-500 chars), generate button, image preview, and regenerate option
    - Create `<ImageUploader>` with drag-and-drop, file type/size validation display, and preview
    - Handle AI service errors with fallback to upload option
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 13.7 Build order list and order detail pages
    - Create `<OrderList>` showing orders sorted by date (most recent first) with status and price
    - Create `<OrderDetail>` showing full order info, specs, images, status, payment status
    - Create `<CancelOrderButton>` with conditional visibility and `<ConfirmDialog>`
    - Handle empty order list state
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5_

- [~] 14. Implement React frontend - merchant pages
  - [ ] 14.1 Build merchant login page
    - Create `<MerchantLoginForm>` with username/password fields
    - Display generic error for invalid credentials
    - Display lockout message with remaining time when account is locked
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 14.2 Build merchant order management page
    - Create `<OrderManagement>` with paginated list (20/page), filters (status, date, payment)
    - Create `<OrderActions>` with accept/reject buttons (reject requires reason input)
    - Display full order details on selection with customer info and images
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 14.3 Build order status and payment management controls
    - Create status advancement button showing next phase in sequence
    - Hide advancement when order is "Selesai"
    - Create `<PaymentStatusControl>` dropdown with three payment status options
    - Disable payment update for cancelled/rejected orders
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3, 12.4_

  - [ ] 14.4 Build cake specification management pages
    - Create `<SpecCategoryManager>` with list, add, edit, and delete (soft-delete) functionality
    - Create `<SpecOptionManager>` with list per category, add, edit, delete, and price input
    - Implement validation feedback for name uniqueness and price range
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [ ] 14.5 Build unavailability calendar page
    - Create `<UnavailabilityCalendar>` with month navigation and date selection
    - Implement add closed date with optional note, remove closed date
    - Show warning for dates with pending orders
    - Validate future/today dates only
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [ ] 14.6 Build sales report page with charts and PDF download
    - Create `<SalesReport>` with month/year selector, default to current month
    - Integrate Chart.js (react-chartjs-2) for bar charts (order counts) and pie charts (status/payment breakdowns)
    - Create `<ReportDownload>` button generating PDF via jsPDF + html2canvas
    - Handle empty data periods
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ] 14.7 Build business information management page
    - Create `<BusinessInfoForm>` with shop name, phone, and description fields
    - Implement validation (name ≤100, phone valid format, description ≤500)
    - Wire to business info API endpoints
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 16. Integration wiring and final verification
  - [ ] 16.1 Wire all frontend pages to backend API and verify end-to-end flows
    - Ensure all customer flows work: register → login → place order → track → cancel
    - Ensure all merchant flows work: login → manage orders → update status → manage specs → reports
    - Verify Axios retry interceptor handles network failures correctly
    - Verify session expiry redirects work for both roles
    - _Requirements: 17.1, 17.2, 17.3, 19.1_

  - [ ]* 16.2 Write integration tests for critical API flows
    - Test full order lifecycle: create → accept → advance → complete
    - Test authentication flows for both customer and merchant
    - Test role-based access denial across endpoints
    - Test file upload and AI image generation (mocked)
    - _Requirements: 4.2, 9.1, 10.2, 11.1, 18.1, 18.2_

- [ ] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All user-facing text must be in Bahasa Melayu
- The backend uses raw mysql2 parameterized queries for SQL flexibility and injection prevention
- Images are stored locally under `/uploads/images/` with URLs in the database
- Sessions are stored in MariaDB via express-mysql-session for persistence

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "2.1", "2.4"] },
    { "id": 3, "tasks": ["2.2", "2.5", "2.6"] },
    { "id": 4, "tasks": ["2.3", "2.7", "4.1", "5.1"] },
    { "id": 5, "tasks": ["4.2", "4.4", "5.2"] },
    { "id": 6, "tasks": ["4.3", "4.5", "6.1"] },
    { "id": 7, "tasks": ["6.2", "6.3", "6.5", "6.7"] },
    { "id": 8, "tasks": ["6.4", "6.6", "6.8", "6.10"] },
    { "id": 9, "tasks": ["6.9", "6.11", "8.1", "8.3"] },
    { "id": 10, "tasks": ["8.2", "8.4", "9.1", "9.2"] },
    { "id": 11, "tasks": ["10.1"] },
    { "id": 12, "tasks": ["10.2", "12.1"] },
    { "id": 13, "tasks": ["12.2"] },
    { "id": 14, "tasks": ["13.1", "13.2", "14.1"] },
    { "id": 15, "tasks": ["13.3", "13.4", "14.2", "14.4"] },
    { "id": 16, "tasks": ["13.5", "13.6", "13.7", "14.3", "14.5"] },
    { "id": 17, "tasks": ["14.6", "14.7"] },
    { "id": 18, "tasks": ["16.1"] },
    { "id": 19, "tasks": ["16.2"] }
  ]
}
```
