# Requirements Document

## Introduction

The Order Form Chatbot is an AI-powered conversational assistant integrated into the MyKek cake ordering system's order form. The chatbot helps customers (Pelanggan) navigate the cake ordering process by answering questions about available cake specifications, guiding them through form completion, explaining options and pricing, and suggesting cake designs based on occasions or preferences. The chatbot communicates in Bahasa Melayu and is designed for customers in rural Sarawak who may be unfamiliar with online ordering systems.

## Glossary

- **System**: The MyKek web application
- **Chatbot**: The AI-powered conversational assistant (Pembantu Pesanan) embedded in the order form page
- **Customer**: A registered user (Pelanggan) who places cake orders
- **Chat_Session**: A single conversation instance between the Customer and the Chatbot, lasting from when the Customer opens the chat until the Customer closes it or navigates away from the order form
- **Chat_Message**: A single message within a Chat_Session, either from the Customer or the Chatbot
- **Cake_Spec_Category**: A configurable category of cake specification (e.g., size, flavor, theme)
- **Cake_Spec_Option**: A selectable option within a Cake_Spec_Category with optional additional pricing
- **Form_Context**: The current state of the order form including selected options, empty fields, and calculated price
- **Suggestion**: A Chatbot recommendation for cake specifications based on Customer-stated preferences or occasion

## Requirements

### Requirement 1: Chatbot Interface Display

**User Story:** As a Customer, I want to see a chatbot widget on the order form page, so that I can access help while filling out my cake order.

#### Acceptance Criteria

1. WHEN a Customer loads the order form page, THE Chatbot SHALL display a floating chat button in the bottom-right corner of the viewport, positioned 16 pixels from the bottom and right edges, with a minimum touch target size of 48 by 48 pixels
2. WHEN a Customer clicks the chat button, THE Chatbot SHALL open a chat panel displaying a welcome message in Bahasa Melayu that introduces the assistant and offers to help with the order
3. WHEN the chat panel is open, THE Chatbot SHALL display a text input field (maximum 500 characters) at the bottom of the panel with a send button, where the Customer can type and submit messages by clicking the send button or pressing the Enter key
4. WHEN a Customer clicks the chat button while the chat panel is open, THE Chatbot SHALL close the chat panel and retain the conversation history for the current session
5. THE Chatbot SHALL display the chat panel at a maximum width of 380 pixels and a maximum height of 500 pixels, positioned so it does not obscure the order form's submit button or price display
6. IF the viewport width is less than 480 pixels, THEN THE Chatbot SHALL display the chat panel at full viewport width and full viewport height as an overlay, with a visible close button to return to the order form

### Requirement 2: Customer Message Handling

**User Story:** As a Customer, I want to send messages to the chatbot and receive responses, so that I can get help with my order.

#### Acceptance Criteria

1. WHEN a Customer submits a message (1 to 500 characters), THE Chatbot SHALL display the Customer's message in the chat panel and send it to the backend for processing
2. WHEN the backend returns a response within 15 seconds of the Customer's submission, THE Chatbot SHALL display the response message in the chat panel, visually distinguished from the Customer's messages by sender label or alignment
3. WHILE the Chatbot is processing a Customer message, THE Chatbot SHALL display a typing indicator in the chat panel
4. IF a Customer submits an empty message or a message exceeding 500 characters, THEN THE Chatbot SHALL prevent submission and display a validation message indicating the allowed message length (1 to 500 characters)
5. THE Chatbot SHALL display all messages in chronological order within the chat panel, with the most recent message visible (auto-scrolled to bottom), retaining up to 50 messages in the current session
6. IF the backend fails to return a response within 15 seconds or returns an error, THEN THE Chatbot SHALL hide the typing indicator and display a message indicating the response could not be retrieved, allowing the Customer to resend the message

### Requirement 3: Cake Specification Guidance

**User Story:** As a Customer, I want the chatbot to explain available cake options, so that I can make informed choices about my cake order.

#### Acceptance Criteria

1. WHEN a Customer asks about available options for a Cake_Spec_Category (e.g., "Apa saiz kek yang ada?"), THE Chatbot SHALL respond within 10 seconds with a list of all active Cake_Spec_Options for that category, displaying for each option the option name, description, and additional price in MYR
2. WHEN a Customer asks about the meaning or difference between Cake_Spec_Options, THE Chatbot SHALL respond with the stored description text for each referenced option from the database
3. WHEN a Customer asks about pricing, THE Chatbot SHALL explain that the total price is calculated as the sum of additional prices from all selected options and display the current running total in MYR based on the Customer's currently selected Cake_Spec_Options in the active order form session
4. IF a Customer asks about a Cake_Spec_Category or Cake_Spec_Option that does not exist or is inactive, THEN THE Chatbot SHALL respond that the requested item is not available and list the available active categories when a category was requested, or the available active options within the relevant category when an option was requested
5. IF the Chatbot cannot determine the intent of the Customer's message or the message does not relate to cake specifications, THEN THE Chatbot SHALL respond with a message indicating it can help with cake option inquiries and list the available Cake_Spec_Categories the Customer can ask about

### Requirement 4: Form Filling Assistance

**User Story:** As a Customer, I want the chatbot to help me fill out the order form, so that I can complete my order without confusion.

#### Acceptance Criteria

1. WHEN a Customer asks the Chatbot to select a specific Cake_Spec_Option (e.g., "Pilihkan saiz 2kg untuk saya"), THE Chatbot SHALL update the corresponding form field with the requested option and display a confirmation message in the chat stating the category name and the selected option name
2. WHEN a Customer asks what fields are still incomplete, THE Chatbot SHALL read the current form state and list each unfilled required field by name with a one-sentence description (maximum 100 characters per field) of what input is expected
3. WHEN a Customer asks about delivery methods, THE Chatbot SHALL explain the available options ("Ambil Sendiri" for pickup or "Penghantaran" for delivery) and note that delivery requires an address
4. WHEN a Customer asks about date selection, THE Chatbot SHALL explain that the date must be at least 2 days from today and that certain dates may be unavailable (Closed_Dates)
5. IF a Customer requests the Chatbot to select an option that does not exist or is inactive, THEN THE Chatbot SHALL inform the Customer that the option is unavailable and suggest up to 3 valid alternatives from the same Cake_Spec_Category
6. IF the Chatbot cannot determine which Cake_Spec_Option the Customer is referring to because the request matches multiple options within the same category, THEN THE Chatbot SHALL present the matching options (up to 5) and ask the Customer to clarify their selection
7. IF the Chatbot cannot interpret the Customer's form-filling request, THEN THE Chatbot SHALL inform the Customer that the request was not understood and suggest that the Customer rephrase or manually select the option from the form
8. WHEN a Customer asks the Chatbot to select an option for a form field that already has a value, THE Chatbot SHALL replace the existing selection with the new option and display a confirmation message indicating the previous and new selection

### Requirement 5: Cake Design Suggestions

**User Story:** As a Customer, I want the chatbot to suggest cake designs based on my occasion or preferences, so that I can get inspiration for my order.

#### Acceptance Criteria

1. WHEN a Customer describes an occasion or preference (e.g., "Saya nak kek untuk hari jadi anak 5 tahun"), THE Chatbot SHALL respond within 15 seconds with 1 to 3 Suggestions, where each Suggestion includes recommended Cake_Spec_Options for one or more Cake_Spec_Categories and an explanation of no more than 200 characters describing why each option suits the occasion
2. WHEN the Chatbot provides a Suggestion, THE Chatbot SHALL only recommend active Cake_Spec_Options that exist in the database
3. WHEN a Customer accepts a Suggestion (e.g., "Ya, pilihkan yang pertama"), THE Chatbot SHALL apply the suggested Cake_Spec_Options to the order form, display the selected options in the chat with their associated prices, and confirm the total price impact of the applied selections
4. IF the Chatbot cannot determine suggestions from the Customer's description, THEN THE Chatbot SHALL ask a follow-up question to clarify the Customer's preferences, and SHALL ask a maximum of 2 follow-up questions before providing a best-effort Suggestion based on available information
5. WHEN a Customer declines all provided Suggestions (e.g., "Tak nak semua tu"), THE Chatbot SHALL ask the Customer to describe their preferences differently or offer to let the Customer select options manually from the order form

### Requirement 6: Conversation Context Awareness

**User Story:** As a Customer, I want the chatbot to understand the context of my order form, so that its responses are relevant to my current selections.

#### Acceptance Criteria

1. WHEN a Customer sends a message that relates to the current order form state (e.g., "Berapa jumlah harga sekarang?"), THE Chatbot SHALL include the current Form_Context (all selected Cake_Spec_Options, the selected delivery method, the selected date, and the calculated total price) in its response generation and provide an answer consistent with the current form selections
2. WHEN a Customer asks a follow-up question that references a previous message using pronouns or implicit references (e.g., "Yang mana lebih murah?" after asking about sizes), THE Chatbot SHALL resolve the reference using the Chat_Session history and respond with information that correctly identifies and addresses the referenced subject from the prior exchange
3. WHEN the Customer changes a form selection outside of the chat (directly on the form), THE Chatbot SHALL use the updated Form_Context for the next response generated after the change, such that the response reflects the new selections rather than the previous ones
4. THE Chatbot SHALL maintain conversation context for the duration of the Chat_Session, retaining up to 50 messages in the session history
5. IF the Chat_Session history reaches 50 messages, THEN THE Chatbot SHALL remove the oldest messages to make room for new ones while retaining the most recent 50 messages, and SHALL continue to respond using the available history

### Requirement 7: Language and Tone

**User Story:** As a Customer, I want the chatbot to communicate in Bahasa Melayu with a friendly tone, so that I feel comfortable using it.

#### Acceptance Criteria

1. THE Chatbot SHALL respond to all Customer messages in Bahasa Melayu regardless of the language used by the Customer
2. THE Chatbot SHALL use an informal tone by addressing the Customer with "anda" instead of formal pronouns, using sentences of no more than 25 words each, and avoiding technical jargon or formal bureaucratic language
3. THE Chatbot SHALL limit each response to a maximum of 300 words to maintain readability
4. IF a Customer asks a question that does not relate to cake ordering, order status, delivery, payment, cake specifications, or the MyKek system features, THEN THE Chatbot SHALL respond in Bahasa Melayu stating that it can only assist with cake orders and suggest a relevant ordering action the Customer can take
5. IF the Chatbot cannot determine the intent of a Customer message, THEN THE Chatbot SHALL respond in Bahasa Melayu asking the Customer to rephrase their question and provide a list of topics it can assist with

### Requirement 8: Error Handling and Fallback

**User Story:** As a Customer, I want the chatbot to handle errors gracefully, so that I am not left without assistance when something goes wrong.

#### Acceptance Criteria

1. IF the Chatbot backend service is unavailable or returns an error, THEN THE Chatbot SHALL display a message in the chat panel stating "Maaf, pembantu pesanan tidak tersedia buat masa ini. Sila cuba lagi sebentar." and disable the input field with a retry button that, when pressed, re-attempts the connection to the backend service
2. IF the retry attempt in criterion 1 also fails, THEN THE Chatbot SHALL keep the input field disabled, display the same unavailability message, and retain the retry button so the Customer can attempt again
3. IF the network connection is lost while a message is being sent, THEN THE Chatbot SHALL display a connectivity error message indicating the network is unavailable within 10 seconds of the failed request, and retain the unsent message in the input field so the Customer can retry when connectivity is restored
4. IF the Chatbot backend returns a response indicating it cannot process the Customer's message (e.g., no matching intent or confidence below threshold), THEN THE Chatbot SHALL respond with a fallback message that suggests the Customer rephrase the question and lists at least 3 common help topics (e.g., "Tanya saya tentang saiz kek, perisa, tema, atau harga")
5. WHILE the Chatbot is waiting for a backend response, THE Chatbot SHALL display a typing indicator in the chat panel within 1 second of sending the request
6. IF the Chatbot response takes longer than 15 seconds, THEN THE Chatbot SHALL hide the typing indicator, display a timeout message indicating the request took too long, and allow the Customer to resend the message or continue filling the form manually

### Requirement 9: Chatbot Backend Processing

**User Story:** As a developer, I want the chatbot to process messages through a backend service, so that responses are generated using AI with access to current cake specification data.

#### Acceptance Criteria

1. WHEN the backend receives a Customer message, THE System SHALL construct a prompt that includes the Customer's message, the Chat_Session history (up to the last 10 messages), the current Form_Context, and the active Cake_Spec_Categories with their options and prices
2. WHEN the prompt is constructed, THE System SHALL send it to an AI language model API and return the generated response to the frontend within 30 seconds of receiving the Customer's message
3. THE System SHALL include instructions in the constructed prompt that restrict the AI language model's responses to topics related to cake ordering, available specifications, pricing, delivery, and the MyKek ordering process; IF the AI language model returns a response that does not relate to these topics, THEN THE System SHALL replace it with a message indicating that the chatbot can only assist with cake ordering inquiries
4. IF the AI language model API is unavailable or returns an error, THEN THE System SHALL return a predefined fallback response indicating temporary unavailability within 5 seconds of detecting the failure
5. IF the AI language model API does not respond within 30 seconds, THEN THE System SHALL cancel the pending request and return the predefined fallback response indicating temporary unavailability
6. THE System SHALL not store Chat_Session messages in the database beyond the active session; WHEN the Customer closes the chat widget, navigates away from the page, or the Customer's browser session expires, THE System SHALL discard all Chat_Session messages associated with that session

### Requirement 10: Performance and Resource Management

**User Story:** As a user on a potentially slow connection, I want the chatbot to be lightweight and responsive, so that it does not degrade the order form experience.

#### Acceptance Criteria

1. THE Chatbot frontend component SHALL add no more than 50KB (gzipped) to the order form page bundle size
2. WHEN a Customer clicks the chat button for the first time, THE Chatbot SHALL lazy-load its component code, adding zero bytes to the initial page bundle prior to this interaction so that the order form page load time is not increased by the Chatbot
3. WHILE the chat panel is closed, THE Chatbot SHALL not make any network requests or run any background processing beyond rendering the chat button
4. THE System SHALL rate-limit Chatbot API requests to a maximum of 20 Customer-sent messages per Chat_Session to prevent excessive API usage
5. IF a Customer exceeds the rate limit, THEN THE Chatbot SHALL display a message indicating the message limit has been reached, disable the message input field for the remainder of the Chat_Session, and suggest the Customer complete the form manually or contact the shop directly
6. IF the Chatbot component code fails to load when the Customer clicks the chat button, THEN THE Chatbot SHALL display an error message on the chat button area indicating the assistant could not be loaded and allow the Customer to retry loading by clicking the button again
