Okay, the review of the UI components is complete:

- `src/app/page.tsx`: Renders the main chat interface, mapping `$messages` to
  `MessageItem` components. Uses `$isGenerating` for a `LinearProgress`
  indicator.
- `src/components/MessageItem.tsx`: Renders individual messages using
  `MarkdownRenderer` and shows a spinner based on `message.isLoading`.
- `src/features/mini-chat/MiniChatDialog.tsx`: Renders the MiniChat interface,
  mapping `$miniChat.messages` to simple `Typography` components. Uses
  `$miniChat.loading` for a `LinearProgress` indicator.

This review confirms that both interfaces are driven by their respective
Effector stores (`$messages` and `$miniChat.messages`). Therefore, updating
these stores incrementally via the `onChunk` callback within the respective
models (`chat/model.ts` and `mini-chat/model.ts`) is the correct approach. The
existing loading indicators driven by `$isGenerating` and `$miniChat.loading`
will also function correctly when these stores are updated based on the
`streamChatFx.pending` state.

Let's refine the integration plan slightly based on these details:

---

## Refined Plan: Integrating `chat-stream` Feature (v1.1)

**Objective:** Refactor the `chat` and `mini-chat` features to utilize the new
`chat-stream` feature for handling API provider communication, enabling
real-time streaming responses and cancellation.

**1. Refactor `src/features/chat/model.ts` (Main Chat):**

- **Imports:** Update imports for `chat-stream` units and types. Remove old API
  effect/types.
- **State:** Add `$activeChatStreamId = chatDomain.store<string | null>(null)`.
- **API Call Triggering:** Reroute `sample` blocks targeting the old effect to
  `streamChatFx`. Update the `fn` to build `StreamChatParams` and define
  callbacks.
- **Callback Implementation:**
  - **`onChunk(payload: StreamChunkPayload)`:**
    - Get `$messages`. Find the target message (likely last, or identified via
      context/`isLoading`).
    - _Set `message.isLoading = true` on the target message if it's the first
      chunk._
    - Append `payload.chunk.choices[0]?.delta?.content` to `message.content`.
    - Update `$messages`.
  - **`onComplete(payload: StreamCompletePayload)`:**
    - Get `$messages`. Find completed message.
    - _Set `message.isLoading = false`._ Update message ID if needed.
    - Update `$messages`.
    - Trigger downstream events (saves, etc.).
    - Reset `$activeChatStreamId`.
  - **`onError(payload: StreamErrorPayload)`:**
    - Update `$apiError`.
    - Reset `$isGenerating`.
    - Reset `$activeChatStreamId`.
    - _Set `message.isLoading = false` on the failed message._ Optionally update
      content.
  - **`onAbort(payload: StreamAbortPayload)`:**
    - Reset `$isGenerating`.
    - Reset `$activeChatStreamId`.
    - _Set `message.isLoading = false` on the aborted message._
- **Stream ID Management:** Store `payload.streamId` from the first callback
  (e.g., `onChunk`) into `$activeChatStreamId`.
- **Cancellation Trigger:** Define `stopGenerationClicked` event. Create a
  `sample` listening to it, reading `$activeChatStreamId`, filtering, and
  targeting `abortStream`.
- **State Updates:** Drive `$isGenerating` from `streamChatFx.pending`. Adapt
  `$retryingMessageId` logic if needed.
- **Cleanup:** Remove old effect, `sendApiRequestFn`, related types.

**2. Refactor `src/features/mini-chat/model.ts` (Mini Chat):**

- **Imports:** Update imports for `chat-stream`. Remove old API effect/utils.
- **State:** Add `$miniChatActiveStreamId = createStore<string | null>(null)`.
- **API Call Triggering:** Reroute `sample` targeting old effect to
  `streamChatFx`. Update `fn` to build `StreamChatParams` and define callbacks.
- **Callback Implementation:**
  - **`onChunk(payload: StreamChunkPayload)`:**
    - Get `$miniChat` state.
    - _If `messages` is empty or last message is user, add a new assistant
      message object with `isLoading: true`._
    - Append `payload.chunk.choices[0]?.delta?.content` to the last message's
      `content`.
    - Update `$miniChat` store (messages).
  - **`onComplete(payload: StreamCompletePayload)`:**
    - Update `$miniChat`: set `loading: false`. Set `isLoading: false` on the
      completed message.
    - Reset `$miniChatActiveStreamId`.
  - **`onError(payload: StreamErrorPayload)`:**
    - Update `$miniChat`: set `loading: false`. Set `isLoading: false` on the
      failed message. Add error indicator/message if desired.
    - Reset `$miniChatActiveStreamId`.
  - **`onAbort(payload: StreamAbortPayload)`:**
    - Update `$miniChat`: set `loading: false`. Set `isLoading: false` on the
      aborted message.
    - Reset `$miniChatActiveStreamId`.
- **Stream ID Management:** Store `payload.streamId` from the first callback
  into `$miniChatActiveStreamId`.
- **Cancellation Trigger:** Define `stopMiniChatGenerationClicked` event. Add a
  `sample` listening to it, reading `$miniChatActiveStreamId`, filtering, and
  targeting `abortStream`.
- **State Updates:** Drive `$miniChat.loading` from `streamChatFx.pending`.
- **Cleanup:** Remove old effect, delete `src/features/mini-chat/api.ts`.

**3. UI Changes Required (to be implemented in Code Mode):**

- **`src/app/page.tsx`:** Modify the Send/Generate `IconButton` (lines 669-680)
  to conditionally render a "Stop" button when `$isGenerating` is true. The
  "Stop" button should trigger the `stopGenerationClicked` event.
- **`src/features/mini-chat/MiniChatDialog.tsx`:** Modify the Send `IconButton`
  (lines 236-250) to conditionally render a "Stop" button when
  `$miniChat.loading` is true. The "Stop" button should trigger the
  `stopMiniChatGenerationClicked` event.
- _(Optional Enhancement)_: Consider replacing `Typography` with
  `MarkdownRenderer` in `MiniChatDialog.tsx` (lines 181-183) for consistent
  rendering with the main chat.

**4. Sequence Diagram:** (Remains the same as in the previous plan)

---

This refined plan incorporates insights from the UI components and provides a
more detailed roadmap for the refactoring process.
