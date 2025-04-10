Here's a summary of what was done according to the `PLAN.md`:

...

**Phase 12 (Retry, Generate, Placeholder, Draft Persistence & Refactoring)**

1. **Draft Persistence with Debounce:**

   - The current input (`$messageText`) is now saved as a `draft` field inside each chat session object.
   - Debounced by 1 second to avoid excessive saves.
   - When a chat is loaded, its draft is restored automatically, ensuring in-progress messages persist across reloads.
   - Draft changes trigger chat save to IndexedDB, keeping data consistent.

2. **Explicit Request Contexts for API Calls:**

   - Introduced a `requestContext` parameter with explicit types: `"normal"`, `"retry"`, `"generate"`.
   - This context is passed through all API calls and used to determine update logic after responses.
   - Eliminates reliance on transient Effector stores for context, reducing race conditions.

3. **Unified Placeholder Handling for Retry & Generate:**

   - **Generate Flow:**

     - Clicking the generate button (when input is empty and the last message is from user) inserts a placeholder assistant message immediately.
     - Shows a spinner on this placeholder.
     - Placeholder is replaced with the API response content upon success.

   - **Retry Flow:**

     - Retrying an assistant message replaces it directly after the new regenerated message is received.
     - Retrying a user message:
       - If the next message is an assistant, it is replaced.
       - **If the next message is another user or absent (Scenario 1.2.b), a placeholder assistant message is inserted immediately after the retried user message.**
       - This placeholder shows a spinner and is replaced upon API success.

   - Both flows now provide immediate visual feedback and consistent update behavior.

4. **Effector State Refactoring & Cleanup:**

   - Removed transient stores like `$retryContext`, `$placeholderInfo`, `$generatingPlaceholderId`.
   - All relevant context is passed explicitly with each API call.
   - Samples simplified and made more robust by avoiding timing issues.
   - Reset logic improved to avoid premature clearing of context.

5. **Persistent Chat Saving:**

   - All message updates, including retries, generates, edits, deletes, and draft changes, now trigger chat save.
   - Ensures chat sessions in IndexedDB are always up-to-date.
   - Fixes inconsistencies where some updates were previously not saved.

6. **Scrolling Behavior Fixes:**

   - Introduced `$scrollTrigger` store as a counter.
   - Scroll effect now depends on this trigger, ensuring consistent auto-scroll after new messages, retries, and generates.
   - Fixed previous issues with inconsistent or missing scrolls.

7. **UI/UX Enhancements:**

   - The generate button replaces the send button when the input is empty.
   - Snackbar warnings appear if trying to send while editing a message.
   - Improved spinners on placeholders and retries.
   - Enhanced hover effects and editing experience.
   - Cleaned up layout, drawer transitions, and responsiveness for better usability.

8. **Retry Placeholder Fix (Scenario 1.2.b):**

   - Specifically addressed the case where retrying a user message followed by another user message or no message.
   - Inserts a placeholder assistant message immediately upon retry.
   - Placeholder is replaced with the new response once available.
   - Fixes previous bug where no placeholder was inserted, causing confusing UI delays.

---

**Phase 13 (Usage Info & Mini Chat Implementation)**

1.  **Usage Info Feature:**

    - **Implementation:** Introduced a comprehensive Usage Info feature accessible via a new `QueryStatsIcon` in the AppBar, displaying metrics in a dedicated dialog (`UsageInfoDialog`).
    - **Metrics Displayed:** Shows real-time Chat ID, tokens sent/received, context window usage (current vs. max with a progress bar), estimated API cost, current chat size, total DB size, and browser quota.
    - **Technology:** Leverages Effector (`features/usage-info/model.ts`) for reactive state management, effects (`fetchStorageInfoFx`, `calculateUsageStatsFx`) for data fetching/calculation, and utility functions (`features/usage-info/utils.ts`) for specific computations (storage estimation, cost calculation).
    - **Mobile Integration:** Added a reusable `UsageInfoContent` component and integrated it into the `MobileUnifiedDrawer` under a new "Usage" tab, ensuring feature availability on mobile devices.

2.  **Mini Chat Feature (Foundation & Refinements):**

    - **Initial Implementation:** Built the foundational components (`MiniChatToolbar`, `MiniChatDialog`, `useTextSelection` hook), Effector state model (`features/mini-chat/model.ts`), API connection (`features/mini-chat/api.ts`), and integrated them into the main UI (`page.tsx`, `MessageItem.tsx`).
    - **Expand to Full Chat:** Implemented the `expandMiniChatFx` effect, allowing users to promote an ephemeral mini-chat conversation into a persistent, saved chat session in IndexedDB via `saveChatFx`.
    - **Explain Flow Fix:** Corrected the "Explain" behavior when the mini-chat is already open, ensuring the explain prompt is sent immediately without clearing existing input unnecessarily.
    - **Dedicated Model Selector:** Created the `MiniChatModelSelector` component and corresponding state (`$miniChatModelId` with localStorage persistence), allowing users to select a model specifically for the mini-chat, distinct from the main chat model. This selector was added to the main `ChatSettingsContent`.
    - **Analysis:** Added `REEVALUATION.md` documenting an analysis of the mini-chat implementation against its requirements.

3.  **Overall Impact:**
    - Significantly enhanced user insight into resource consumption (tokens, cost, storage) via the Usage Info feature.
    - Introduced a powerful, contextual Mini Chat feature for quick, in-place interactions, improving workflow efficiency.
    - Refined Mini Chat behavior based on detailed requirements and added key functionalities like expansion and dedicated model selection.
