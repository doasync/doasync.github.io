# Phase 11: UI/UX Refinements Plan

**Goals:**

1.  Implement single active message outline on click.
2.  Fix message editing: Confirm on outside click, correct cancel behavior.
3.  Prevent automatic scrolling on message retry and edit confirmation.
4.  Adjust UI layout: Move "New Chat" button, implement persistent History and Settings drawers on desktop.

**Detailed Steps:**

1.  **Message Outline/Active State Management:**
    - **State (`ui-state/model.ts`):** Add `$activeMessageId = createStore<string | null>(null)` store and `setActiveMessageId = createEvent<string | null>()` event. Reset on new chat load (`chatSelected`, `newChatCreated`).
    - **Component (`MessageItem.tsx`):** Use `useUnit` for state/event. Add `onClick` to outer `Paper` to set ID. Update `borderColor` and action button `display` based on `activeMessageId`, removing hover logic.
2.  **Message Editing Enhancements:**
    - **Cancel Revert (`MessageItem.tsx`):** Add state `const [originalContentOnEdit, setOriginalContentOnEdit] = useState<string>('');`. Store `message.content` in it via `handleEditClick`. Update `handleEditCancel` to revert `editedText` to `originalContentOnEdit`.
    - **Confirm on Outside Click (`MessageItem.tsx`):** Add `useRef` to outer `Paper`. Remove `onBlur` from `InputBase`. Add `useEffect` hook with `mousedown` listener to call `handleEditConfirm` if click is outside the `messageItemRef.current`.
    - **Effector Model (`chat/model.ts`):** Verify `editMessage` is only triggered by `handleEditConfirm`.
3.  **Scroll Behavior Fixes:**
    - **State (`ui-state/model.ts`):** Add `$preventScroll = createStore<boolean>(false)` store and `setPreventScroll = createEvent<boolean>()` event.
    - **Retry Flow (`chat/model.ts`):** Use `sample` to trigger `setPreventScroll(true)` before retry API call and `setPreventScroll(false)` after retry API call finishes (using `sendApiRequestFx.finally`). Reset `$retryingMessageId`.
    - **Edit Flow (`chat/model.ts`):** Use `sample` to trigger `setPreventScroll(true)` on `editMessage`.
    - **Scroll Logic (`page.tsx`):** Get `$preventScroll` via `useUnit`. Modify scroll `useEffect`: check `!preventScroll` before scrolling. Reset `preventScroll` to `false` within the effect if it was true (to handle edit flow). Add `preventScroll` to dependencies. Import `setPreventScroll` event.
4.  **UI Layout Adjustments:**
    - **"New Chat" Button (`page.tsx`):** Move the `AddCommentIcon` `IconButton` block to be right after the `HistoryIcon` `IconButton`. Adjust spacing.
    - **Persistent Drawers (Desktop - `page.tsx` & `ui-state/model.ts`):**
      - Add persistent open state stores (`$isHistoryDrawerPersistentOpen`, `$isSettingsDrawerPersistentOpen`) and localStorage load/save logic in `ui-state`.
      - Update drawer toggle/open/close events to use these persistent stores.
      - Change Drawer `variant` to `"persistent"` in `page.tsx`. Use persistent stores for `open` prop.
      - Conditionally hide header open buttons based on persistent open state.
      - Add close buttons inside `ChatHistoryContent.tsx` and `ChatSettingsContent.tsx`.
      - Apply conditional `marginLeft`/`marginRight` with transitions to the main content wrapper in `page.tsx` based on persistent drawer open states. Define drawer width constants.

**Mermaid Diagram:**

```mermaid
graph TD
    subgraph "Phase 11: UI/UX Refinements"
        direction LR
        A("1. Message Outline") --> A1("Add $activeMessageId store (ui-state)");
        A --> A2("MessageItem: onClick sets ID");
        A --> A3("MessageItem: borderColor uses active ID");
        A --> A4("MessageItem: Action buttons visibility uses active ID");
        A --> A5("MessageItem: Remove hover state/handlers");

        B("2. Message Editing") --> B1("MessageItem: Store original content on edit start");
        B --> B2("MessageItem: handleEditCancel reverts to stored original");
        B --> B3("MessageItem: Implement Confirm on Outside Click (useEffect, ref, listener)");
        B --> B4("MessageItem: Remove onBlur confirm");

        C("3. Scroll Behavior") --> C1("Add $preventScroll store (ui-state)");
        C --> C2("chat/model: Set preventScroll=true on retry/edit start");
        C --> C3("chat/model: Set preventScroll=false on retry end");
        C --> C4("page.tsx: Condition scroll useEffect on !preventScroll");
        C --> C5("page.tsx: Reset preventScroll after check (for edit)");

        D("4. Layout Adjustments") --> D1("page.tsx: Move 'New Chat' button");
        D --> D2("Implement Persistent Drawers (Desktop)");
        D2 --> D2a("ui-state: Add persistent open stores & localStorage logic");
        D2 --> D2b("page.tsx: Use variant='persistent'");
        D2 --> D2c("page.tsx: Use persistent open stores for 'open' prop");
        D2 --> D2d("page.tsx: Conditionally hide header open buttons");
        D2 --> D2e("Content Components: Add internal close buttons");
        D2 --> D2f("page.tsx: Apply conditional margins to main content for shifting");
    end
```
