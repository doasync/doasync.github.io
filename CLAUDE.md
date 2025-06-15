# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Commands

Build and development commands:

```bash
npm run dev        # Start development server with Turbopack
npm run build      # Create production build (static export to out/)
npm run start      # Start production server
npm run lint       # Run ESLint
```

## Architecture Overview

This is a Next.js chat application using Effector for state management. The app
integrates with OpenAI-compatible API for LLM interactions.

### Key Technologies

- **Framework**: Next.js 15 with App Router and TypeScript
- **State Management**: Effector with patronum utilities
- **UI**: Material UI (MUI) v7
- **Storage**: IndexedDB (chat history), LocalStorage (settings)
- **Streaming**: Server-Sent Events (SSE) for real-time responses

### Feature-Based Architecture

The codebase follows a feature-oriented structure where each feature is
self-contained:

```
src/features/
├── api-config/        # API configuration management
├── audio-chat/        # Audio conversation features
├── chat/              # Main chat logic and UI
├── chat-history/      # Chat persistence with IndexedDB
├── chat-settings/     # User preferences and API key
├── chat-stream/       # SSE streaming implementation
├── document-processing/ # File upload and document handling
├── image-generation/  # AI image generation features
├── mini-chat/         # Contextual mini chat overlay
├── models-select/     # LLM model selection with auto-capabilities
├── speech-to-text/    # STT transcription services
├── text-to-speech/    # TTS generation services
├── ui-state/          # Global UI state (dialogs, snackbars)
├── usage-info/        # Token counting and usage metrics
└── voice-models/      # Voice and audio model configuration
```

Each feature follows this pattern:

- `model.ts` - Effector state management (stores, events, effects)
- `index.ts` - Public API exports
- `types.ts` - TypeScript interfaces (if needed)
- Component files - React components (if UI is involved)

### State Management Pattern

All state logic uses Effector and follows these conventions:

1. **Stores** are prefixed with `$` (e.g., `$messages`, `$apiKey`)
2. **Events** describe user actions (e.g., `messageSent`, `editMessage`)
3. **Effects** handle async operations with `Fx` suffix (e.g., `streamChatFx`)
4. State flows are connected using `sample` for reactive updates
5. Debug logging is enabled in development via `patronum/debug`

Example pattern:

```typescript
const $store = createStore(initialValue);
const event = createEvent<Payload>();
const effectFx = createEffect<Params, Result>();

sample({
  clock: event,
  source: $store,
  fn: (state, payload) => /* transform */,
  target: effectFx,
});
```

### Key Implementation Notes

1. **API Integration**: The app integrates with unified API for LLM
   interactions, with automatic model capability detection for vision, audio,
   and other features.

2. **Chat Streaming**: The `chat-stream` feature is stateless and reusable. It
   manages SSE connections with proper cleanup via AbortController for real-time
   responses.

3. **Multimodal Support**: Messages support text, images, and file attachments.
   Vision models are automatically selected when images are attached via the
   `autoSelectModelForCapabilities` system.

4. **Message Handling**: Messages support rich content including Markdown, LaTeX
   math (KaTeX), code highlighting (Prism), and Mermaid diagrams.

5. **Storage**:

   - Chat history uses IndexedDB with the `idb` library
   - Settings and API key use LocalStorage
   - Auto-save is debounced to prevent excessive writes
   - Message drafts are persisted per chat session

6. **API Integration**: All LLM calls go through an API provider endpoint with
   OpenAI-compatible format. The app supports multiple providers (OpenAI,
   Anthropic, Google, etc.) through VoidAI, for example.

7. **Audio Features**: Standalone STT (Speech-to-Text) and TTS (Text-to-Speech)
   dialogs provide transcription and voice generation without affecting main
   chat.

8. **Static Export**: The app is configured for static export
   (`output: 'export'`), meaning no server-side rendering.

### Development Guidelines

1. When modifying features, always update the corresponding `model.ts` first
2. Keep effects pure - side effects only in effect handlers
3. Use TypeScript strictly - avoid `any` types
4. Follow the existing file structure patterns
5. Test SSE streaming thoroughly as it's critical for UX
6. Respect feature boundaries - import only from feature's `index.ts`

### Common Tasks

**Adding a new feature:**

1. Create a new directory under `src/features/`
2. Add `model.ts` with state logic
3. Export public API through `index.ts`
4. Connect to main app in `src/app/page.tsx` if needed

**Modifying chat behavior:**

- Main logic is in `src/features/chat/model.ts`
- Streaming logic is in `src/features/chat-stream/model.ts`
- UI components are in `src/components/MessageItem.tsx`

**Working with multimodal features:**

- Image attachments: `src/components/ImageAttachmentInput.tsx`
- Document processing: `src/features/document-processing/`
- Audio transcription: `src/features/speech-to-text/`
- Text-to-speech: `src/features/text-to-speech/`

**Model capabilities and selection:**

- Model detection logic in `src/features/models-select/model.ts`
- Auto-selection based on capabilities (vision, audio, etc.)
- Voice model configuration in `src/features/voice-models/`

**Debugging state:**

- Effector debug logs are enabled in development
- Check browser console for detailed state flow
- Use Effector DevTools browser extension for inspection

### File Processing

The app supports various file types through the document-processing feature:

- **PDF**: Uses `pdfjs-dist` (worker file is copied to public during build)
- **DOCX**: Uses `mammoth` for conversion
- **Text files**: Direct text extraction (MD, TXT, HTML)

The app supports uploading various file types:

- **Images**: JPG, PNG, GIF, WebP
- **Audio**: MP3, WAV, FLAC, M4A...
- **Documents**: PDF, DOCX, MD, TXT, HTML
- **Recordings**: Voice recording via browser

### API Integration Details

- **Primary API**: VoidAI unified endpoint
- **Authentication**: User-provided API keys stored in LocalStorage
- **Streaming**: Server-Sent Events with `eventsource-parser`
- **Rate Limiting**: Handled by the service
- **Error Handling**: Graceful fallbacks and user-friendly error messages

## Development Advice

- Always run `npm run build` to test static export compatibility

## Coding Guidelines

- Don't use default exports

```

</invoke>
```
