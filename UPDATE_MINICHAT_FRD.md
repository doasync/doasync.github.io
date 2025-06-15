### Comprehensive Plan for Updating `src/features/mini-chat/FRD.md`

#### Goal:

To update `src/features/mini-chat/FRD.md` to accurately reflect the current
implementation, align with the `PRD.md` and `src/features/chat-stream/FRD.md`,
and provide clear, comprehensive documentation for developers.

#### Key Areas for Update:

1.  **Introduction/Overview (Section 1):**

    - **Action:** Emphasize its role as a "lightweight, contextual chat
      interface" (`PRD.md`:154) and its integration with the `chat-stream`
      feature for real-time responses.
    - **Reason:** The current overview is a bit generic. Highlighting its
      streaming capabilities and contextual nature from the PRD and chat-stream
      FRD will make it more accurate.

2.  **Scope — Behavioral Paradigm Fit (Section 2):**

    - **Action:** Re-evaluate and refine the behavior around `Ask` and `Explain`
      when a mini chat is _active_ and new text is selected.
      - `"Ask"` button: Confirm it pastes selected text into the input _without
        sending_, allowing edit.
      - `"Explain"` button: Confirm it immediately prefixes a predefined message
        and _sends instantly_.
    - **Action:** Explicitly mention the behavior when the mini-chat is
      _minimized_ and `Ask`/`Explain` are clicked (it restores it first).
    - **Reason:** The current FRD partially covers this, but the code
      (`src/features/mini-chat/MiniChatToolbar.tsx`) explicitly handles
      restoration if minimized, which should be documented.

3.  **User Stories (Section 3):**

    - **Action:** Add a user story related to stopping ongoing generation within
      the mini-chat.
    - **Action:** Add a user story about the ability to minimize and restore the
      mini-chat.
    - **Reason:** The `stopMiniChatGenerationClicked` event and
      `minimizeMiniChat`/`restoreMiniChat` functionality are present in the code
      (`src/features/mini-chat/MiniChatDialog.tsx`,
      `src/features/mini-chat/model.ts`,
      `src/features/mini-chat/MiniChatFAB.tsx`) but not explicitly covered by
      user stories.

4.  **Functional Specifications (Section 4):**

    - **4.1 Context-Based Text Selection:**

      - **Action:** Detail how `src/features/mini-chat/useTextSelection.ts`
        detects selection within `.chat-message` elements and positions the
        toolbar. Mention the debounce mechanism.
      - **Reason:** This is a crucial part of the feature's activation, and
        `src/features/mini-chat/useTextSelection.ts` provides specific
        implementation details (e.g., `chat-message` class, debounce) that
        should be documented.

    - **4.2 Ask Flow:**

      - **Action:** Clearly state that if the mini-chat is minimized, it will be
        restored first. Then, if open, it quotes the text into the input; if
        closed, it opens with quoted text and position.
      - **Reason:** Align with `src/features/mini-chat/MiniChatToolbar.tsx`
        implementation.

    - **4.3 Explain Flow:**

      - **Action:** Clearly state that if the mini-chat is minimized, it will be
        restored first. Then, if open, it sends the explanation prompt
        immediately; if closed, it opens and then sends the explanation prompt.
      - **Reason:** Align with `src/features/mini-chat/MiniChatToolbar.tsx`
        implementation.

    - **4.4 Mini Chat Panel:**

      - **Action:** Add details about the visual states: `isOpen`, `isCompact`,
        `isMinimized`, `loading`.
      - **Action:** Explicitly state that messages are rendered using
        `Typography` and `Paper` components, and mention basic styling for
        user/assistant messages.
      - **Action:** Describe the input field's behavior: multiline, `TextField`
        with `SendIcon` (or `StopIcon` when loading).
      - **Action:** Add a new sub-section for **4.4.1 Streaming Responses**:
        Detail how `chat-stream` is integrated for real-time message generation,
        including the `LinearProgress` bar for loading state. Mention the
        `stopMiniChatGenerationClicked` event and `StopIcon` for cancellation.
      - **Reason:** The current description is sparse. The
        `src/features/mini-chat/MiniChatDialog.tsx` and
        `src/features/mini-chat/model.ts` files contain many UI/behavioral
        details for the panel and its streaming integration that need to be
        documented.

    - **4.5 Expand to Full Chat:**

      - **Action:** Clarify the "Preserves input if expanded" (`PRD.md`:163)
        based on user clarification: sent messages are migrated, AND any _unsent
        draft text_ in the mini-chat input is transferred to the main chat's
        input.
      - **Action:** Detail the `expandMiniChatFx` logic: creates a new chat
        session, maps mini-chat messages, applies mini-chat's model, main chat's
        temperature/system prompt, saves to IndexedDB (`saveChatFx`), and then
        selects the new chat (`chatSelected`). Also, it clears the mini-chat
        state.
      - **Action:** Mention the UI changes: sets mobile drawer to "history" and
        closes it.
      - **Reason:** This section needs significant expansion to cover the
        `expandMiniChatFx` implementation in `src/features/mini-chat/model.ts`
        and the clarified PRD requirement.

    - **4.6 Closure & Lifecycle:**
      - **Action:** Reiterate that closing discards ephemeral data. Add
        `resetMiniChat` event.
      - **Action:** Add a new sub-section for **4.6.1
        Minimization/Restoration**: Describe the `minimizeMiniChat` and
        `restoreMiniChat` events, and the logic behind auto-minimization
        (`$shouldMinimize`, `$isMobileDrawerOpen`, `$isModelSelectorActive`,
        `$isMainInputFocused`). Explain the role of
        `src/features/mini-chat/MiniChatFAB.tsx` in restoring.
      - **Reason:** Minimization is a significant lifecycle aspect not covered.

5.  **Non-Functional Specifications (Section 5):**

    - **Action:** Update the tech stack to specifically mention
      `react-draggable` for drag functionality, and `eventsource-parser` (via
      `chat-stream`) for streaming.
    - **Action:** Emphasize the Effector integration with `chat-stream` and how
      `src/features/mini-chat/model.ts` acts as a consumer. Refer to
      `src/features/chat-stream/FRD.md` for details on `streamChatFx` and its
      callbacks.
    - **Reason:** More detailed technical alignment with the actual
      implementation and dependencies.

6.  **Acceptance Criteria (Section 6):**

    - **Action:** Add new criteria for:
      - A progress indicator (LinearProgress) is shown during streaming.
      - A "Stop" button appears during streaming and successfully cancels
        generation.
      - The mini-chat can be minimized and restored via the FAB.
      - Unsent input is transferred upon expansion.
    - **Action:** Refine existing criteria to be more precise based on code
      review.
    - **Reason:** To ensure the FRD covers all implemented functionality.

7.  **Constraints & Risks (Section 7):**

    - **Action:** Add "API key must be present for streaming to work" (derived
      from `src/features/mini-chat/model.ts` filter).
    - **Action:** Mention that the `chat-stream` module is stateless and relies
      on the `mini-chat` module for message state management and `streamId`
      generation.
    - **Reason:** Important constraints from the underlying `chat-stream`
      integration.

8.  **Success Metrics / Definition of Done (Section 8):**

    - **Action:** Potentially add metrics related to streaming performance
      (though `chat-stream` covers core streaming, Mini-chat's UI responsiveness
      during stream is relevant).
    - **Reason:** To ensure the success metrics are comprehensive.

9.  **Out of Scope (Section 9):**
    - **Action:** Review and ensure it still aligns with the current scope and
      doesn't contradict any newly added features.
    - **Reason:** Keep the document accurate.

#### Mermaid Diagram for Mini Chat Core Flow:

```mermaid
graph TD
    subgraph User Interaction
        A[User Selects Text] --> B{Is Selection in Chat Message?}
        B -- No --> End[Hide Toolbar]
        B -- Yes --> C[useTextSelection.ts]
    end

    subgraph Mini Chat Toolbar Logic
        C --> D{Debounce Timer (400ms)}
        D --> E[showMiniChatToolbar Event]
        E --> F[MiniChatToolbar.tsx]
        F -- Click "Ask" --> G{Is Mini Chat Minimized?}
        G -- Yes --> H[restoreMiniChat Event]
        G -- No --> I{Is Mini Chat Open?}
        I -- Yes --> J[updateMiniChatInput (Quote Selection)]
        I -- No --> K[miniChatOpened (with Initial Input & Position)]
        J --> L[Hide Toolbar, Clear Selection]
        K --> L

        F -- Click "Explain" --> M{Is Mini Chat Minimized?}
        M -- Yes --> H
        M -- No --> N{Is Mini Chat Open?}
        N -- Yes --> O[sendMiniChatMessage (Explanation Prompt)]
        N -- No --> P[miniChatOpened (Empty Input)]
        P --> O
        O --> L
    end

    subgraph Mini Chat Dialog & Streaming
        subgraph model.ts
            miniChatOpened --> Q[$miniChat (isOpen = true, set position)]
            updateMiniChatInput --> Q
            _addMiniChatUserMessage --> Q
            _addPlaceholderMessage --> Q
            miniChatStreamRequestInitiated --> Q[Set loading: true]
            _miniChatMessageChunkReceived --> Q[Append chunk to message]
            _miniChatMessageCompleted --> Q[Set loading: false, isLoading: false, trigger scroll]
            _miniChatMessageErrored --> Q[Set loading: false, isLoading: false, error message]
            _miniChatMessageAborted --> Q[Set loading: false, isLoading: false]
            minimizeMiniChat --> Q[Set isMinimized: true]
            restoreMiniChat --> Q[Set isMinimized: false]
            resetMiniChat --> Q[Reset all state]
        end

        sendMiniChatMessage --> R[PrepareStreamPayload]
        R -- 1. Add User Msg --> _addMiniChatUserMessage
        R -- 2. Add Placeholder Msg --> _addPlaceholderMessage
        R -- 3. Notify Stream Init --> miniChatStreamRequestInitiated
        R -- 4. Call Stream Effect --> S[streamChatFx (from chat-stream)]
        S -- Streaming --> T[onChunk Callback]
        T --> _miniChatMessageChunkReceived
        S -- Complete --> U[onComplete Callback]
        U --> _miniChatMessageCompleted
        S -- Error --> V[onError Callback]
        V --> _miniChatMessageErrored
        S -- Abort --> W[onAbort Callback]
        W --> _miniChatMessageAborted

        stopMiniChatGenerationClicked --> X[abortStream (from chat-stream)]
        X --> S[Cancel Stream]

        expandMiniChat --> Y[expandMiniChatFx]
        Y --> Z[Save Chat to IndexedDB]
        Y --> AA[Select New Chat in Main UI]
        Y --> AB[Reset Mini Chat State]
        Y --> AC[Hide Toolbar]
    end

    Q -- Rendered by --> MiniChatDialog.tsx
    Q -- Rendered by --> MiniChatFAB.tsx
    Q -- Consumed by --> MiniChatModelSelector.tsx
```
