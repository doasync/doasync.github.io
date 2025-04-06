## Product Requirements Document: LLM Chat Interface

**Version:** 1.2
**Date:** 2025-04-06
**Author:** doasync
**Status:** Refined Draft

**1. Introduction**

This document outlines the requirements for a static, adaptive web application designed as a chat interface for interacting with Large Language Models (LLMs). The App will be built using TypeScript, React, Next.js, Material UI (MUI) for React components, effector for state management, and fetch API for data fetching. It will be a client-side only App. The interface will primarily interact with LLMs through the **OpenRouter** unified API, utilizing user-provided API keys stored locally in the browser. The UI must be responsive, automatically adjusting its layout, functionality, and content based on the user's device and screen size. Core actions will primarily be represented by icon buttons.

**2. Goals**

*   Provide a clean, intuitive, and responsive user interface for chatting with selected LLMs via OpenRouter.
*   Enable users to manage multiple chat conversations (history) persistently using IndexedDB.
*   Allow users to easily select and switch between different LLM models available through OpenRouter, fetched dynamically.
*   Offer robust chat message interactions including copy, **editing of both user and model messages**, delete, and retry with resubmission.
*   Provide essential configuration options for the current chat session (API key, temperature, system prompt) stored locally.
*   Support client-side file attachment (text/images) for multimodal interaction where supported by the model.
*   Ensure a seamless experience across desktop and mobile devices.

**3. Target Audience**

Users who need a web-based interface to interact with various LLM APIs via the OpenRouter service, using their own API keys, without relying on a dedicated backend. Users accept the inherent risks of storing API keys in browser storage for this client-side App.

**4. Functional Requirements**

**4.1. Main UI Layout & Core Components**

*   The App will be a single-page App (SPA) interface.
*   It will utilize Material UI components for the user interface elements.
*   State management will use `effector` library, structured according to its best practices to handle complex state interactions reliably.
*   Asynchronous operations, primarily LLM API calls via OpenRouter and dynamic model list fetching, are handled using Effector Effects and fetch API directly.
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
    *   Contains a list of available LLM models, **fetched dynamically from an OpenRouter endpoint on App startup**.
    *   Includes a search input field at the top to filter the model list.
    *   Selecting a model updates the "Current Model Display" and sets the model for **subsequent interactions** in the current chat. The UI will **not** explicitly indicate points in the history where the model was changed.
*   **4.2.4. New Chat Button (Right):**
    *   An icon button located to the right of the model display.
    *   On click: Clears the current chat window, preserves settings (API key, temperature, system prompt), starts a new chat session UI-wise, and prepares for storage upon first message exchange.
*   **4.2.5. Chat Settings Button (Far Right):**
    *   An icon button located on the far right.
    *   On click: Opens the "Chat Settings" sidebar (Right Drawer on Desktop/Tablet, Bottom Drawer on Mobile).

**4.3. Chat Window (Middle Area)**

*   **4.3.1. Display Area:**
    *   The main area displaying the conversation history for the *current* chat.
    *   Must be scrollable vertically. Consider virtualization for very long chats if performance degrades.
    *   New messages appear at the bottom.
*   **4.3.2. Message Alignment:**
    *   Messages from the LLM model are aligned to the left.
    *   Messages from the user are aligned to the right and have highlighted background (different color).
*   **4.3.3. Message Interaction:** **(Not Implemented)** 
    *   ~~Clicking/tapping on any message highlights it (e.g., outline).~~ **Not implemented in this version.**
    *   ~~Upon highlighting, a small set of action icons appears (e.g., in a small popover or inline toolbar), designed for usability on both desktop (hover/click) and touch devices (tap).~~ **Not implemented in this version.**
*   **4.3.4. Message Actions (Icons):** **(Not Implemented)**
    *   **Copy Text:** Copies the plain text content. **(Not Implemented)**
    *   **Copy Markdown/Code:** Copies the content formatted as Markdown. **(Not Implemented)**
    *   **Edit:** Allows the user to modify the text content of **both user and model messages**. The edited version **replaces the original in the stored history**. This edited history is then used as context for all subsequent LLM requests, effectively allowing the user to guide the conversation history. **(Not Implemented)**
    *   **Delete:** **(Not Implemented)**
        *   Deleting a **User Message**: Removes only that specific user message from the chat view and the history sent to the LLM. **(Not Implemented)**
        *   Deleting a **Model Response**: Removes only that specific model response from the chat view and the history sent to the LLM. **(Not Implemented)**
        *   Deleted messages are treated as if they never existed for future LLM interactions. Confirmation may be required. **(Not Implemented)**
    *   **Retry/Resubmit:** (Kept simple as requested) **(Not Implemented)**
        *   **On a User Message:** Resubmits history up to and including this message. Replaces the *next* model response with the new one. History below is preserved. Shows loader on the affected model response during regeneration. **(Not Implemented)**
        *   **On an LLM Message:** Resubmits history up to the *preceding* user message. Replaces the *current* model response with the new one. History below is preserved. Shows loader on the affected model response during regeneration. **(Not Implemented)**

**4.4. Message Input Area (Bottom)**

*   **4.4.1. Text Input Field:**
    *   Multi-line text input, resizes vertically up to a max height.
*   **4.4.2. Attach File Button (Inside Field, Right):** **(Not Implemented in this version)**
    *   Icon button to select local text or image files (approx. **~20MB client-side limit**). **(Not Implemented in this version)**
    *   Reads content client-side (text content or **base64 encoded image data formatted as a data URL, e.g., `data:image/png;base64,...`**). **(Not Implemented in this version)**
    *   The UI must **clearly indicate** when a file is attached and staged for sending. **(Not Implemented in this version)**
    *   Includes a check (using model metadata from the dynamic list, e.g., `architecture.input_modalities`) to verify if the **currently selected model supports multimodal input** before attempting to send image data. **(Not Implemented in this version)**
    *   Errors during file reading or for unsupported types will trigger user alerts. No server uploads. **(Not Implemented in this version)**
*   **4.4.3. Send Button (Inside Field, Right):**
    *   Icon button. Sends text and attached file data (if any) upon click or Enter press.
    *   **Action Sequence on Send:**
        1.  **Display User Message:** Display the user's message immediately in the chat window (aligned right).
        2.  **Clear Input:** Clear the input field to prepare for the next message.
        3.  **Initial Chat Save (First Message):** If this is the *first* message in a *new* chat session:
            *   **Create Chat Record:** Create a new chat record in memory with a unique ID.
            *   **Default Title:** Assign a default title based on the current date and time (e.g., "Chat 2025-04-07 15:30").
            *   **Include Settings:** Include the current chat settings (selected model, temperature, system prompt) in the chat record.
            *   **Add First Message:** Add the user's first message to this record's message list.
            *   **Save to IndexedDB:** Save this initial chat record to IndexedDB for persistence.
            *   **Immediately add/update the entry in the Chat History sidebar** to display this new chat with its default title.
        4.  **Else (if adding to an existing chat):**
            *   **Append Message:** Add the user's message to the existing chat record's message list in IndexedDB.
        5.  **Initiate API Request (Model Response):** 
            *   **Prepare Context:** Gather the current chat context, including the system prompt, all messages up to this point, and any attached file data.
            *   **Send API Call:** Send the chat context to the configured LLM via the OpenRouter API, using the stored API key and current chat settings.
        6.  **UI - Show Loading:** Display a **loading indicator (spinner)** in the chat window where the model's response is expected (aligned left).
        7.  **Await API Response:** Handle the API response:
            *   **API Success:** On successful API response:
                *   **Extract Response:** Receive the model's response text and token usage data (`usage.total_tokens`).
                *   **UI - Display Response:** Replace the loading indicator with the received model message in the chat window (aligned left).
                *   **Update Chat Record:** Add the model's message and its token count to the chat record in IndexedDB.
                *   **Title Generation (First Response):** If this was the *first* model response in the chat:
                    *   **Title API Request:** Initiate an API request to the `google/gemma-3-27b-it` model via OpenRouter (using the user's API key). Send the user's first message and this first model response with a hardcoded prompt requesting a short title.
                    *   **Await Title Response:** Handle the title generation API response:
                        *   **Title Success:** Receive the generated title. Update the chat record in IndexedDB, replacing the default date/time title with the new one. Update the corresponding entry's title in the Chat History sidebar UI to reflect the generated title.
                        *   **Title Failure:** On title generation failure, log the error to the console. The chat title remains the default date/time title. No user-facing error alert is needed for title generation failure.
            *   **API Failure:** On API request failure (for model response):
                *   **UI - Remove Loading:** Remove the loading indicator from the chat window.
                *   **UI - Display Error:** Display an error message to the user (e.g., using an MUI Alert component) indicating the failure.
                *   The chat remains saved in its current state (with the user's message).

**4.5. Chat History Sidebar (Left Drawer / Bottom Drawer - Mobile)**

*   **4.5.1. Sidebar View:**
    *   MUI Drawer storing/displaying chat sessions from IndexedDB.
    *   On mobile, uses a Bottom Drawer. Switching between History and Settings (if both use Bottom Drawers) will be handled via **tabs within the drawer as well as separate trigger icons in the header bar**.
*   **4.5.2. Chat Search:**
    *   Input field filters chat list based on **titles**. Search within message content might be considered later based on performance.
*   **4.5.3. Chat List:**
    *   Displays previous chat sessions loaded from IndexedDB. Each entry shows:
        *   **Chat Title:**
            *   Initially displayed as the **default date and time** when a new chat is created and saved upon sending the first message.
            *   **Updated asynchronously** to an auto-generated title after the *first successful model response* is received and the subsequent title generation request to `google/gemma-3-27b-it` completes successfully.
            *   Remains the date/time if title generation fails. **Note: Automatic title generation might have issues and is not fully reliable in the current version.**
            *   The title is **editable by the user** at any time by clicking on it (or via an edit icon) within the history list. User edits override any default or generated title.
        *   Timestamp (e.g., last modified).
    *   Clicking a chat in the history loads that conversation (messages, associated settings) into the main Chat Window and updates relevant UI elements.

**4.6. Chat Settings Sidebar (Right Drawer / Bottom Drawer - Mobile)**

*   **4.6.1. Sidebar View:**
    *   MUI Drawer. On mobile, uses a Bottom Drawer (see 4.5.1 for switching mechanism).
*   **4.6.2. API Key Input:**
    *   Text input (type="password" or with visibility toggle) for the user's OpenRouter API Key.
    *   Required for all LLM interactions.
    *   Stored in browser's persistent storage (LocalStorage).
*   **4.6.3. Total Token Count Display:**
    *   Displays the **sum of `usage.total_tokens`** reported by the OpenRouter API responses for message exchanges within the *current* chat session. This provides an actual count based on API feedback, not a client-side estimation.
*   **4.6.4. Model Temperature Slider:**
    *   MUI Slider (e.g., 0.0 to 2.0) to adjust temperature for the current chat. Value used in subsequent requests.
*   **4.6.5. System Prompt Input:**
    *   Multi-line text area for the system prompt for the current chat. Included in LLM requests.

**5. Non-Functional Requirements**

*   **5.1. Technology Stack:** TypeScript, React, Next.js, MUI v5+, effector, TanStack React Query, OpenRouter API.
*   **5.2. Architecture:** Static Web Application. Logic runs client-side.
    *   **Data Persistence:**
        *   Chat history (messages, titles, chat-specific settings) in **IndexedDB**. No specific warnings or handling for IndexedDB storage limits will be implemented initially.
        *   Global settings (API key, default preferences) in **LocalStorage**. **Users accept the risk associated with storing API keys in browser storage.**
*   **5.3. Responsiveness & Adaptability:** Seamless adaptation to desktop, tablet, mobile. Layouts adjust. Sidebars become Bottom Drawers on mobile, with clear switching mechanism (tabs or header icons).
*   **5.4. Browser Compatibility:** Latest versions of Chrome, Firefox, Safari, Edge.
*   **5.5. Performance:** Responsive UI, smooth scrolling (consider virtualization if needed), efficient state updates. Clear loading indicators for API calls.
*   **5.6. Usability & Error Handling:** Intuitive interface, clear iconography (with tooltips), accessible message actions on touch. **User-facing errors (API, network, file) communicated via MUI Alert components.**

**6. Design and UI/UX**

*   Material Design principles via MUI.
*   Prioritize understandable icon buttons.
*   Clear distinction between user/model messages.
*   Clear interactive element states (hover, focus, active).
*   Smooth transitions. Loading indicators (spinners).

**7. Out of Scope**

*   Server-side logic/hosting (beyond static deployment).
*   User auth beyond local storage.
*   The LLM models themselves (via OpenRouter).
*   Advanced file management.
*   Real-time collaboration.
*   Backend storage/security for API keys or history.
*   Client-side token estimation libraries.
*   Proactive management of IndexedDB storage limits.

---