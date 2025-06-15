## Product Requirements Document: LLM Chat Interface

**Version:** 2.2 **Date:** 2025-06-15 **Author:** doasync **Status:**
Comprehensive Update with All Implemented Features

---

### 1. Introduction

This document outlines the requirements for a static, adaptive web application
designed as a chat interface for interacting with Large Language Models (LLMs).
The App will be built using TypeScript, React, Next.js, Material UI (MUI) for
React components, Effector for state management, and fetch API for data
fetching. It will be a client-side only App. The interface will primarily
interact with LLMs through the **VoidAI** unified API, utilizing user-provided
API keys stored locally in the browser, **delivering responses in real-time via
streaming.** The UI must be responsive, automatically adjusting its layout,
functionality, and content based on the user's device and screen size. Core
actions will primarily be represented by icon buttons.

---

### 2. Goals

- Provide a clean, intuitive, and responsive user interface for chatting with
  selected LLMs via VoidAI, **featuring real-time streaming of responses.**
- **Deliver an interactive and immediate user experience through real-time
  streaming of LLM responses, with the capability to stop message generation.**
- Enable users to manage multiple chat conversations (history) persistently
  using IndexedDB, including duplication and title regeneration.
- Allow users to easily select and switch between different LLM models available
  through VoidAI, fetched dynamically, with options to filter and view detailed
  model information.
- Offer robust chat message interactions including copy, **editing of both user
  and model messages**, delete, retry with resubmission, **and the ability to
  stop ongoing message generation.**
- **Render rich content within chat messages**, including Markdown formatting,
  syntax-highlighted code blocks, LaTeX math equations, and Mermaid diagrams.
- Provide essential configuration options for the current chat session (API key,
  temperature, system prompt) stored locally.
- Support client-side file attachment (text, images, and audio) for multimodal
  interaction.
- **Enable standalone audio transcription via a dedicated dialog.**
- **Enable standalone text-to-speech generation via a dedicated dialog.**
- Ensure a seamless experience across desktop and mobile devices, including
  persistent side drawers on desktop.
- **Persist in-progress message drafts per chat session with debounce, restoring
  drafts on reload.**
- **Provide real-time resource usage insights (tokens, cost, storage).**
- **Enable quick contextual interactions via a Mini Chat interface with a
  dedicated model selector, also supporting real-time streaming responses and
  generation cancellation.**

---

### 3. Target Audience

Users who need a web-based interface to interact with various LLM APIs via the
VoidAI service, using their own API keys, without relying on a dedicated
backend. Users accept the inherent risks of storing API keys in browser storage
for this client-side App.

---

### 4. Functional Requirements

#### 4.1. Main UI Layout & Core Components

- Single-page App (SPA).
- Built with Material UI v7 components.
- State managed via Effector with patronum utilities, following best practices.
- Async operations (API calls, model fetching) handled via Effector Effects and
  fetch API.
- Component files use kebab-case naming convention (e.g., `message-item.tsx`).
- Feature exports organized alphabetically in index files for consistency.
- Responsive layout adapting fluidly to screen sizes.
- Desktop/tablet: persistent sidebars for History and Settings; mobile: tabs
  within bottom drawer.

#### 4.2. Header Bar (Top)

- **4.2.1. Chat History Button (Left):** Opens/closes History sidebar or drawer.
- **4.2.2. New Chat Button (Left):** Clears chat window, preserves settings,
  starts new session UI-wise.
- **4.2.3. Current Model Display (Center):** Shows cleaned model name.
- **4.2.4. Model Info Button (Center):** Opens Model Info view.
- **4.2.5. Model Selection Dropdown:**
  - List fetched dynamically from VoidAI.
  - Search input for filtering.
  - Filter toggle for free models.
  - Selecting updates the current chat's model.
- **4.2.6. Chat Settings Button (Right):** Opens/closes Settings sidebar or
  drawer.
- **4.2.7. **Usage Info Button:\*\* (New)
  - An icon button (e.g., `QueryStatsIcon`) in the AppBar.
  - Opens a dialog showing real-time usage metrics (see 4.8).

#### 4.3. Chat Window (Middle Area)

- **4.3.1. Display Area:** Scrollable, centered. **Displays assistant messages
  as they stream in real-time.** Auto-scrolls on new user messages and during
  streaming (pauses on user interaction).
- **4.3.2. Message Rendering:** Via `react-markdown` and plugins.
  - Standard and GitHub Flavored Markdown.
  - Syntax-highlighted code blocks.
  - LaTeX math via KaTeX.
  - Mermaid diagrams.
- **4.3.3. Message Alignment:** Model left, user right, styled accordingly.
- **4.3.4. Message Interaction:** Hover toolbar, double-click to edit.
- **4.3.5. Message Actions:**
  - **Copy Text:** Plain text.
  - **Copy Markdown:** Raw content.
  - **Edit:** Inline editing for user/model messages, persists edits affecting
    future context.
  - **Delete:** Removes message, affects future context.
  - **Retry/Resubmit:**
    - **User message retry:** Resubmits up to and including this message.
      - If next message is a model reply, replaces it.
      - **If next is another user or absent, inserts placeholder assistant
        message immediately after retried user message. This placeholder is then
        populated with the assistant's response as it streams in.**
    - **Model message retry:** Resubmits up to preceding user message, replaces
      model reply.
    - **Generate:** When input is empty and last message is user, inserts
      placeholder assistant message immediately. **This placeholder is then
      populated with the assistant's response as it streams in.**
  - **All retry/generate placeholders appear instantly, show spinners, and are
    seamlessly replaced by streaming content.**
  - **Stop Generation:**
    - A 'Stop' button (or similar UI element) becomes available when an
      assistant message is actively being streamed.
    - Allows the user to cancel the ongoing stream for the current assistant
      message.
    - The message will retain the content received up to the point of
      cancellation.

#### 4.4. Message Input Area (Bottom)

- **4.4.1. Text Input:** Multiline, resizes vertically.
- **4.4.2. Attach File Button:** Provides access to comprehensive file
  attachment menu:
  - File uploads (images, documents, audio) with drag-and-drop support
  - Voice recording functionality
  - Standalone transcription dialog access
  - Standalone text-to-speech dialog access
  - Image generation dialog access
- **4.4.3. Send Button:**
  - Sends on click or Enter.
  - **If input empty & last message is user, triggers Generate flow, which
    streams the response (see above).**
- **4.4.4. Draft Persistence:**
  - The current input text is saved as a **`draft`** field inside the chat
    session.
  - Debounced (~1s) to minimize storage writes.
  - Draft restored automatically when chat is loaded, enabling seamless
    continuation.
  - Draft changes trigger chat save to IndexedDB.

#### 4.5. Chat History Sidebar (Left Drawer / Bottom Drawer - Mobile)

- **4.5.1. View:** Persistent drawer or bottom tab.
- **4.5.2. Search:** Filters chats by title.
- **4.5.3. List:** Shows chat title, timestamp, actions menu.
- **4.5.4. Actions:**
  - Rename (inline edit).
  - Duplicate (creates a copy with timestamp).
  - Regenerate Title (via API).
  - Delete (permanent).
- **4.5.5. Persistence:**
  - **All message updates, retries, generates, edits, deletes, and draft changes
    trigger chat save.**
  - Ensures chats in IndexedDB reflect latest state consistently.

#### 4.6. Chat Settings Sidebar (Right Drawer / Bottom Drawer - Mobile)

- **4.6.1. View:** Persistent drawer or bottom tab.
- **4.6.2. API Key Input:** Stored in LocalStorage.
- **4.6.3. Total Token Count:** Sum of tokens for current chat.
- **4.6.4. Temperature Slider:** Per-chat.
- **4.6.5. System Prompt:** Per-chat.
- **4.6.6. Free Models Toggle:**
  - Filters model list to free models.
  - Persisted in LocalStorage.
- **4.6.7. Mini Chat Model Selector:**
  - **Dedicated dropdown for selecting Mini Chat model,** stored separately,
    persisted in LocalStorage.
  - Allows quick context chats with different model from main chat.

#### 4.7. Model Information View (Alert Dialog)

- Triggered via info button.
- Displays:
  - Model name (🎁 if free).
  - Model ID with copy button.
  - Metadata: creation date, context length.
  - Pricing: input/output token costs.
  - Description text.

#### 4.8. Usage Info Dialog (New)

- **Triggered via Usage Info button in AppBar or Mobile Drawer.**
- **Displays real-time resource metrics:**
  - Current Chat ID.
  - Tokens sent and received.
  - Context window usage (current/max) with progress bar.
  - Estimated API cost.
  - Current chat size.
  - Total IndexedDB size.
  - Browser quota.
- **Accessible on both desktop and mobile (via dedicated drawer tab).**

#### 4.9. Mini Chat (New)

- **Lightweight, contextual chat interface embedded within the main UI,
  providing real-time streaming responses.**
- **Accessible via contextual buttons and text selection.**
- **Features:**
  - **Floating Action Button (FAB):** Always-available overlay button
  - **Text Selection Integration:** Right-click selected text to explain
  - **Draggable Interface:** Repositionable dialog with drag handles
  - **Compact/Expanded States:** Minimize and maximize functionality
  - Dedicated Effector state model with independent chat history
  - Sends quick prompts without affecting main chat history
  - **Dedicated model selector independent of main chat**
  - **Streaming Responses:** Assistant messages appear in real-time as they are
    generated
  - **Stop Generation:** Allows users to cancel an ongoing message stream within
    the mini chat
  - Option to **expand Mini Chat into a full persistent chat session** saved in
    IndexedDB
  - Preserves input if expanded
  - Handles "Explain" flow immediately if already open
- **Improves workflow by enabling quick, contextual queries without cluttering
  main chat.**

#### 4.10. Standalone Transcription Dialog (New)

- **Provides a dedicated interface for transcribing audio files without
  affecting the current chat conversation.**
- **Access:**
  - Opened via the attachment menu (📎 → "Transcribe Audio").
- **Features:**

  - **File Input**: Supports drag-and-drop or file picker for audio files (up to
    25MB).
  - **Client-Side Analysis**: Displays the audio file's size, duration, format,
    and sample rate before transcription.
  - **Audio Preview**: Includes a native HTML `<audio>` player to preview the
    uploaded file.
  - **Model & Format Selection**: Allows users to choose a transcription model
    and a response format (`json`, `text`, `srt`, `vtt`), with options filtered
    by model compatibility
  - **Context Prompt**: Users can provide text prompts to improve accuracy
  - **Advanced Audio Support**: Multiple formats (MP3, WAV, FLAC, M4A, etc.)
    with client-side audio analysis
  - **Transcription History**: Displays a list of completed transcriptions with
    metadata (audio duration, text size) and provides actions to download, copy,
    or paste the result
  - **Audio Preview**: Built-in audio player for file validation before
    transcription
  - **Workflow**: Pasting a transcription into the chat input automatically
    closes the dialog, allowing the user to review and send the message manually

  #### 4.11. Standalone Text-to-Speech (TTS) Dialog (New)

  - **Provides a dedicated interface for converting text into speech without
    affecting the current chat conversation.**
  - **Access:**
    - Opened via the attachment menu (📎 → "Text to Speech").
  - **Features:**
    - **Text Input**: A multi-line text area for input, with a character counter
      (up to 4000 characters).
    - **Dynamic Model & Voice Selection**: Allows users to choose a TTS model
      and then a corresponding voice. The list of available voices is
      dynamically updated based on the selected model
    - **Format Selection**: A dropdown allows users to select the desired audio
      output format (e.g., `mp3`, `wav`), with options filtered by the selected
      model's capabilities
    - **Model-Specific Options**: Includes a field for "Voice Instructions" that
      is only enabled for specific models like `gpt-4o-mini-tts`
    - **Voice Model Management**: Comprehensive voice database with favorites,
      provider-specific voices (OpenAI, ElevenLabs), and per-model compatibility
    - **Audio Preview**: Built-in audio player for generated audio validation
    - **Generation History**: Displays a list of previously generated audio
      files, with metadata (model, voice, format, size) and provides actions to
      download or preview the audio

#### 4.12. Image Generation Dialog (New)

- **Provides a dedicated interface for AI image generation using DALL-E and
  compatible models.**
- **Access:**
  - Opened via the attachment menu (📎 → "Generate Image") or text commands in
    chat.
- **Features:**
  - **Text Prompt Input**: Multi-line text area for image description prompts
  - **Model Selection**: Support for image generation models (DALL-E 3, DALL-E
    2, and other compatible models)
  - **Quality & Style Settings**: Size selection (1024x1024, 1792x1024, etc.),
    quality (standard/HD), and style options
  - **Batch Generation**: Generate multiple images simultaneously with count
    selection
  - **Generation History**: Persistent storage of generated images with metadata
    (prompt, model, settings, timestamp) in IndexedDB
  - **Image Management**: Preview, download, delete, and send-to-chat
    functionality
  - **Chat Integration**: Direct insertion of generated images into current chat
    conversation

#### 4.13. Ephemeral Audio Features (New)

- **Provides in-message audio capabilities separate from standalone dialogs.**
- **Access:**
  - Audio buttons on individual chat messages
- **Features:**
  - **Ephemeral TTS**: Convert any message text to speech (session-only, not
    persisted)
  - **Ephemeral STT**: Transcribe audio content in messages (session-only, not
    persisted)
  - **Per-Message Controls**: Individual audio/transcript toggle buttons on each
    message
  - **Separate Model Selection**: Dedicated in-chat model selectors for STT/TTS
    independent of main chat model
  - **Memory Management**: Automatic cleanup of audio data to prevent chat
    pollution
  - **Audio Player Integration**: Built-in controls for playback and transcript
    display

#### 4.14. Advanced Model Capability Detection (New)

- **Provides intelligent model selection based on content type and
  capabilities.**
- **Functionality:**
  - **Auto-Selection**: Automatic model switching when images/audio are attached
  - **Capability Inference**: Dynamic detection of vision, audio, streaming, and
    function calling support
  - **Model Database**: Comprehensive capability matrix for 200+ models across
    multiple providers
  - **Smart Filtering**: Filter models by specific capabilities (vision-enabled,
    audio-enabled, etc.)
  - **Provider Support**: OpenAI, Anthropic, Google, xAI, Mistral, and custom
    providers
  - **Constraint Handling**: Model-specific limits (max image size, audio
    duration, context length)

#### 4.15. Provider URL Testing and Validation (New)

- **Provides real-time API connection validation.**
- **Access:**
  - Provider URL test component in chat settings
- **Features:**
  - **Connection Testing**: Real-time validation of custom API endpoints
  - **Status Indicators**: Visual feedback for connection success/failure
  - **Error Diagnosis**: Detailed error messages for troubleshooting
  - **Auto-Validation**: Automatic testing when URL is modified
  - **Multiple Providers**: Support for testing various API providers and custom
    endpoints

#### 4.16. Auto-Title Generation (New)

- **Provides AI-powered automatic chat title generation.**
- **Functionality:**
  - **Smart Title Creation**: Generate descriptive titles based on conversation
    context
  - **Model Selection**: Dedicated model choice for title generation
  - **Manual Regeneration**: Option to regenerate titles for existing chats
  - **Fallback Titles**: Automatic fallback to timestamp-based titles if
    generation fails
- **Access:**
  - Automatic on chat creation, manual via chat history actions

#### 4.17. Advanced Document Processing (Enhanced)

- **Comprehensive document processing with multiple format support.**
- **Enhanced Features:**
  - **PDF Processing**: PDF.js-based extraction with metadata (author, title,
    page count)
  - **DOCX Processing**: Mammoth-based Word document conversion with formatting
    preservation
  - **HTML Processing**: Turndown-based markdown conversion
  - **Text Files**: Direct processing for MD, TXT, and other text formats
  - **Batch Processing**: Upload and process up to 10 files simultaneously
  - **Document Preview**: Rich preview interface with metadata display
  - **Extraction Progress**: Real-time progress tracking for large files
  - **Text Chunking**: Intelligent splitting for large documents
  - **Error Handling**: Graceful fallback for unsupported formats

#### 4.18. Voice Model Management System (New)

- **Comprehensive voice configuration and management system.**
- **Features:**
  - **Voice Database**: Extensive catalog of voices from multiple providers
  - **Provider Support**: OpenAI, ElevenLabs, Google voices with metadata
  - **Voice Preferences**: Favorites system and default voice selection
  - **Compatibility Matrix**: Dynamic voice-to-model compatibility checking
  - **Per-Model Settings**: Model-specific voice preferences and overrides
  - **Voice Preview**: Audio samples and voice characteristic information

#### 4.19. Advanced Chat History Management (Enhanced)

- **Sophisticated chat persistence and management beyond basic requirements.**
- **Enhanced Features:**
  - **Chat Duplication**: Create copies of existing conversations with timestamp
    suffixes
  - **Advanced Search**: Full-text search across chat content and titles
  - **Auto-Indexing**: Automatic organization and sorting of chat sessions
  - **Draft Persistence**: Per-chat session draft saving with debounced updates
  - **Recovery System**: Automatic chat restoration and error recovery
  - **Metadata Management**: Rich metadata tracking (token counts, model
    history, creation dates)

#### 4.20. Usage Analytics and Resource Monitoring (Enhanced)

- **Comprehensive resource usage tracking and analytics.**
- **Enhanced Features:**
  - **Token Tracking**: Real-time prompt and completion token counting
  - **Cost Calculation**: Dynamic API cost estimation with provider-specific
    pricing
  - **Storage Analytics**: IndexedDB usage monitoring with quota tracking
  - **Context Window Monitoring**: Real-time context usage with visual
    indicators
  - **Per-Chat Metrics**: Individual conversation analytics and history
  - **Export Functionality**: Usage data export for external analysis

---

### 5. Non-Functional Requirements

- **Technology Stack:** TypeScript, React, Next.js 15, MUI v7, Effector with
  patronum utilities, `idb`, VoidAI API, `eventsource-parser`, `react-markdown`,
  `remark-gfm`, `remark-math`, `rehype-katex`, `katex`,
  `@lightenna/react-mermaid-diagram`, `@tanstack/react-query`, `dompurify`,
  `effector-storage`, `turndown`, `use-long-press`.
- **Architecture:** Static Web Application, client-side only, feature-based
  modular with kebab-case component naming and alphabetical export organization.
- **Data Persistence:** IndexedDB (chats), LocalStorage (settings, API key, free
  toggle, mini chat model, drawer states).
- **Responsiveness:** Desktop drawers persistent; mobile drawers as tabs. Smooth
  transitions.
- **Performance:** Responsive UI, **real-time feedback via streaming
  responses,** smooth scrolling, efficient state updates, clear loading
  indicators for generation and streaming, optimized markdown rendering.
- **Code Organization:** Feature-based architecture with kebab-case component
  naming (e.g., `message-item.tsx`, `chat-settings-content.tsx`) and
  alphabetical export organization in index files for consistency.
- **Development Workflow:** Comprehensive quality assurance with `npm run qa`,
  automatic formatting with `npm run fix`, TypeScript compilation checks, and
  circular dependency detection.
- **Build Configuration:** Static export only (`output: 'export'`), ESLint
  disabled during build but enforced via manual checks, unoptimized images for
  static export compatibility.
- **Usability & Error Handling:** Intuitive icons with tooltips, clear feedback,
  accessible actions, user-facing errors via MUI Alerts.
- **Resource Visibility:** Real-time usage info to aid user awareness of tokens,
  costs, storage.

---

### 6. Design and UI/UX

- Material Design principles via MUI.
- Prioritize understandable icon buttons.
- Clear distinction between user and model messages.
- Clear interactive states (hover, selected, editing).
- Smooth transitions and loading indicators.
- Rich content rendering clean and non-disruptive.
- **Mini Chat UI integrated seamlessly.**
- **Usage Info presented clearly and accessibly.**
- Clear visual indication of messages being streamed in real-time (e.g., text
  appearing progressively).
- Accessible and intuitive 'Stop Generation' controls during message streaming
  for both main and mini chat.

---

### 7. Out of Scope

- Server-side logic/hosting.
- User authentication beyond local storage.
- The LLM models themselves.
- Advanced file management.
- Real-time collaboration.
- Backend storage/security.
- Client-side token estimation libraries.
- Proactive management of IndexedDB storage limits.
- Server-side rendering (app is static export only).

### 8. Implementation Notes

- **Version 2.2 Update:** Comprehensive documentation of all implemented
  features including image generation, ephemeral audio, advanced model
  capabilities, and sophisticated UI components.
- **Recent Refactoring (v2.1):** The codebase has been refactored to use
  consistent kebab-case naming for all component files and alphabetical export
  organization.
- **Quality Assurance:** Development workflow includes comprehensive QA tools
  (`npm run qa`) for TypeScript compilation, linting, formatting, and circular
  dependency checking.
- **Static Export:** Application is configured for static export only with
  unoptimized images and ESLint disabled during build.
- **Advanced Architecture:** Feature-based modular architecture with Effector
  state management, IndexedDB persistence, and sophisticated component patterns.

---
