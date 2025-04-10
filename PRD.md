## Product Requirements Document: LLM Chat Interface

**Version:** 1.8  
**Date:** 2025-04-10  
**Author:** doasync  
**Status:** Updated after Phase 13 (Usage Info & Mini Chat)

---

### 1. Introduction

This document outlines the requirements for a static, adaptive web application designed as a chat interface for interacting with Large Language Models (LLMs). The App will be built using TypeScript, React, Next.js, Material UI (MUI) for React components, Effector for state management, and fetch API for data fetching. It will be a client-side only App. The interface will primarily interact with LLMs through the **OpenRouter** unified API, utilizing user-provided API keys stored locally in the browser. The UI must be responsive, automatically adjusting its layout, functionality, and content based on the user's device and screen size. Core actions will primarily be represented by icon buttons.

---

### 2. Goals

- Provide a clean, intuitive, and responsive user interface for chatting with selected LLMs via OpenRouter.
- Enable users to manage multiple chat conversations (history) persistently using IndexedDB, including duplication and title regeneration.
- Allow users to easily select and switch between different LLM models available through OpenRouter, fetched dynamically, with options to filter and view detailed model information.
- Offer robust chat message interactions including copy, **editing of both user and model messages**, delete, and retry with resubmission.
- **Render rich content within chat messages**, including Markdown formatting, syntax-highlighted code blocks, LaTeX math equations, and Mermaid diagrams.
- Provide essential configuration options for the current chat session (API key, temperature, system prompt) stored locally.
- Support client-side file attachment (text/images) for multimodal interaction where supported by the model.
- Ensure a seamless experience across desktop and mobile devices, including persistent side drawers on desktop.
- **Persist in-progress message drafts per chat session with debounce, restoring drafts on reload.**
- **Provide real-time resource usage insights (tokens, cost, storage).**
- **Enable quick contextual interactions via a Mini Chat interface with a dedicated model selector.**

---

### 3. Target Audience

Users who need a web-based interface to interact with various LLM APIs via the OpenRouter service, using their own API keys, without relying on a dedicated backend. Users accept the inherent risks of storing API keys in browser storage for this client-side App.

---

### 4. Functional Requirements

#### 4.1. Main UI Layout & Core Components

- Single-page App (SPA).
- Built with Material UI components.
- State managed via Effector, following best practices.
- Async operations (API calls, model fetching) handled via Effector Effects and fetch API.
- Responsive layout adapting fluidly to screen sizes.
- Desktop/tablet: persistent sidebars for History and Settings; mobile: tabs within bottom drawer.

#### 4.2. Header Bar (Top)

- **4.2.1. Chat History Button (Left):** Opens/closes History sidebar or drawer.
- **4.2.2. New Chat Button (Left):** Clears chat window, preserves settings, starts new session UI-wise.
- **4.2.3. Current Model Display (Center):** Shows cleaned model name.
- **4.2.4. Model Info Button (Center):** Opens Model Info view.
- **4.2.5. Model Selection Dropdown:**
  - List fetched dynamically from OpenRouter.
  - Search input for filtering.
  - Filter toggle for free models.
  - Selecting updates the current chat's model.
- **4.2.6. Chat Settings Button (Right):** Opens/closes Settings sidebar or drawer.
- **4.2.7. **Usage Info Button:\*\* (New)
  - An icon button (e.g., `QueryStatsIcon`) in the AppBar.
  - Opens a dialog showing real-time usage metrics (see 4.8).

#### 4.3. Chat Window (Middle Area)

- **4.3.1. Display Area:** Scrollable, centered, auto-scrolls on new user messages.
- **4.3.2. Message Rendering:** Via `react-markdown` and plugins.
  - Standard and GitHub Flavored Markdown.
  - Syntax-highlighted code blocks.
  - LaTeX math via KaTeX.
  - Mermaid diagrams.
- **4.3.3. Message Alignment:** Model left, user right, styled accordingly.
- **4.3.4. Message Interaction:** Hover toolbar, double-click to edit.
- **4.3.5. Message Actions:**
  - **Copy Text:** Plain text.
  - **Copy Markdown:** Raw content.
  - **Edit:** Inline editing for user/model messages, persists edits affecting future context.
  - **Delete:** Removes message, affects future context.
  - **Retry/Resubmit:**
    - **User message retry:** Resubmits up to and including this message.
      - If next message is a model reply, replaces it.
      - **If next is another user or absent, inserts placeholder assistant message immediately after retried user message, replaced upon API success.**
    - **Model message retry:** Resubmits up to preceding user message, replaces model reply.
    - **Generate:** When input is empty and last message is user, inserts placeholder assistant message immediately, replaced upon API success.
  - **All retry/generate placeholders appear instantly, show spinners, and are replaced seamlessly.**

#### 4.4. Message Input Area (Bottom)

- **4.4.1. Text Input:** Multiline, resizes vertically.
- **4.4.2. Attach File Button:** (Not Implemented)
- **4.4.3. Send Button:**
  - Sends on click or Enter.
  - **If input empty & last message is user, triggers Generate flow (see above).**
- **4.4.4. Draft Persistence:**
  - The current input text is saved as a **`draft`** field inside the chat session.
  - Debounced (~1s) to minimize storage writes.
  - Draft restored automatically when chat is loaded, enabling seamless continuation.
  - Draft changes trigger chat save to IndexedDB.

#### 4.5. Chat History Sidebar (Left Drawer / Bottom Drawer - Mobile)

- **4.5.1. View:** Persistent drawer or bottom tab.
- **4.5.2. Search:** Filters chats by title.
- **4.5.3. List:** Shows chat title, timestamp, actions menu.
- **4.5.4. Actions:**
  - Rename (inline edit).
  - Duplicate (creates a copy with timestamp).
  - Regenerate Title (via API).
  - Delete (permanent).
- **4.5.5. Persistence:**
  - **All message updates, retries, generates, edits, deletes, and draft changes trigger chat save.**
  - Ensures chats in IndexedDB reflect latest state consistently.

#### 4.6. Chat Settings Sidebar (Right Drawer / Bottom Drawer - Mobile)

- **4.6.1. View:** Persistent drawer or bottom tab.
- **4.6.2. API Key Input:** Stored in LocalStorage.
- **4.6.3. Total Token Count:** Sum of tokens for current chat.
- **4.6.4. Temperature Slider:** Per-chat.
- **4.6.5. System Prompt:** Per-chat.
- **4.6.6. Free Models Toggle:**
  - Filters model list to free models.
  - Persisted in LocalStorage.
- **4.6.7. Mini Chat Model Selector:**
  - **Dedicated dropdown for selecting Mini Chat model,** stored separately, persisted in LocalStorage.
  - Allows quick context chats with different model from main chat.

#### 4.7. Model Information View (Alert Dialog)

- Triggered via info button.
- Displays:
  - Model name (🎁 if free).
  - Model ID with copy button.
  - Metadata: creation date, context length.
  - Pricing: input/output token costs.
  - Description text.

#### 4.8. Usage Info Dialog (New)

- **Triggered via Usage Info button in AppBar or Mobile Drawer.**
- **Displays real-time resource metrics:**
  - Current Chat ID.
  - Tokens sent and received.
  - Context window usage (current/max) with progress bar.
  - Estimated API cost.
  - Current chat size.
  - Total IndexedDB size.
  - Browser quota.
- **Accessible on both desktop and mobile (via dedicated drawer tab).**

#### 4.9. Mini Chat (New)

- **Lightweight, contextual chat interface embedded within the main UI.**
- **Accessible via contextual buttons (e.g., explain selection).**
- **Features:**
  - Minimal toolbar and dialog.
  - Dedicated Effector state model.
  - Sends quick prompts without affecting main chat history.
  - **Dedicated model selector independent of main chat.**
  - Option to **expand Mini Chat into a full persistent chat session** saved in IndexedDB.
  - Preserves input if expanded.
  - Handles "Explain" flow immediately if already open.
- **Improves workflow by enabling quick, contextual queries without cluttering main chat.**

---

### 5. Non-Functional Requirements

- **Technology Stack:** TypeScript, React, Next.js, MUI v5+, Effector, `idb`, OpenRouter API, `react-markdown`, `remark-gfm`, `react-syntax-highlighter`, `remark-math`, `rehype-katex`, `katex`, `@lightenna/react-mermaid-diagram`.
- **Architecture:** Static Web Application, client-side only, feature-based modular.
- **Data Persistence:** IndexedDB (chats), LocalStorage (settings, API key, free toggle, mini chat model, drawer states).
- **Responsiveness:** Desktop drawers persistent; mobile drawers as tabs. Smooth transitions.
- **Performance:** Responsive UI, smooth scrolling, efficient state updates, clear loading indicators, optimized markdown rendering.
- **Usability & Error Handling:** Intuitive icons with tooltips, clear feedback, accessible actions, user-facing errors via MUI Alerts.
- **Resource Visibility:** Real-time usage info to aid user awareness of tokens, costs, storage.

---

### 6. Design and UI/UX

- Material Design principles via MUI.
- Prioritize understandable icon buttons.
- Clear distinction between user and model messages.
- Clear interactive states (hover, selected, editing).
- Smooth transitions and loading indicators.
- Rich content rendering clean and non-disruptive.
- **Mini Chat UI integrated seamlessly.**
- **Usage Info presented clearly and accessibly.**

---

### 7. Out of Scope

- Server-side logic/hosting.
- User authentication beyond local storage.
- The LLM models themselves.
- Advanced file management.
- Real-time collaboration.
- Backend storage/security.
- Client-side token estimation libraries.
- Proactive management of IndexedDB storage limits.

---
