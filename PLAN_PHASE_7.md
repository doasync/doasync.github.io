# Phase 7: Message Actions - Detailed Plan

```mermaid
graph TD
    subgraph Phase7 [Phase 7: Message Actions]
    direction TB
        subgraph 7.1 Edit Message
        direction TB
            7.1.1[7.1.1 Add edit state to messages (isEdited, originalContent)]
            7.1.2[7.1.2 Create Effector events: messageEditStarted, messageEditCancelled, messageEditConfirmed]
            7.1.3[7.1.3 Add UI elements in MessageItem to trigger edit mode ("Edit" icon in MessageActions)]
            7.1.4[7.1.4 Implement inline editing in MessageItem (replace text with input)]
            7.1.5[7.1.5 Handle edit confirm/cancel in MessageItem, trigger Effector events]
            7.1.6[7.1.6 Update saveChatFx to persist edited messages in IndexedDB]
            7.1.7[7.1.7 Update sendApiRequestFx to use edited message content]
            7.1.1 --> 7.1.2 --> 7.1.3 --> 7.1.4 --> 7.1.5 --> 7.1.6 --> 7.1.7
        end

        subgraph 7.2 Delete Message
        direction TB
            7.2.1[7.2.1 Create Effector event: messageDeleted]
            7.2.2[7.2.2 Add "Delete" icon in MessageActions in MessageItem]
            7.2.3[7.2.3 Implement delete logic in MessageItem, trigger messageDeleted]
            7.2.4[7.2.4 Update $currentChat.messages store to remove deleted message]
            7.2.5[7.2.5 Update saveChatFx to persist chat without deleted message]
            7.2.6[7.2.6 Update sendApiRequestFx to exclude deleted messages]
            7.2.1 --> 7.2.2 --> 7.2.3 --> 7.2.4 --> 7.2.5 --> 7.2.6
        end

        subgraph 7.3 Retry Message
        direction TB
            7.3.1[7.3.1 Create Effector event: messageRetry]
            7.3.2[7.3.2 Add "Retry" icon in MessageActions in MessageItem]
            7.3.3[7.3.3 Implement retry logic in MessageItem, trigger messageRetry]
            7.3.4[7.3.4 Implement retry logic in chat.ts (prepare history, trigger sendApiRequestFx, update $currentChat.messages)]
            7.3.5[7.3.5 Update UI to show loading indicator while retrying]
            7.3.6[7.3.6 Regenerate only the immediately following model response]
            7.3.1 --> 7.3.2 --> 7.3.3 --> 7.3.4 --> 7.3.5 --> 7.3.6
        end

        subgraph 7.4 Copy Message
        direction TB
            7.4.1[7.4.1 Add "Copy Text" icon in MessageActions in MessageItem]
            7.4.2[7.4.2 Implement "Copy Text" logic in MessageItem to copy plain text content to clipboard]
            7.4.3[7.4.3 Add "Copy Markdown/Code" icon in MessageActions in MessageItem]
            7.4.4[7.4.4 Implement "Copy Markdown/Code" logic in MessageItem to copy markdown content to clipboard]
            7.4.1 --> 7.4.2 --> 7.4.3 --> 7.4.4
        end
    Phase7 --- 7.1
    Phase7 --- 7.2
    Phase7 --- 7.3
    Phase7 --- 7.4
    end
```

Here is the updated plan for **Phase 7: Message Actions**, now including the "Copy Message" feature and reflecting the clarifications:

**Phase 7 Plan:**

1.  **Implement Edit Message Functionality (7.1):**

    - 7.1.1. Add state to the \`messages\` array in \`$currentChat\` to track edit status for each message, including \`isEdited: boolean\` and \`originalContent: string\`.
    - 7.1.2. Create new Effector events: \`messageEditStarted\`, \`messageEditCancelled\`, and \`messageEditConfirmed\` in \`src/model/chat.ts\`.
    - 7.1.3. In \`src/components/MessageItem.tsx\`, add UI elements within the \`MessageActions\` component to trigger edit mode. This will be an "Edit" icon button that appears on hover or click of the message.
    - 7.1.4. When edit mode is active for a \`MessageItem\`, implement inline editing. Replace the static message text with a text input field, allowing direct modification within the chat window.
    - 7.1.5. Implement handlers for edit confirmation (e.g., "Save" button or Enter key) and cancellation (e.g., "Cancel" button or Escape key) in \`MessageItem.tsx\`. Trigger \`messageEditConfirmed\` and \`messageEditCancelled\` Effector events, passing updated/original content.
    - 7.1.6. Update \`saveChatFx\` in \`src/model/history.ts\` to persist edited messages (including \`isEdited\` and \`originalContent\`) in IndexedDB.
    - 7.1.7. Modify \`sendApiRequestFx\` in \`src/model/chat.ts\` to use the edited message content for API requests.

2.  **Implement Delete Message Functionality (7.2):**

    - 7.2.1. Create a new Effector event: \`messageDeleted\` in \`src/model/chat.ts\`.
    - 7.2.2. In \`src/components/MessageItem.tsx\`, add a "Delete" icon button within \`MessageActions\`, appearing on hover/click.
    - 7.2.3. Implement delete logic in \`MessageItem.tsx\`. Clicking "Delete" triggers \`messageDeleted\` event with the message ID.
    - 7.2.4. Update \`$currentChat.messages\` store in \`src/model/chat.ts\` to handle \`messageDeleted\`, removing the message from the \`$messages\` array.
    - 7.2.5. Update \`saveChatFx\` in \`src/model/history.ts\` to persist chat history without the deleted message in IndexedDB.
    - 7.2.6. Ensure \`sendApiRequestFx\` in \`src/model/chat.ts\` excludes deleted messages for API requests.

3.  **Implement Retry Message Functionality (7.3):**

    - 7.3.1. Create a new Effector event: \`messageRetry\` in \`src/model/chat.ts\`.
    - 7.3.2. In \`src/components/MessageItem.tsx\`, add a "Retry" icon button in \`MessageActions\`, appearing on hover/click.
    - 7.3.3. Implement retry logic in \`MessageItem.tsx\`. Clicking "Retry" triggers \`messageRetry\` event with the message to be retried.
    - 7.3.4. Implement retry logic in \`src/model/chat.ts\` to handle \`messageRetry\`:
      - Identify the message being retried.
      - Prepare chat history (up to and including user message for user retry, up to preceding user message for model retry).
      - Trigger \`sendApiRequestFx\` with prepared history.
      - On new model response, update \`$currentChat.messages\`. Replace only the _immediately following_ model response when retrying a user message, or the _current_ model response when retrying a model message. Preserve subsequent history.
    - 7.3.5. Update UI in \`src/components/MessageItem.tsx\` to show a loading indicator on the message being retried.
    - 7.3.6. Ensure only the immediately following model response is regenerated when retrying a user message.

4.  **Implement Copy Message Functionality (7.4):**
    - 7.4.1. In \`src/components/MessageItem.tsx\`, add a "Copy Text" icon button within \`MessageActions\`, appearing on hover/click.
    - 7.4.2. Implement "Copy Text" logic in \`MessageItem.tsx\` to copy the plain text content of the message to the clipboard.
    - 7.4.3. In \`src/components/MessageItem.tsx\`, add a "Copy Markdown/Code" icon button within \`MessageActions\`, appearing on hover/click.
    - 7.4.4. Implement "Copy Markdown/Code" logic in \`MessageItem.tsx\` to copy the message content, formatted as Markdown or code (preserving formatting where possible), to the clipboard.

Are you pleased with this updated plan for Phase 7? Would you like me to save this plan to a markdown file? After that, we can switch to code mode to begin implementation.
