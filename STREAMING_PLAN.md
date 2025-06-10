Okay, the analysis of `src/features/mini-chat/api.ts` confirms that it, too, uses a standard non-streaming `fetch` call (`await response.json()`).

**Information Gathering Summary:**

- **Objective:** Create a unified, DRY, and robust streaming architecture for API provider calls using Effector and `eventsource-parser`, located in `src/features/chat-stream/`.
- **Current State:** Both the main chat (`src/features/chat/`) and MiniChat (`src/features/mini-chat/`) features currently use standard, non-streaming `fetch` requests handled within their respective `lib.ts` and `api.ts` files via Effector effects.
- **Key Requirements:** The new architecture must handle SSE parsing reliably, provide seamless stream abortion without cancellation messages, be stateless in its core logic (consumers handle state via callbacks), and expose a clean API via Effector.

Now that I have a clear picture of the existing setup and the requirements, I can propose a detailed plan.

---

## Plan: Unified API Provider Streaming Architecture

This plan outlines the design and implementation steps for the `src/features/chat-stream/` feature, providing a unified and maintainable solution for API provider streaming.

**1. Goal Recap:**

Develop a reusable Effector-based feature (`chat-stream`) that encapsulates API provider SSE streaming logic using `eventsource-parser`. This feature will provide robust streaming, cancellation, and error handling capabilities for consumers like the main chat and MiniChat features.

**2. Proposed Architecture & Design:**

We will adhere to the suggested directory structure:

```
src/features/chat-stream/
  ├── index.ts           # Public API: streaming effect, abort event, types
  ├── api.ts             # Low-level SSE fetch logic with eventsource-parser & AbortController
  ├── types.ts           # Streaming-specific types (chunks, events, effect params, callbacks)
  ├── model.ts           # Core Effector units (effect, abort event, controller management)
  └── FRD.md             # Feature requirements documentation
```

**File Breakdown & Implementation Details:**

- **`types.ts`**:

  - Define interfaces for SSE chunks (e.g., `ParsedEvent` from `eventsource-parser`).
  - Define types for the data payload within SSE events (e.g., `APIStreamChoice`, `APIStreamChunk`).
  - Define the parameter type for the main streaming effect (`StreamChatParams`), including API provider parameters (`model`, `messages`, `temperature`, etc., _ensuring `stream: true` is always set_), API key, and mandatory callback functions (`onChunk`, `onComplete`, `onError`, potentially `onStart`, `onAbort`).
  - Define the type for the `abortStream` event payload (e.g., `{ streamId: string }`).
  - Define potential structured error types for the effect's rejection.

- **`api.ts`**:

  - Implement the core asynchronous function (`fetchChatStream`) that will serve as the Effector effect's handler.
  - **Parameters:** This function will accept `StreamChatParams` (including callbacks and an `AbortSignal`).
  - **Fetch:** Initiate the `fetch` request to API provider with `stream: true` and the provided `AbortSignal`.
  - **Error Handling:** Handle initial fetch errors (network issues, non-2xx status codes before streaming starts).
  - **Stream Reading:** Obtain the `ReadableStream` reader.
  - **Decoding:** Use `TextDecoder` to decode `Uint8Array` chunks.
  - **Parsing:** Instantiate `createParser` from `eventsource-parser`. Feed decoded text chunks into the parser (`parser.feed(...)`).
  - **SSE Event Handling:** Implement the `onParse` callback for the parser:
    - Check `event.type`: Handle `event`, `reconnect-interval`, etc., as needed.
    - If `event.type === 'event'`:
      - Ignore comments (`: OPENROUTER PROCESSING`). Could potentially trigger an `onComment` callback if needed later.
      - Check for `data: [DONE]`. If found, signal completion via the `onComplete` callback and break the reading loop.
      - If `data` is present, parse the JSON (`JSON.parse(event.data)`).
      - Handle potential JSON parsing errors gracefully.
      - Extract the content delta (e.g., `parsed.choices[0].delta.content`).
      - If content exists, invoke the `onChunk` callback with the parsed chunk data.
  - **Completion/Cleanup:** Ensure the `onComplete` callback is called when the stream ends naturally (`reader.read()` returns `done: true`) or `[DONE]` is received. Close the reader.
  - **Abort Handling:** Catch `AbortError` specifically. Invoke an `onAbort` callback (or handle silently as per requirements).
  - **General Errors:** Catch any other errors during streaming/parsing and invoke the `onError` callback.

- **`model.ts`**:

  - **Domain:** Create an Effector domain (`chatStreamDomain`).
  - **AbortController Management:**
    - Maintain a non-reactive mapping (e.g., a `Map<string, AbortController>`) within the module scope to track active streams and their controllers. This avoids unnecessary Effector state updates for internal management.
  - **Abort Event:** Define the public `abortStream = chatStreamDomain.event<{ streamId: string }>()`.
  - **Streaming Effect:**
    - Define the main public effect: `streamChatFx = chatStreamDomain.effect<StreamChatParams, void, Error>()`.
    - **Handler:** Use a wrapper function around `api.fetchChatStream`. This wrapper will:
      1.  Generate a unique `streamId` for this request.
      2.  Create a new `AbortController`.
      3.  Store the controller in the map: `activeStreams.set(streamId, controller)`.
      4.  Pass the `controller.signal` and other parameters (including callbacks) to `fetchChatStream`.
      5.  Crucially, pass the `streamId` to the callbacks (`onChunk`, `onComplete`, `onError`, `onAbort`) so the consumer knows which stream the event belongs to. Modify `types.ts` accordingly.
      6.  Wrap the call to `fetchChatStream` in a `try...finally` block.
      7.  In the `finally` block, always remove the controller from the map: `activeStreams.delete(streamId)`.
    - **Effect Promise:** The effect will resolve (`void`) upon successful stream completion (`onComplete` called) and reject (`Error`) if `onError` is called or an unhandled exception occurs in the handler.
  - **Abort Logic:**
    - Use `sample` or `.watch` to listen to `abortStream`.
    - When `abortStream` is triggered:
      1.  Look up the `AbortController` using the provided `streamId` in the `activeStreams` map.
      2.  If found, call `controller.abort()`.
      3.  Remove the controller from the map (though the effect's `finally` block will also do this).
  - **Statelessness:** This model focuses on _orchestrating_ the stream lifecycle (start, abort, completion/error reporting via effect promise/callbacks) and managing the `AbortController`. It does _not_ store the streaming content itself.

- **`index.ts`**:

  - Export `streamChatFx` and `abortStream` from `model.ts`.
  - Export all relevant types from `types.ts` (e.g., `StreamChatParams`, chunk types, callback signatures).

- **`FRD.md`**:
  - Document the purpose of the feature.
  - Provide usage examples for calling `streamChatFx` and `abortStream`.
  - Explain the callback mechanism and the expected data format for chunks.
  - Outline the error handling strategy (effect rejection, `onError` callback).

**3. Mermaid Diagrams:**

- **Sequence Diagram (Streaming Flow):**

  ```mermaid
  sequenceDiagram
      participant UI
      participant FeatureModel (e.g., chat/model.ts)
      participant ChatStream (chat-stream/model.ts)
      participant ChatStreamAPI (chat-stream/api.ts)
      participant EventsourceParser
      participant APIProvider

      UI->>FeatureModel: User sends message / Clicks Generate
      FeatureModel->>ChatStream: Call streamChatFx(params including callbacks, generates streamId)
      ChatStream->>ChatStreamAPI: Execute effect handler (creates AbortController, stores [streamId, controller])
      ChatStreamAPI->>APIProvider: fetch(..., stream: true, signal)
      activate APIProvider
      APIProvider-->>ChatStreamAPI: Streaming Response (ReadableStream)
      deactivate APIProvider
      ChatStreamAPI->>EventsourceParser: parser.feed(chunk)
      loop Parse Chunks
          EventsourceParser->>ChatStreamAPI: onParse(event)
          alt data: [DONE]
              ChatStreamAPI->>FeatureModel: onComplete(streamId)
              ChatStreamAPI-->>ChatStream: Resolve effect promise
          else data: {choices: [...]}
              ChatStreamAPI->>FeatureModel: onChunk(streamId, parsedChunk)
          else comment or other
              ChatStreamAPI->>EventsourceParser: Ignore / Handle comment
          end
      end
      FeatureModel->>UI: Update message display incrementally

      %% Abort Flow
      UI->>FeatureModel: User clicks Stop button
      FeatureModel->>ChatStream: Call abortStream({ streamId })
      ChatStream->>ChatStreamAPI: Look up AbortController, call controller.abort()
      ChatStreamAPI->>APIProvider: Abort signal received
      ChatStreamAPI-->>ChatStream: Reject effect promise (AbortError)
      ChatStream->>FeatureModel: Effect fails (AbortError) - handled silently or via onAbort callback
      FeatureModel->>UI: Update UI (hide Stop button, etc.)
  ```

- **Component Diagram (Dependencies):**

  ```mermaid
  graph TD
      subgraph Feature: Main Chat
          ChatModel[chat/model.ts]
          ChatLib[chat/lib.ts]
          ChatUI[chat/components]
      end
      subgraph Feature: Mini Chat
          MiniChatModel[mini-chat/model.ts]
          MiniChatApi[mini-chat/api.ts]
          MiniChatUI[mini-chat/components]
      end
      subgraph Feature: Chat Stream
          ChatStreamIndex[chat-stream/index.ts] -- exports --> ChatStreamModel[chat-stream/model.ts]
          ChatStreamModel -- uses --> ChatStreamApi[chat-stream/api.ts]
          ChatStreamApi -- uses --> EventsourceParser[eventsource-parser]
          ChatStreamModel -- exports --> ChatStreamTypes[chat-stream/types.ts]
          ChatStreamIndex -- exports --> ChatStreamTypes
      end

      ChatModel -- uses --> ChatStreamIndex
      MiniChatModel -- uses --> ChatStreamIndex

      ChatUI -- interacts --> ChatModel
      MiniChatUI -- interacts --> MiniChatModel

      %% Dashed lines show planned removal/replacement
      ChatModel -.-> ChatLib
      MiniChatModel -.-> MiniChatApi
  ```

**4. Integration Strategy (High-Level):**

- **Refactor `chat/model.ts`:**
  - Remove the existing `sendApiRequestFx` and its related non-streaming logic in `lib.ts`.
  - Import `streamChatFx`, `abortStream`, and types from `chat-stream`.
  - Trigger `streamChatFx` instead of the old effect when a message is sent or generated.
  - **Callbacks:** Implement `onChunk`, `onComplete`, `onError`, `onAbort` within the chat model:
    - `onChunk`: Append the received content delta to the appropriate message in `$messages` (likely the last one, potentially identified via `streamId` context if needed). Trigger UI updates.
    - `onComplete`: Finalize the message state (e.g., set `isLoading: false`). Trigger save logic (`normalResponseProcessed` or `retryUpdate`).
    - `onError`: Update `$apiError` store. Reset loading states.
    - `onAbort`: Reset loading states. Update UI (hide stop button). _Do not show a cancellation message._
  - **State:** Manage `$isGenerating` based on `streamChatFx.pending`. Add state/logic to track the `streamId` of the currently active stream for abortion.
  - **UI:** Add a "Stop" button that appears during generation, which triggers `abortStream` with the active `streamId`.
- **Refactor `mini-chat/model.ts`:**
  - Apply similar changes as in `chat/model.ts`.
  - Remove `sendMiniChatMessageFx` and the logic in `api.ts`.
  - Use `streamChatFx` and `abortStream`.
  - Implement callbacks to update `$miniChat.messages` and `$miniChat.loading`.
  - Add UI logic for the "Stop" button within the MiniChat dialog, triggering `abortStream`.

**5. Dependencies:**

- Ensure `eventsource-parser` is installed (user confirmed it is). No other new dependencies seem necessary based on the plan.

---

This plan provides a clear path to implementing the unified streaming architecture. It leverages Effector for orchestration, `eventsource-parser` for robust SSE handling, and ensures the core logic remains stateless as requested, delegating state management to the consuming features via callbacks.

What do you think of this plan? Are there any adjustments or clarifications you'd like before proceeding?
