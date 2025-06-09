
**Subject: Comprehensive Implementation Plan for Multimodal File Uploads with VoidAI API**

Hello Claude,

My goal is to implement file upload functionality (specifically for images) in my LLM chat application, enabling multimodal interaction as specified in my Product Requirements Document ([`PRD.md`](PRD.md:1)). I need you to act as a senior software architect and provide a comprehensive, exhaustive plan for this implementation.

### **1. Current Project Context**

To give you a complete picture, here is the state of the project:

*   **Technology Stack:** The application is a client-side only SPA built with TypeScript, React, Next.js, and Material UI. We use **Effector** for state management.
*   **Architecture:** We have a modular, feature-based architecture. All API interactions are designed to go through a unified, OpenAI-compatible provider: **VoidAI**.
*   **Core Features Implemented:**
    *   **`chat-stream` ([`src/features/chat-stream/FRD.md`](src/features/chat-stream/FRD.md:1)):** A reusable, stateless feature that handles all Server-Sent Events (SSE) streaming from the VoidAI API. It manages the `fetch` lifecycle, stream parsing, and cancellation via `AbortController`.
    *   **`chat` ([`src/features/chat/FRD.md`](src/features/chat/FRD.md:1)):** The main chat interface, which consumes `chat-stream` to send messages and receive real-time responses. It manages the conversation state, including messages, retries, and drafts.
    *   **`mini-chat`:** A secondary, contextual chat dialog that also consumes the `chat-stream` feature for its functionality.

### **2. The Core Challenge**

We are now integrating the **VoidAI API** ([`VoidAI.app.docs.md`](VoidAI.app.docs.md:1)) across the application.

*   **Requirement:** Our [`PRD.md`](PRD.md:25) explicitly requires the ability for users to attach files (starting with images) to their messages for multimodal conversations.
*   **The Gap:** After a thorough review of the provided [`VoidAI.app.docs.md`](VoidAI.app.docs.md:1), it is **not immediately clear how to include image data within a standard `chat.completions` API call**. The documentation provides examples for text-only chat, separate endpoints for image *generation* (from a text prompt), and speech-to-text, but it does not specify the message format for sending images *as input* in a chat conversation (e.g., like OpenAI's array-based content with `type: "image_url"`).

### **3. Your Task**

Please perform the following:

1.  **Analyze and Strategize:**
    *   Thoroughly analyze the following documents: [`PRD.md`](PRD.md:1), [`chat-stream/FRD.md`](src/features/chat-stream/FRD.md:1), [`chat/FRD.md`](src/features/chat/FRD.md:1), and [`VoidAI.app.docs.md`](VoidAI.app.docs.md:1).
    *   Thoroughly analyze the following documents: [`PRD.md`](PRD.md:1), [`chat-stream/FRD.md`](src/features/chat-stream/FRD.md:1), [`chat/FRD.md`](src/features/chat/FRD.md:1), and [`VoidAI.app.docs.md`](VoidAI.app.docs.md:1).
    *   Identify and articulate the discrepancy between the product requirement for multimodal chat and the apparent capabilities of the `VoidAI` chat completions API as documented.
    *   Propose a high-level **strategy** to bridge this gap. Consider potential solutions or workarounds. For instance:
        *   Does the API's "OpenAI compatibility" imply that it might support standard multimodal message formats even if they aren't explicitly documented?
        *   Is there another endpoint or a combination of endpoints in the VoidAI API that should be used?
        *   If direct support is absent, what is the best path forward?

2.  **Create a Comprehensive Implementation Plan:**
    *   Based on your proposed strategy, create a detailed, step-by-step implementation plan. This plan must be exhaustive and cover all necessary changes across the application's feature layers.

### **4. Required Plan Details**

The implementation plan must include, but is not limited to, the following sections:

*   **Architectural Changes:** A high-level overview of any modifications to the data flow or architecture. Use a **Mermaid diagram** to illustrate the new flow for a message with a file attachment.
*   **State Management (Effector):**
    *   Detail the necessary changes to the `chat` feature's model ([`src/features/chat/model.ts`](src/features/chat/model.ts:1)).
    *   Define new stores, events, and effects required to manage file state (e.g., handling file selection, storing file data/URL, and associating it with a message).
*   **Type Definitions:**
    *   Specify the required modifications to the core `Message` interface in [`src/features/chat/types.ts`](src/features/chat/types.ts:1) to accommodate file/image data (e.g., storing base64 data, object URLs, or other identifiers).
*   **API Interaction:**
    *   How will the API request payload sent to `chat.completions` be structured to include the image? Define the exact format.
    *   Will the `chat-stream` feature need modification? If so, what changes are required in [`api.ts`](src/features/chat-stream/api.ts:1) or [`model.ts`](src/features/chat-stream/model.ts:1)?
*   **UI Components:**
    *   Describe the new or modified React components needed for the user interface. This should include:
        1.  An "Attach File" button in the message input area.
        2.  A file selection dialog/handler.
        3.  A preview of the attached image within the message input area before sending.
        4.  Rendering of the image within the `MessageItem.tsx` component in the chat history.
*   **Sequence of Work:** Provide a logical, ordered list of tasks from backend logic to frontend UI to guide the implementation process.

Please be as detailed and specific as possible. Your analysis and plan will be the foundation for this feature's development.