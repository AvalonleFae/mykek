# Implementation Plan: Order Form Chatbot

## Overview

This plan implements the Order Form Chatbot (Pembantu Pesanan) as a lazy-loaded React component with a Node.js/Express backend that integrates with an AI language model API. The implementation follows an incremental approach: frontend chat UI first, then backend API, then AI integration, and finally wiring everything together.

## Tasks

- [ ] 1. Set up project structure and core definitions
  - [ ] 1.1 Create data shape definitions and constants for the chatbot
    - Create `src/components/Chatbot/types.js` with JSDoc-documented object shape definitions for: `ChatSession`, `ChatMessage`, `Suggestion`, `SuggestionOption`, `FormAction`, `FormContext`, `HistoryMessage`
    - Create `src/components/Chatbot/constants.js` with configuration constants: `MAX_MESSAGES = 50`, `MAX_MESSAGE_LENGTH = 500`, `MAX_SENT_MESSAGES = 20`, `RESPONSE_TIMEOUT = 15000`, `PANEL_MAX_WIDTH = 380`, `PANEL_MAX_HEIGHT = 500`, `MOBILE_BREAKPOINT = 480`
    - _Requirements: 1.1, 1.5, 1.6, 2.4, 2.5, 6.4, 10.4_

  - [ ] 1.2 Create ChatContext for session state management
    - Create `src/components/Chatbot/ChatContext.jsx` with React Context providing chat session state
    - Implement state: `messages[]`, `isOpen`, `isLoading`, `messageCount`, `error`, `isDisabled`
    - Implement actions: `addMessage`, `togglePanel`, `setLoading`, `setError`, `incrementCount`, `clearError`
    - Implement FIFO eviction when messages exceed 50
    - _Requirements: 2.5, 6.4, 6.5, 10.4_

  - [ ]* 1.3 Write property test for message history ordering and FIFO cap
    - **Property 2: Message history maintains chronological order and 50-message cap with FIFO eviction**
    - **Validates: Requirements 2.5, 6.4, 6.5**

  - [ ]* 1.4 Write property test for toggle preserving conversation history
    - **Property 3: Toggle open/close preserves conversation history**
    - **Validates: Requirements 1.4**

- [ ] 2. Implement frontend chat UI components
  - [ ] 2.1 Create ChatButton component
    - Create `src/components/Chatbot/ChatButton.jsx` with floating button positioned bottom-right (16px from edges)
    - Minimum touch target 48x48px
    - Toggle chat panel open/close on click
    - Show error state when component fails to load
    - _Requirements: 1.1, 1.4, 10.6_

  - [ ] 2.2 Create ChatPanel component
    - Create `src/components/Chatbot/ChatPanel.jsx` with max width 380px, max height 500px
    - Full-screen overlay when viewport < 480px with close button
    - Position so it does not obscure submit button or price display
    - Display welcome message in Bahasa Melayu on first open
    - _Requirements: 1.2, 1.5, 1.6_

  - [ ] 2.3 Create MessageList and ChatMessage components
    - Create `src/components/Chatbot/MessageList.jsx` for scrollable message list with auto-scroll to bottom
    - Create `src/components/Chatbot/ChatMessage.jsx` with sender distinction (customer right-aligned, bot left-aligned)
    - Display messages in chronological order
    - _Requirements: 2.2, 2.5_

  - [ ] 2.4 Create MessageInput component with validation
    - Create `src/components/Chatbot/MessageInput.jsx` with text input (max 500 chars)
    - Send button and Enter key submission support
    - Prevent submission of empty or >500 character messages with validation message
    - Disable input when rate limit reached or service unavailable
    - _Requirements: 1.3, 2.1, 2.4, 10.4, 10.5_

  - [ ]* 2.5 Write property test for message validation
    - **Property 1: Message validation determines submission outcome**
    - **Validates: Requirements 2.1, 2.4**

  - [ ]* 2.6 Write property test for rate limiting
    - **Property 9: Rate limiting blocks messages after 20 per session**
    - **Validates: Requirements 10.4**

  - [ ] 2.7 Create TypingIndicator component
    - Create `src/components/Chatbot/TypingIndicator.jsx` with animated dots
    - Show within 1 second of sending request
    - Hide on response received or timeout (>15 seconds)
    - _Requirements: 2.3, 8.5, 8.6_

  - [ ] 2.8 Create SuggestionCard component
    - Create `src/components/Chatbot/SuggestionCard.jsx` displaying suggestion with options and "Apply" button
    - Show option names, category names, and prices for each suggestion
    - Trigger form update when customer accepts a suggestion
    - _Requirements: 5.1, 5.3_

  - [ ] 2.9 Create error handling components (RetryButton, ChatErrorMessage)
    - Create `src/components/Chatbot/RetryButton.jsx` for retry connection
    - Create `src/components/Chatbot/ChatErrorMessage.jsx` for error/fallback messages
    - Handle: service unavailable, network lost, timeout, rate limit exceeded
    - _Requirements: 8.1, 8.2, 8.3, 8.6, 10.5_

- [ ] 3. Checkpoint - Frontend components complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement chatbot API service (frontend)
  - [ ] 4.1 Create chatbot API client
    - Create `src/components/Chatbot/chatbotApi.js` with `sendMessage` function
    - POST to `/api/pelanggan/chatbot/mesej` with message, history (last 10), and form context
    - Handle 15-second timeout on frontend side
    - Handle network errors and return appropriate error states
    - _Requirements: 2.1, 2.6, 6.1, 8.3, 8.6_

  - [ ] 4.2 Integrate API client with ChatContext
    - Wire `sendMessage` into ChatContext dispatch flow
    - On send: add customer message, set loading, call API, add bot response
    - Handle form actions from response (update form state)
    - Handle suggestions from response (display in SuggestionCard)
    - _Requirements: 2.1, 2.2, 4.1, 5.3_

  - [ ] 4.3 Implement form context synchronization
    - Read current form state from existing FormContext on each message send
    - Ensure chatbot always uses latest form selections even when customer modifies form directly
    - _Requirements: 6.1, 6.3_

- [ ] 5. Implement backend chatbot endpoint
  - [ ] 5.1 Create chatbot route and controller
    - Create `routes/pelanggan/chatbot.js` with POST `/mesej` endpoint
    - Add authentication middleware (require logged-in customer)
    - Validate request body: `mesej` (1-500 chars), `sejarah` (max 10 items), `konteksBoring` (required fields)
    - Return 400 for invalid requests, 401 for unauthenticated
    - _Requirements: 9.1, 9.4_

  - [ ] 5.2 Create ChatbotService
    - Create `services/chatbotService.js` with `processMessage` method
    - Fetch active cake spec categories and options from database
    - Call PromptBuilder to construct prompt
    - Send prompt to AI language model API
    - Handle AI API timeout (30 seconds) and errors with fallback response
    - _Requirements: 9.1, 9.2, 9.4, 9.5_

  - [ ] 5.3 Create PromptBuilder
    - Create `services/promptBuilder.js` with `buildPrompt` method
    - Include: customer message, session history, form context, active cake specs with prices
    - Include system prompt with: role definition, language constraint (Bahasa Melayu), tone guidelines, topic restriction, response format instructions
    - Include instructions for form actions and suggestions in JSON format
    - _Requirements: 9.1, 9.3, 7.1, 7.2, 7.3_

  - [ ]* 5.4 Write property test for prompt construction completeness
    - **Property 4: Prompt construction includes all required context**
    - **Validates: Requirements 3.1, 4.2, 6.1, 9.1**

  - [ ] 5.5 Create response validator
    - Create `services/responseValidator.js` with `validate` method
    - Check if response is on-topic (related to cake ordering)
    - Enforce 300-word maximum, truncate if exceeded
    - Replace off-topic responses with fallback message
    - _Requirements: 7.3, 9.3_

  - [ ]* 5.6 Write property test for response word count limit
    - **Property 8: Response word count does not exceed 300 words**
    - **Validates: Requirements 7.3**

- [ ] 6. Checkpoint - Backend API complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement form interaction logic
  - [ ] 7.1 Implement form action handling (select option)
    - When backend returns a `tindakan` with `jenis: 'pilih_opsyen'`, update the corresponding form field
    - Display confirmation message with category name and selected option
    - Handle case where option is already selected (replace and show previous + new)
    - _Requirements: 4.1, 4.8_

  - [ ]* 7.2 Write property test for form action application
    - **Property 5: Form action correctly updates form state**
    - **Validates: Requirements 4.1, 4.8**

  - [ ] 7.3 Implement suggestion application logic
    - When customer accepts a suggestion, apply all option selections to form
    - Calculate and display total price impact
    - Validate all suggestion options are active before applying
    - _Requirements: 5.3, 5.2_

  - [ ]* 7.4 Write property test for suggestion option validation
    - **Property 6: Suggestions only reference active cake spec options**
    - **Validates: Requirements 5.2**

  - [ ]* 7.5 Write property test for suggestion application and price calculation
    - **Property 7: Applying a suggestion updates all referenced form fields and calculates correct price impact**
    - **Validates: Requirements 5.3**

- [ ] 8. Implement lazy loading and performance optimization
  - [ ] 8.1 Set up lazy loading for ChatWidget
    - Wrap chatbot component with `React.lazy` and `Suspense`
    - Load chatbot code only when customer clicks chat button for the first time
    - Ensure zero bytes added to initial page bundle
    - Handle load failure with error state on chat button
    - _Requirements: 10.1, 10.2, 10.6_

  - [ ] 8.2 Ensure no background processing when panel is closed
    - Verify no network requests or background processing when chat panel is closed
    - Only the chat button renders when panel is closed
    - _Requirements: 10.3_

- [ ] 9. Wire everything together and integrate into order form page
  - [ ] 9.1 Integrate ChatWidget into the order form page
    - Import and render lazy-loaded `ChatWidget` in the order form page component
    - Connect ChatContext to existing FormContext for form state reading
    - Ensure chatbot can read and update form selections
    - _Requirements: 1.1, 6.1, 6.3_

  - [ ] 9.2 Implement conversation context awareness
    - Ensure form context is read fresh on each message send
    - Include last 10 messages as history in API requests
    - Handle follow-up questions using session history
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 9.3 Write integration tests for chatbot API endpoint
    - Test valid request/response flow with mocked AI
    - Test authentication requirement (401)
    - Test invalid request body (400)
    - Test AI timeout and error handling (fallback response)
    - _Requirements: 9.1, 9.2, 9.4, 9.5_

  - [ ]* 9.4 Write component tests for ChatWidget
    - Test ChatButton positioning and toggle behavior
    - Test MessageInput character limit enforcement
    - Test MessageList auto-scroll
    - Test mobile overlay at viewport < 480px
    - Test error states and retry behavior
    - _Requirements: 1.1, 1.3, 1.5, 1.6, 2.4, 8.1_

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The chatbot uses session-scoped state only (no database persistence for messages)
- All AI responses are validated for topic relevance and word count before returning to the customer
- The frontend is lazy-loaded to maintain order form page performance

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "5.1"] },
    { "id": 2, "tasks": ["1.3", "1.4", "2.1", "2.2", "2.3", "2.4", "2.7", "2.8", "2.9", "5.2"] },
    { "id": 3, "tasks": ["2.5", "2.6", "5.3", "5.5"] },
    { "id": 4, "tasks": ["5.4", "5.6", "4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3"] },
    { "id": 6, "tasks": ["7.1", "7.3"] },
    { "id": 7, "tasks": ["7.2", "7.4", "7.5", "8.1", "8.2"] },
    { "id": 8, "tasks": ["9.1", "9.2"] },
    { "id": 9, "tasks": ["9.3", "9.4"] }
  ]
}
```
