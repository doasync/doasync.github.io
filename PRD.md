Отлично, вот обновленная версия PRD с учетом ваших правок:

---

## Product Requirements Document: LLM Chat Interface

**Version:** 1.1
**Date:** 2025-04-06
**Author:** doasync
**Status:** Draft

**1. Introduction**

This document outlines the requirements for a static, adaptive web application designed as a chat interface for interacting with Large Language Models (LLMs). The application will be built using TypeScript, React, Next.js, Material UI (MUI) for React components, TanStack React Query for fetching, and `effector` for state management. It will be a client-side only application, meaning no backend server logic will be developed as part of this scope. The interface will primarily interact with LLMs through the **OpenRouter** unified API, utilizing user-provided API keys. The UI must be responsive, automatically adjusting its layout, functionality, and content based on the user's device and screen size. Core actions will primarily be represented by icon buttons.

**2. Goals**

*   Provide a clean, intuitive, and responsive user interface for chatting with selected LLMs via OpenRouter.
*   Enable users to manage multiple chat conversations (history).
*   Allow users to easily select and switch between different LLM models available through OpenRouter.
*   Offer standard chat message interactions (copy, edit, delete, retry with resubmission).
*   Provide essential configuration options for the current chat session (API key, temperature, system prompt).
*   Ensure a seamless experience across desktop and mobile devices.
*   Persist chat history and user settings locally in the browser.

**3. Target Audience**

Users who need a web-based interface to interact with various LLM APIs, specifically through the OpenRouter service, using their own API keys, without relying on a dedicated backend.

**4. Functional Requirements**

**4.1. Main UI Layout & Core Components**

*   The application will be a single-page application (SPA) interface.
*   It will utilize Material UI components for the user interface elements.
*   State management will use `effector` library.
*   Asynchronous operations, primarily LLM API calls via OpenRouter, will use TanStack React Query.
*   The layout will adapt fluidly to different screen sizes.

**4.2. Header Bar (Top)**

*   **4.2.1. Chat History Button (Left):**
    *   An icon button located on the far left.
    *   On click: Opens the "Chat History" sidebar (Left Drawer on Desktop/Tablet, Bottom Drawer on Mobile).
*   **4.2.2. Current Model Display (Center):**
    *   Displays the name of the currently selected LLM model.
    *   On click: Opens the "Model Selection Dropdown".
*   **4.2.3. Model Selection Dropdown:**
    *   A dropdown menu appearing below the "Current Model Display".
    *   Contains a list of available LLM models (intended for use via OpenRouter).
    *   Includes a search input field at the top to filter the model list.
    *   Selecting a model from the list updates the "Current Model Display" and sets the model for subsequent interactions in the current chat.
*   **4.2.4. New Chat Button (Right):**
    *   An icon button located to the right of the model display.
    *   On click: Clears the current chat window, preserves settings (like API key, potentially temperature/system prompt unless reset explicitly), and starts a new chat session in the UI, preparing for storage upon first message exchange.
*   **4.2.5. Chat Settings Button (Far Right):**
    *   An icon button located on the far right.
    *   On click: Opens the "Chat Settings" sidebar (Right Drawer on Desktop/Tablet, Bottom Drawer on Mobile).

**4.3. Chat Window (Middle Area)**

*   **4.3.1. Display Area:**
    *   The main area displaying the conversation history for the *current* chat.
    *   Must be scrollable vertically.
    *   New messages appear at the bottom.
*   **4.3.2. Message Alignment:**
    *   Messages from the LLM model are aligned to the left.
    *   Messages from the user are aligned to the right and have highlighted background (different color).
*   **4.3.3. Message Interaction:**
    *   Clicking on any message (user or model) should highlight it (e.g., with an outline).
    *   Upon clicking/highlighting, a small set of action icons should appear, typically near the highlighted message.
*   **4.3.4. Message Actions (Icons):**
    *   **Copy Text:** Copies the plain text content of the message to the clipboard.
    *   **Copy Markdown/Code:** Copies the message content formatted as Markdown (or best guess for code blocks) to the clipboard.
    *   **Edit:** Allows the user to modify the text content of *both user and model messages* directly within the chat interface. This action modifies the stored message data locally but **does not** automatically trigger a resubmission to the LLM.
    *   **Delete:** Removes the selected message (and potentially subsequent messages if logically dependent, TBD) from the chat view and stored history. May require confirmation.
    *   **Retry/Resubmit:** This action allows regenerating a response based on the history *up to a certain point*.
        *   **On a User Message:** Takes the chat history *up to and including* the selected user message. Resubmits this context to the LLM. The *next* LLM response in the sequence is replaced with the new response. Messages below the replaced LLM response are preserved. During regeneration, a loading indicator (spinner) replaces the affected LLM response.
        *   **On an LLM Message:** Takes the chat history *up to the user message preceding* the selected LLM message. Resubmits that context. The selected LLM response is replaced with the new response. Messages below the replaced LLM response are preserved. During regeneration, a loading indicator (spinner) replaces the affected LLM response.

**4.4. Message Input Area (Bottom)**

*   **4.4.1. Text Input Field:**
    *   A multi-line text input field for composing new messages.
    *   Should resize vertically based on content, up to a reasonable maximum height.
*   **4.4.2. Attach File Button (Inside Field, Right):**
    *   An icon button within the input field area.
    *   *Functionality:* Allows the user to select local **text files or image files**. The content (text content or base64 encoded image data) is read entirely client-side and held temporarily in memory. This data can then be included as part of the prompt sent to the LLM (if the selected model supports it). **No server-side uploads occur.**
*   **4.4.3. Send Button (Inside Field, Right):**
    *   An icon button within the input field area, possibly next to the attach button or replacing it when text is present.
    *   On click (or pressing Enter, perhaps Shift+Enter for newline):
        *   Sends the content of the text input field (and any attached file data) as a user message.
        *   Clears the input field.
        *   Displays the user message in the chat window.
        *   Triggers the request to the configured LLM via the OpenRouter API using the stored API key and chat settings (model, temperature, system prompt, history).

**4.5. Chat History Sidebar (Left Drawer / Bottom Drawer - Mobile)**

*   **4.5.1. Sidebar View:**
    *   A drawer component (MUI Drawer) that slides in from the left on larger screens and up from the bottom on mobile.
    *   Contains a list of previous chat sessions stored in IndexedDB.
*   **4.5.2. Chat Search:**
    *   A search input field at the top of the sidebar.
    *   Filters the displayed chat history list based on keywords found in chat titles or potentially message content (performance permitting).
*   **4.5.3. Chat List:**
    *   Displays previous chats. Each entry should show:
        *   **Chat Title:** Initially auto-generated based on the first few messages (e.g., using a developer-specified utility model via OpenRouter with the user's API key for summarization). The title must be editable by the user.
        *   Timestamp (e.g., last modified).
    *   Clicking a chat in the history loads that conversation (messages, associated settings like model, temperature, system prompt) into the main Chat Window and updates relevant UI elements (e.g., model display).

**4.6. Chat Settings Sidebar (Right Drawer / Bottom Drawer - Mobile)**

*   **4.6.1. Sidebar View:**
    *   A drawer component (MUI Drawer) that slides in from the right on larger screens and up from the bottom on mobile (may share the bottom drawer mechanism with History, using tabs or distinct triggers).
*   **4.6.2. API Key Input:**
    *   A text input field (likely type="password" or with a visibility toggle) for the user to enter their OpenRouter API Key.
    *   This key is required for making requests to the LLMs via OpenRouter.
    *   The key must be stored securely in the browser's persistent storage (e.g., LocalStorage). Appropriate warnings about browser storage security should be considered.
*   **4.6.3. Token Count Display:**
    *   Displays an *estimated* count of tokens used in the *current* chat session (based on message content and potentially model-specific tokenization rules, requires client-side calculation).
*   **4.6.4. Model Temperature Slider:**
    *   A slider component (MUI Slider) allowing the user to adjust the 'temperature' parameter for the LLM's generation (e.g., range 0.0 to 2.0, with appropriate steps). The selected value applies to the *current* chat and should be used in subsequent LLM requests for this chat.
*   **4.6.5. System Prompt Input:**
    *   A multi-line text area where the user can define a 'system prompt' or initial instructions for the LLM for the *current* chat session. This prompt should be included appropriately (typically at the beginning of the context) when sending requests to the LLM for this chat.

**5. Non-Functional Requirements**

*   **5.1. Technology Stack:**
    *   Language: TypeScript
    *   Framework/Library: React, Next.js (for static site generation/serving)
    *   UI Components: Material UI (MUI) v5+ (including `@mui/material`, `@emotion/react`, `@emotion/styled`, `@mui/material-nextjs`, `@emotion/cache`)
    *   State Management: effector (`effector`)
    *   Data Fetching & Caching: TanStack React Query (`@tanstack/react-query`)
    *   LLM Interaction: Primarily via **OpenRouter API**.
*   **5.2. Architecture:** Static Web Application. All logic runs in the user's browser. No backend server component.
    *   **Data Persistence:**
        *   Chat history (messages, titles, associated settings per chat) will be stored in **IndexedDB**.
        *   Global settings like the API key and potentially default model/temperature will be stored in **LocalStorage**. Users should be aware that storing API keys in browser storage has security implications and is done at their own risk.
*   **5.3. Responsiveness & Adaptability:**
    *   The UI must adapt seamlessly to various screen sizes (desktop, tablet, mobile).
    *   Layouts, font sizes, and component spacing should adjust appropriately.
    *   Sidebars (Drawers) must function correctly on all device types, transitioning to Bottom Drawers on mobile screens as specified.
*   **5.4. Browser Compatibility:** Must function correctly on the latest versions of major modern web browsers (Chrome, Firefox, Safari, Edge).
*   **5.5. Performance:** The interface should feel responsive and smooth. Scrolling through long chats should be performant (consider virtualization if needed). UI updates should be efficient. API calls should provide visual feedback (e.g., loading states).
*   **5.6. Usability & Error Handling:**
    *   The interface should be intuitive, with clear iconography and user flows. Use tooltips for icon buttons where meaning isn't immediately obvious.
    *   All user-facing errors (e.g., invalid API key, network issues, OpenRouter API errors, file reading errors) must be clearly communicated to the user, preferably using non-blocking notifications like **MUI Alert components**.

**6. Design and UI/UX**

*   Adhere to Material Design principles using MUI components.
*   Prioritize icon buttons for actions (Send, Attach, New Chat, History, Settings, Message Actions).
*   Maintain clear visual distinction between user messages and LLM responses (alignment, background color/styling).
*   Ensure interactive elements have clear hover, focus, and active/selected states.
*   Implement smooth transitions for drawers and dropdowns.
*   Provide loading indicators (spinners) during API requests and potentially long computations (like token counting or title generation).

**7. Out of Scope**

*   Server-side application logic or hosting infrastructure (beyond static site deployment).
*   User authentication or multi-user capabilities beyond local browser storage.
*   The LLM models themselves (provided via OpenRouter).
*   Complex file management beyond temporary client-side handling for prompt inclusion.
*   Real-time collaboration features.
*   Backend infrastructure for storing API keys or chat history.

---