You're right, the plan needs to be more specific about how the correct message is identified for updates during streaming. Let's clarify that logic.

**Clarification on Identifying the Target Message:**

The most reliable approach, consistent with existing patterns (like the `message.isLoading` flag used in `MessageItem.tsx` and the `placeholderGenerated` logic in `chat/model.ts`), is to use a dedicated loading state on the message itself.

Here's the proposed logic:

1.  **Stream Start (in `chat/model.ts` or `mini-chat/model.ts`):**

    - **For New Generation:** Before calling `streamChatFx`, create and add a new assistant message to the list (e.g., `$messages` or `$miniChat.messages`). This message should have:
      - A unique temporary ID (e.g., `crypto.randomUUID()`).
      - `role: 'assistant'`.
      - `content: ''` (initially empty).
      - **`isLoading: true`**. This is the key identifier.
    - **For Retry (Less common for streaming _into_ an old message, usually replaces):** If a scenario required streaming updates to an existing message (e.g., regenerating a specific assistant response), that message's `isLoading` flag would be set to `true` before calling `streamChatFx`. _However, the current plan focuses on replacing/inserting for retries, which simplifies things._

2.  **During `onChunk` Callback (in `chat/model.ts` or `mini-chat/model.ts`):**

    - The callback receives the `payload` containing the `streamId` and `chunk`.
    - It needs to find the message in its respective store (`$messages` or `$miniChat.messages`) that currently has **`isLoading: true`**. _Assumption: Only one message should be in this loading state per feature context at any given time._
    - Append the `payload.chunk.choices[0]?.delta?.content` to this specific message's `content`.
    - Update the store (`$messages.recompute` or `$miniChat.recompute` might be needed if just updating a property within an object in the array).

3.  **During `onComplete`, `onError`, `onAbort` Callbacks (in `chat/model.ts` or `mini-chat/model.ts`):**
    - Find the message with `isLoading: true`.
    - Set its `isLoading` property to `false`.
    - Perform any other necessary state updates (e.g., finalize content, update ID from response, set error state).

**Updating the Plan:**

Let's incorporate this explicit logic into the refined plan (v1.2):

---

## Refined Plan: Integrating `chat-stream` Feature (v1.2)

**Objective:** Refactor the `chat` and `mini-chat` features to utilize the new `chat-stream` feature... (rest of objective unchanged)

**1. Refactor `src/features/chat/model.ts` (Main Chat):**

- ... (Imports, State unchanged) ...
- **API Call Triggering:**
  - Locate `sample` blocks targeting old effect.
  - _Ensure that before calling `streamChatFx` for a new generation, a placeholder assistant message with `content: '', isLoading: true`, and a unique ID is added to `$messages` (similar to the existing `placeholderGenerated` logic)._
  - Change `target` to `streamChatFx`.
  - Modify `fn` to build `StreamChatParams`, define callbacks.
- **Callback Implementation:**
  - **`onChunk(payload: StreamChunkPayload)`:**
    - Get `$messages`. Find the message where **`msg.isLoading === true`**.
    - If found, append `payload.chunk.choices[0]?.delta?.content` to `msg.content`.
    - Update `$messages`.
  - **`onComplete(payload: StreamCompletePayload)`:**
    - Get `$messages`. Find message where **`msg.isLoading === true`**.
    - If found, set **`msg.isLoading = false`**. Update ID if needed.
    - Update `$messages`.
    - Trigger downstream events. Reset `$activeChatStreamId`.
  - **`onError(payload: StreamErrorPayload)`:**
    - Update `$apiError`. Reset `$isGenerating`. Reset `$activeChatStreamId`.
    - Get `$messages`. Find message where **`msg.isLoading === true`**.
    - If found, set **`msg.isLoading = false`**. Optionally update content.
    - Update `$messages`.
  - **`onAbort(payload: StreamAbortPayload)`:**
    - Reset `$isGenerating`. Reset `$activeChatStreamId`.
    - Get `$messages`. Find message where **`msg.isLoading === true`**.
    - If found, set **`msg.isLoading = false`**.
    - Update `$messages`.
- ... (Stream ID Management, Cancellation Trigger, State Updates, Cleanup unchanged) ...

**2. Refactor `src/features/mini-chat/model.ts` (Mini Chat):**

- ... (Imports, State unchanged) ...
- **API Call Triggering:**
  - Locate `sample` targeting old effect.
  - _Modify the logic triggered by `sendMiniChatMessage`: Instead of just setting `loading: true`, it should also add a new assistant message object to `$miniChat.messages` with `content: '', role: 'assistant', isLoading: true`._
  - Change `target` to `streamChatFx`. Update `fn` to build `StreamChatParams`, define callbacks.
- **Callback Implementation:**
  - **`onChunk(payload: StreamChunkPayload)`:**
    - Get `$miniChat` state. Find message in `state.messages` where **`msg.isLoading === true`**.
    - If found, append `payload.chunk.choices[0]?.delta?.content` to `msg.content`.
    - Update `$miniChat` store.
  - **`onComplete(payload: StreamCompletePayload)`:**
    - Get `$miniChat` state. Find message where **`msg.isLoading === true`**.
    - If found, set **`msg.isLoading = false`**.
    - Update `$miniChat` store (set `loading: false`, update `messages`).
    - Reset `$miniChatActiveStreamId`.
  - **`onError(payload: StreamErrorPayload)`:**
    - Get `$miniChat` state. Find message where **`msg.isLoading === true`**.
    - If found, set **`msg.isLoading = false`**. Add error indicator/message if desired.
    - Update `$miniChat` store (set `loading: false`, update `messages`).
    - Reset `$miniChatActiveStreamId`.
  - **`onAbort(payload: StreamAbortPayload)`:**
    - Get `$miniChat` state. Find message where **`msg.isLoading === true`**.
    - If found, set **`msg.isLoading = false`**.
    - Update `$miniChat` store (set `loading: false`, update `messages`).
    - Reset `$miniChatActiveStreamId`.
- ... (Stream ID Management, Cancellation Trigger, State Updates, Cleanup unchanged) ...

**3. UI Changes Required:** (Unchanged)

**4. Sequence Diagram:** (Unchanged)

---

This revised plan (v1.2) clarifies that the message with `isLoading: true` is the target for streaming updates. This leverages an existing pattern and provides a clear mechanism for the callbacks.
