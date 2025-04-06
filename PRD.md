Okay, here is a Product Requirements Document (PRD) in English based on your description.

---

## Product Requirements Document: LLM Chat Interface

**Version:** 1.0
**Date:** 2025-04-06
**Author:** doasync
**Status:** Draft

**1. Introduction**

This document outlines the requirements for a static, adaptive web application designed as a chat interface for interacting with Large Language Models (LLMs). The application will be built using TypeScript, React, Next.js, Material UI (MUI) for React components, TanStack React Query for fetching, and effector for state management. It will be a client-side only application, meaning no backend server logic will be developed as part of this scope. The UI must be responsive, automatically adjusting its layout, functionality, and content based on the user's device and screen size. Core actions will primarily be represented by icon buttons.

**2. Goals**

*   Provide a clean, intuitive, and responsive user interface for chatting with selected LLMs.
*   Enable users to manage multiple chat conversations (history).
*   Allow users to easily select and switch between different (pre-configured) LLM models.
*   Offer standard chat message interactions (copy, edit, delete, retry).
*   Provide basic configuration options for the current chat session (temperature, system prompt).
*   Ensure a seamless experience across desktop and mobile devices.

**3. Target Audience**

Users who need a web-based interface to interact with various LLM APIs or models configured on the client-side.

**4. Functional Requirements**

**4.1. Main UI Layout & Core Components**

*   The application will be a single-page application (SPA) interface.
*   It will utilize Material UI components for the user interface elements.
*   State management will use `effector` library.
*   Asynchronous operations like potential LLM API calls will use React Query,
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
    *   Contains a list of available LLM models.
    *   Includes a search input field at the top to filter the model list.
    *   Selecting a model from the list updates the "Current Model Display" and potentially affects the current or next chat interaction.
*   **4.2.4. New Chat Button (Right):**
    *   An icon button located to the right of the model display.
    *   On click: Clears the current chat window and starts a new chat session.
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
    *   Clicking on any message (user or model) should highlight it (with an outline).
    *   Upon clicking/highlighting, a small set of action icons should appear above the message.
*   **4.3.4. Message Actions (Icons):**
    *   **Copy Text:** Copies the plain text content of the message to the clipboard.
    *   **Copy Markdown/Code:** Copies the message content formatted as Markdown to the clipboard.
    *   **Edit (User Messages Only):** Allows the user to modify the text of their own previous message. This does not trigger a resubmission.
    *   **Delete:** Removes the message from the chat view. May require confirmation.
    *   **Retry (User Messages Only):** Resubmits the user's message to the LLM, potentially generating a new response.

**4.4. Message Input Area (Bottom)**

*   **4.4.1. Text Input Field:**
    *   A multi-line text input field for composing new messages.
    *   Should likely resize vertically based on content.
*   **4.4.2. Attach File Button (Inside Field, Right):**
    *   An icon button within the input field area.
    *   *Functionality:* As this is a static client-side app, it involves reading file content client-side (e.g., text files) to include in the prompt, or linking to client-side accessible resources. It will *not* involve server-side uploads.
*   **4.4.3. Send Button (Inside Field, Right):**
    *   An icon button within the input field area, next to or replacing the attach button when text is present.
    *   On click (or pressing Enter in the text field): Sends the content of the text input field as a user message. Clears the input field. Displays the user message in the chat window and triggers the request (submission) to the LLM.

**4.5. Chat History Sidebar (Left Drawer / Bottom Drawer - Mobile)**

*   **4.5.1. Sidebar View:**
    *   A drawer component (MUI Drawer) that slides in from the left on larger screens and potentially up from the bottom on mobile.
    *   Contains a list of previous chat sessions.
*   **4.5.2. Chat Search:**
    *   A search input field at the top of the sidebar.
    *   Filters the displayed chat history list based on keywords found in chat titles and/or content.
*   **4.5.3. Chat List:**
    *   Displays previous chats with titles (auto-generated or user-defined) and timestamps.
    *   Clicking a chat in the history loads that conversation into the main Chat Window.

**4.6. Chat Settings Sidebar (Right Drawer / Bottom Drawer - Mobile)**

*   **4.6.1. Sidebar View:**
    *   A drawer component (MUI Drawer) that slides in from the right on larger screens and potentially up from the bottom on mobile (sharing space or distinct from the History drawer).
*   **4.6.2. Token Count Display:**
    *   Displays the *estimated* or *actual* number of tokens used in the *current* chat session (requires calculation logic based on messages and model specifics).
*   **4.6.3. Model Temperature Slider:**
    *   A slider component (MUI Slider) allowing the user to adjust the 'temperature' parameter for the LLM's generation (e.g., range 0.0 to 1.0). The selected value should be used in subsequent LLM requests for the current chat.
*   **4.6.4. System Prompt Input:**
    *   A text area where the user can define a 'system prompt' or initial instructions for the LLM for the *current* chat session. This prompt should be included appropriately when interacting with the LLM.

**5. Non-Functional Requirements**

*   **5.1. Technology Stack:**
    *   Language: TypeScript
    *   Framework/Library: React, Next.js
    *   UI Components: Material UI (MUI) v5+ (including `@mui/material`, `@emotion/react`, `@emotion/styled`, `@mui/material-nextjs`, `@emotion/cache`)
    *   State Management: effector (`effector`)
    *   Data Fetching: TanStack React Query (`@tanstack/react-query`)
*   **5.2. Architecture:** Static Web Application. All logic runs in the user's browser. No backend server component. Data persistence (chat history, settings) must rely on browser storage (LocalStorage, IndexedDB).
*   **5.3. Responsiveness & Adaptability:**
    *   The UI must adapt seamlessly to various screen sizes (desktop, tablet, mobile).
    *   Layouts, font sizes, and component spacing should adjust appropriately.
    *   Sidebars (Drawers) must function correctly on all device types, specifically transitioning to Bottom Drawers on mobile screens as specified.
*   **5.4. Browser Compatibility:** Must function correctly on the latest versions of major modern web browsers (Chrome, Firefox, Safari, Edge).
*   **5.5. Performance:** The interface should feel responsive and smooth. Scrolling through long chats should be performant. UI updates should be efficient.
*   **5.6. Usability:** The interface should be intuitive, with clear iconography and user flows.

**6. Design and UI/UX**

*   Adhere to Material Design principles using MUI components.
*   Prioritize icon buttons for actions where appropriate (Send, New Chat, History, Settings, Message Actions). Ensure icons are universally understood or provide tooltips.
*   Maintain clear visual distinction between user messages and LLM responses (alignment, possibly background color/styling).
*   Ensure interactive elements have clear hover and focus states.
*   Implement smooth transitions for drawers and dropdowns.

**8. Out of Scope**

*   Server-side application logic or hosting infrastructure (beyond static site deployment).
*   User authentication or multi-user capabilities.
*   The LLM models themselves.
*   Advanced collaboration features.

---