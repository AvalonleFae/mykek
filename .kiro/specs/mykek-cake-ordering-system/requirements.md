# Requirements Document

## Introduction

MyKek is a web-based digital cake ordering system designed for Zuraida Patisserie, a small cake business in rural Sarawak, Malaysia. The system enables customers (Pelanggan) to place customized cake orders with AI-powered cake design visualization, and provides the merchant (Peniaga) with tools to manage orders, track payments, configure cake specifications, and generate sales reports. The interface is in Bahasa Melayu and built with Vite React (JSX) frontend and MariaDB database.

## Glossary

- **System**: The MyKek web application
- **Customer**: A registered user (Pelanggan) who places cake orders
- **Merchant**: The business owner/admin (Peniaga) who manages orders and business operations
- **Order**: A cake order (Tempahan) placed by a Customer containing cake specifications, delivery details, and payment information
- **Order_Status**: The current state of an order: Menunggu Pengesahan (Pending), Diterima (Accepted), Ditolak (Rejected), Dibatalkan (Cancelled), or production phases (Sedang Diproses, Sedang Dihias, Sedia untuk Diambil/Dihantar, Selesai)
- **Cake_Spec_Category**: A configurable category of cake specification (KategoriSpesifikasiKek) such as size, flavor, or theme
- **Cake_Spec_Option**: A selectable option (PilihanSpesifikasiKek) within a Cake_Spec_Category with optional additional pricing
- **AI_Image_Generator**: The integrated AI service that generates cake design images from text descriptions
- **Closed_Date**: A date (TarikhTutup) set by the Merchant when orders cannot be fulfilled
- **Order_Image**: A reference image (ImejTempahan) attached to an order, either AI-generated or uploaded by the Customer
- **Sales_Report**: A monthly report with data visualization showing order and revenue statistics

## Requirements

### Requirement 1: Customer Registration

**User Story:** As a Customer, I want to register an account using my phone number, so that I can place cake orders through the system.

#### Acceptance Criteria

1. WHEN a Customer provides a valid phone number (Malaysian format: 10-11 digits starting with "01") and a name (1 to 100 characters), THE System SHALL create a new Customer account and store the phone number and name in the database
2. IF a Customer attempts to register with a phone number already associated with an existing account, THEN THE System SHALL display an error message indicating the phone number is already registered
3. IF a Customer submits the registration form with an empty name, an empty phone number, or a phone number that does not match the required format, THEN THE System SHALL display an error message indicating which field is invalid and not create the account
4. WHEN a Customer successfully registers, THE System SHALL redirect the Customer to the login page with a success confirmation message

### Requirement 2: Customer Login

**User Story:** As a Customer, I want to log in using my phone number, so that I can access my account and place orders.

#### Acceptance Criteria

1. WHEN a Customer provides a registered phone number, THE System SHALL authenticate the Customer and grant access to the Customer dashboard
2. IF a Customer provides a phone number that is not registered, THEN THE System SHALL display an error message indicating the phone number is not found
3. IF a Customer submits the login form with an empty phone number field or a phone number containing non-numeric characters, THEN THE System SHALL display an error message indicating the phone number format is invalid and SHALL NOT attempt authentication
4. WHILE a Customer is authenticated, THE System SHALL maintain the session for a maximum of 24 hours of inactivity, after which the session SHALL expire
5. IF a Customer's session expires, THEN THE System SHALL redirect the Customer to the login page and display a message indicating the session has ended

### Requirement 3: Customer Profile Management

**User Story:** As a Customer, I want to update my profile information, so that my name and delivery address are current.

#### Acceptance Criteria

1. WHEN a Customer submits updated profile information (name or address), THE System SHALL validate that the name is between 2 and 100 characters and the address is no more than 500 characters, save the changes to the database, and display a success confirmation
2. WHEN a Customer accesses the profile page, THE System SHALL display the current profile information including name, phone number (read-only), and address
3. IF a Customer submits profile information that fails validation, THEN THE System SHALL display an error message indicating which field is invalid and preserve the entered data in the form
4. IF the System fails to save the updated profile information, THEN THE System SHALL display an error message indicating the update was unsuccessful and preserve the entered data in the form

### Requirement 4: Cake Order Placement

**User Story:** As a Customer, I want to place a cake order with full specifications, so that I can order a customized cake from Zuraida Patisserie.

#### Acceptance Criteria

1. THE System SHALL display all active Cake_Spec_Categories and their associated Cake_Spec_Options in the order form, where active means the category or option has not been deleted by the Merchant
2. WHEN a Customer submits a cake order with selected specifications, pickup/delivery date, delivery method, payment method, and optional notes (maximum 500 characters), THE System SHALL create a new Order with status "Menunggu Pengesahan" (Pending)
3. WHEN a Customer selects "Penghantaran" (delivery) as the delivery method, THE System SHALL require the Customer to provide a delivery address (maximum 255 characters)
4. THE System SHALL calculate and display the total price (jumlahHarga) in MYR as the sum of all additional prices from selected Cake_Spec_Options, updating the displayed total each time the Customer changes a selection
5. IF a Customer selects a pickup/delivery date that falls on a Closed_Date or is earlier than 2 days from the current date, THEN THE System SHALL display a message indicating the date is unavailable and prevent order submission
6. WHEN an Order is successfully placed, THE System SHALL display an order confirmation showing the order ID, selected cake specifications, pickup/delivery date, delivery method, delivery address (if applicable), total price, and payment method
7. IF a Customer attempts to submit the order form without selecting an option from each required Cake_Spec_Category or without providing a pickup/delivery date, delivery method, or payment method, THEN THE System SHALL display a validation message indicating the missing fields and prevent order submission

### Requirement 5: AI Cake Image Generation

**User Story:** As a Customer, I want to generate a visual cake image using AI based on my text description, so that I can visualize my desired cake design before ordering.

#### Acceptance Criteria

1. WHEN a Customer provides a text description (between 10 and 500 characters) of a desired cake design, THE System SHALL send the description to the AI_Image_Generator and display the generated image within 30 seconds, allowing the Customer to regenerate with a modified description
2. IF a Customer submits a text description that is empty, fewer than 10 characters, or exceeds 500 characters, THEN THE System SHALL display an error message indicating the required description length and SHALL NOT send the request to the AI_Image_Generator
3. THE System SHALL store the generated image URL and the text prompt associated with the Order when the Customer selects the generated image
4. IF the AI_Image_Generator service is unavailable or returns an error, THEN THE System SHALL display a message informing the Customer that image generation is temporarily unavailable and allow the Customer to proceed without an image or upload a reference image instead
5. IF the AI_Image_Generator API rate limit is exceeded, THEN THE System SHALL inform the Customer that the service is temporarily busy and suggest trying again later or uploading a reference image

### Requirement 6: Reference Image Upload

**User Story:** As a Customer, I want to upload my own reference image for the cake design, so that I can provide a visual reference without using AI generation.

#### Acceptance Criteria

1. WHEN a Customer uploads a reference image file, THE System SHALL store the image, associate it as the Order_Image for the Order, and display a success confirmation with a preview of the uploaded image
2. THE System SHALL accept image files in JPEG and PNG formats with a maximum file size of 5MB and a maximum of 1 reference image per Order
3. IF a Customer uploads a file that exceeds 5MB or is in a format other than JPEG or PNG, THEN THE System SHALL display an error message indicating the accepted formats (JPEG, PNG) and maximum file size (5MB) without clearing the upload form
4. IF a Customer uploads a new reference image when an Order_Image already exists for the Order, THEN THE System SHALL replace the existing Order_Image with the newly uploaded image
5. IF the image upload fails due to a network or server error, THEN THE System SHALL display an error message indicating the upload was unsuccessful and allow the Customer to retry

### Requirement 7: Order Status Tracking

**User Story:** As a Customer, I want to check the status of my orders, so that I can know the progress of my cake order.

#### Acceptance Criteria

1. THE System SHALL display a list of all Orders placed by the authenticated Customer, sorted by order date (most recent first), showing for each Order the order ID, order date, Order_Status, and total price
2. WHEN a Customer selects an Order from the list, THE System SHALL display the full order details including cake specifications, images, delivery information, pickup/delivery date, Order_Status, and payment status
3. WHEN the Merchant updates an Order_Status, THE System SHALL display the updated status on the Customer's order view upon the Customer's next page load or manual refresh
4. IF the authenticated Customer has no Orders, THEN THE System SHALL display a message indicating that no orders have been placed

### Requirement 8: Order Cancellation

**User Story:** As a Customer, I want to cancel my order under certain conditions, so that I can withdraw an order I no longer need.

#### Acceptance Criteria

1. WHILE an Order has status "Menunggu Pengesahan" (Pending), THE System SHALL display a "Batal Tempahan" (Cancel Order) button on the order detail view
2. WHEN an Order has status "Diterima" (Accepted) and the acceptance timestamp is within the last 24 hours, THE System SHALL display a "Batal Tempahan" (Cancel Order) button on the order detail view
3. WHEN a Customer presses the "Batal Tempahan" button, THE System SHALL display a confirmation dialog asking the Customer to confirm the cancellation
4. WHEN a Customer confirms cancellation, THE System SHALL update the Order_Status to "Dibatalkan" (Cancelled) and display a success message
5. WHILE an Order has status "Ditolak" (Rejected), "Dibatalkan" (Cancelled), "Selesai" (Completed), or is in a production phase beyond the 24-hour acceptance window, THE System SHALL hide the "Batal Tempahan" button

### Requirement 9: Merchant Login

**User Story:** As a Merchant, I want to log in with my admin credentials, so that I can access the business management features.

#### Acceptance Criteria

1. WHEN a Merchant provides a valid admin username (namaPenggunaAdmin) and password (kataLaluan) that match a stored Merchant account record, THE System SHALL authenticate the Merchant and grant access to the Merchant dashboard
2. IF a Merchant provides a username that does not exist or a password that does not match the stored credentials, THEN THE System SHALL display a generic error message indicating the credentials are incorrect without specifying which field is wrong
3. WHILE a Merchant is authenticated, THE System SHALL maintain the session for up to 60 minutes of inactivity, after which the session SHALL expire and the Merchant SHALL be redirected to the login page
4. IF a Merchant fails to authenticate 5 consecutive times for the same username, THEN THE System SHALL temporarily lock the account for 15 minutes and display a message indicating the account is temporarily locked

### Requirement 10: Order Management

**User Story:** As a Merchant, I want to view and manage incoming orders, so that I can accept or reject orders and track their progress.

#### Acceptance Criteria

1. THE System SHALL display all Orders in a paginated list view (maximum 20 orders per page), sortable and filterable by Order_Status, order date, delivery/pickup date, and payment status
2. WHILE an Order has status "Menunggu Pengesahan" (Pending), WHEN the Merchant accepts the Order, THE System SHALL update the Order_Status to "Diterima" (Accepted) and record the acceptance timestamp
3. WHILE an Order has status "Menunggu Pengesahan" (Pending), WHEN the Merchant rejects the Order, THE System SHALL require a rejection reason (between 1 and 500 characters) and update the Order_Status to "Ditolak" (Rejected) with the reason stored
4. WHEN the Merchant selects an Order, THE System SHALL display the full order details including Customer information, cake specifications, reference images, delivery details, and notes
5. IF the accept or reject operation fails due to a system error, THEN THE System SHALL display an error message indicating the operation was unsuccessful and retain the Order in its previous status

### Requirement 11: Order Status Updates

**User Story:** As a Merchant, I want to update the production status of accepted orders, so that Customers can track the progress of their cake.

#### Acceptance Criteria

1. WHILE an Order has status "Diterima" (Accepted) or is in a production phase, THE System SHALL allow the Merchant to advance the Order_Status to the next phase in the following fixed sequence: "Diterima" (Accepted) → "Sedang Diproses" (In Progress) → "Sedang Dihias" (Decorating) → "Sedia untuk Diambil/Dihantar" (Ready for Pickup/Delivery) → "Selesai" (Completed)
2. WHEN the Merchant advances the Order_Status, THE System SHALL save the new status to the database and display the updated status on the Customer's order view upon the Customer's next page load or refresh
3. IF an Order has reached the final status "Selesai" (Completed), THEN THE System SHALL hide the status advance option and no longer allow further status changes
4. THE System SHALL only allow forward progression through the production sequence and SHALL NOT allow the Merchant to skip phases or revert to a previous status

### Requirement 12: Payment Status Management

**User Story:** As a Merchant, I want to update the payment status of orders, so that I can track which orders have been paid.

#### Acceptance Criteria

1. WHEN the Merchant updates the payment status of an Order, THE System SHALL save the updated payment status to the database and display a success confirmation to the Merchant
2. THE System SHALL display the current payment status for each Order in the order list and order detail views
3. THE System SHALL allow the Merchant to set the payment status of an Order to one of the following values: "Belum Dibayar" (Unpaid), "Deposit Dibayar" (Deposit Paid), or "Telah Dibayar" (Fully Paid)
4. IF the Merchant attempts to update the payment status of an Order that has status "Dibatalkan" (Cancelled) or "Ditolak" (Rejected), THEN THE System SHALL prevent the update and display a message indicating payment status cannot be changed for cancelled or rejected orders

### Requirement 13: Cake Specification Management

**User Story:** As a Merchant, I want to manage cake specification categories and options, so that I can customize the order form with available choices and pricing.

#### Acceptance Criteria

1. WHEN the Merchant adds a new Cake_Spec_Category with a name (maximum 100 characters) and description (maximum 500 characters), THE System SHALL create the category, make it available in the order form, and display a success confirmation to the Merchant
2. WHEN the Merchant adds a new Cake_Spec_Option to a Cake_Spec_Category with a name (maximum 100 characters), description (maximum 500 characters), and additional price (RM 0.00 to RM 9999.99), THE System SHALL create the option, associate it with the category, and display a success confirmation to the Merchant
3. WHEN the Merchant edits an existing Cake_Spec_Category or Cake_Spec_Option, THE System SHALL update the record and display a success confirmation to the Merchant
4. WHEN the Merchant deletes a Cake_Spec_Category that contains associated Cake_Spec_Options, THE System SHALL remove the category and all its associated options from the order form for future orders
5. WHEN the Merchant deletes a Cake_Spec_Option, THE System SHALL remove the option from the order form for future orders
6. THE System SHALL retain deleted Cake_Spec_Categories and Cake_Spec_Options in existing Orders for historical accuracy
7. IF the Merchant submits a Cake_Spec_Category or Cake_Spec_Option with an empty name, a name that already exists within the same scope, or an additional price outside the valid range, THEN THE System SHALL display an error message indicating the validation failure and not create or update the record

### Requirement 14: Unavailability Calendar Management

**User Story:** As a Merchant, I want to set unavailability dates on a calendar, so that Customers cannot select those dates for order pickup or delivery.

#### Acceptance Criteria

1. WHEN the Merchant adds a Closed_Date with a future or current date and an optional reason note of up to 200 characters, THE System SHALL store the Closed_Date and block that date from Customer order selection, and display a success confirmation
2. WHEN the Merchant removes a Closed_Date, THE System SHALL make that date available again for Customer order selection and display a success confirmation
3. THE System SHALL display all Closed_Dates on a calendar view for the Merchant, showing the current month by default with navigation to view future and past months
4. IF the Merchant attempts to add a Closed_Date for a date that is already marked as closed, THEN THE System SHALL display an error message indicating the date is already unavailable
5. IF the Merchant adds a Closed_Date for a date that has existing Orders with status "Menunggu Pengesahan" (Pending), THEN THE System SHALL still store the Closed_Date and display a warning indicating the number of existing pending orders on that date
6. IF the Merchant attempts to add a Closed_Date with a past date, THEN THE System SHALL display an error message indicating that only today or future dates can be marked as unavailable

### Requirement 15: Sales Report Generation

**User Story:** As a Merchant, I want to generate monthly sales reports with data visualization, so that I can analyze business performance.

#### Acceptance Criteria

1. WHEN the Merchant selects a month and year, THE System SHALL generate a sales report containing total orders, total revenue (in MYR), order status breakdown, and payment method breakdown for that period
2. THE System SHALL display the sales report data using bar charts for order counts and pie charts for status and payment breakdowns
3. WHEN the Merchant requests to download a report, THE System SHALL generate a downloadable PDF file containing the report data and charts
4. THE System SHALL default to displaying the current month's report when the Merchant first accesses the reports page
5. IF no orders exist for the selected month and year, THEN THE System SHALL display a message indicating no data is available for the selected period

### Requirement 16: Business Information Management

**User Story:** As a Merchant, I want to update my business information, so that Customers can see current shop details.

#### Acceptance Criteria

1. WHEN the Merchant submits updated business information (shop name, phone number, or shop description), THE System SHALL validate the input, save the changes to the database, and display a success confirmation message
2. THE System SHALL display the current business information on the Merchant profile page
3. IF the Merchant submits business information with a shop name exceeding 100 characters, a phone number not matching a valid Malaysian phone format (10-11 digits), or a shop description exceeding 500 characters, THEN THE System SHALL display an error message indicating which field is invalid and not save the changes
4. THE System SHALL display the current business information (shop name, phone number, and shop description) on the Customer-facing shop profile so that Customers can view up-to-date shop details

### Requirement 17: System Availability and Performance

**User Story:** As a user (Customer or Merchant), I want the system to be responsive and available, so that I can use it reliably.

#### Acceptance Criteria

1. THE System SHALL be accessible via web browser (latest two major versions of Chrome, Firefox, Safari, and Edge on desktop and mobile) with a minimum uptime of 95% measured monthly
2. WHEN a user performs an action (page load, form submission, data retrieval) on a connection of at least 1 Mbps, THE System SHALL deliver a visible server response within 10 seconds, measured from the moment the user initiates the action to the moment content begins rendering in the browser
3. IF the network connection is lost during a form submission, THEN THE System SHALL display a connectivity error message within 15 seconds of the failed request and preserve the entered form data so the user can retry submission when connectivity is restored

### Requirement 18: Data Security and Access Control

**User Story:** As a system administrator, I want data to be protected and access restricted by role, so that sensitive information remains secure.

#### Acceptance Criteria

1. THE System SHALL restrict Merchant management features (order management, specification management, reports, business settings) to authenticated Merchant users only
2. THE System SHALL restrict Customer features (order placement, order history, profile) to authenticated Customer users only
3. THE System SHALL store Merchant passwords in a hashed format using a one-way hashing algorithm such that the original password cannot be retrieved from the stored value
4. IF an unauthenticated user attempts to access a protected resource, THEN THE System SHALL redirect the user to the corresponding login page (Merchant login for Merchant resources, Customer login for Customer resources)
5. IF an authenticated Customer attempts to access a Merchant-restricted resource, or an authenticated Merchant attempts to access a Customer-restricted resource, THEN THE System SHALL deny access and redirect the user to their own dashboard
6. IF a user session has been inactive for more than 60 minutes, THEN THE System SHALL invalidate the session and redirect the user to the appropriate login page on the next request

### Requirement 19: Offline Resilience

**User Story:** As a user in a rural area with unstable internet, I want the system to handle connectivity issues gracefully, so that I do not lose my work.

#### Acceptance Criteria

1. IF a network request fails or times out during page loading, THEN THE System SHALL display a loading indicator and retry the request up to 3 times with a 3-second interval between retries before showing a connectivity error message
2. WHILE a Customer is filling out the order form, THE System SHALL save form input data to local browser storage within 2 seconds of each input change, retaining the data for at least 24 hours, so that data is not lost on accidental page refresh or connectivity loss
3. WHEN a Customer returns to the order form after a page refresh or connectivity restoration, THE System SHALL restore the previously saved form input data from local browser storage and display it in the corresponding form fields
