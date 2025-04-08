# Current Plan: Phase 11 Fixes

**Goal:** Address user feedback from the initial Phase 11 implementation and resolve reported issues with layout, editing, scrolling, and feature behavior.

**Priority 1: Layout & Core Functionality Fixes**

1.  **Fix Persistent Drawer Layout & Responsiveness (`page.tsx`, potentially theme/styles):**

    - **Problem:** Layout breaks, elements off-screen (History button, input field), settings drawer closes on resize, header buttons disappear, content shifts beyond the visible area.
    - **Action:**
      - Thoroughly review and correct the CSS (`marginLeft`, `marginRight`, `width`, transitions) applied to the main content wrapper (`Box component="main"`) and the persistent `Drawer` components in `page.tsx`. Ensure calculations correctly use `HISTORY_DRAWER_WIDTH` and `SETTINGS_DRAWER_WIDTH`.
      - Verify the interaction between `variant="persistent"` and the applied `sx` styles, ensuring they follow MUI best practices for persistent drawers and content shifting.
      - Debug the conditional rendering logic for the header `HistoryIcon` and `SettingsIcon` buttons. Ensure they correctly check `isHistoryPersistentOpen`, `isSettingsPersistentOpen`, AND `!isMobile`.
      - Ensure the `Toolbar` content (including the moved "New Chat" button) doesn't cause overflow or incorrect positioning due to layout shifts.
      - Investigate why the Settings drawer closes on resize. Ensure its `open` prop remains bound to `$isSettingsDrawerPersistentOpen` and that state persists correctly through resizes.
      - Test layout extensively at various screen widths and during window resizing.

2.  **Fix Message Editing Visibility (`MessageItem.tsx`, `chat/model.ts`):**

    - **Problem:** Changes made via confirm-on-outside-click aren't immediately reflected in the UI, although they seem to save to IDB eventually.
    - **Action:**
      - Analyze the sequence of events: `handleClickOutside` -> `handleEditConfirm` -> `editMessage` event -> `$messages` store update -> React re-render.
      - Ensure the `$messages.on(editMessage, ...)` handler in `chat/model.ts` correctly updates the store state synchronously.
      - Verify that the `MessageItem` component re-renders promptly when the `$messages` store updates after an edit.
      - Consider if the `handleClickOutside` listener logic needs adjustment to ensure state updates complete before further interactions. Maybe add a small loading indicator during the brief save process?

3.  **Fix Scroll Behavior (`page.tsx`, `chat/model.ts`, `ui-state/model.ts`):**
    - **Problem:** Auto-scrolling still occurs on edit confirmation and retry initiation. Requirement is to scroll _only_ after sending a _new_ user message.
    - **Action:**
      - Modify the scroll `useEffect` in `page.tsx`: It should _only_ trigger `scrollIntoView` if `$preventScroll` is `false`. Remove the logic that resets `setPreventScroll(false)` from within this effect.
      - Ensure `setPreventScroll(true)` in `chat/model.ts` is triggered reliably _before_ any action (edit, retry) that might update `$messages` and cause an unwanted scroll.
      - Ensure `setPreventScroll(false)` is triggered reliably _after_ the edit/retry flow is fully complete (e.g., after retry API response is processed, after edit UI state is settled).
      - Add a new trigger specifically for scrolling after a _new user message_ is added. Perhaps a dedicated event or sampling the `userMessageCreated` event _after_ the message is added to `$messages` and _if_ `$preventScroll` is false.

**Priority 2: Feature Adjustments & Minor Fixes**

4.  **Revert Message Outline to Hover (`MessageItem.tsx`, `ui-state/model.ts`):**

    - **Problem:** Click-based outline activation is not preferred.
    - **Action:**
      - In `MessageItem.tsx`: Restore `onMouseEnter`, `onMouseLeave`, and `isHovered` state.
      - Update `borderColor` and action button `display` styles to depend on `isHovered` again.
      - Remove the `onClick={() => setActiveId(message.id)}` handler from the outer `Paper`.
      - Remove the `useUnit` call for `$activeMessageId` and `setActiveMessageId`.
      - In `ui-state/model.ts`: Remove the `$activeMessageId` store and `setActiveMessageId` event definitions and their usage (including resets and debug entries). Update `index.ts` accordingly.

5.  **Implement Double-click to Edit (`MessageItem.tsx`):**

    - **Problem:** Feature was missed.
    - **Action:** Add an `onDoubleClick` prop to the `Card` element (line 127) that calls `handleEditClick`. Ensure this doesn't conflict with single-click selection if that's added later.

6.  **Fix Settings Tooltip Interference (`ChatSettingsContent.tsx`):**

    - **Problem:** API Key tooltip overlaps the close chevron.
    - **Action:** Adjust the `sx` prop (e.g., add padding/margin) for the `Tooltip` wrapping the API Key `TextField` or for the close `IconButton` to prevent overlap. Consider changing `placement` if necessary.

7.  **Move Regenerate Title Button (`page.tsx`, `ChatHistoryContent.tsx`, `chat-history/model.ts`):**
    - **Problem:** Button should be in the history item menu.
    - **Action:**
      - Remove the `RefreshIcon` `IconButton` from the `Toolbar` in `page.tsx`.
      - In `ChatHistoryContent.tsx`, add a new `MenuItem` to the 3-dot menu.
      - The `onClick` for this new item should trigger an event (e.g., `regenerateTitleForChat`) in `chat-history/model.ts`, passing the `menuChatId`.
      - Modify or create logic in `chat-history/model.ts` linked to this new event that calls the existing `generateTitleFx`, ensuring it uses the correct chat context (messages from the specified chat ID).

**Testing:** After each priority group (or major fix), test thoroughly across different browsers and screen sizes, focusing on the specific issues addressed and potential regressions.
