## Product Requirements Document: LLM Chat Interface

**Version:** 1.5
**Date:** 2025-04-08
**Author:** doasync
**Status:** Updated after Phase 10 (Rich Content, Model Enhancements, History Actions)

**1. Introduction**

This document outlines the requirements for a static, adaptive web application designed as a chat interface for interacting with Large Language Models (LLMs). The App will be built using TypeScript, React, Next.js, Material UI (MUI) for React components, effector for state management, and fetch API for data fetching. It will be a client-side only App. The interface will primarily interact with LLMs through the **OpenRouter** unified API, utilizing user-provided API keys stored locally in the browser. The UI must be responsive, automatically adjusting its layout, functionality, and content based on the user's device and screen size. Core actions will primarily be represented by icon buttons.

**2. Goals**

- Provide a clean, intuitive, and responsive user interface for chatting with selected LLMs via OpenRouter.
- Enable users to manage multiple chat conversations (history) persistently using IndexedDB, including duplication.
- Allow users to easily select and switch between different LLM models available through OpenRouter, fetched dynamically, with options to filter and view detailed model information.
- Offer robust chat message interactions including copy, **editing of both user and model messages**, delete, and retry with resubmission.
- **Render rich content within chat messages**, including Markdown formatting, syntax-highlighted code blocks, LaTeX math equations, and Mermaid diagrams.
- Provide essential configuration options for the current chat session (API key, temperature, system prompt) stored locally.
- Support client-side file attachment (text/images) for multimodal interaction where supported by the model.
- Ensure a seamless experience across desktop and mobile devices.

**3. Target Audience**

Users who need a web-based interface to interact with various LLM APIs via the OpenRouter service, using their own API keys, without relying on a dedicated backend. Users accept the inherent risks of storing API keys in browser storage for this client-side App.

**4. Functional Requirements**

**4.1. Main UI Layout & Core Components**

- The App will be a single-page App (SPA) interface.
- It will utilize Material UI components for the user interface elements.
- State management will use `effector` library, structured according to its best practices to handle complex state interactions reliably.
- Asynchronous operations, primarily LLM API calls via OpenRouter and dynamic model list fetching, are handled using Effector Effects and fetch API directly.
- The layout will adapt fluidly to different screen sizes.

**4.2. Header Bar (Top)**

- **4.2.1. Chat History Button (Left):**
  - An icon button located on the far left.
  - On click: Opens the "Chat History" sidebar (Left Drawer on Desktop/Tablet, Bottom Drawer on Mobile).
- **4.2.2. Current Model Display (Center):**
  - Displays the **cleaned name** of the currently selected LLM model (provider prefix removed, e.g., "Llama 4 Scout" instead of "Meta: Llama 4 Scout").
  - On click: Opens the "Model Selection Dropdown".
- **4.2.3. Model Info Button (Center):**
  - An **info icon button** located next to the "Current Model Display".
  - On click: Opens the "Model Information" view (Right Drawer on Desktop/Tablet, new Tab in Bottom Drawer on Mobile).
- **4.2.4. Model Selection Dropdown:**
  - A dropdown menu appearing below the "Current Model Display".
  - Contains a list of available LLM models, **fetched dynamically from an OpenRouter endpoint on App startup**.
  - Includes a search input field at the top to filter the model list by name.
  - **Filters models based on the "Show only free models" setting** (see 4.6.6).
  - Selecting a model updates the "Current Model Display" and sets the model for **subsequent interactions** in the current chat. The UI will **not** explicitly indicate points in the history where the model was changed.
- **4.2.5. New Chat Button (Right):**
  - An icon button located to the right of the model display/info button.
  - On click: Clears the current chat window, preserves settings (API key, temperature, system prompt), starts a new chat session UI-wise, and prepares for storage upon first message exchange.
- **4.2.6. Chat Settings Button (Far Right):**
  - An icon button located on the far right.
  - On click: Opens the "Chat Settings" sidebar (Right Drawer on Desktop/Tablet, Bottom Drawer on Mobile).

**4.3. Chat Window (Middle Area)**

- **4.3.1. Display Area:**
  - The main area displaying the conversation history for the _current_ chat.
  - Must be scrollable vertically. Consider virtualization for very long chats if performance degrades.
  - New messages appear at the bottom.
- **4.3.2. Message Rendering:**
  - Messages are rendered using `react-markdown` and associated plugins.
  - **Supports:**
    - Standard Markdown syntax.
    - GitHub Flavored Markdown (GFM) including tables, task lists, strikethrough.
    - Syntax highlighting for code blocks (`language ... `) using `react-syntax-highlighter`.
    - LaTeX math notation (`$...$` and `$$...$$`) rendered using KaTeX via `rehype-katex`.
    - Mermaid diagrams (`mermaid ... `) rendered using `@lightenna/react-mermaid-diagram`.
- **4.3.3. Message Alignment:**
  - Messages from the LLM model are aligned to the left.
  - Messages from the user are aligned to the right and have highlighted background (different color).
- **4.3.4. Message Interaction:**
  - Hovering over a message reveals a small set of action icons in a popover/toolbar.
- **4.3.5. Message Actions (Icons):**
  - **Copy Text:** Copies the plain text content using `navigator.clipboard`. **(Implemented)**
  - **Copy Markdown/Code:** Copies the raw content as-is using `navigator.clipboard`. **(Implemented)**
  - **Edit:** Allows the user to modify the text content of **both user and model messages** via inline editing. The edited version **replaces the original in the stored history**. This edited history is then used as context for all subsequent LLM requests. **(Implemented)**
  - **Delete:**
    - Deleting a **User Message**: Removes only that specific user message from the chat view and the history sent to the LLM. **(Implemented)**
    - Deleting a **Model Response**: Removes only that specific model response from the chat view and the history sent to the LLM. **(Implemented)**
    - Deleted messages are treated as if they never existed for future LLM interactions. **(Implemented)**
  - **Retry/Resubmit:**
    - **On a User Message:** Resubmits history up to and including this message. Replaces the _next_ model response with the new one. History below is preserved. Shows loader on the affected model response during regeneration. **(Implemented)**
    - **On an LLM Message:** Resubmits history up to the _preceding_ user message. Replaces the _current_ model response with the new one. History below is preserved. Shows loader on the affected model response during regeneration. **(Implemented)**

**4.4. Message Input Area (Bottom)**

- **4.4.1. Text Input Field:**
  - Multi-line text input, resizes vertically up to a max height.
- **4.4.2. Attach File Button (Inside Field, Right):** **(Not Implemented in this version)**
  - Icon button to select local text or image files (approx. **~20MB client-side limit**). **(Not Implemented in this version)**
  - Reads content client-side (text content or **base64 encoded image data formatted as a data URL, e.g., `data:image/png;base64,...`**). **(Not Implemented in this version)**
  - The UI must **clearly indicate** when a file is attached and staged for sending. **(Not Implemented in this version)**
  - Includes a check (using model metadata from the dynamic list, e.g., `architecture.input_modalities`) to verify if the **currently selected model supports multimodal input** before attempting to send image data. **(Not Implemented in this version)**
  - Errors during file reading or for unsupported types will trigger user alerts. No server uploads. **(Not Implemented in this version)**
- **4.4.3. Send Button (Inside Field, Right):**
  - Icon button. Sends text and attached file data (if any) upon click or Enter press.
  - **Action Sequence on Send:** (Remains largely the same, ensures rendered content is saved)
    1.  **Display User Message:** Display the user's message immediately in the chat window (aligned right, rendered via MarkdownRenderer).
    2.  **Clear Input:** Clear the input field.
    3.  **Initial Chat Save (First Message):** (As before)
    4.  **Else (if adding to an existing chat):** (As before)
    5.  **Initiate API Request (Model Response):** (As before)
    6.  **UI - Show Loading:** (As before)
    7.  **Await API Response:**
        - **API Success:**
          - **Extract Response:** (As before)
          - **UI - Display Response:** Replace loading indicator with the model message (rendered via MarkdownRenderer).
          - **Update Chat Record:** (As before)
          - **Title Generation (First Response):** (As before)
        - **API Failure:** (As before)

**4.5. Chat History Sidebar (Left Drawer / Bottom Drawer - Mobile)**

- **4.5.1. Sidebar View:**
  - MUI Drawer storing/displaying chat sessions from IndexedDB.
  - On mobile, uses a Bottom Drawer. Switching between History, Settings, and Model Info (if all use Bottom Drawers) will be handled via **tabs within the drawer as well as separate trigger icons in the header bar**.
- **4.5.2. Chat Search:**
  - Input field filters chat list based on **titles**.
- **4.5.3. Chat List:**
  - Displays previous chat sessions loaded from IndexedDB. Each entry shows:
    - **Chat Title:** (Editable, default date/time, updated by auto-generation or user edit).
    - Timestamp (e.g., last modified).
    - **Actions Menu:** A **3-dot icon button (`MoreVertIcon`)** reveals a menu on click.
  - Clicking a chat title/item loads that conversation.
- **4.5.4. Chat Item Actions Menu:**
  - **Rename:** Allows inline editing of the chat title (reuses existing logic).
  - **Duplicate:** Creates a copy of the selected chat session with a new ID, current timestamp, and appended title (e.g., "My Chat (Copy)"). The duplicated chat is immediately selected.
  - **Delete:** Permanently removes the chat session (reuses existing logic).

**4.6. Chat Settings Sidebar (Right Drawer / Bottom Drawer - Mobile)**

- **4.6.1. Sidebar View:**
  - MUI Drawer. On mobile, uses a Bottom Drawer (see 4.5.1 for switching mechanism).
- **4.6.2. API Key Input:**
  - Text input (type="password" or with visibility toggle) for the user's OpenRouter API Key. Stored in LocalStorage.
- **4.6.3. Total Token Count Display:**
  - Displays the **sum of `usage.total_tokens`** for the _current_ chat session.
- **4.6.4. Model Temperature Slider:**
  - MUI Slider to adjust temperature for the current chat.
- **4.6.5. System Prompt Input:**
  - Multi-line text area for the system prompt for the current chat.
- **4.6.6. Free Models Toggle:**
  - A **toggle switch** labeled "Show only free models".
  - When enabled, filters the Model Selection Dropdown (4.2.4) to show only models with zero prompt and completion costs.
  - Setting is persisted in LocalStorage.

**4.7. Model Information View (Right Drawer / Bottom Drawer - Mobile)**

- **4.7.1. View Trigger:**
  - Opened by clicking the info icon button (4.2.3) in the header.
- **4.7.2. View Container:**
  - On Desktop: A Right-side MUI Drawer.
  - On Mobile: A new tab within the unified Bottom Drawer (see 4.5.1).
- **4.7.3. Content:** Displays details of the **currently selected model**:
  - **Header:** Model Name (with 🎁 icon if free).
  - **Model ID:** Displayed in monospace font with a copy-to-clipboard button.
  - **Metadata:** Creation Date (formatted), Context Length.
  - **Pricing:** Input token cost ($/M), Output token cost ($/M).
  - **Description:** Full model description text.

**5. Non-Functional Requirements**

- **5.1. Technology Stack:** TypeScript, React, Next.js, MUI v5+, effector, idb, OpenRouter API, `react-markdown`, `remark-gfm`, `react-syntax-highlighter`, `remark-math`, `rehype-katex`, `katex`, `@lightenna/react-mermaid-diagram`.
- **5.2. Architecture:** Static Web Application. Logic runs client-side.
  - **Data Persistence:** (As before - IndexedDB for chats, LocalStorage for settings including free model toggle).
- **5.3. Responsiveness & Adaptability:** Seamless adaptation. Layouts adjust. Sidebars/Info become Bottom Drawers with tabs on mobile.
- **5.4. Browser Compatibility:** Latest versions of Chrome, Firefox, Safari, Edge.
- **5.5. Performance:** Responsive UI, smooth scrolling, efficient state updates. Clear loading indicators. Markdown rendering performance should be monitored for very long/complex messages.
- **5.6. Usability & Error Handling:** Intuitive interface, clear iconography (with tooltips), accessible message actions. User-facing errors via MUI Alert components.

**6. Design and UI/UX**

- Material Design principles via MUI.
- Prioritize understandable icon buttons.
- Clear distinction between user/model messages.
- Clear interactive element states.
- Smooth transitions. Loading indicators.
- **Rich content rendering should be clean and not disrupt the chat flow.**

**7. Out of Scope**

- (Largely unchanged)
- Server-side logic/hosting.
- User auth beyond local storage.
- The LLM models themselves.
- Advanced file management.
- Real-time collaboration.
- Backend storage/security.
- Client-side token estimation libraries.
- Proactive management of IndexedDB storage limits.

---
