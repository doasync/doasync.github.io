# Feature Requirements Document (FRD): Main Chat Interface

**Version:** 1.0
**Date:** 2025-06-08
**Author:** Roo (AI Assistant)
**Status:** Initial Draft

---

## 1. Overview

The Main Chat Interface is the central feature of this application, providing users with the primary means to interact with various Large Language Models (LLMs) facilitated through the OpenRouter API. This feature is responsible for managing the current chat session's messages, handling user input, orchestrating message-related actions (sending, editing, deleting, retrying, generating new responses), and displaying the conversation. It deeply integrates with the `chat-stream` feature ([`src/features/chat-stream/FRD.md`](../chat-stream/FRD.md:1)) to deliver real-time, streaming responses from LLMs.

As a client-side only application, the chat feature manages its state locally using Effector. It collaborates with other features such as `chat-settings` ([`src/features/chat-settings/model.ts`](../chat-settings/model.ts:1)) for API key and model parameters, `models-select` ([`src/features/models-select/model.ts`](../models-select/model.ts:1)) for LLM selection, and `chat-history` ([`src/features/chat-history/model.ts`](../chat-history/model.ts:1)) for persistence of conversations and message drafts. The overall vision is guided by the Product Requirements Document ([`PRD.md`](../../PRD.md:1)).

---

## 2. Goals

Derived from the [`PRD.md`](../../PRD.md:17) (Section 2), the primary goals for the Main Chat Interface are:

- Provide a clean, intuitive, and responsive user interface for chatting with selected LLMs via OpenRouter.
- Enable robust chat message interactions including copy, **editing of both user and model messages** ([`PRD.md`](../../PRD.md:21)), delete, and retry with resubmission capabilities.
- **Render rich content within chat messages**, including Markdown formatting, syntax-highlighted code blocks, LaTeX math equations, and Mermaid diagrams ([`PRD.md`](../../PRD.md:22)).
- **Persist in-progress message drafts** per chat session with debounce, restoring drafts on reload ([`PRD.md`](../../PRD.md:26)), facilitated via `chat-history`.
- Facilitate a seamless user experience across desktop and mobile devices.
- Support dynamic model selection and switching by interfacing with the `models-select` feature.
- Manage core chat settings (temperature, system prompt) for the current session by interfacing with the `chat-settings` feature. API key management is also handled via `chat-settings`.

---

## 3. Non-Goals

The Main Chat Interface feature does NOT directly handle:

- **Direct API Communication:** All direct calls to the OpenRouter API for streaming chat completions are delegated to the `chat-stream` feature.
- **Model List Management:** Fetching, storing, and filtering the list of available LLM models is the responsibility of the `models-select` feature.
- **Chat History Persistence:** Long-term storage, retrieval, and management of multiple chat sessions (including titles, timestamps, deletion, duplication) are handled by the `chat-history` feature.
- **Global Settings Management:** Storage and management of the OpenRouter API key and other global application settings (like the "show free models only" toggle) are handled by the `chat-settings` feature.
- **Rich Content Rendering Implementation:** While the chat feature manages message objects containing potentially rich content, the actual parsing and rendering logic for Markdown, LaTeX, Mermaid diagrams, and syntax-highlighted code blocks is delegated to specific UI components like `MarkdownRenderer.tsx` ([`src/components/MarkdownRenderer.tsx`](../../components/MarkdownRenderer.tsx:1)) and `MessageItem.tsx` ([`src/components/MessageItem.tsx`](../../components/MessageItem.tsx:1)).
- **Client-Side Token Estimation Algorithms:** The `chat` feature provides the message data, but any complex token counting or cost estimation logic is handled by the `usage-info` feature ([`src/features/usage-info/model.ts`](../usage-info/model.ts:1)), as per [`PRD.md`](../../PRD.md:201).
- **Advanced File Management:** Implementation of file attachments beyond basic text and image concepts outlined in the [`PRD.md`](../../PRD.md:24) (e.g., complex upload UI, previews for various file types) is out of scope for this core chat FRD.

---

## 4. User Stories

- As a user, I want to type my message in an input field and send it to the selected LLM so that I can get a response.
- As a user, I want to see the LLM's response appear word-by-word (streaming) in real-time as it is generated, for a more interactive and immediate experience.
- As a user, I want a "Stop" button to be available during LLM response generation so I can cancel it if it's taking too long, irrelevant, or I change my mind.
- As a user, I want to be able to edit the content of my previously sent messages or the assistant's messages to correct errors or refine the conversation context for future interactions.
- As a user, I want to delete any message (mine or the assistant's) from the current conversation if it's irrelevant or erroneous.
- As a user, if an LLM response is unsatisfactory, incomplete, or results in an error, I want to retry generating the response for that specific point in the conversation, and the system should intelligently replace or insert the new response.
- As a user, if I retried a user message and the next message in the conversation was also a user message or if the retried user message was the last one, I want the system to insert a placeholder for the assistant's response, which is then filled by the streaming content ([`PRD.md`](../../PRD.md:83)).
- As a user, I want to be able to click a "Generate" button (or similar mechanism) to prompt the LLM for a new response without typing a new message, especially if the last message in the chat was mine ([`PRD.md`](../../PRD.md:85), [`PRD.md`](../../PRD.md:94)).
- As a user, I expect my current unsent message draft in the input field to be automatically saved (debounced) and restored if I switch to another chat session or reload the application.
- As a user, I want to view richly formatted content within messages, such as code blocks with syntax highlighting, mathematical formulas (LaTeX), and diagrams (Mermaid), rendered correctly and clearly.
- As a user, I expect clear visual indicators for loading states (e.g., when a message is being generated or retried) and for any API errors that might occur.
- As a user, I want the chat window to automatically scroll to show the latest message as new content arrives, but also to pause this auto-scrolling if I am interacting with older messages or editing a message.
- As a user, I want to easily copy the plain text content or the raw Markdown source of any message for use elsewhere.

---

## 5. Functional Specifications

### 5.1 Core Data Structures ([`src/features/chat/types.ts`](./types.ts:1))

- **`Role: "user" | "assistant" | "system"`**: Defines the possible roles for a message sender.
- **`Message` Interface**:
  - `id: string`: Unique identifier for the message (e.g., `crypto.randomUUID()`).
  - `role: Role`: The sender of the message.
  - `content: string | any`: The textual content of the message. The `any` type is a placeholder acknowledging that future iterations might support more complex, non-string content types for rich rendering (e.g. image data for multimodal models). Currently, it's primarily a string containing Markdown.
  - `timestamp: number`: Unix timestamp (milliseconds) of when the message was created or last significantly updated.
  - `isEdited?: boolean`: Optional flag, true if the message content has been edited by the user.
  * `originalContent?: string | any`: Optional, stores the original content if `isEdited` is true.
  - `isLoading?: boolean`: Optional flag, true if this message is an assistant message currently being generated/streamed or awaiting retry.
  - `isRetryOf?: string`: Optional, ID of the message this current message is a retry/regeneration of.
- **`RequestContext` Union Type**:
  - `RequestContextNormal = { type: "normal" }`
  - `RequestContextGenerate = { type: "generate"; placeholderId: string }`
  - `RequestContextRetry = { type: "retry"; originalMessageId: string; originalRole: Role; retryPlaceholderId?: string }`
  - These internal types are used to contextualize stream requests, though the current `model.ts` implementation uses separate `sample` paths rather than explicit branching on these context types for initiating streams. They document the intent behind different stream initiations.
- **`MessageRetryInitiatedPayload = { messageId: string; role: Role }`**: Payload for the internal `messageRetryInitiated` event, used to manage UI spinners.

### 5.2 Core Chat State & Logic ([`src/features/chat/model.ts`](./model.ts:1))

- **Effector Domain:** `chatDomain = createDomain("chat")`.
- **Key Stores:**
  - `$messageText: Store<string>`: Holds the current text content of the main message input field. Serves as the draft.
  - `$messages: Store<Message[]>`: An array of `Message` objects representing the chronological order of the current chat session's conversation.
  - `$isGenerating: Store<boolean>`: A global flag for the chat feature, indicating if an LLM response stream is currently active. Set to `true` on `streamInitiatedWithTarget` and `false` on `chatStreamFinished`.
  - `$apiError: Store<string | null>`: Stores the message of the last encountered API error for display in the UI. Reset on new user actions that initiate an API call.
  - `$activeChatStreamId: Store<string | null>`: Holds the unique `streamId` (generated via `crypto.randomUUID()`) of the currently active streaming request to `chat-stream`. Used for targeted stream cancellation. Reset on stream completion, error, or abort.
  - `$retryingMessageId: Store<string | null>`: Stores the `id` of the message that is currently undergoing a retry operation, used by the UI to display a spinner or other visual feedback on that specific message. Reset on stream completion, error, or abort.
  - `$preventScroll: Store<boolean>`: A flag to temporarily disable automatic scrolling of the chat window to the latest message. Set to `true` during message editing, reset to `false` when a stream finishes.
  * `$scrollTrigger: Store<number>`: Stores a timestamp. Updated by `scrollToLastMessageNeeded` event. UI components subscribe to this to trigger a scroll to the bottom/latest message.
  * `$isMainInputFocused: Store<boolean>`: Tracks whether the main chat input field has focus. This can be used by other features (e.g., Mini Chat auto-minimization).
- **Key Public Events (exposed via [`src/features/chat/index.ts`](./index.ts:1)):**
  - `messageTextChanged: Event<string>`: Fired when the user types in the message input field.
  - `messageSent: Event<void>`: Fired when the user submits their message.
  - `editMessage: Event<{ messageId: string; newContent: string }>`: Fired when the user confirms an edit to an existing message.
  - `deleteMessage: Event<string>`: Fired when the user deletes a message.
  - `messageRetry: Event<Message>`: Fired when the user requests to retry a specific message.
  - `generateResponseClicked: Event<void>`: Fired when the user requests the LLM to generate a response without new user input.
  - `stopGenerationClicked: Event<void>`: Fired when the user clicks the "Stop" button during an active stream.
  - `setPreventScroll: Event<boolean>`: Allows external control over the `$preventScroll` state.
  - `mainInputFocused: Event<boolean>`: Signals focus changes in the main input.
- **Key Internal Orchestration Events (within `chat/model.ts`):**
  - `userMessageCreated: Event<Message>`: Signals a new user message has been formatted and is ready to be added to `$messages`.
  - `streamInitiatedWithTarget: Event<StreamInitiatedWithTargetPayload>`: Central event for initiating any stream request via `chat-stream`. Carries all necessary parameters including the target message ID for updates.
  - `_messageChunkReceived`, `_messageCompleted`, `_messageErrored`, `_messageAborted`: Internal events mirroring `chat-stream` callbacks, scoped to update the chat feature's state.
  - `chatStreamFinished: Event<void>`: Signals the end of any stream lifecycle (complete, error, or abort) for resetting related states.
  - `messageRetryInitiated: Event<MessageRetryInitiatedPayload>`: Internal event for managing retry spinner UI.
  - `scrollToLastMessageNeeded: Event<void>`: Signals the UI to scroll.
  - `normalResponseProcessed: Event<void>`, `assistantResponseCompleted: Event<void>`: Signal `chat-history` to persist the chat.
  - `apiKeyMissing: Event<void>`: Signals that an API key is required.
  - `initialChatSaveNeeded: Event<void>`: Signals `chat-history` to perform the first save of a new chat session.

### 5.3 Message Lifecycle & User Input

- **Input Handling:** User typing in the UI's input field triggers `messageTextChanged`, which updates `$messageText`.
- **Sending Message:**
  1.  User submits the message (e.g., clicks Send button). UI triggers `messageSent`.
  2.  If `$apiKey` is missing, `apiKeyMissing` is triggered, and the flow stops.
  3.  If `$messageText` is not empty, a new `Message` object (role: "user", content from `$messageText`, new `id`, current `timestamp`) is created.
  4.  `userMessageCreated` is triggered with the new user message.
      - `$messages` store is updated to include this new user message.
      - `$messageText` store is cleared.
      - If this is the first message in `$messages` (i.e., `messages.length === 1` after adding), `initialChatSaveNeeded` is triggered.
  5.  The `userMessageCreated` event then triggers the logic to prepare for and initiate a stream request for an assistant's response (see 5.5).
- **Draft Persistence:**
  - The `chat-history` feature is responsible for persisting the content of `$messageText`.
  - `chat-history` subscribes to `$messageText` changes (typically with a debounce mechanism, e.g., ~1 second).
  - On change, `chat-history` saves the current `$messageText` value into the `draft` field of the active chat session object in IndexedDB.
  - When a chat session is loaded (e.g., via `chatSelected` event in `chat-history`), `chat-history` retrieves the `draft` string and uses it to initialize/update the `$messageText` store in the `chat` feature, restoring the user's unsent input.

### 5.4 Message Interactions (Edit, Delete, Copy)

- **Edit Message (`editMessage`):**
  1.  UI (e.g., `MessageItem.tsx`) triggers `editMessage` with `messageId` and `newContent`.
  2.  `$messages` store updates the specified message: `content` is set to `newContent`, `isEdited` becomes `true`, and the original `content` is saved to `originalContent`.
  3.  `$preventScroll` is set to `true` to avoid auto-scroll during editing.
  - Subsequent API calls will use the edited content as part of the history.
- **Delete Message (`deleteMessage`):**
  1.  UI triggers `deleteMessage` with `messageId`.
  2.  `$messages` store filters out the message with the given `messageId`.
  - Subsequent API calls will use the history without the deleted message.
- **Copy Message Content:**
  - This is a UI-level capability handled within `MessageItem.tsx`.
  - Provides options to "Copy Text" (plain text version of `message.content`) and "Copy Markdown" (raw `message.content` string).
  - Uses the browser's Clipboard API (`navigator.clipboard.writeText()`). The `chat` model simply provides the `message.content` data.

### 5.5 Streaming Responses & Cancellation (Integration with `chat-stream`)

The `chat` feature acts as a consumer of the `chat-stream` feature for all LLM interactions.

- **Stream Orchestration Event (`streamInitiatedWithTarget`):**
  - This internal event is the convergence point for initiating any stream request.
  - **Payload (`StreamInitiatedWithTargetPayload`):**
    - `streamId: string`: A unique ID for this specific stream request (e.g., `crypto.randomUUID()`).
    - `targetMessageId: string`: The ID of the message in `$messages` that will receive the streamed content. This can be the ID of a newly created placeholder assistant message or an existing assistant message (e.g., during retry or generate on an existing placeholder).
    - `shouldAddNewMessage: boolean`:
      - If `true`, a new placeholder `Message` (role: "assistant", `id: targetMessageId`, `isLoading: true`, `content: ""`) is added to `$messages` when `streamInitiatedWithTarget` is processed.
      - If `false`, the existing message in `$messages` with `id: targetMessageId` is marked with `isLoading: true` (its content might be cleared or appended to based on `isFirstChunk` in `_messageChunkReceived`).
    - `streamParams: StreamChatParams`: The complete parameter object required by `chat-stream/streamChatFx` (includes `streamId`, `model`, API-formatted `messages` history, `apiKey`, `temperature`, and the four crucial callbacks: `onChunk`, `onComplete`, `onError`, `onAbort`).
- **Triggering `streamInitiatedWithTarget`:**
  - **Normal Send Flow:** Triggered by `userMessageCreated`. `shouldAddNewMessage` is `true`; `targetMessageId` is newly generated. `streamParams.messages` includes the new user message.
  - **Generate Response Flow:** Triggered by `generateResponseClicked`. Logic determines if an existing assistant placeholder can be reused (`shouldAddNewMessage = false`, `targetMessageId` = existing ID) or if a new one is needed (`shouldAddNewMessage = true`, `targetMessageId` = new ID). `streamParams.messages` is constructed accordingly (may exclude the placeholder if reusing).
  - **Retry Message Flow:** Triggered by `messageRetry`. Logic determines if an existing assistant message is being replaced or if a new placeholder is needed after a user message retry. `streamParams.messages` is carefully constructed by `prepareRetryRequestParamsFn`.
- **Processing `streamInitiatedWithTarget`:**
  1.  Updates `$isGenerating` to `true`.
  2.  Updates `$activeChatStreamId` with `payload.streamId`.
  3.  If `payload.shouldAddNewMessage` is true, a new assistant message (ID: `payload.targetMessageId`, `isLoading: true`, empty content) is added to `$messages`.
  4.  If `payload.shouldAddNewMessage` is false, the existing message in `$messages` with ID `payload.targetMessageId` has its `isLoading` property set to `true`.
  5.  `streamChatFx` (from `chat-stream`) is called with `payload.streamParams`.
- **Callback Handling (Internal Events Mapping to `chat-stream` Callbacks):**
  - `onChunk` (defined within `streamParams` for `streamChatFx`) triggers `_messageChunkReceived({ targetMessageId, chunkContent, isFirstChunk })`:
    - The message in `$messages` with `id === targetMessageId` has `chunkContent` appended to its `content`. If `isFirstChunk` is true, `content` is replaced. `isLoading` remains `true`.
  - `onComplete` (defined within `streamParams`) triggers `_messageCompleted({ targetMessageId })`:
    - The message in `$messages` with `id === targetMessageId` has `isLoading` set to `false`.
    - Triggers `chatStreamFinished`.
    - Triggers `normalResponseProcessed` (signals `chat-history` for potential save).
    - Triggers `assistantResponseCompleted` (signals `chat-history` for final save).
    - Triggers `scrollToLastMessageNeeded`.
  - `onError` (defined within `streamParams`) triggers `_messageErrored({ targetMessageId, error })`:
    - The message in `$messages` with `id === targetMessageId` has `isLoading` set to `false` and its `content` updated to display an error (e.g., `"Error: ${error.message}"`).
    - Triggers `chatStreamFinished`.
    - Updates `$apiError` with `error.message`.
  - `onAbort` (defined within `streamParams`) triggers `_messageAborted({ targetMessageId })`:
    - The message in `$messages` with `id === targetMessageId` has `isLoading` set to `false`.
    - Triggers `chatStreamFinished`.
- **`chatStreamFinished: Event<void>`:** This internal event is crucial for resetting states that are active _during_ a stream. It's triggered by `_messageCompleted`, `_messageErrored`, and `_messageAborted`.
  - Resets `$isGenerating` to `false`.
  - Resets `$activeChatStreamId` to `null`.
  - Resets `$retryingMessageId` to `null`.
  - Resets `$preventScroll` to `false`.
- **Stream Cancellation (`stopGenerationClicked: Event<void>`):**
  1.  UI triggers `stopGenerationClicked`.
  2.  This samples `$activeChatStreamId`.
  3.  If an active `streamId` exists, it calls `abortStream({ streamId })` from the `chat-stream` feature.
  4.  `chat-stream` then aborts the underlying `fetch` request, which eventually leads to its `onAbort` callback being invoked, triggering `_messageAborted` in the `chat` feature.

### 5.6 Generate Response Flow (`generateResponseClicked`)

- **Purpose:** Allows the user to request a new assistant response without typing a new user message. Typically used when the main input is empty and the last message was from the user, or to regenerate the last assistant's response if it was incomplete or erroneous (but not a formal "retry" of a specific message).
- **Trigger:** `generateResponseClicked` event.
- **Pre-conditions:** An API key (`$apiKey`) must be present, and `$messages` must not be empty.
- **Logic to Determine `targetMessageId` and `shouldAddNewMessage`:**
  1.  Examine the last message in `$messages`.
  2.  If the last message is an assistant message and `isLoading` is `true` (i.e., it's an existing placeholder from a previously interrupted generation):
      - `targetMessageId` is set to this last message's `id`.
      - `shouldAddNewMessage` is set to `false` (the existing placeholder will be updated).
  3.  Otherwise (last message is a user, or a completed assistant message, or no messages):
      - `targetMessageId` is a newly generated `crypto.randomUUID()`.
      - `shouldAddNewMessage` is set to `true` (a new assistant placeholder will be added).
- **`messagesForApi` Construction:**
  - If `shouldAddNewMessage` is `true`, the `messagesForApi` array includes all current messages from `$messages`.
  - If `shouldAddNewMessage` is `false` (i.e., updating an existing placeholder identified by `targetMessageId`), the `messagesForApi` array includes all messages from `$messages` _except_ the placeholder itself (i.e., `messages.slice(0, targetIndex)` where `targetIndex` is the index of the placeholder). This ensures the API generates a response based on the history _before_ the placeholder.
- **Action:** Triggers `streamInitiatedWithTarget` with the prepared payload.

### 5.7 Retry Logic Flow (`messageRetry`)

- **Purpose:** Allows the user to re-request a response for a specific point in the conversation, either for a user message (to get a new assistant reply) or an assistant message (to regenerate that reply).
- **Trigger:** `messageRetry: Event<Message>` is triggered by the UI (e.g., a retry button on `MessageItem.tsx`), passing the `Message` object to be retried.
- **Pre-conditions:** An API key (`$apiKey`) must be present, and the message must be "retryable" (user or assistant role).
- **Spinner Management (`messageRetryInitiated`):**
  - `messageRetry` triggers `messageRetryInitiated({ messageId, role })`.
  - This event uses `determineRetryingMessageIdFn` (from [`src/features/chat/lib.ts`](./lib.ts:80)) to decide which message ID should be stored in `$retryingMessageId` for displaying a spinner:
    - If retrying an assistant message, `$retryingMessageId` is set to that assistant message's ID.
    - If retrying a user message, `$retryingMessageId` is set to the ID of the _next_ assistant message (if one exists); otherwise, it might be `null` or the ID of the new placeholder that will be created.
- **API History Construction (`prepareRetryRequestParamsFn` from [`src/features/chat/lib.ts`](./lib.ts:25)):**
  - This crucial function takes the current `$messages`, chat settings, and the `messageToRetry`.
  - If retrying a `user` message: `messagesForApi` includes all messages from the beginning up to and _including_ the retried user message.
  - If retrying an `assistant` message: `messagesForApi` includes all messages from the beginning up to (but _excluding_) the retried assistant message.
  - It returns `{ messages: messagesForApi, modelId, apiKey, temperature, systemPrompt }`.
- **Targeting the Response (`targetMessageId`, `shouldAddNewMessage`):**
  1.  **Retrying an Assistant Message:**
      - `targetMessageId` is set to the `id` of the `messageToRetry` (the assistant message itself).
      - `shouldAddNewMessage` is set to `false` (the existing assistant message will be updated).
  2.  **Retrying a User Message:**
      - Find the index of the `messageToRetry` (the user message).
      - Check the message immediately following it (`nextMessage`).
      - If `nextMessage` exists and `nextMessage.role === "assistant"`:
        - `targetMessageId` is set to `nextMessage.id`.
        - `shouldAddNewMessage` is set to `false` (the existing subsequent assistant message will be updated).
      - Else (no subsequent message, or the next message is also a user message):
        - `targetMessageId` is a newly generated `crypto.randomUUID()`.
        - `shouldAddNewMessage` is set to `true` (a new placeholder assistant message will be inserted after the retried user message, as per [`PRD.md`](../../PRD.md:83)).
- **Action:** Triggers `streamInitiatedWithTarget` with the prepared payload.

### 5.8 API Key Missing (`apiKeyMissing`)

- Triggered by `messageSent` or `generateResponseClicked` if `$apiKey.getState()` is null or empty.
- Consumed by UI components (e.g., `ApiKeyMissingDialog.tsx` ([`src/components/ApiKeyMissingDialog.tsx`](../../components/ApiKeyMissingDialog.tsx:1))) to prompt the user for their API key.

### 5.9 Scroll Management

- **`$preventScroll: Store<boolean>`:** When `true`, automatic scrolling to the newest message should be disabled by the UI.
  - Set to `true` by `editMessage`.
  - Reset to `false` by `chatStreamFinished` (i.e., after stream completion, error, or abort), and potentially on `messageRetryInitiated`.
- **`scrollToLastMessageNeeded: Event<void>`:** Explicitly signals the UI to scroll the chat view to the latest message.
  - Triggered by `_messageCompleted` (after a stream successfully finishes).
- **`$scrollTrigger: Store<number>`:** Stores a timestamp. It's updated whenever `scrollToLastMessageNeeded` is triggered. UI components (like the chat display area) subscribe to `$scrollTrigger` and perform the scroll action within a `useEffect` hook that depends on this store's value. This ensures scrolling happens reliably after state updates.

### 5.10 Rich Content Handling

- The `$messages` store holds message content as strings. It is expected that these strings may contain Markdown.
- The actual parsing and rendering of Markdown (Standard and GitHub Flavored), syntax-highlighted code blocks (using `react-syntax-highlighter`), LaTeX math equations (via KaTeX and `remark-math`/`rehype-katex`), and Mermaid diagrams (via `@lightenna/react-mermaid-diagram`) are responsibilities delegated to the `MessageItem.tsx` component, likely through a specialized `MarkdownRenderer.tsx` component.
- The `chat` feature's role is to manage and provide the raw `message.content` string; it does not perform the rendering itself.

---

## 6. Non-Functional Specifications

- **Technology Stack:** TypeScript, React, Effector (with `patronum/debug` for development). UI may use MUI primitives where not fully delegated to dedicated components.
- **Integration:**
  - **Consumer of:** `chat-stream` (for API calls), `chat-settings` (for API key, temperature, system prompt), `models-select` (for `selectedModelId`).
  - **Provider to:** `chat-history` (signals for saving chat, provides `$messageText` for draft persistence), `usage-info` (provides `$messages` for token calculation), UI components (for rendering state).
- **Data Persistence:**
  - Message drafts (`$messageText`) are persisted by `chat-history` to IndexedDB (debounced).
  - Full chat sessions are saved to IndexedDB by `chat-history` upon signals from the `chat` feature (e.g., `normalResponseProcessed`, `assistantResponseCompleted`).
- **Error Handling:** API errors from `chat-stream` are propagated to `$apiError` and can be displayed within the content of the affected message. UI should present these errors clearly.
- **Responsiveness & UI/UX:** Adheres to [`PRD.md`](../../PRD.md:181) guidelines: Material Design, intuitive icons, clear message distinction, interactive states, smooth transitions, loading indicators.
- **Code Quality:** Well-structured, modular, documented, and adheres to project linting/formatting standards.

---

## 7. Acceptance Criteria

- User can successfully type a message, send it, and see the assistant's streaming response.
- The "Stop Generation" button effectively cancels an ongoing stream, and UI updates (loading indicators, button state) correctly.
- Editing a user message updates its content and the `isEdited` flag; subsequent API calls use the edited content.
- Editing an assistant message updates its content and `isEdited` flag; subsequent API calls use this edited context.
- Deleting any message removes it from the UI and from the history used in subsequent API calls.
- **Retry (User Message):**
  - Retrying a user message sends history up to and including that user message.
  - If an assistant message follows, it's replaced by the new streaming response.
  - If no assistant message (or another user message) follows, a new assistant placeholder is inserted and then filled.
- **Retry (Assistant Message):**
  - Retrying an assistant message sends history up to _before_ that assistant message.
  - The new streaming response replaces the original assistant message content.
- The "Generate" button correctly triggers a new assistant response:
  - If the last message was a loading assistant placeholder, it's reused.
  - Otherwise, a new assistant placeholder is added and filled.
- The API key missing dialog appears if an action requiring an API key is attempted without one.
- Chat window automatically scrolls to the latest message unless `$preventScroll` is true.
- `$preventScroll` is correctly managed during message editing.
- Loading indicators (`$isGenerating` for global, `$retryingMessageId` for specific message spinner) are accurate.
- Rich content (Markdown, code blocks with syntax highlighting, LaTeX, Mermaid) is correctly passed to `MessageItem.tsx` / `MarkdownRenderer.tsx` and rendered as per [`PRD.md`](../../PRD.md:22).
- Message input draft is saved to IndexedDB (via `chat-history`) on a debounce and correctly restored when a chat session is loaded.
- User can copy plain text and Markdown source of messages.
- The `$currentChatTokens` store (managed by `usage-info` based on `$messages`) is available for display.

---

## 8. Constraints & Risks

- **Complexity:** The state management for various message generation flows (normal send, retry user, retry assistant, generate) and the precise construction of `messagesForApi` for each case is complex and error-prone if not handled carefully.
- **External Dependencies:** Heavy reliance on `chat-stream` for all API interactions. Any issues in `chat-stream` will directly impact the chat feature. Reliance on the OpenRouter API's availability and performance.
- **State Synchronization:** Ensuring that UI state, Effector store state, and persisted state (via `chat-history`) remain consistent, especially around message edits, deletions, and retries.
- **`Message.content` Type:** The `string | any` type for `Message.content` offers flexibility but lacks strict type safety for future non-string content types (e.g., structured data for tool calls, image URLs). This could lead to runtime errors if not handled carefully by rendering components.
- **Performance:** While Effector is efficient, very long chat histories held in the in-memory `$messages` array could potentially degrade UI performance on less powerful devices if not paired with UI virtualization techniques (which is a UI concern, not model logic).

---

## 9. Success Metrics / Definition of Done

- All Acceptance Criteria (Section 7) are met and validated through testing.
- The chat feature is stable, with no critical bugs related to message history integrity, streaming behavior, retry logic, or content rendering.
- User feedback confirms an intuitive, responsive, and reliable chat experience.
- The code is well-documented, adheres to project coding standards, and is maintainable.
- This FRD document is complete, accurate, and provides sufficient detail for developers to understand the feature's architecture and logic.

---

## 10. Out of Scope (Current Version)

As per [`PRD.md`](../../PRD.md:193) (Section 7) and current implementation focus:

- Server-side logic or hosting.
- Advanced file management or complex file type previews within messages (current scope is text-based rich content).
- User authentication beyond local API key storage.
- Real-time multi-user collaboration features.
- Backend storage or security for chat history (all current persistence is client-side via IndexedDB).
- Sophisticated client-side token estimation algorithms (basic data for this is provided to `usage-info`).

---

## 11. Future Considerations

- **Refined `Message.content` Type:** Transition from `string | any` to a more structured type definition to explicitly support various rich content types (e.g., `{ type: 'markdown', text: '...' }`, `{ type: 'image', url: '...' }`, `{ type: 'tool_call', call_data: {...} }`). This would improve type safety and extensibility.
- **Client-Side File Attachments:** Implement UI and logic for attaching files (text/images as per [`PRD.md`](../../PRD.md:24)) to messages, including handling file data and potentially integrating with multimodal LLMs.
- **Granular Error Handling:** Implement more specific error messages and recovery options for different types of API errors (e.g., rate limits, model-specific errors) beyond the generic error display.
- **UI Performance for Very Long Chats:** Investigate and potentially implement UI virtualization techniques for the message list if performance becomes an issue with extremely long conversations.
- **Proactive Token Management:** Explore client-side warnings or indicators as the context window approaches its limit, based on data from `usage-info`.

---

## 12. Core Flow Diagram (Mermaid)

```mermaid
graph TD
    subgraph User Actions & UI
        A[Type in Input] --> EV_messageTextChanged(messageTextChanged)
        B[Click Send Button] --> EV_messageSent(messageSent)
        C[Click Generate Button] --> EV_generateResponseClicked(generateResponseClicked)
        D[Click Retry on MessageItem] --> EV_messageRetry(messageRetry)
        E[Confirm Edit in MessageItem] --> EV_editMessage(editMessage)
        F[Click Delete on MessageItem] --> EV_deleteMessage(deleteMessage)
        G[Click Stop Generation Button] --> EV_stopGenerationClicked(stopGenerationClicked)
        H[Input Field Focus/Blur] --> EV_mainInputFocused(mainInputFocused)
        I[Copy Text/Markdown in MessageItem]
    end

    subgraph Chat Feature Core Logic (src/features/chat/model.ts)
        direction LR

        EV_messageTextChanged --> S_messageText[($messageText Store)]
        S_messageText -- Debounced by chat-history --> Ext_ChatHistory_DraftSave[chat-history: Save Draft]


        EV_messageSent -- Filter: API Key & Text not empty --> EV_userMessageCreated(userMessageCreated)
        EV_userMessageCreated --> S_messages[($messages Store): Add User Msg]
        EV_userMessageCreated --> S_messageText[Clear Input]
        EV_userMessageCreated -- If first message --> EV_initialChatSaveNeeded(initialChatSaveNeeded)
        EV_userMessageCreated --> FN_prepNormalSend[Prepare Normal Send Payload \n(target: new, shouldAdd: true)]
        FN_prepNormalSend --> EV_streamInitiated(streamInitiatedWithTarget)

        EV_generateResponseClicked -- Filter: API Key & Messages exist --> FN_prepGenerate[Prepare Generate Payload \n(determines target & shouldAdd)]
        FN_prepGenerate --> EV_streamInitiated

        EV_messageRetry -- Filter: API Key & Retryable Msg --> EV_msgRetryInit(messageRetryInitiated)
        EV_messageRetry -- Filter: API Key & Retryable Msg --> FN_prepRetry[lib.ts: prepareRetryRequestParamsFn \n(constructs API history)]
        FN_prepRetry --> FN_determineTargetForRetry[Determine Retry Target & shouldAdd \n(for user/assistant retry cases)]
        FN_determineTargetForRetry --> EV_streamInitiated

        EV_msgRetryInit -- Uses lib.ts:determineRetryingMessageIdFn --> S_retryingMsgId[($retryingMessageId Store)]

        EV_editMessage --> S_messages[Update Edited Msg Content & Flags]
        EV_editMessage --> S_preventScroll[($preventScroll Store): true]
        EV_deleteMessage --> S_messages[Filter Deleted Msg from History]

        EV_streamInitiated ==> PAYLOAD{streamId, targetMsgId, shouldAddNewMsg, streamParams}
        PAYLOAD --> S_isGenerating[($isGenerating Store): true]
        PAYLOAD --> S_activeStreamId[($activeChatStreamId Store): Set ID]
        PAYLOAD -- If shouldAddNewMsg=true --> S_messages[Add New Placeholder Msg (isLoading=true, id=targetMsgId)]
        PAYLOAD -- If shouldAddNewMsg=false --> S_messages[Set Existing Msg isLoading=true @targetMsgId]
        PAYLOAD --> FX_streamChat[chat-stream: streamChatFx Call with streamParams]

        subgraph chat-stream Callbacks
            FX_streamChat -- On Chunk --> EV_chunk(_messageChunkReceived)
            FX_streamChat -- On Complete --> EV_complete(_messageCompleted)
            FX_streamChat -- On Error --> EV_error(_messageErrored)
            FX_streamChat -- On Abort --> EV_abort(_messageAborted)
        end

        EV_chunk --> S_messages[Append Chunk to Target Msg @targetMsgId, content, isLoading=true, isFirstChunk logic]
        EV_complete --> S_messages[Set Target Msg @targetMsgId isLoading=false]
        EV_error --> S_messages[Set Target Msg @targetMsgId isLoading=false, Add Error to content]
        EV_abort --> S_messages[Set Target Msg @targetMsgId isLoading=false]

        EV_complete --> EV_chatStreamFin(chatStreamFinished)
        EV_complete --> EV_normProcessed(normalResponseProcessed)
        EV_complete --> EV_assistCompleted(assistantResponseCompleted)
        EV_complete --> EV_scrollNeeded(scrollToLastMessageNeeded)

        EV_error --> EV_chatStreamFin
        EV_error --> S_apiError[($apiError Store): Set Error Message]
        EV_abort --> EV_chatStreamFin

        EV_chatStreamFin --> S_isGenerating[false]
        EV_chatStreamFin --> S_activeStreamId[Reset to null]
        EV_chatStreamFin --> S_retryingMsgId[Reset to null]
        EV_chatStreamFin --> S_preventScroll[false]

        EV_stopGenerationClicked -- Uses S_activeStreamId --> FX_abortStream[chat-stream: abortStream Call with streamId]
        FX_abortStream -- Triggers --> FX_streamChat[Cancellation of Underlying Fetch]

        EV_mainInputFocused --> S_mainInputFocused[($isMainInputFocused Store)]
        EV_scrollNeeded --> S_scrollTrigger[($scrollTrigger Store): Update Timestamp]

        EV_messageSent -- Filter: No API Key --> EV_apiKeyMissing(apiKeyMissing)
        EV_generateResponseClicked -- Filter: No API Key --> EV_apiKeyMissing
    end

    subgraph External Systems & Features
        FX_streamChat -- Interacts with --> Ext_OpenRouter[OpenRouter API]
        S_messages -- Data for --> Ext_UsageInfo[usage-info Feature: Calculates Tokens/Cost]
        EV_initialChatSaveNeeded --> Ext_ChatHistory[chat-history Feature: Save New Session to IndexedDB]
        EV_normProcessed --> Ext_ChatHistory[Save Updated Session to IndexedDB]
        EV_assistCompleted --> Ext_ChatHistory[Save Updated Session to IndexedDB]
        Ext_ChatHistory_DraftLoad[chat-history: Load Draft on Chat Select from IndexedDB] --> S_messageText
        EV_apiKeyMissing -- Consumed by --> UI_ApiKeyDialog[ApiKeyMissingDialog.tsx]

        FX_streamChat -- Uses Config from --> Ext_Settings[$apiKey, $temperature, $systemPrompt (from chat-settings)]
        FX_streamChat -- Uses ModelID from --> Ext_Models[$selectedModelId (from models-select)]
    end

    subgraph UI Rendering
        S_messageText --> UI_Input[MessageInput.tsx (Displays Draft)]
        S_messages --> UI_MsgList[MessageList / MessageItem.tsx (Displays Messages)]
        UI_MsgList -- Uses --> UI_Markdown[MarkdownRenderer.tsx for Rich Content (MD, Code, LaTeX, Mermaid)]
        S_isGenerating --> UI_LoadIndicator[Global Loading Indicator (e.g., LinearProgress)]
        S_apiError --> UI_ErrorDisplay[Error Alert/Notification]
        S_retryingMsgId --> UI_MsgItemSpinner[Spinner on specific MessageItem during retry]
        S_scrollTrigger --> UI_ChatWindow[Chat Window Scroll Logic (Scrolls on trigger update)]
        S_mainInputFocused -- May affect --> UI_Layout[Overall UI Layout (e.g., for keyboard shortcuts)]
        I --> Browser_Clipboard[Browser Clipboard API (for Copy actions in MessageItem)]
```
