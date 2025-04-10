# Mini-Chat Feature Integration Plan

---

## Overview

This document describes **how to integrate the Inline Draggable Mini Chat Assistant** into the existing chat UI, following the FRD and development plan.

---

## 1. Enhance Chat Message Components

- In `src/components/MessageItem.tsx`, **add the CSS class `chat-message`** to the outermost container of each chat message to enable selection detection.

Example:

```tsx
<Paper className="chat-message" ...>
  {/* message content */}
</Paper>
```

---

## 2. Use the Text Selection Detection Hook

- In your **chat message list container**, likely `src/components/ChatHistoryContent.tsx`, **import and invoke**:

```tsx
import { useMiniChatTextSelection } from "../features/mini-chat/useTextSelection";

function ChatHistoryContent() {
  useMiniChatTextSelection();

  return <div>{/* your chat message list */}</div>;
}
```

- This hook listens for user text selection **inside `.chat-message` elements** and triggers the mini-chat toolbar accordingly.

---

## 3. Render Mini-Chat Overlay Components Globally

- In your **main layout** or **chat page**, **import and render**:

```tsx
import { MiniChatToolbar } from "../features/mini-chat/MiniChatToolbar";
import { MiniChatDialog } from "../features/mini-chat/MiniChatDialog";

function AppLayout() {
  return (
    <>
      {/* existing layout */}
      <MiniChatToolbar />
      <MiniChatDialog />
    </>
  );
}
```

- These components will **overlay the chat UI** when active, enabling the mini-chat flows.

---

## 4. Backend API Endpoint

- Implement the `/api/assistant` endpoint to process mini-chat queries.
- Connect it to your LLM provider (OpenRouter, OpenAI, etc).
- Handle latency and errors gracefully.

---

## 5. Expanding to Full Chat

- When the user clicks **Expand** in Mini Chat, the ephemeral conversation should be **saved into your persistent chat history**.
- Use the existing chat history Effector stores or APIs to **create a new saved chat session** with the mini chat's messages.
- Close the ephemeral mini chat afterwards.

---

## 6. Summary Diagram

```mermaid
flowchart TD
    subgraph ChatUI["Existing Chat UI"]
        A[ChatHistoryContent]
        B[MessageItem (.chat-message)]
    end

    subgraph MiniChatFeature["Mini Chat Feature"]
        C[useMiniChatTextSelection hook]
        D[MiniChatToolbar]
        E[MiniChatDialog]
        F[Effector Stores/Events]
    end

    A -->|renders multiple| B
    A -->|calls| C
    D --> F
    E --> F
    C --> F
    F --> D
    F --> E
```

---

## 7. Summary

- The mini-chat feature **augments** your chat UI with contextual, ephemeral AI conversations.
- It is **isolated yet easily integrated** via CSS class, hook, and overlay components.
- It **does not disrupt** existing chat flows.
- It **supports expansion** to saved chats, aligning with your data model.

---

Prepared by Roo, 2025.
