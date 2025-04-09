# Plan to Fix Chat Retry Logic (Scenario 1.2.b)

**Goal:** Align the chat message retry implementation with the revised flow requirements, specifically addressing the scenario where a user message is retried, and the next message in the sequence is also a user message (or doesn't exist).

**Problem:** The current implementation waits for the API response _before_ inserting the new assistant message. The revised flow requires inserting a placeholder message _immediately_, showing a loading indicator on it, and then replacing its content upon API response.

**Affected Files:**

- `src/features/chat/types.ts`
- `src/features/chat/model.ts`
- `src/features/chat/lib.ts`
- `src/components/MessageItem.tsx`

**Implementation Steps:**

1.  **Update Types (`src/features/chat/types.ts`):**

    - Add an optional `isLoading?: boolean` field to the `Message` interface. This will help identify placeholder messages.

2.  **Modify State Management (`src/features/chat/model.ts`):**

    - Introduce a new store to track the placeholder message:
      ```typescript
      const $placeholderInfo = chatDomain.store<{
        id: string;
        originalUserId: string;
      } | null>(null, { name: "$placeholderInfo" });
      ```
      This store will hold the temporary ID of the placeholder and the ID of the user message that triggered its creation.
    - Update the `sample` block triggered by `messageRetry`:
      - Source `$messages`.
      - Filter for retries on messages with `role: 'user'`.
      - Inside the filter or `fn`, check if the message immediately following the retried user message has `role: 'user'` or does not exist.
      - If the above condition is true (Scenario 1.2.b):
        - Generate a unique temporary ID (`tempId`).
        - Create a placeholder `Message` object: `{ id: tempId, role: 'assistant', content: '', timestamp: Date.now(), isLoading: true }`.
        - Target `$messages` with a function that inserts this placeholder immediately after the retried user message in the array.
        - Target `$placeholderInfo` with the value `{ id: tempId, originalUserId: messageRetried.id }`.
      - Ensure the existing targets (`retryTriggered`, `prepareRetryParams`, `messageRetryInitiated`) are still triggered correctly for all valid retries.
    - Update the `sample` block that targets `$retryingMessageId`:
      - Source `{ messages: $messages, placeholderInfo: $placeholderInfo }`.
      - Clock on `messageRetryInitiated`.
      - Modify the `fn`:
        - If `placeholderInfo` exists and `messageRetryInitiated.payload.messageId === placeholderInfo.originalUserId`, return `placeholderInfo.id`.
        - Otherwise, use the existing logic: return `messageId` for assistant retries, or find the next assistant message ID for user retries (when not scenario 1.2.b).
    - Update the `sample` block that targets `calculatedRetryUpdate`:
      - Source `{ messages: $messages, retryContext: $retryContext, placeholderInfo: $placeholderInfo }`.
      - Clock on `apiRequestSuccess`.
      - Filter for `retryContext !== null`.
      - In the `fn`, pass the sourced `placeholderInfo` to the `calculateRetryUpdatePayloadFn` function.
    - Reset `$placeholderInfo` to `null` when the retry API call finishes (e.g., sample from `sendApiRequestFx.finally`).

3.  **Modify Library Functions (`src/features/chat/lib.ts`):**

    - Update the signature of `calculateRetryUpdatePayloadFn` to accept `placeholderInfo: { id: string, originalUserId: string } | null` as part of its first argument.
    - Inside `calculateRetryUpdatePayloadFn`:
      - Check if `placeholderInfo` exists and `retryContext.messageId === placeholderInfo.originalUserId`.
      - If true:
        - Calculate `targetIndex` by finding the index of the message with `id === placeholderInfo.id`.
        - Set `insert = false`.
        - Construct the `newAssistantMessage` using `placeholderInfo.id`, the content from the `response`, and `isLoading: false`.
      - If false: Use the existing logic based on `retryContext.role` to determine `targetIndex` and `insert`.
    - Review `updateMessagesOnRetryFn`: Ensure it correctly replaces the message at `targetIndex` using the `newAssistantMessage`, preserving the ID (which is crucial for replacing the placeholder). The existing map-based replacement should work if the ID in `newAssistantMessage` matches the placeholder's ID.

4.  **Modify UI Component (`src/components/MessageItem.tsx`):**
    - Locate the rendering logic for the `CircularProgress` spinner.
    - Add a condition to display the spinner if `message.isLoading` is true, in addition to the existing check for `isRetryingThisMessage`. This ensures the placeholder shows a spinner immediately upon creation.
      ```tsx
      // Example modification
      {
        (isRetryingThisMessage || message.isLoading) && (
          <CircularProgress
            size={20}
            sx={
              {
                /* existing styles */
              }
            }
          />
        );
      }
      ```

**Conceptual Flow Diagram (Scenario 1.2.b):**

```mermaid
graph TD
    A[User Clicks Retry on User Msg] --> B{Next Msg is User?};
    B -- Yes --> C[Create Placeholder (ID: tempId, isLoading: true)];
    C --> D[Insert Placeholder into $messages];
    D --> E[Store {tempId, originalUserId} in $placeholderInfo];
    E --> F[Trigger API Request (sendApiRequestFx)];
    F --> G[Show Spinner on Placeholder (via $retryingMessageId = tempId OR message.isLoading)];
    G -- API Success --> H[Calculate Update: Replace Placeholder (using placeholderInfo)];
    H --> I[Update Placeholder in $messages (ID: tempId, content=API response, isLoading=false)];
    I --> J[Clear Spinner & Reset $placeholderInfo];

    B -- No (Next is Assistant) --> K[Trigger API Request (sendApiRequestFx)];
    K --> L[Show Spinner on Next Assistant Msg];
    L -- API Success --> M[Calculate Update: Replace Next Assistant Msg];
    M --> N[Update Next Assistant Msg in $messages];
    N --> O[Clear Spinner & Reset $placeholderInfo];
```
