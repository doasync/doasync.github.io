Hello, here is my advice on integrating multimodal file uploads into your
application:

---

### **1. Analysis and Strategy**

#### **1.1. Discrepancy Analysis**

My analysis of the provided documents confirms the core challenge you've
identified:

- **Product Requirement (`PRD.md`):** Section 4.4.2 explicitly requires a
  "Attach File Button" for multimodal interaction, with a starting focus on
  images.
- **API Documentation (`VoidAI.app.docs.md`):** The documentation details
  several powerful but separate endpoints:
  - `chat.completions` for text-based conversational chat.
  - `images.generate` for text-to-image generation.
  - `audio.transcriptions` for speech-to-text.
  - `audio.speech` for text-to-speech.
- **The Gap:** There is no explicit documentation within `VoidAI.app.docs.md`
  that describes how to send image data _as input_ within a `chat.completions`
  call. This contrasts with the standard OpenAI API for GPT-4 Vision, which
  specifies a particular array structure for the `content` field.

#### **1.2. Proposed Strategy**

The most viable strategy is to **leverage VoidAI's stated OpenAI
compatibility**. The `VoidAI.app.docs.md` mentions that the text generation API
is "fully compatible with the OpenAI SDK". This strongly implies that VoidAI
likely supports the standard OpenAI Vision (multimodal) message format, even if
it is not explicitly documented.

Therefore, we will proceed with the following strategic assumptions:

1.  **Assume OpenAI Vision Compatibility:** We will structure our API calls to
    `chat.completions` using the standard message format for multimodal inputs
    defined by OpenAI.
2.  **Client-Side File Processing:** Given the client-side-only architecture, we
    will handle file selection and processing entirely in the browser. The
    standard approach is to use the `FileReader` API to read the selected image
    file as a **Base64-encoded Data URL**.
3.  **Direct Payload Injection:** This Base64 string will be directly embedded
    into the `chat.completions` request payload, following the OpenAI Vision
    format. No separate upload endpoint is required.
4.  **Risk Acknowledgment:** The primary risk is that this undocumented
    compatibility does not exist. The first implementation step should be a
    minimal proof-of-concept to validate this assumption. If it fails, the
    feature is blocked by the current API's capabilities, and this would need to
    be escalated.

---

### **2. Comprehensive Implementation Plan**

#### **2.1. Architectural Changes**

The core data flow will be extended to handle file attachments. The `chat`
feature will be responsible for managing the file's state from selection to
inclusion in the message payload, while the `chat-stream` feature will be
updated to transport this more complex payload.

Here is a Mermaid diagram illustrating the new flow:

```mermaid
graph TD
    subgraph User Interface
        A[MessageInput Area] -- 1. Click --> B(Attach File Button);
        B -- 2. Triggers --> C{<input type="file">};
        C -- 3. User Selects File --> D[File Object];
        D -- 4. onChange event --> E[UI Handler];
        E -- 5. FileReader API --> F[Base64 Data URL];
        F -- 6. Shows Preview in --> G[Image Preview in Input Area];
    end

    subgraph Effector State (chat feature)
        E -- Fires Event --> H(fileSelected Event);
        H -- Updates --> I[($pendingAttachment Store)<br>{ file: File, dataUrl: string }];
        J[Send Button Click] -- Fires Event --> K(messageSent Event);
        K -- Reads from --> I;
        K -- Reads from --> L[($messageText Store)];
    end

    subgraph API Request Construction (chat feature)
        K -- Triggers Logic --> M{Construct Payload};
        M -- Creates --> N[OpenAI Vision-compatible<br>messages array];
    end

    subgraph API Call (chat-stream feature)
        M -- Calls --> O(streamChatFx Effect);
        O -- Sends Payload to --> P[VoidAI API<br>/v1/chat/completions];
    end

    subgraph Message Rendering
        P -- Streams Response --> Q[MessageItem.tsx];
        Q -- Renders --> R{Text Content};
        Q -- Renders --> S{Image from Message Data};
    end

    style I fill:#f9f,stroke:#333,stroke-width:2px
    style N fill:#ccf,stroke:#333,stroke-width:2px
```

#### **2.2. Type Definitions (`src/features/chat/types.ts`)**

The `Message` interface is the most critical structure to change. We must evolve
its `content` field from a simple string to a structure capable of holding
multimodal data, mirroring the OpenAI standard.

```typescript
// In: src/features/chat/types.ts

// 1. Define the content part types
export interface TextContentPart {
  type: 'text';
  text: string;
}

export interface ImageContentPart {
  type: 'image_url';
  image_url: {
    // The URL can be a public URL or a Base64 Data URL
    url: string;
    // Optional: detail level, defaults to 'auto'
    detail?: 'low' | 'high' | 'auto';
  };
}

// Union of all possible content parts
export type MessageContentPart = TextContentPart | ImageContentPart;

// 2. Update the Message interface
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  // 'content' is now an array of parts for user messages, or a string for assistant/system messages.
  content: string | MessageContentPart[];
  // This field will be used for rendering the image in the UI after sending
  // It stores the Data URL locally so we don't have to keep the full base64 in the main content state if it was large
  attachmentDataUrl?: string;
  timestamp: number;
  isEdited?: boolean;
  originalContent?: string | MessageContentPart[];
  isLoading?: boolean;
  isRetryOf?: string;
}
```

#### **2.3. State Management (`src/features/chat/model.ts`)**

We need to introduce state for managing the file selection process within the
`chat` feature.

**New Stores:**

- `$pendingAttachment: Store<{ file: File; dataUrl: string } | null>`: Holds the
  file object and its Base64 Data URL while it's in the input area, before being
  sent.

**New Events:**

- `fileSelected: Event<File>`: Triggered by the UI when the user picks a file.
- `fileAttachmentCleared: Event<void>`: Triggered by the UI to remove the
  pending file.

**Updated Logic:**

1.  **File Handling Flow:**

    - A new effect, `readFileAsDataUrlFx`, will be created to handle the
      `FileReader` logic asynchronously.
    - `sample` will connect `fileSelected` to this effect.
    - On completion, `readFileAsDataUrlFx.doneData` will update the
      `$pendingAttachment` store.

    ```typescript
    // In: src/features/chat/model.ts

    import { createEffect } from 'effector';

    // New state for the pending file attachment
    export const $pendingAttachment = chatDomain.createStore<{
      file: File;
      dataUrl: string;
    } | null>(null);

    // New events
    export const fileSelected = chatDomain.createEvent<File>();
    export const fileAttachmentCleared = chatDomain.createEvent<void>();

    // Effect to read file data
    export const readFileAsDataUrlFx = createEffect<File, string>((file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
    });

    // Wire events to state
    $pendingAttachment
      .on(
        readFileAsDataUrlFx.done,
        (state, { params: file, result: dataUrl }) => ({ file, dataUrl }),
      )
      .reset(fileAttachmentCleared, messageSent); // Clear attachment on clear or send

    sample({
      clock: fileSelected,
      target: readFileAsDataUrlFx,
    });
    ```

2.  **Message Sending (`messageSent` event):**

    - The logic triggered by `messageSent` must be updated to read from
      `$pendingAttachment`.
    - If an attachment exists, it will construct the `MessageContentPart[]`
      array.
    - The new `Message` object added to the `$messages` store will include the
      `attachmentDataUrl` for immediate rendering.

    ```typescript
    // Inside the sample for messageSent

    // ...
    fn: ({ text, attachment, ... }) => {
      const contentParts: MessageContentPart[] = [];

      // Add text part
      if (text.trim()) {
        contentParts.push({ type: 'text', text: text.trim() });
      }

      // Add image part if it exists
      if (attachment) {
        contentParts.push({
          type: 'image_url',
          image_url: { url: attachment.dataUrl },
        });
      }

      // If no content, do nothing
      if (contentParts.length === 0) return null;

      const newUserMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: contentParts,
        attachmentDataUrl: attachment?.dataUrl, // For UI rendering
        timestamp: Date.now(),
      };

      return newUserMessage;
    },
    // ...
    ```

#### **2.4. API Interaction (`chat-stream` feature)**

The `chat-stream` feature must be updated to accept the new multimodal message
structure.

1.  **Update Types (`src/features/chat-stream/types.ts`):**

    - The `StreamChatParams` interface must be modified to use the new
      `MessageContentPart` type.

    ```typescript
    // In: src/features/chat-stream/types.ts

    import { MessageContentPart } from '@/features/chat/types'; // Import from chat feature

    export interface StreamChatMessage {
      role: 'system' | 'user' | 'assistant';
      // This is the key change
      content: string | MessageContentPart[];
      // ... other optional fields like 'name'
    }

    export interface StreamChatParams {
      streamId: string;
      model: string;
      // Use the updated message type
      messages: StreamChatMessage[];
      apiKey: string;
      temperature?: number;
      // ... other params and callbacks
    }
    ```

2.  **No Logic Change Needed:** The core logic of `api.ts` and `model.ts` in
    `chat-stream` should not require changes. `fetchChatStream` in `api.ts`
    already uses `JSON.stringify(body)`, which will correctly serialize the more
    complex nested array structure of the multimodal message. The change is
    purely at the type-definition level to allow the new payload structure to
    pass through.

#### **2.5. UI Components**

Several UI components will need to be created or modified.

1.  **Attach File Button (`MessageInput.tsx`):**

    - Add an `IconButton` with a paperclip (`AttachFile`) icon.
    - This button will be associated with a visually hidden
      `<input type="file" accept="image/*">`. Clicking the icon button will
      programmatically trigger a click on the input element.
    - An `onChange` handler on the file input will grab the selected `File`
      object and call the `fileSelected(file)` Effector event.

2.  **Image Preview (`MessageInput.tsx`):**

    - Use the `useUnit` hook from `effector-react` to subscribe to the
      `$pendingAttachment` store.
    - When `$pendingAttachment` is not null, render a small preview of the image
      inside or above the text input area.
    - The preview container should include a "remove" (`<CloseIcon />`) button
      that, when clicked, fires the `fileAttachmentCleared()` event.

    ```jsx
    // In MessageInput.tsx (conceptual)
    const pendingAttachment = useUnit($pendingAttachment);

    return (
      <Box>
        {pendingAttachment && (
          <Box position="relative" width="80px" height="80px">
            <img
              src={pendingAttachment.dataUrl}
              alt="Preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <IconButton
              onClick={() => fileAttachmentCleared()}
              size="small"
              style={{ position: 'absolute', top: 0, right: 0 }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        )}
        <TextField /* ... */ />
        <IconButton onClick={handleAttachClick}>
          <AttachFileIcon />
        </IconButton>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          hidden
          accept="image/*"
        />
        {/* ... Send Button ... */}
      </Box>
    );
    ```

3.  **Image Rendering (`MessageItem.tsx`):**

    - The component's logic must be updated to handle `message.content` being
      either a string or an array.
    - It should also check for `message.attachmentDataUrl` for user messages to
      render the image that was sent.
    - If `message.role === 'user'` and `message.attachmentDataUrl` exists,
      render an `<img>` tag with the `src` set to this Data URL.
    - The `react-markdown` component should process the text part of the
      content.

    ```jsx
    // In MessageItem.tsx (conceptual)

    // Helper to extract text from content
    const getTextContent = (content) => {
      if (typeof content === 'string') return content;
      const textPart = content.find((part) => part.type === 'text');
      return textPart ? textPart.text : '';
    };

    const text = getTextContent(message.content);

    return (
      <Box>
        {/* Render the image if it exists */}
        {message.role === 'user' && message.attachmentDataUrl && (
          <img
            src={message.attachmentDataUrl}
            alt="User attachment"
            style={{ maxWidth: '300px', borderRadius: '8px' }}
          />
        )}

        {/* Render the text content via Markdown */}
        {text && <MarkdownRenderer content={text} />}
      </Box>
    );
    ```

#### **2.6. Sequence of Work**

This is the recommended order of implementation to ensure a smooth development
process.

1.  **Validate the Core Assumption (Proof of Concept):**

    - Before any significant coding, create a minimal, hard-coded test case. Use
      a tool like Postman or a simple `fetch` script to send a request to the
      VoidAI `chat.completions` endpoint using a Base64 encoded image and the
      OpenAI Vision message format. **If this fails, the entire plan must be
      re-evaluated.**

2.  **Update Foundational Types:**

    - Modify the `Message` interface and define
      `TextContentPart`/`ImageContentPart` in `src/features/chat/types.ts`.
    - Update `StreamChatParams` and related types in
      `src/features/chat-stream/types.ts`.

3.  **Implement Core Logic (Effector):**

    - Add the `$pendingAttachment` store, `fileSelected`/`fileAttachmentCleared`
      events, and the `readFileAsDataUrlFx` effect to
      `src/features/chat/model.ts`.
    - Update the `messageSent` logic to correctly construct the new multimodal
      `content` array and populate `attachmentDataUrl`.

4.  **Develop UI for Input:**

    - Add the "Attach File" button and the hidden file input to
      `MessageInput.tsx`.
    - Implement the `onChange` handler to call the `fileSelected` event.
    - Build the preview component within `MessageInput.tsx` that displays the
      image from `$pendingAttachment` and allows for its removal.

5.  **Develop UI for Rendering:**

    - Modify `MessageItem.tsx` to correctly render messages containing images.
      Ensure it can handle the new `content` array structure and uses
      `attachmentDataUrl`.

6.  **End-to-End Testing:**
    - Thoroughly test the entire flow: selecting an image, seeing the preview,
      sending the message, seeing it render correctly in the chat history, and
      confirming the LLM's response is contextually aware of the image.
    - Test all edge cases: sending an image with no text, sending text with no
      image, clearing an attachment, handling different image types/sizes, and
      error handling for file reading.
