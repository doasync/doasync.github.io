### Plan: Localizing "Send/Generate" Button Loading State

**Goal:** Decouple the "Send/Generate" button's loading state in the main chat and mini-chat components from the global `streamChatFx.pending` store, ensuring each button's state reflects only the streaming activity within its respective chat context.

**Proposed Modifications:**

1.  **Modify `src/features/chat/model.ts` (Main Chat)**

    - **Current State:** The `$isGenerating` store for the main chat is currently derived directly from `streamChatFx.pending`.
    - **Action:**

      - Remove the explicit `.on` handler that maps `streamChatFx.pending` to `$isGenerating`.
      - Modify `$isGenerating` to be updated by events specific to the main chat's streaming lifecycle.

    - **Specific Code Changes:**

      - **Identify and remove:**
        ```typescript
        // Locate and remove this line or similar (exact line might vary based on code formatting):
        // $isGenerating.on(streamChatFx.pending, (_, pending) => pending);
        ```
      - **Update `$isGenerating` on stream initiation:**
        When `streamChatFx` is called for the main chat, the `streamRequestInitiated` event is emitted. We will use this to set `$isGenerating` to `true`.
        ```typescript
        // Add or modify a handler in the $isGenerating store definition
        $isGenerating.on(streamRequestInitiated, () => true);
        ```
      - **Update `$isGenerating` on stream completion/error/abort:**
        The `onComplete`, `onError`, and `onAbort` callbacks are executed when the stream finishes for any reason. We will introduce a new internal event (`chatStreamFinished`) that these callbacks trigger, which will then set `$isGenerating` to `false`.

        ```typescript
        // Define a new internal event for stream completion/error/abort
        // Add this near other event definitions in src/features/chat/model.ts
        const chatStreamFinished = chatDomain.event<void>();

        // Inside the 'fn' of the sample that triggers streamChatFx (e.g., `sample({ clock: ..., target: streamChatFx })`):
        // Modify the onComplete, onError, and onAbort callbacks to also trigger chatStreamFinished.
        const onComplete = () => {
          // ... existing onComplete logic ...
          chatStreamFinished(); // <-- ADD THIS LINE
        };
        const onError = ({ error }: StreamErrorPayload) => {
          // ... existing onError logic ...
          chatStreamFinished(); // <-- ADD THIS LINE
        };
        const onAbort = () => {
          // ... existing onAbort logic ...
          chatStreamFinished(); // <-- ADD THIS LINE
        };

        // Add handler to $isGenerating to reset its state when stream finishes
        $isGenerating.on(chatStreamFinished, () => false);
        ```

2.  **Modify `src/features/mini-chat/model.ts` (Mini Chat)**

    - **Current State:** The `loading` property within the `$miniChat` store is currently derived directly from `streamChatFx.pending`.
    - **Action:**

      - Remove the explicit `.on` handler that maps `streamChatFx.pending` to `$miniChat.loading`.
      - Modify the `loading` property within `$miniChat` to be updated by events specific to the mini-chat's streaming lifecycle.

    - **Specific Code Changes:**

      - **Identify and remove:**
        ```typescript
        // Locate and remove this block within the $miniChat store definition:
        // .on(streamChatFx.pending, (state, pending) => ({
        //     ...state,
        //     loading: pending,
        // }));
        ```
      - **Update `loading` on stream initiation:**
        The `miniChatStreamRequestInitiated` event is emitted when the mini-chat is about to start a stream. We will use this to set `$miniChat.loading` to `true`.
        ```typescript
        // Add a handler to $miniChat to set loading to true when a stream request is initiated
        $miniChat.on(miniChatStreamRequestInitiated, (state) => ({
          ...state,
          loading: true,
        }));
        ```
      - **Ensure `loading` is set to `false` on stream completion/error/abort:**
        The existing `_miniChatMessageCompleted`, `_miniChatMessageErrored`, and `_miniChatMessageAborted` events are already responsible for handling the completion, error, and abort states. We need to ensure that their respective `.on` handlers for `$miniChat` explicitly set the `loading` property to `false`. Based on `FIX_PLAN.md`, they already do this for `isLoading` on the specific message, but we need to ensure the top-level `loading` for the chat is also reset.

        ```typescript
        // Verify and ensure 'loading: false' is set in these handlers for $miniChat:
        $miniChat.on(_miniChatMessageCompleted, (state, { placeholderId }) => ({
          ...state,
          messages: state.messages.map((msg) =>
            msg.id === placeholderId ? { ...msg, isLoading: false } : msg
          ),
          loading: false, // <-- ENSURE THIS IS PRESENT
        }));

        $miniChat.on(
          _miniChatMessageErrored,
          (state, { placeholderId, error }) => ({
            ...state,
            messages: state.messages.map((msg) =>
              msg.id === placeholderId
                ? {
                    ...msg,
                    isLoading: false,
                    content: `${msg.content || ""}\n\nError: ${error.message}`,
                  }
                : msg
            ),
            loading: false, // <-- ENSURE THIS IS PRESENT
          })
        );

        $miniChat.on(_miniChatMessageAborted, (state, { placeholderId }) => ({
          ...state,
          messages: state.messages.map((msg) =>
            msg.id === placeholderId ? { ...msg, isLoading: false } : msg
          ),
          loading: false, // <-- ENSURE THIS IS PRESENT
        }));
        ```

### Overall Flow for Localized Loading States

```mermaid
graph TD
    subgraph Global Chat Stream Effect
        G[streamChatFx (unified Effect)]
        G_P[streamChatFx.pending (global flag)]
    end

    subgraph Main Chat Feature
        MC_Trigger[Main Chat UI Action (Send/Generate)] --> MC_CallStream[Internal Logic: Trigger Main Chat Stream]
        MC_CallStream --> MC_SRI[chat/model.ts: streamRequestInitiated event]
        MC_SRI --> MC_IsGen_True[$isGenerating.on(streamRequestInitiated)]
        MC_IsGen_True -- Sets true --> MC_IsGenerating_Store[$isGenerating (local)]
        MC_IsGenerating_Store -- Drives UI --> MC_UI_Button[Main Chat Send/Generate Button State]

        MC_CallStream --> G
        G -- calls callbacks --> MC_Callbacks[chat/model.ts: onComplete/onError/onAbort]
        MC_Callbacks --> MC_SF[chat/model.ts: chatStreamFinished event]
        MC_SF --> MC_IsGen_False[$isGenerating.on(chatStreamFinished)]
        MC_IsGen_False -- Sets false --> MC_IsGenerating_Store

        style G_P fill:#FFCCCC,stroke:#990000,stroke-width:2px,font-weight:bold
        MC_IsGenerating_Store -.x No longer driven by .-> G_P
    end

    subgraph Mini Chat Feature
        MiC_Trigger[Mini Chat UI Action (Send)] --> MiC_Prep[mini-chat/model.ts: _prepareAndTriggerStream event]
        MiC_Prep --> MiC_SRI[mini-chat/model.ts: miniChatStreamRequestInitiated event]
        MiC_SRI --> MiC_Load_True[$miniChat.on(miniChatStreamRequestInitiated)]
        MiC_Load_True -- Sets true --> MiC_Loading_Prop[($miniChat.loading) (local)]
        MiC_Loading_Prop -- Drives UI --> MiC_UI_Button[Mini Chat Send Button State]

        MiC_Prep --> G
        G -- calls callbacks --> MiC_Callbacks[mini-chat/model.ts: onComplete/onError/onAbort]
        MiC_Callbacks --> MiC_LocalEvents[mini-chat/model.ts: _miniChatMessageCompleted/Errored/Aborted events]
        MiC_LocalEvents --> MiC_Load_False[$miniChat.on(these events)]
        MiC_Load_False -- Sets false --> MiC_Loading_Prop

        MiC_Loading_Prop -.x No longer driven by .-> G_P
    end

    style MC_IsGenerating_Store fill:#CCEEFF,stroke:#333,stroke-width:2px,font-weight:bold
    style MiC_Loading_Prop fill:#CCFFCC,stroke:#333,stroke-width:2px,font-weight:bold
```
