# Feature Requirements Document (FRD): Main Chat Interface

**Version:** 1.0
**Date:** 2025-06-08
**Author:** Roo (AI Assistant)
**Status:** Initial Draft

---

## 1. Overview

The Main Chat Interface is the primary user-facing component of the LLM Chat application, enabling direct interaction with Large Language Models. It provides a comprehensive environment for managing chat conversations, configuring session settings, and displaying rich message content. This feature is deeply integrated with the `chat-stream` module, leveraging its robust Server-Sent Events (SSE) streaming capabilities for real-time, incremental responses from the selected Language Model. It also interacts with other core features such as `chat-history` for persistence, `chat-settings` for configuration, and `models-select` for model management.

---

## 2. Goals

The primary goals for the Main Chat Interface, aligned with the overall product vision outlined in `PRD.md`, are:

- Provide a clean, intuitive, and responsive user interface for chatting with selected LLMs via VoidAI.
- Enable users to manage multiple chat conversations persistently through integration with `chat-history`, including loading and saving.
- Allow users to easily select and switch between different LLM models available through VoidAI, fetched dynamically via `models-select`.
- Offer robust chat message interactions including copy, **editing of both user and model messages**, delete, and retry with intelligent resubmission logic.
- **Render rich content within chat messages**, including Markdown formatting, syntax-highlighted code blocks, LaTeX math equations, and Mermaid diagrams.
- Provide essential configuration options for the current chat session (API key, temperature, system prompt) that are stored locally via `chat-settings`.
- **Persist in-progress message drafts per chat session with debounce, restoring drafts on reload.**
- Ensure a seamless experience across desktop and mobile devices, including consistent behavior with persistent side drawers on desktop and mobile unified drawers.

---

## 3. Non-Goals

This Feature Requirements Document specifically defines the scope of the `chat` feature. The following aspects are explicitly out of scope for this module, as they are handled by other dedicated features or are external dependencies:

- **Direct API Interaction:** The `chat` feature does not directly make HTTP requests to the VoidAI API. All streaming API communication is delegated to the `src/features/chat-stream` module.
- **Model Fetching and Management:** The fetching, filtering, and selection of available LLM models are handled by the `src/features/models-select` feature.
- **Chat History Persistence:** While `chat` provides the in-memory message state, the saving, loading, duplication, and deletion of full chat sessions to/from IndexedDB are managed by the `src/features/chat-history` feature.
- **API Key and Core Settings Storage:** The storage and management of the VoidAI API key, temperature, and system prompt are handled by the `src/features/chat-settings` feature.
- **Detailed UI Rendering of Messages:** While `chat` provides the message data, the complex rendering of rich content (Markdown, code blocks, LaTeX, Mermaid) is handled by separate UI components like `src/components/MessageItem.tsx` and `src/components/MarkdownRenderer.tsx`.
- **Client-side Token Estimation Libraries:** The application does not implement client-side token estimation libraries. Token usage metrics are provided by the `src/features/usage-info` feature, which consumes message data from `$messages`.
- **Advanced File Management:** Beyond the conceptual support for file attachments mentioned in the PRD, this feature does not implement advanced file management capabilities (e.g., uploading, displaying complex media types).
- **Server-side Logic/Hosting:** This is a client-side only web application.
- **User Authentication:** Beyond local storage of the API key, no user authentication or account management is handled.
- **Real-time Collaboration:** The application does not support multi-user, real-time collaboration on chat sessions.

---

## 4. User Stories

These user stories describe the desired interactions and experiences within the Main Chat Interface:

- **As a user**, I want to type messages into an input field and send them to the LLM to initiate a conversation.
- **As a user**, I want to see LLM responses stream in real-time as they are generated, providing an immediate and dynamic interaction experience.
- **As a user**, I want to be able to stop an ongoing LLM generation at any point if it's taking too long, producing irrelevant content, or if I change my mind.
- **As a user**, I want to edit both my own messages and the assistant's messages to correct errors, refine context, or adjust previous turns in the conversation.
- **As a user**, I want to delete individual messages from the conversation history.
- **As a user**, I want to retry a message if the previous response was unsatisfactory, incomplete, or resulted in an error, with the system intelligently replacing or inserting the new response in the correct place.
- **As a user**, I want to generate a new assistant response without sending a new message, especially useful when the input is empty and the last message was a user message (e.g., to continue an interrupted thought).
- **As a user**, I want my message draft to persist in the input field even if I navigate away or reload the page, so I can seamlessly continue typing later.
- **As a user**, I want to see rich content like Markdown-formatted text, syntax-highlighted code blocks, mathematical equations (LaTeX), and diagrams (Mermaid) rendered correctly and legibly within chat messages.
- **As a user**, I want clear visual feedback, such as loading indicators during generation and informative error messages, to understand the system's status.
- **As a user**, I want the chat window to automatically scroll to the latest message as new content arrives, but I also want the ability to temporarily pause auto-scrolling (e.g., while reading or editing older messages).
- **As a user**, I want to easily copy the plain text content of any message for use elsewhere.
- **As a user**, I want to easily copy the raw Markdown content of any message for use elsewhere.

---

## 5. Functional Specifications

This section details the functional aspects and internal mechanisms of the Main Chat Interface.

### 5.1 Types (`src/features/chat/types.ts`)

The following core data structures define the information managed within the chat feature:

- `Role`: A union type representing the sender of a message: `"user" | "assistant" | "system"`.
- `Message` interface: Represents a single chat message.
  - `id: string`: A unique identifier for the message (e.g., `crypto.randomUUID()`).
  - `role: Role`: Specifies whether the message is from the user, assistant, or system.
  - `content: string | any`: The actual text content of the message. The `any` type is currently used to allow for various content types that `MarkdownRenderer` can handle, but is a candidate for future refinement into more specific types (e.g., for images, tool calls).
  - `timestamp: number`: A Unix timestamp (milliseconds) indicating when the message was created.
  - `isEdited?: boolean`: An optional flag indicating if the message has been edited by the user.
  - `originalContent?: string | any`: An optional field storing the content of the message before it was last edited.
  - `isLoading?: boolean`: An optional flag indicating if the message (typically an assistant message) is currently being generated or streamed.
  - `isRetryOf?: string`: An optional field storing the `id` of the message this current message is a retry or regeneration for.
- `RequestContext` types: Internal types used to provide context for stream requests (e.g., `"normal"`, `"generate"`, `"retry"`), though not directly exposed in `StreamChatParams`.
- `MessageRetryInitiatedPayload`: Defines the payload for the internal event that triggers the display of a retry spinner.

### 5.2 Core Chat State Management (`src/features/chat/model.ts`)

The `chat` feature utilizes Effector for reactive state management. All core logic and state transitions are defined within `src/features/chat/model.ts`.

- `chatDomain`: An Effector domain (`createDomain("chat")`) encapsulating all chat-related stores, events, and effects, ensuring modularity and isolation.
- `$messageText`: A `Store<string>` that holds the current text typed by the user in the main chat input field.
- `$messages`: A `Store<Message[]>` that maintains the ordered array of `Message` objects representing the complete conversation history for the currently active chat session.
- `$isGenerating`: A `Store<boolean>` that indicates whether an LLM response is actively being streamed or generated. This store is set to `true` when a `streamInitiatedWithTarget` event occurs and `false` when `chatStreamFinished` is triggered (on stream completion, error, or abort).
- `$apiError`: A `Store<string | null>` that stores any error messages received from the API or during stream processing. This store is reset (`null`) when a new user action (e.g., `messageSent`, `generateResponseClicked`, `messageRetry`) initiates a new request.
- `$currentChatTokens`: A `Store<number>` that holds the estimated token count for the messages in the current chat. This store is updated by the `src/features/usage-info` feature, which consumes message data from `$messages` to perform its calculations.
- `$activeChatStreamId`: A `Store<string | null>` that stores the unique `streamId` of the currently active streaming request. This ID is crucial for targeting the correct stream for cancellation (`abortStream`). It is set on `streamInitiatedWithTarget` and reset on stream completion, error, or abort.
- `$retryingMessageId`: A `Store<string | null>` that holds the `id` of the message (either user or assistant) that is currently being retried. This is used by the UI (e.g., `MessageItem.tsx`) to display a loading spinner specifically on the retried message.
- `$preventScroll`: A `Store<boolean>` that controls the auto-scrolling behavior of the chat window. When `true`, auto-scrolling is paused (e.g., during message editing) to prevent the view from shifting unexpectedly. It is reset to `false` when a stream finishes.
- `$scrollTrigger`: A `Store<number>` that holds a timestamp. This store is updated by the `scrollToLastMessageNeeded` event, signaling UI components to perform a scroll action (e.g., to the bottom of the chat window).
- `$isMainInputFocused`: A `Store<boolean>` that tracks whether the main chat input field currently has focus. This state is consumed by other features (e.g., `mini-chat`) for auto-minimization logic.

### 5.3 Message Input and Sending

This section describes the flow from user input to the initiation of an LLM request.

1.  **Typing Input:** The `messageTextChanged` event (`Event<string>`) is dispatched whenever the user modifies the text in the main chat input field. This event updates the `$messageText` store.
2.  **Sending a Message:** The `messageSent` event (`Event<void>`) is triggered (typically by clicking a "Send" button in the UI).
    - **Validation:** A filter ensures that the `$messageText` is not empty after trimming whitespace.
    - **User Message Creation:** A new `Message` object with `role: "user"`, the trimmed content from `$messageText`, a unique `id` (`crypto.randomUUID()`), and a `timestamp` is created. This message is then added to the `$messages` store via the `userMessageCreated` event.
    - **Input Clearing:** Immediately after `userMessageCreated`, the `$messageText` store is reset to an empty string, clearing the input field.
    - **Initial Chat Save:** If `userMessageCreated` results in `$messages.length === 1` (i.e., it's the very first message in a new chat session), the `initialChatSaveNeeded` event is triggered. This signals the `chat-history` feature to save this newly created chat session to IndexedDB.
    - **Stream Initiation:** The `userMessageCreated` event also serves as a clock for a `sample` that prepares the payload for and triggers the `streamInitiatedWithTarget` event, which is the gateway to starting the LLM streaming process (see Section 5.5).

### 5.4 Message Interactions (Edit, Delete, Copy)

The chat feature supports various interactions with individual messages in the conversation history.

- **Editing Messages:**
  - The `editMessage` event (`Event<{ messageId: string; newContent: string }>`) is dispatched when a user confirms an edit to a message (e.g., via an inline editor in `MessageItem.tsx`).
  - The `$messages` store updates the `content` of the message matching `messageId` with `newContent`.
  - The `isEdited` flag for that message is set to `true`.
  - The `originalContent` field is populated with the message's content _before_ the edit.
  - During editing, the `$preventScroll` store is set to `true` to pause auto-scrolling, ensuring a stable view for the user.
- **Deleting Messages:**
  - The `deleteMessage` event (`Event<string>`) is dispatched with the `id` of the message to be removed.
  - The `$messages` store filters out the specified message, effectively removing it from the conversation history.
- **Copying Message Content:**
  - The UI (`MessageItem.tsx`) provides actions to copy message content.
  - **Copy Text:** Copies the plain text `content` of a message to the clipboard. This typically uses `navigator.clipboard.writeText()`.
  - **Copy Markdown:** Copies the raw Markdown `content` of a message to the clipboard. This also uses `navigator.clipboard.writeText()`.
  - These actions are handled directly in the UI components and do not have corresponding Effector events in `chat/model.ts`.

### 5.5 Streaming Responses & Cancellation

The `chat` feature integrates with `src/features/chat-stream` to handle real-time LLM responses via Server-Sent Events.

1.  **Stream Initiation Orchestration (`streamInitiatedWithTarget`):**

    - This internal event (`Event<StreamInitiatedWithTargetPayload>`) is the central point for initiating any LLM streaming request. It is triggered by three main paths:
      - `userMessageCreated` (for a new user message).
      - `generateResponseClicked` (for generating a response without a new user message).
      - `messageRetry` (for retrying a previous message).
    - The `StreamInitiatedWithTargetPayload` contains crucial information:
      - `streamId: string`: A unique ID generated for this specific stream request (used internally by `chat-stream` for `AbortController` management).
      - `targetMessageId: string`: The ID of the `Message` object in the `$messages` store that will receive the streamed content. This is either a newly generated ID for a new message or an existing ID for an in-place update.
      - `shouldAddNewMessage: boolean`: A flag indicating whether a new assistant `Message` object needs to be added to `$messages` (true) or if an existing one should be updated (false).
      - `streamParams: StreamChatParams`: The actual parameters passed to `chat-stream`'s `streamChatFx` effect, including the model, message history, API key, and various callbacks.
    - When `streamInitiatedWithTarget` is triggered:
      - The `$isGenerating` store is set to `true`.
      - The `$activeChatStreamId` store is set to the `streamId` from the payload.
      - The `$messages` store is updated: either a new assistant placeholder message (`isLoading: true`, empty content) is added, or an existing target message is marked `isLoading: true`.
      - Finally, `streamChatFx` (from `chat-stream`) is called with the `streamParams`.

2.  **`streamChatFx` Callbacks and `$messages` Updates:**

    - The `streamChatFx` effect invokes specific callbacks (`onChunk`, `onComplete`, `onError`, `onAbort`) during the streaming lifecycle. These callbacks, defined within `chat/model.ts`, dispatch internal events that update the `$messages` store.
    - **`onChunk` (`_messageChunkReceived`):**
      - Receives `StreamChunkPayload` containing a `chunk` of content and the `streamId`.
      - Dispatches `_messageChunkReceived` with the `targetMessageId` and `chunkContent`.
      - The `$messages` store appends the `chunkContent` to the `content` of the message identified by `targetMessageId`.
      - The `isLoading` flag for that message remains `true` until the stream finishes.
      - An `isFirstChunk` flag ensures that the first chunk _replaces_ any initial placeholder content, while subsequent chunks _append_.
    - **`onComplete` (`_messageCompleted`):**
      - Invoked when the stream finishes successfully (`[DONE]` signal or natural stream end).
      - Dispatches `_messageCompleted` with the `targetMessageId`.
      - The `$messages` store sets `isLoading: false` for the target message.
      - Triggers `chatStreamFinished` (sets `$isGenerating: false`).
      - Triggers `normalResponseProcessed` and `assistantResponseCompleted` events, signaling `chat-history` to save the completed response and update chat metadata.
      - Triggers `scrollToLastMessageNeeded` to ensure the UI scrolls to the latest message.
    - **`onError` (`_messageErrored`):**
      - Invoked if an error occurs during streaming or parsing.
      - Dispatches `_messageErrored` with `targetMessageId` and the `error` object.
      - The `$messages` store sets `isLoading: false` for the target message and updates its `content` to display an error message (e.g., `"Error: {error.message}"`).
      - Triggers `chatStreamFinished` and updates `$apiError` with the error message.
    - **`onAbort` (`_messageAborted`):**
      - Invoked if the stream is explicitly canceled.
      - Dispatches `_messageAborted` with `targetMessageId`.
      - The `$messages` store sets `isLoading: false` for the target message.
      - Triggers `chatStreamFinished`.

3.  **Loading Indicator:**

    - A visual loading indicator (e.g., a `LinearProgress` bar in the UI) is displayed when the `$isGenerating` store is `true`.

4.  **Cancellation:**
    - The `stopGenerationClicked` event (`Event<void>`) is dispatched when the user clicks a "Stop Generation" button in the UI (e.g., in the message input area).
    - This event samples the `$activeChatStreamId` store. If a stream ID is active, it dispatches an `abortStream` event (from `chat-stream`) with the `streamId`.
    - The `chat-stream` module then handles the abortion of the underlying `fetch` request, leading to the `onAbort` callback being triggered in `chat/model.ts`.

### 5.6 Generate Response Flow

This flow allows the user to re-prompt the LLM without sending a new user message, often used to get an alternative response or continue a previous thought.

1.  **Trigger:** The `generateResponseClicked` event (`Event<void>`) is dispatched (e.g., by a "Generate" button in the UI, or implicitly if the input is empty and Send is pressed after a user message).
2.  **Pre-requisites:** The flow proceeds only if an `apiKey` is present and there are existing messages in `$messages`.
3.  **Determining `targetMessageId` and `shouldAddNewMessage`:**
    - The logic checks the `lastMessage` in the `$messages` store.
    - If the `lastMessage` is an `assistant` message and its `isLoading` flag is currently `true` (indicating it's an existing placeholder from a previous failed or aborted generation), then its `id` is reused as the `targetMessageId`, and `shouldAddNewMessage` is set to `false`. This means the new streamed content will overwrite the existing placeholder.
    - Otherwise (if the last message is not a loading assistant placeholder, or if the chat is empty), a new unique `id` is generated for `targetMessageId`, and `shouldAddNewMessage` is set to `true`. This means a brand new assistant message will be appended to `$messages`.
4.  **`messagesForApi` Construction:**
    - If `shouldAddNewMessage` is `true`, all messages currently in `$messages` are included in the history sent to the API.
    - If `shouldAddNewMessage` is `false` (meaning an existing placeholder is being updated), the history sent to the API is sliced to exclude the `targetMessageId` (i.e., messages up to the index _before_ the placeholder are included). This ensures the API call doesn't include the empty or partial placeholder.
5.  **Stream Initiation:** The prepared payload (containing `streamId`, `targetMessageId`, `shouldAddNewMessage`, and `streamParams`) is passed to the `streamInitiatedWithTarget` event.

### 5.7 Retry Logic Flow

This flow allows users to retry generating a response for a specific message, either their own or the assistant's.

1.  **Trigger:** The `messageRetry` event (`Event<Message>`) is dispatched, typically from `MessageItem.tsx` when a "Retry" action is invoked, passing the `Message` object to be retried.
2.  **Pre-requisites:** An `apiKey` must be present, and the `messageToRetry` must be a "user" or "assistant" role.
3.  **Spinner Display (`messageRetryInitiated`):**
    - The `messageRetry` event triggers `messageRetryInitiated` (`Event<MessageRetryInitiatedPayload>`).
    - This internal event updates the `$retryingMessageId` store.
    - The `determineRetryingMessageIdFn` (from `src/features/chat/lib.ts`) is used to determine which message ID should display the "retrying" spinner:
      - If an `assistant` message is being retried, the spinner is placed directly on that `assistant` message.
      - If a `user` message is being retried, the function looks for the `assistant` message immediately following it. The spinner is placed on this following `assistant` message. If no `assistant` message follows (e.g., the user's last message in the chat), the spinner may not be displayed on any specific message, or it might fall back to a global loading indicator.
4.  **`messagesForApi` Construction (`prepareRetryRequestParamsFn`):**
    - The `prepareRetryRequestParamsFn` (from `src/features/chat/lib.ts`) is crucial for building the correct message history slice (`messagesForApi`) to send to the LLM for the retry.
    - If a `user` message is retried, the history includes all messages up to and _including_ the retried user message.
    - If an `assistant` message is retried, the history includes all messages up to (but _not including_) the retried assistant message. This ensures the API call starts fresh from the preceding user turn.
5.  **Determining `targetMessageId` and `shouldAddNewMessage` for the new response:**
    - If an `assistant` message is being retried, its `id` is reused as `targetMessageId`, and `shouldAddNewMessage` is `false` (the new response will overwrite the old assistant message).
    - If a `user` message is being retried:
      - The logic checks if an `assistant` message immediately follows the user message. If so, that `assistant` message's `id` is reused as `targetMessageId`, and `shouldAddNewMessage` is `false`.
      - Otherwise (no following assistant message, or another user message comes after the retried user message), a new unique `id` is generated for `targetMessageId`, and `shouldAddNewMessage` is `true` (a new assistant message will be inserted).
6.  **Stream Initiation:** The prepared payload (containing `streamId`, `targetMessageId`, `shouldAddNewMessage`, and `streamParams`) is passed to the `streamInitiatedWithTarget` event.

### 5.8 API Key Handling

- The `apiKeyMissing` event (`Event<void>`) is dispatched when the `messageSent` or `generateResponseClicked` events are triggered, but the `$apiKey` store is empty or `null`.
- This event is consumed by UI components (e.g., `src/components/ApiKeyMissingDialog.tsx`) to display a modal dialog prompting the user to enter their VoidAI API key.

### 5.9 Scroll Management

The chat feature manages auto-scrolling to provide a smooth user experience while allowing for manual control.

- `$preventScroll`: A `Store<boolean>` that can be set to `true` (e.g., by the `editMessage` event) to temporarily prevent the chat window from automatically scrolling to the bottom. This is crucial for maintaining the user's view when they are interacting with older messages. It is reset to `false` when `chatStreamFinished` is triggered.
- `scrollToLastMessageNeeded`: An event (`Event<void>`) that is explicitly triggered by the model (e.g., after an assistant response completes, or when a user message is sent). This event signals to UI components that the chat window should scroll to the bottom.
- `$scrollTrigger`: A `Store<number>` that stores a timestamp (`Date.now()`). This store updates its value whenever `scrollToLastMessageNeeded` is triggered. UI components that need to perform a scroll action (e.g., `useEffect` hooks in the main chat display component) can subscribe to changes in this store to react to scroll triggers.

### 5.10 Draft Persistence

The `chat` feature maintains the current message draft, which is then persisted by the `chat-history` feature.

- The `$messageText` store holds the current, unsent text in the main chat input field.
- The `chat-history` feature consumes updates to `$messageText` (likely with a debounce mechanism to reduce write operations) and saves this content into the `draft` field of the currently active chat session object in IndexedDB.
- When a user selects a chat from history (via `chatSelected` event from `chat-history`), the saved `draft` text from that chat session is used to re-initialize the `$messageText` store. This ensures that the user's unsent input is seamlessly restored, allowing them to continue typing from where they left off.

---

## 6. Non-Functional Specifications

- **Technology Stack:** The `chat` feature is built using TypeScript, React, and Effector for state management, residing primarily within the `/src/features/chat/` directory. It relies on Material UI (MUI) for its component library.
- **Streaming Backend:** The core API interaction for streaming responses is handled by the `src/features/chat-stream` module. The `chat/model.ts` acts as a consumer, providing parameters and handling callbacks from `streamChatFx` and `abortStream`.
- **Architecture:** The application is a Static Web Application, entirely client-side, and adheres to a feature-based modular architecture.
- **Data Persistence:** While chat messages are managed in-memory by the `$messages` store, the `chat-history` feature is responsible for persisting complete chat sessions (including messages and the current draft) to IndexedDB.
- **Responsiveness:** The UI is designed to adapt fluidly to various screen sizes and orientations, providing a consistent and usable experience across desktop, tablet, and mobile devices.
- **Performance:** The feature is designed for efficient state updates, smooth scrolling even with long message histories, and optimized rendering of rich content. Loading indicators provide clear visual feedback during asynchronous operations.
- **Rich Content Rendering:** Messages support a wide range of rich content, including standard Markdown, GitHub Flavored Markdown, syntax-highlighted code blocks (using `react-syntax-highlighter`), LaTeX mathematical equations (via KaTeX and `rehype-katex`), and Mermaid diagrams (using `@lightenna/react-mermaid-diagram`). This rendering is handled by the `src/components/MarkdownRenderer.tsx` component, integrated within `src/components/MessageItem.tsx`.
- **UI/UX:** Adheres to Material Design principles. User messages are clearly distinguished from assistant messages (e.g., alignment, background color). Intuitive icons with tooltips are used for message actions (edit, delete, retry, copy). Clear interactive states (hover, selected, editing) are provided.
- **Error Handling:** The feature provides clear user-facing error messages for API failures via the `$apiError` store and by updating the content of affected messages.
- **Reusability/Maintainability:** The codebase maintains a clear separation of concerns, with well-defined interfaces and responsibilities for each feature module (`chat`, `chat-stream`, `chat-history`, `chat-settings`, `models-select`, `ui-state`, `usage-info`). This promotes reusability and ease of maintenance.

---

## 7. Acceptance Criteria

The following criteria define the successful implementation and behavior of the Main Chat Interface:

| No. | Criteria                                                                                                                                                                                                                      |
| :-- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | The user can type text into the main input field, and the `$messageText` store updates accordingly.                                                                                                                           |
| A2  | The user can send a message (e.g., by clicking a "Send" button), clearing the input field upon submission.                                                                                                                    |
| A3  | User messages are added to the `$messages` store with correct `id`, `role: "user"`, `content`, and `timestamp`.                                                                                                               |
| A4  | Assistant responses stream in real-time, with content incrementally appended to the corresponding message in the UI.                                                                                                          |
| A5  | A loading indicator (e.g., `LinearProgress`) is visible at the appropriate location during message generation, disappearing upon completion or error.                                                                         |
| A6  | A "Stop Generation" button (`StopIcon`) is visible in the input area when an LLM response is actively generating.                                                                                                             |
| A7  | Clicking the "Stop Generation" button successfully aborts the ongoing stream, and the UI correctly reflects the cancellation (loading indicator disappears, `StopIcon` reverts to `SendIcon`).                                |
| A8  | The user can edit their own messages; changes are persisted in the `$messages` store, `isEdited` is set to `true`, and `originalContent` is stored.                                                                           |
| A9  | The user can edit assistant messages; changes are persisted in the `$messages` store, `isEdited` is set to `true`, and `originalContent` is stored.                                                                           |
| A10 | Edited messages (both user and assistant) are correctly used in subsequent API calls for context.                                                                                                                             |
| A11 | The user can delete any message from the conversation, and it is removed from the `$messages` store.                                                                                                                          |
| A12 | Clicking the "Retry" button on a user message initiates a new stream request, and the new assistant response correctly replaces any existing assistant message immediately following it, or inserts a new one if none exists. |
| A13 | Clicking the "Retry" button on an assistant message initiates a new stream request, and the new assistant response correctly replaces the existing assistant message.                                                         |
| A14 | A visual spinner is displayed on the target message (retried assistant message or the one following retried user message) during a retry operation.                                                                           |
| A15 | The "Generate" button (or implicit generate via empty input send) correctly triggers a new assistant response.                                                                                                                |
| A16 | If the last message is a loading assistant placeholder (e.g., from a previous failed generation), "Generate" reuses and updates that placeholder.                                                                             |
| A17 | If no loading assistant placeholder exists, "Generate" adds a new assistant message to the conversation.                                                                                                                      |
| A18 | An "API Key Missing" dialog is displayed if a message is sent or generation is attempted without a valid API key.                                                                                                             |
| A19 | The chat window automatically scrolls to the latest message when new content arrives (user messages, assistant chunks, completion).                                                                                           |
| A20 | Auto-scrolling is temporarily paused when the user is actively editing a message (`$preventScroll`).                                                                                                                          |
| A21 | Rich content, including Markdown, code blocks with syntax highlighting, LaTeX equations, and Mermaid diagrams, is rendered correctly within messages.                                                                         |
| A22 | The current input field draft (`$messageText`) is debounced and persisted to IndexedDB by `chat-history` for the active chat session.                                                                                         |
| A23 | The saved draft is correctly restored to the input field (`$messageText`) when a chat session is loaded from history.                                                                                                         |
| A24 | The user can successfully copy the plain text content of any message to their clipboard.                                                                                                                                      |
| A25 | The user can successfully copy the raw Markdown content of any message to their clipboard.                                                                                                                                    |
| A26 | The `$currentChatTokens` store accurately reflects the token count for the messages in the current chat, and this data is accessible for the `Usage Info` feature.                                                            |

---

## 8. Constraints & Risks

- **Strong Dependency on `chat-stream`:** The `chat` feature is entirely dependent on the `src/features/chat-stream` module for all its LLM API communication. Any issues or limitations in `chat-stream` will directly impact the `chat` feature.
- **External API Reliance:** The application relies on the VoidAI API for LLM interactions. Downtime, rate limits, or changes in the VoidAI API can affect functionality.
- **API Key Requirement:** A valid VoidAI API key must be configured by the user for any LLM interaction to function. The application handles the missing key scenario by prompting the user.
- **Complexity of History Management for API Calls:** The logic for building the correct message history slice (`messagesForApi`) for "normal" sends, "generate" requests, and "retry" operations is complex, especially for user vs. assistant retries. Incorrect slicing could lead to incorrect LLM context or unexpected responses.
- **In-Memory Message Store Size:** While `chat-history` handles persistence, the `$messages` store holds the entire current conversation in memory. For extremely long chat sessions, this could potentially lead to performance degradation or increased memory usage on lower-end devices.
- **`content: string | any` Type:** The use of `any` for `Message.content` provides flexibility for rich content rendering but reduces type safety. Future enhancements might require a more structured union type for content.
- **Concurrency:** Only one active stream is supported per chat session. Concurrent requests from the same chat are not explicitly handled (e.g., sending a message while another is still generating).

---

## 9. Success Metrics / Definition of Done

- **Responsiveness:** User messages are sent, and assistant responses begin streaming (first chunk received) within acceptable latency (e.g., less than 1 second on a stable network connection).
- **Reliability:** Zero critical bugs reported related to message history integrity, streaming interruptions, retry logic failures, or content rendering issues.
- **User Satisfaction:** Positive user feedback confirming an intuitive, responsive, and reliable chat experience that effectively supports their LLM interaction needs.
- **Documentation Completeness:** This FRD, along with `PRD.md` and `src/features/chat-stream/FRD.md`, provides sufficient detail for developers to understand, maintain, and extend the `chat` feature.
- **Acceptance Criteria Met:** All criteria listed in Section 7 are successfully demonstrated through testing.

---

## 10. Out of Scope (Current Version)

The following functionalities are not part of the current `chat` feature implementation:

- Server-side logic or hosting of any kind.
- Advanced file management, including direct file uploads, image display, or complex media handling within messages (beyond what `MarkdownRenderer` can intrinsically parse from Markdown links).
- User authentication or account management beyond local storage of the API key.
- Real-time collaboration features for multi-user chat sessions.
- Backend storage or security mechanisms for chat history (handled by client-side IndexedDB and `chat-history`).
- Client-side token estimation libraries (raw token estimation handled by `usage-info` based on data from `chat`).

---

## 11. Future Considerations

Potential enhancements or areas for future development for the `chat` feature include:

- **Refinement of `Message.content` Type:** Evolving the `content: string | any` type to a more structured union type (e.g., `string | ImageContent | ToolCallContent`) to provide stricter type safety and explicit support for various rich content types.
- **Enhanced File Attachment Support:** Implementing comprehensive client-side file attachment support, including visual previews and integration with multimodal LLM capabilities, as per `PRD.md` Section 2.
- **More Granular Error Handling:** Providing more specific error messages and recovery options for different types of API failures (e.g., rate limits, invalid model, network issues).
- **Performance Optimizations for Very Long Histories:** Exploring techniques like virtualized lists for rendering extremely long chat histories or message archiving to manage in-memory `$messages` size, if performance becomes an issue.
- **Pre-processing Input:** Implementing client-side pre-processing of user input for token estimation or content validation before sending to the LLM.
- **User Interruptions:** More sophisticated handling of user interruptions during streaming, allowing for partial responses to be preserved or easily resumed.

---

## 12. Core Flow Diagram

```mermaid
graph TD
    subgraph User Actions (UI)
        A[Type in Input] --> B(messageTextChanged)
        C[Click Send] --> D(messageSent)
        E[Click Generate] --> F(generateResponseClicked)
        G[Click Retry Message Item] --> H(messageRetry)
        I[Click Edit Message Item] --> J(editMessage)
        K[Click Delete Message Item] --> L(deleteMessage)
        M[Click Stop Generation Button] --> N(stopGenerationClicked)
        O[Input Focus/Blur] --> P(mainInputFocused)
        Q[Copy Message Text/Markdown]
    end

    subgraph Chat Feature Core (src/features/chat/model.ts)
        direction LR
        B --> Q1[$messageText Store (Current Draft)]
        D -- Filters empty --> R1[userMessageCreated Event]
        F -- Filters API Key/No Messages --> S1[Prepare Generate Payload]
        H -- Filters API Key/Retryable --> T1[messageRetryInitiated Event]
        H -- Filters API Key/Retryable --> U1[Prepare Retry Payload (via lib.ts)]
        J --> V1[$messages Store (Update Edited Msg)]
        L --> V1[$messages Store (Filter Deleted Msg)]
        Q1 -- Debounced by chat-history --> History[Draft Persistence in IndexedDB]

        R1 --> V1[$messages Store (Add New User Msg)]
        R1 --> W1[initialChatSaveNeeded Event (if first message)]
        R1 --> S2[Prepare Normal Send Payload]
        S2 --> X1(streamInitiatedWithTarget)
        S1 --> X1
        U1 --> X1

        T1 --> Y1[$retryingMessageId Store (for Spinner)]

        X1 --> Z1[$isGenerating Store (true)]
        X1 --> A2[$activeChatStreamId Store (Set ID)]
        X1 --> B2[$messages Store (Add New/Update Placeholder Msg)]
        X1 --> C2[streamChatFx (from @/features/chat-stream)]

        subgraph chat-stream Interaction
            C2 -- On Chunk --> D2(_messageChunkReceived)
            C2 -- On Complete --> E2(_messageCompleted)
            C2 -- On Error --> F2(_messageErrored)
            C2 -- On Abort --> G2(_messageAborted)
        end

        D2 --> B2[Append Chunk Content to Target Message]
        E2 --> B2[Set isLoading=false for Target Message]
        F2 --> B2[Set isLoading=false, Add Error Content to Target Message]
        G2 --> B2[Set isLoading=false for Target Message]

        E2 --> H2(assistantResponseCompleted)
        E2 --> I2(normalResponseProcessed)
        E2 --> J2(scrollToLastMessageNeeded)

        F2 --> K2[$apiError Store (Set Error Message)]

        E2, F2, G2 --> L2(chatStreamFinished Event)
        L2 --> Z1[$isGenerating Store (false)]
        L2 --> A2[Reset $activeChatStreamId]
        L2 --> Y1[Reset $retryingMessageId]
        L2 --> M2[$preventScroll Store (reset)]

        N -- Uses --> A2 --> N2[abortStream (from @/features/chat-stream)]
        N2 -- Triggers --> C2[Cancellation of Stream]

        P --> O2[$isMainInputFocused Store]
    end

    subgraph External Dependencies & Integrations
        C2 -- Uses --> P1[$apiKey, $temperature, $systemPrompt, $selectedModelId (from chat-settings, models-select)]
        H2, I2 -- Trigger --> Q2[chat-history/model.ts (Save Chat Session to IndexedDB)]
        J2 --> R2[$scrollTrigger Store (for UI Scroll)]
        V1 -- Data Source --> S3[Usage Info Feature (Consumes $messages for token count)]
    end

    subgraph UI Rendering & Components
        P1, V1, Z1, K2, Y1, M2, R2, O2, S3 -- Rendered by --> T3[Chat UI Components (e.g., ChatWindow.tsx, MessageItem.tsx, MessageInput.tsx)]
        T3 -- Displays --> U3[Rich Content (MarkdownRenderer.tsx)]
        T3 -- Handles --> Q[Copy Logic (Browser API)]
    end
```
