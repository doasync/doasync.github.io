I have now had the opportunity to test the implemented vision-enabled chat
functionality (Phase 1.1), and I've identified several critical issues and areas
for improvement.

**Observed Issues:**

1.  **Inability to Upload Multiple Photos Simultaneously:** The current
    interface only allows me to attach one photo at a time. I need the ability
    to select and upload multiple photos concurrently.
2.  **Images Not Sent to VoidAI Model:** Despite attaching images in the UI,
    they are not being sent to the VoidAI API. I've observed the following in
    the Chrome Network tab for a message where I attached an image and sent the
    text "I have attached the image. Did you get it?":

    ```json
    {
      "model": "chatgpt-4o-latest",
      "messages": [
        {
          "id": "83b4763a-902c-48ee-8f7b-c489eaf2177f",
          "role": "user",
          "content": "can you see the images? Do you support vision?",
          "timestamp": 1749482213786
        },
        {
          "id": "4e6c08fd-e48f-4049-a1ed-0b47e677f799",
          "role": "assistant",
          "content": "Yes, I can help interpret and analyze images! If you upload an image, I can assist with tasks such as identifying objects, describing the contents, reading text within the image (OCR), and more. Feel free to share an image, and let me know what you'd like help with.",
          "timestamp": 1749482213786,
          "isLoading": false
        },
        {
          "id": "a58647fd-fea3-4188-95f7-17d06b37b406",
          "role": "user",
          "content": "I have attached the image. Did you get it?",
          "timestamp": 1749482246783
        },
        {
          "id": "7dd9a73f-0e82-40aa-84bf-626c5ca8924b",
          "role": "assistant",
          "content": "It looks like the image didn’t come through. Could you please try uploading it again? Once it's successfully uploaded, I’ll be able to help you analyze or interpret it. Let me know what you’d like me to do with the image once it’s attached!",
          "timestamp": 1749482246783,
          "isLoading": false
        },
        {
          "id": "53619297-1907-4d9f-9b45-4655c57ac7e0",
          "role": "user",
          "content": "I have attached the image. Did you get it now?",
          "timestamp": 1749483115658
        }
      ],
      "temperature": 0.7,
      "stream": true
    }
    ```

    The assistant's response "It looks like the image didn’t come through"
    confirms that the image data is not being correctly transmitted in the API
    request.

3.  **Images Not Displayed in Chat History:** Uploaded images are not visible
    within the main chat history window after being sent.

**Desired Functionality and User Experience (UX) Enhancements:**

The current implementation of image attachments, where they are "pending" near
the prompt box, is not ideal. I envision a more integrated and persistent
approach:

- **Images as First-Class Messages:** Each uploaded image (or any future file
  type) should be treated as a distinct message within the main chat window,
  similar to how text messages appear. This means that upon selection, an image
  should immediately appear in the chat history as a "user message" containing
  only the image, and then be sent to the model.
- **Multiple Image Messages:** This implies that selecting multiple photos
  should result in multiple, separate image messages appearing sequentially in
  the chat history.
- **Persistent File Messages:** These image messages, like text messages, must
  be persistent and saved as part of the conversation history.
- **Dedicated File Actions:** Each image message in the chat history should have
  specific actions associated with it, replacing the generic "Edit"
  functionality:
  - **Delete:** To remove the image message from the history.
  - **Replace:** To swap the image in that specific message with a new one.
  - **Regenerate:** To resend that specific image message to the AI model.

**Request for Plan Refinement:**

Given these critical issues and the significant shift in the desired UX for file
attachments, I believe our existing integration plans need a thorough
re-evaluation and adjustment.

Please:

1.  **Review the provided
    [`VOIDAI_FULL_INTEGRATION_PLAN.md`](VOIDAI_FULL_INTEGRATION_PLAN.md)**
    (especially Phase 1.1) and **re-read
    [`Multimodal_Chat_Implementation_Plan.md`](Multimodal_Chat_Implementation_Plan.md)**
    in light of the issues described above and the new desired UX for file
    attachments.
2.  **Analyze the current implementation** to pinpoint why images are not being
    sent to the model and why they are not appearing in the chat history.
3.  **Propose a refined plan** that addresses these issues and incorporates the
    new UX requirements (multiple uploads, images as separate messages,
    persistent history, and specific file actions). This refined plan should
    detail the necessary architectural, state management, API interaction, and
    UI component changes.

I look forward to your detailed analysis and the improved plan.

---

## Task: Re-architect Multimodal Image Uploads to "First-Class Messages"

**Context:**

Previously, we implemented a basic image upload feature, treating images as
"pending attachments" associated with the chat input field
(@VOIDAI_FULL_INTEGRATION_PLAN.md). This initial approach has proven to be
problematic and does not align with the desired user experience for a modern
multimodal chat application.

**Observed Issues with Current Implementation:**

1.  **Limited Uploads:** Users can only attach one image at a time.
2.  **Images Not Sent to AI:** Despite appearing in the UI, attached images are
    not being correctly included in the API requests sent to the VoidAI model.
3.  **Images Not Persistent in History:** Uploaded images do not appear as part
    of the permanent chat history after being sent.

**Desired User Experience (UX) Shift:**

The core problem is the "pending attachment" model. We need to move towards a
more intuitive and robust experience where images are treated as "first-class
messages" within the chat history, similar to how text messages are handled.

Here's the desired UX:

- **Immediate Display:** When a user selects one or more images, they should
  immediately appear in the main chat history window as distinct "user messages"
  containing only the image(s).
- **Multiple Image Messages:** Selecting multiple photos should result in
  multiple, separate image messages appearing sequentially in the chat history.
- **Persistent File Messages:** These image messages, like text messages, must
  be persistent and saved as part of the conversation history.
- **Explicit API Trigger:** Crucially, these image messages, once displayed in
  the history, are initially in a **"pending send" state**. They are _not_
  automatically sent to the VoidAI API upon upload. The API call will only be
  triggered when the user explicitly sends a _subsequent text message_. At that
  point, the new text message will be intelligently bundled with any immediately
  preceding "pending" image messages into a single, multimodal API request.
- **Dedicated File Actions:** For image messages in the chat history, the
  generic "Edit" functionality should be replaced with more appropriate actions:
  - **Delete:** To remove the image message from the history.
  - **Replace:** (Deferred for a future phase due to complexity)
  - **Regenerate:** (Deferred for a future phase due to complexity)

**Architectural Rationale for the Shift:**

This architectural shift from "pending attachments" to "first-class messages"
offers several significant advantages:

- **Improved User Feedback:** Users get immediate visual confirmation that their
  images have been processed and added to the conversation context.
- **Enhanced Control:** Users have explicit control over when their images are
  sent to the AI, allowing them to compose a full thought (multiple images +
  text) before engaging the model.
- **Robustness:** Eliminates the race condition that caused images to be dropped
  from API requests.
- **Scalability:** Provides a more natural extension point for other multimodal
  inputs (e.g., audio, documents) in the future, as they can all be treated as
  distinct messages.
- **Clearer Conversation Flow:** The chat history accurately reflects all user
  inputs, whether text or media.

**High-Level Plan Overview:**

The implementation will involve a refactor of our Effector state management and
UI components.

1.  **Core State Management Re-architecture:**

    - The existing "pending attachments" state and related logic will be
      removed.
    - A new mechanism will be introduced to process selected files and
      immediately create `Message` objects for them, which are then added to the
      main `$messages` store. These messages will have a new `status` property
      (e.g., `'pending'`) to indicate they are awaiting an API send.
    - The `fileSelected` event will be updated to handle multiple files.

2.  **Smart Context Bundling for API Calls:**

    - When the user sends a text message, the system will intelligently identify
      this new text message and any contiguous, immediately preceding image-only
      messages that are in a `'pending'` status.
    - The content of these identified messages will be combined into a single,
      multimodal API payload, which is then sent to the VoidAI chat completions
      endpoint.
    - Once successfully sent, the `status` of these bundled image messages will
      be updated from `'pending'` to `'sent'`.

3.  **UI Component Adaptation:**
    - The image attachment input component (`ImageAttachmentInput.tsx`) will be
      simplified to only handle file selection, removing its preview display
      responsibilities.
    - The message item component (`MessageItem.tsx`) will be updated to:
      - Visually indicate the `'pending'` status of image messages.
      - Conditionally display appropriate actions (e.g., "Delete" instead of
        "Edit") for image-only messages.

**Your Task:**

Implement the architectural shift described above. You have the autonomy to
decide the specific implementation details (e.g., how to structure effects,
events, and stores within Effector, precise UI component changes). Focus on
delivering a robust solution that adheres to the "first-class message"
principle, enables multiple image uploads, correctly sends images with text, and
displays them persistently in the chat history.

You have access to the full codebase. Please prioritize correctness,
maintainability, and a clean separation of concerns in your implementation.
