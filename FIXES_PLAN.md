# Current Plan: Fixes

**Layout & Core Functionality Fixes**

1.  **Fix Persistent Drawer Layout & Responsiveness (`page.tsx`, potentially theme/styles):**

    - **Problem:** Layout is not polished, elements are not fully stretched to width (New Message input field, message bubbles), settings drawer closes on resize (should've transform into bottom drawer tab), header buttons are on top of settings drawer, chat flow is not aligned to center, no message alignment (left, right) to differentiete roles.

2.  **Fix Message Editing Visibility (`MessageItem.tsx`, `chat/model.ts`):**

    - **Problem:** Changes made via confirm-on-outside-click aren't immediately reflected in the UI, although they seem to save to IDB eventually.

3.  **Fix Scroll Behavior (`page.tsx`, `chat/model.ts`, `ui-state/model.ts`):**
    - **Problem:** Auto-scrolling sould occur on _only_ after sending a _new_ user message, not on edit confirmation and retry initiation.
4.  **Message Outline (`MessageItem.tsx`, `ui-state/model.ts`):**

    - **Problem:** In editing message mode, the highlighting with outline should be kept (hover on other elements should stop), so that the editing element is always outlined. Only one element can be outlined (multiple should be impossible).

5.  **Retry logic doesn't update the message (`MessageItem.tsx`):**

    - **Problem:** A new message is received but doesn't applied.
