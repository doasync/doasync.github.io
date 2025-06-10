# Feature Requirements Document (FRD): Inline Draggable Mini Chat Assistant

**Version:** 1.1
**Date:** 2025-06-08
**Author:** Roo (AI Assistant)
**Status:** Revised to reflect streaming integration and current implementation details.

---

## 1. Overview

**Purpose:** The Inline Draggable Mini Chat Assistant is a lightweight, contextual chat interface embedded within the main UI. It empowers users to rapidly highlight text within chat messages and invoke an ephemeral AI conversation for quick assistance, explanations, or rephrasing without disrupting their primary reading flow. This feature leverages the `chat-stream` module for real-time, streaming responses from the selected Language Model.

Facilitate micro-dialogues _without leaving_ the reading domain, fostering multi-turn assistant reply cycles split away from the main chat, improving knowledge flow, accessibility, hypothesis clarification, or obtaining instant rephrases/explanations with minimal UI disruption. The mini chat maintains its own conversation history in memory and can be expanded into a full, persistent chat session.

---

## 2. Scope — Behavioral Paradigm Fit

- **Only one mini chat can be active at a time.**

- When a mini chat is _active_ (i.e., open and not minimized):

  - Any new selection of text in main chat messages SHALL re-show the contextual toolbar near the selection.
  - Clicking the **"Ask"** button on the toolbar:
    - If the mini chat was minimized, it SHALL be restored first.
    - The selected text SHALL be pasted into the open mini chat input field (prefixed with `> ` and a newline). This action **does not automatically send** the message, allowing the user to edit it before manual submission.
  - Clicking the **"Explain"** button on the toolbar:
    - If the mini chat was minimized, it SHALL be restored first.
    - A predefined prompt (`"Please explain this to me: "`) concatenated with the selected text SHALL be **sent instantly** to the assistant. The toolbar will then close.
  - These actions augment the existing mini chat session without resetting the current conversation.

- If no mini chat is open (or if it was previously closed):

  - Selecting text in main chat messages SHALL show the contextual toolbar.
  - Clicking **"Ask"**: Opens the mini chat dialog, positioned near the selection, with the selected text quoted into the input field. The dialog starts in a compact input-only mode.
  - Clicking **"Explain"**: Opens the mini chat dialog, positioned near the selection, and immediately sends the explanation prompt with the selected text.

- The mini chat can be **minimized** to a Floating Action Button (FAB) to reduce clutter and **restored** to its previous state. It also auto-minimizes under certain conditions (e.g., mobile drawer opening).

- This supports focused, persistent micro-exchanges, contextually upgraded quickly.

---

## 3. User Stories

- **As a chat user**, I want to highlight text inside messages so that I can invoke quick assistant actions ("Ask", "Explain") via a floating toolbar without leaving my reading flow.
- **As a user**, I want the mini chat to accept new snippets during an ongoing session, either as editable input (_Ask_) or instant explanation requests (_Explain_), even if the mini chat was minimized.
- **As a user**, I want only one mini chat open at a time to avoid confusion or UI clutter.
- **As a user**, I want to see responses stream in real-time within the mini chat for a more interactive experience.
- **As a user**, I want to be able to stop an ongoing message generation in the mini chat if it's taking too long or I change my mind.
- **As a user**, I want to be able to minimize the mini chat dialog to a less obtrusive FAB and restore it easily.
- **As a user**, I want the option to expand an ephemeral mini chat conversation into a full, persistent chat session in my history.
- **As a user**, if I expand the mini chat, I want any unsent text in its input field to be transferred to the main chat input.

---

## 4. Functional Specifications

### 4.1 Context-Based Text Selection & Toolbar Activation

- **Trigger:** Selecting text within elements having the `class="chat-message"` in the main chat interface.
- **Mechanism:** The `useTextSelection.ts` hook listens for `selectionchange` DOM events.
  - It employs a debounce mechanism (approx. 400ms) to avoid premature toolbar display during rapid selection adjustments.
  - It captures pointer coordinates (`mousedown`, `mousemove`, `mouseup`, `touchstart`, `touchmove`, `touchend`) to position the toolbar accurately near the end of the selection.
- **Toolbar Display:**
  - A small, floating toolbar appears near the user's selection point.
  - The toolbar contains an **"Ask"** button (label changes to "Quote" if mini chat is already open) and an **"Explain"** button (conditionally rendered if mini chat input is empty).
  - `showMiniChatToolbar` event is triggered with coordinates and selected text.
  - Toolbar is hidden via `hideMiniChatToolbar` on scroll or after an action.

### 4.2 "Ask" Flow (Toolbar Button)

1.  User selects text in a main chat message. Toolbar appears.
2.  User clicks **"Ask"** (or **"Quote"** if mini chat is open).
3.  **If mini chat is minimized:**
    - It is restored via `restoreMiniChat` event.
4.  **If mini chat is already open (and not minimized):**
    - The selected text is appended to the existing content of the mini chat's input field, prefixed with `> ` and a newline (e.g., `miniChat.input + "\n> " + selectionText`).
    - This is handled by `updateMiniChatInput`. The message is **not** sent automatically.
5.  **If mini chat is not open:**
    - The `miniChatOpened` event is triggered.
    - The mini chat dialog appears, positioned near the selection (using `initialX`, `initialY` from toolbar).
    - It starts in a "compact" state (`startCompact: true`), initially showing only the input area.
    - The selected text is placed into the input field, prefixed with `> ` and a newline.
6.  The selection in the main window is cleared.
7.  The toolbar is hidden (`hideMiniChatToolbar`).

### 4.3 "Explain" Flow (Toolbar Button)

1.  User selects text in a main chat message. Toolbar appears.
2.  User clicks **"Explain"**. (Button only visible if mini chat input is empty).
3.  **If mini chat is minimized:**
    - It is restored via `restoreMiniChat` event.
4.  A predefined prompt (e.g., `"Please explain this to me: {selected text}"`) is constructed.
5.  **If mini chat is already open (and not minimized):**
    - The constructed prompt is sent immediately using `sendMiniChatMessage`.
6.  **If mini chat is not open:**
    - The `miniChatOpened` event is triggered (with empty `initialInput`).
    - The mini chat dialog appears.
    - The constructed prompt is then sent immediately using `sendMiniChatMessage`.
7.  The selection in the main window is cleared.
8.  The toolbar is hidden (`hideMiniChatToolbar`).

### 4.4 Mini Chat Panel (Dialog)

- **Appearance:** A draggable floating dialog (`react-draggable`) styled with MUI `Paper`.
  - Positioned near selection initially if opened via toolbar, otherwise defaults (e.g., bottom-right).
  - Max width ~300px, max height ~40vh.
  - `zIndex` ensures it's above other UI elements.
- **States:**
  - `isOpen`: Boolean, controls overall visibility.
  - `isCompact`: Boolean, if true, message area is hidden (e.g., on initial "Ask"). Becomes `false` when a message is sent.
  - `isMinimized`: Boolean, if true, dialog is hidden, and `MiniChatFAB` may appear.
  - `loading`: Boolean, indicates an active stream request.
- **Header:**
  - Contains title "Mini chat".
  - Drag handle (`.drag-handle`) covers the title area.
  - Contains `IconButton`s for:
    - **Expand** (`OpenInFullIcon`): Visible when not `isCompact`. Triggers `expandMiniChat`.
    - **Minimize** (`RemoveIcon`): Triggers `minimizeMiniChat`.
    - **Close** (`CloseIcon`): Triggers `miniChatClosed`.
- **Message Display Area:**
  - Visible when `!isCompact`.
  - Scrollable area displaying conversation messages (`$miniChat.messages`).
  - Each message (`MiniChatMessage`) is rendered in an MUI `Paper` component.
    - User messages styled differently from assistant messages (e.g., `primary.dark` vs `secondary.dark`).
    - Content rendered via `Typography` with `whiteSpace: "pre-wrap"`.
    - Assistant messages can have `isLoading: true` during streaming.
  - Auto-scrolls to the bottom on new messages or when `triggerMiniChatScroll` event occurs.
- **Input Area:**
  - MUI `TextField`, multiline, placeholder "Type a message...".
  - Value bound to `$miniChat.input`, updated by `updateMiniChatInput`.
  - **Send Button:**
    - `SendIcon` enabled when input is not empty and not `loading`.
    - Triggers `sendMiniChatMessage` with current input.
  - **Stop Button (during streaming):**
    - `StopIcon` appears when `loading` is true.
    - Triggers `stopMiniChatGenerationClicked`.
- **Conversation Lifecycle:**
  - Messages are stored in-memory (`$miniChat.messages`).
  - Conversation is discarded when the dialog is closed (`miniChatClosed` event, which resets state), unless expanded.

#### 4.4.1 Streaming Responses & Cancellation

- **Integration with `chat-stream`:**
  - When `sendMiniChatMessage` is triggered:
    1.  A `userMessage` is created.
    2.  A `placeholderMessage` (for the assistant's response) with a unique `id` and `isLoading: true` is created.
    3.  The `_addMiniChatUserMessage` event adds the user's message to `$miniChat.messages` and clears the input.
    4.  The `_addPlaceholderMessage` event adds the empty, loading assistant message to `$miniChat.messages`.
    5.  A unique `streamId` is generated.
    6.  `miniChatStreamRequestInitiated` event is fired with the `streamId` (updates `$miniChatActiveStreamId` and sets `$miniChat.loading = true`).
    7.  `streamChatFx` (from `chat-stream`) is called with:
        - `streamId`, `model` (from `$miniChatModelId`), `messages` (history + new user message), `apiKey`.
        - Callbacks: `onChunk`, `onComplete`, `onError`, `onAbort`.
- **`onChunk` Callback:**
  - Receives `StreamChunkPayload`.
  - Extracts `delta.content`.
  - Triggers `_miniChatMessageChunkReceived` with `placeholderId` and `chunkContent`.
  - `$miniChat` store appends `chunkContent` to the target assistant message and keeps `isLoading: true`.
- **`onComplete` Callback:**
  - Triggers `_miniChatMessageCompleted` with `placeholderId`.
  - `$miniChat` store sets `isLoading: false` for the target message and `$miniChat.loading = false`.
  - Triggers scroll.
- **`onError` Callback:**
  - Triggers `_miniChatMessageErrored` with `placeholderId` and `error`.
  - `$miniChat` store sets `isLoading: false`, updates message content with error, and sets `$miniChat.loading = false`.
- **`onAbort` Callback:**
  - Triggers `_miniChatMessageAborted` with `placeholderId`.
  - `$miniChat` store sets `isLoading: false` for the target message and `$miniChat.loading = false`.
- **Loading Indicator:**
  - A `LinearProgress` bar is displayed at the bottom of the dialog when `$miniChat.loading` is true.
- **Cancellation:**
  - Clicking the `StopIcon` (visible when `loading` is true) triggers `stopMiniChatGenerationClicked`.
  - This event, via `$miniChatActiveStreamId`, triggers `abortStream` (from `chat-stream`) with the active `streamId`, canceling the underlying `fetch` request.

### 4.5 Expand to Full Chat

- **Trigger:** Clicking the "Expand" icon (`OpenInFullIcon`) in the mini chat dialog header. This triggers the `expandMiniChat` event, which in turn calls `expandMiniChatFx`.
- **Functionality (`expandMiniChatFx`):**
  1.  Retrieves the current mini chat state (messages, model ID).
  2.  If no messages exist, the expansion is aborted.
  3.  A new, unique chat session ID (`crypto.randomUUID()`) is generated.
  4.  A new chat session object is constructed, conforming to the main chat session structure:
      - `id`, `createdAt`, `lastModified`.
      - `title` is initially empty.
      - `messages`: Mini chat messages are mapped to the main chat message format (each gets a new `id`, `timestamp`).
      - `settings`:
        - `model`: Uses the selected `$miniChatModelId` and its details (pricing, context length) fetched from `$availableModels`.
        - `temperature`: Uses the global `$temperature` from `chat-settings`.
        - `systemPrompt`: Uses the global `$systemPrompt` from `chat-settings`.
      - `totalTokens`: Initialized to 0.
      - `draft`: **The current unsent text from the mini chat's input field (`$miniChat.input`) is transferred here.** (User Clarification & PRD.md:163)
  5.  The new chat session is saved to IndexedDB via `saveChatFx` (from `chat-history`).
  6.  The newly created chat is selected in the main UI via `chatSelected(id)`.
  7.  The mobile drawer, if open, is switched to the "history" tab and then closed (`setMobileDrawerTab`, `closeMobileDrawer`).
  8.  The mini chat state is reset (`resetMiniChat`).
  9.  The mini chat toolbar is hidden (`hideMiniChatToolbar`).

### 4.6 Closure & Lifecycle

- **Closing:** Clicking the "Close" icon in the dialog header triggers `miniChatClosed`.
  - This event resets the `$miniChat` store to its initial state (dialog closed, input cleared, messages cleared, loading false, not minimized).
  - All ephemeral conversation data is discarded permanently.
- **Resetting:** The `resetMiniChat` event fully resets the mini chat state.
- **New Session Post-Closure:** After closure, new text selections in the main chat can initiate a fresh mini chat flow.

#### 4.6.1 Minimization, Restoration, and Auto-Minimize

- **Minimization:**
  - Triggered manually by clicking the "Minimize" icon (`RemoveIcon`) in the dialog header, which calls `minimizeMiniChat`.
  - Sets `$miniChat.isMinimized = true`. The dialog becomes hidden (`visibility: hidden`).
- **Restoration:**
  - If the mini chat is minimized (`$miniChat.isMinimized === true` and `$miniChat.isOpen === true`), the `MiniChatFAB.tsx` component (a Floating Action Button with `ChatBubbleOutlineIcon`) becomes visible.
  - Clicking this FAB triggers `restoreMiniChat`.
  - Sets `$miniChat.isMinimized = false`, making the dialog visible again.
  - Also triggered automatically by "Ask" or "Explain" flows if the mini chat was minimized.
- **Auto-Minimization Logic:**
  - The mini chat dialog will automatically minimize under certain conditions to prevent UI overlap or distraction if it's open and not already minimized (`$shouldMinimize` logic):
    - When the mobile drawer is opened (`$isMobileDrawerOpen` becomes true).
    - When the main model selector becomes active (`$isModelSelectorActive` becomes true).
    - When the main chat input area becomes focused (`$isMainInputFocused` becomes true).
  - These conditions trigger the `minimizeMiniChat` event.

---

## 5. Non-Functional Specifications

- **Technology Stack:** Built with React, TypeScript, and Effector for state management, within the `/src/features/mini-chat/` directory.
  - UI components are built using Material UI (MUI), including `Paper`, `TextField`, `IconButton`, `LinearProgress`, etc.
  - Drag functionality provided by `react-draggable`.
- **Streaming Backend:** Utilizes the `chat-stream` feature (`src/features/chat-stream/`) for handling Server-Sent Events (SSE) from the API provider.
  - `mini-chat/model.ts` acts as a consumer of `chat-stream`'s `streamChatFx` effect and `abortStream` event.
  - Relies on `eventsource-parser` (via `chat-stream`) for parsing SSE streams.
  - Refer to [`src/features/chat-stream/FRD.md`](../chat-stream/FRD.md:1) for detailed specifications of the streaming mechanism.
- **State Management:**
  - All mini chat state (dialog visibility, input, messages, loading status, minimized status, toolbar state, selected model ID) is managed by Effector stores and events defined in `src/features/mini-chat/model.ts`.
  - Mini chat model ID (`$miniChatModelId`) is persisted in `localStorage`.
- **UI/UX:**
  - Implements a lightweight, responsive, draggable overlay dialog.
  - Designed to be non-blocking for the main chat experience.
  - Clear visual distinction between user and assistant messages.
  - Clear loading indicators (linear progress bar, Stop icon).
- **Responsiveness:** The mini chat interface should be responsive and usable on various screen sizes, although its primary interaction point (text selection toolbar) is more natural on desktop. Auto-minimization helps manage its presence on smaller screens or conflicting UI states.
- **Error Handling:**
  - API errors during streaming are caught by `chat-stream` and relayed via the `onError` callback, updating the relevant message in the mini chat with an error message.
  - Failures in `expandMiniChatFx` (e.g., IndexedDB save failure) should be handled gracefully, though current implementation might not explicitly show UI errors for this.

---

## 6. Acceptance Criteria

| No.  | Criteria                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A1   | Selecting chat text within a `.chat-message` element shows a toolbar with "Ask" and "Explain" buttons (Explain conditional on empty input). |
| A2   | Clicking "Ask" with no mini chat open reveals the compact input dialog; submitting or further interaction expands it to show messages.      |
| A3   | Clicking "Explain" with no mini chat open opens the mini chat dialog and immediately sends the explanation prompt.                          |
| A4   | If mini chat is open (and not minimized):                                                                                                   |
| A4.1 | Clicking "Ask" (or "Quote") pastes selection into input without sending.                                                                    |
| A4.2 | Clicking "Explain" pastes the explanation prompt + selection and immediately sends it.                                                      |
| A5   | Mini chat dialog is draggable, has a minimal UI, and overlays the main chat UI.                                                             |
| A6   | Expanding mini chat saves the conversation (including messages and settings) as a new full chat session in IndexedDB.                       |
| A6.1 | Unsent text in the mini chat input field is transferred to the new full chat session's draft input upon expansion.                          |
| A7   | Closing the mini chat dialog discards its ephemeral data; no persistence unless expanded.                                                   |
| A8   | A `LinearProgress` indicator is visible at the bottom of the dialog during message streaming.                                               |
| A9   | A "Stop" button (`StopIcon`) is visible in the input area during streaming.                                                                 |
| A10  | Clicking the "Stop" button successfully aborts the ongoing stream and updates UI accordingly.                                               |
| A11  | The mini chat dialog can be minimized by clicking the minimize icon.                                                                        |
| A12  | When minimized, a FAB appears, allowing the user to restore the mini chat to its previous state.                                            |
| A13  | The mini chat auto-minimizes when the mobile drawer is opened, main model selector is active, or main input is focused.                     |
| A14  | If "Ask" or "Explain" is used while mini chat is minimized, it first restores the mini chat.                                                |

---

## 7. Constraints & Risks

- Only one ephemeral mini chat instance is allowed at a time.
- The toolbar activation relies on text selection within designated `.chat-message` elements.
- Must avoid interfering with other UI elements, main chat input, or scrolling.
- API key (`$apiKey`) must be present and valid for streaming to function.
- API latency or failures from the API provider must be handled gracefully by the `chat-stream` layer and reflected in the mini chat UI (e.g., error message, loading state reset).
- Dragging functionality must not interfere with main chat scrolling or text selection.
- The `chat-stream` module is stateless regarding chat content. The `mini-chat` module is responsible for:
  - Generating unique `streamId`s for each request to `chat-stream`.
  - Managing its own message state (including placeholders and `targetMessageId`s for streaming updates).
  - Updating its UI based on the callbacks (`onChunk`, `onComplete`, `onError`, `onAbort`) provided by `chat-stream`.
- Responsiveness needs to be maintained, especially considering the draggable and floating nature of the dialog.

---

## 8. Success Metrics / Definition of Done

- Toolbar appears reliably within ~500ms of text selection completion (accounting for debounce).
- No duplicate or conflicting ephemeral mini chat states occur.
- Expanded chats are reliably saved with correct content and settings; ephemeral sessions are discarded cleanly on close.
- Streaming responses are displayed smoothly, and cancellation is responsive.
- Minimize/restore functionality is intuitive and reliable.
- User feedback confirms the mini chat improves understanding or speeds up contextual query workflows.
- Developers can onboard to this feature and understand its integration with `chat-stream` using this FRD and the `chat-stream` FRD.

---

## 9. Out of Scope (Current Version)

- Multiple simultaneous mini chats.
- Toolbar activation on non-chat UI elements (e.g., settings panel text).
- File attachments or rich input (e.g., images, complex markdown) within the mini chat.
- Saving ephemeral mini chats without explicit expansion by the user.
- Persistence of mini chat message history or input draft if the browser is closed/reloaded before explicit expansion or closure.
- Advanced message editing or interaction features (e.g., copy, delete) within the mini chat dialog itself (these are for the main chat).

---

## 10. Mini Chat Core Flow Diagram

```mermaid
graph TD
    subgraph User Interaction
        A[User Selects Text in .chat-message] --> B{Is Selection Valid?}
        B -- No --> End[Hide Toolbar / No Action]
        B -- Yes --> C[useTextSelection.ts: Detects & Debounces]
    end

    subgraph Mini Chat Toolbar Logic
        C --> D[showMiniChatToolbar Event (coordinates, text)]
        D --> E[MiniChatToolbar.tsx Renders]
        E -- Click "Ask/Quote" --> F{Mini Chat Minimized?}
        F -- Yes --> G[restoreMiniChat Event] --> H{Mini Chat Open?}
        F -- No --> H
        H -- Yes --> I[updateMiniChatInput (Quote Selection)]
        H -- No --> J[miniChatOpened (Initial Input, Position, Compact)]
        I --> K[Hide Toolbar, Clear Selection]
        J --> K

        E -- Click "Explain" --> L{Mini Chat Minimized?}
        L -- Yes --> G[restoreMiniChat Event] --> M{Mini Chat Open?}
        L -- No --> M
        M -- Yes --> N[sendMiniChatMessage (Explanation Prompt)]
        M -- No --> O[miniChatOpened (Empty Input)] --> N
        N --> K
    end

    subgraph "Mini Chat State & Streaming (model.ts)"
        P[$miniChat Store: {isOpen, isCompact, input, messages, loading, isMinimized, initialX, initialY}]
        Q[$miniChatToolbar Store: {visible, x, y, selectionText}]
        R[$miniChatActiveStreamId Store: string | null]
        S[$miniChatModelId Store: string]

        miniChatOpened --> P[Update State: open, position, input*, compact*]
        updateMiniChatInput --> P[Update State: input]
        sendMiniChatMessage --> T{API Key Available?}
        T -- No --> EndRequest[No Action or Error]
        T -- Yes --> U[Construct User Message & Placeholder]
        U --> V[_addMiniChatUserMessage Event] --> P[Add User Msg, Clear Input, isCompact=false]
        V --> W[_addPlaceholderMessage Event] --> P[Add Placeholder Msg (isLoading=true)]
        W --> X[Generate streamId]
        X --> Y[miniChatStreamRequestInitiated Event] --> R[Set Active Stream ID]
        Y --> P[Update State: loading=true]
        Y --> Z[streamChatFx (chat-stream) Call w/ Callbacks]

        subgraph "chat-stream Interaction"
            Z -- Receives Chunk --> onChunk_Callback
            onChunk_Callback --> AA[_miniChatMessageChunkReceived Event] --> P[Append Content to Placeholder Msg]
            Z -- Stream Ends --> onComplete_Callback
            onComplete_Callback --> AB[_miniChatMessageCompleted Event] --> P[isLoading=false, loading=false for msg & chat]
            Z -- Stream Error --> onError_Callback
            onError_Callback --> AC[_miniChatMessageErrored Event] --> P[Set Error Msg, isLoading=false, loading=false]
            Z -- Stream Aborted --> onAbort_Callback
            onAbort_Callback --> AD[_miniChatMessageAborted Event] --> P[isLoading=false, loading=false]
        end

        stopMiniChatGenerationClicked -- Uses $miniChatActiveStreamId --> AE[abortStream (chat-stream) Event] --> Z[Cancel Fetch]

        minimizeMiniChat --> P[Update State: isMinimized=true]
        restoreMiniChat --> P[Update State: isMinimized=false]
        miniChatClosed --> P[Reset All State]
    end

    subgraph Mini Chat UI Components
        P -- Consumed By --> Dialog[MiniChatDialog.tsx]
        Dialog -- Displays --> Header[Title, Expand*, Minimize, Close Icons]
        Dialog -- Displays --> MessagesArea[Messages (Scrollable, User/Assistant Styled)]
        Dialog -- Displays --> InputArea[TextField, Send/Stop Icon, LinearProgress (if loading)]
        P -- isOpen & isMinimized --> FAB[MiniChatFAB.tsx: Shows Restore Button]
        Q -- Consumed By --> ToolbarDisplay[MiniChatToolbar.tsx: Renders Ask/Explain Buttons]
        S -- Consumed By --> ModelSel[MiniChatModelSelector.tsx (in Chat Settings Panel)]
    end

    subgraph Expansion Logic
        expandMiniChat --> AF[expandMiniChatFx Effect]
        AF -- Reads $miniChat, $miniChatModelId etc. --> AG[Construct New Full Chat Session]
        AG -- Sets draft from miniChat.input --> AG
        AG --> AH[saveChatFx (chat-history)]
        AH --> AI[chatSelected (chat-history)]
        AI --> AJ[UI Updates: Drawer, etc.]
        AJ --> AK[resetMiniChat Event] --> P
        AK --> AL[hideMiniChatToolbar Event] --> Q
    end
```
