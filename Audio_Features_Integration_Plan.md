# Audio Features Integration Plan

## 1. Introduction and Overview

This document outlines the comprehensive architectural plan for integrating audio features into our existing chat application. The plan covers four main audio capabilities while maintaining our multi-provider architecture (VoidAI, OpenAI, and Gemini).

### 1.1 Scope

The audio integration will add the following features:

1. **Text-to-Speech (TTS)**: Convert user-specified text into downloadable audio files
2. **Speech-to-Text (STT)**: Transcribe uploaded audio files into text
3. **Audio Input/Output**: Support audio messages within chat conversations
4. **Voice Model Selection**: Choose different voice models and configurations

### 1.2 Architecture Principles

- **Feature-based structure**: Each audio feature will be a self-contained module
- **Provider abstraction**: Handle API differences between providers transparently
- **State management**: Use Effector for predictable state updates
- **User-centric design**: Clear UI/UX for audio interactions

## 2. Text-to-Speech (TTS) Feature

### 2.1 User Experience

Users can convert any text to audio through:

- A dedicated TTS dialog accessible via attachment menu (📎 → "Text to Speech") ✅ Implemented
- Text selection with right-click context menu option ❌ Not implemented
- Keyboard shortcut (Ctrl/Cmd + Shift + S) ❌ Not implemented

The TTS dialog includes:

- Text input area with character counter (4000 max) ✅
- TTS model selector dropdown with provider information ✅
- Voice selector dropdown (dynamic based on model) ✅
- Audio format selector (filtered by model capabilities) ✅
- Instructions field (only for gpt-4o-mini-tts model) ✅
- Streaming toggle switch ✅
- Generated audio history with playback and download ✅
- Delete audio functionality ✅
- Speed control ❌ Not implemented in UI (store exists)

### 2.2 Architecture

```mermaid
graph TB
    subgraph "UI Layer"
        TTSDialog[TTS Dialog Component]
        AttachmentMenu[Attachment Menu Option]
        AudioPlayer[Audio Player Component]
        ContextMenu[Context Menu Option - Planned]
    end

    subgraph "State Management"
        $ttsText[$$ttsText Store]
        $ttsVoice[$$ttsVoice Store]
        $ttsFormat[$$ttsFormat Store]
        $ttsProvider[$$ttsProvider Store]
        $ttsLoading[$$ttsLoading Store]
        generateTTSFx[generateTTSFx Effect]
    end

    subgraph "API Layer"
        TTSAdapter[TTS API Adapter]
        VoidAITTS[VoidAI TTS Handler]
        OpenAITTS[OpenAI TTS Handler]
        GeminiTTS[Gemini TTS Handler]
    end

    TTSDialog --> $ttsText
    TTSDialog --> $ttsVoice
    TTSDialog --> generateTTSFx
    generateTTSFx --> TTSAdapter
    TTSAdapter --> VoidAITTS
    TTSAdapter --> OpenAITTS
    TTSAdapter --> GeminiTTS
```

### 2.3 Provider Capabilities Matrix (Implemented)

| Feature          | VoidAI                                                                                              | Gemini                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Voices           | alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer, verse                            | 30+ voices (Aoede, Charon, Circe, Kore, Fenrir, etc.)    |
| Formats          | MP3, OPUS, AAC, FLAC, WAV, PCM (varies by model)                                                    | WAV only                                                 |
| Models           | tts-1, tts-1-hd, gpt-4o-mini-tts, elevenlabs, gpt-4o-audio-preview, gpt-4o-audio-preview-2024-12-17 | gemini-2.5-flash-preview-tts, gemini-2.5-pro-preview-tts |
| API Endpoint     | /audio/speech (except gpt-4o-audio models use /chat/completions)                                    | /audio/speech (hybrid format)                            |
| Instructions     | ✅ Supported (gpt-4o-mini-tts only)                                                                 | ❌ Not supported                                         |
| Speed Control    | 0.25-4.0 (tts-1, tts-1-hd only)                                                                     | ❌ Not supported                                         |
| Multi-speaker    | ❌ Not implemented                                                                                  | ❌ Not implemented (single speaker only)                 |
| Special Features | ElevenLabs: emotion & accent control, GPT-4o-mini: voice instructions                               | Hybrid API format support                                |

### 2.4 State Model (Actual Implementation)

```typescript
// Features/text-to-speech/model.ts actual structure
interface TTSState {
  text: string
  selectedModel: string
  selectedVoice: string
  selectedFormat: AudioFormat
  isLoading: boolean
  error: string | null
  availableVoices: VoiceOption[]
  instructions: string // For gpt-4o-mini-tts
  audioUrl: string | null
}

// Model Preferences (persisted)
interface ModelPreferences {
  [modelId: string]: {
    voice: string
    format: AudioFormat
    speed: number
    instructions?: string
  }
}

// Generated Audio Storage
interface GeneratedAudio {
  id: string
  url: string
  text: string
  model: string
  voice: string
  format: AudioFormat
  size: number
  timestamp: number
  filename: string
}

// Events
- textChanged: Update text to convert
- voiceSelected: Change voice option
- formatSelected: Change output format
- modelSelected: Change TTS model (updates voice options)
- instructionsChanged: Update voice instructions
- generateTTSClicked: Regular TTS generation
- generateTTSStreamClicked: Streaming TTS (falls back to regular)
- downloadRequested: Save audio file
- previewRequested: Play audio preview
- deleteAudio: Remove from history
- clearError: Clear error message
- ttsDialogOpened: Initialize dialog
- ttsDialogClosed: Cleanup dialog

// Effects
- generateTTSFx: Call provider API with hybrid format for Gemini
- generateTTSStreamFx: Attempt streaming (falls back)
- loadModelPreferencesFx: Load saved preferences
- saveModelPreferencesFx: Persist preferences
```

## 3. Speech-to-Text (STT) Feature

### 3.1 User Experience (Actual Implementation)

Users can transcribe audio files via a dedicated **Standalone Transcription Dialog**, which provides a comprehensive and robust user experience.

- **Access Point**: The dialog is opened via the attachment menu (📎 → "Transcribe Audio").
- **File Input & Analysis**:
  - Supports drag-and-drop and a standard file picker.
  - Enforces a 25MB file size limit and validates file types (`mp3`, `mp4`, `wav`, etc.).
  - **Client-Side Analysis**: Before transcription, the UI displays the audio file's **size, format, duration, and sample rate**.
  - **Audio Preview**: An integrated HTML `<audio>` player allows users to preview the uploaded file.
- **Transcription Configuration**:
  - **Model Selection**: Dropdown to choose between `whisper-1`, `gpt-4o-mini-transcribe`, etc.
  - **Response Format**: Users can select the output format (`json`, `text`, `srt`, `vtt`, `verbose_json`), with options dynamically filtered based on model compatibility. Preferences are saved to `localStorage` on a per-model basis.
  - **Context Prompt**: A text area allows users to provide hints and jargon to improve accuracy.
- **Process & Results**:
  - A loading indicator is shown during transcription.
  - The dialog displays a history of completed transcriptions.
  - **Result Cards**: Each card shows the **audio duration**, the size of the **generated text**, and the raw API response (e.g., JSON, SRT).
  - **Actions**: Users can **download** the raw response, **copy** the text, or **paste the text** into the main chat input, which then closes the dialog.

### 3.2 Architecture (Actual Implementation)

The architecture follows a modular, feature-based structure, mirroring the TTS implementation.

```mermaid
graph TB
    subgraph "UI Layer"
        TranscriptionDialog[TranscriptionDialog Component]
        AttachmentMenu[Attachment Menu Option]
        AudioPlayer[Native Audio Player]
        ResultCard[Transcription Result Card]
    end

    subgraph "State Management (Effector)"
        $sttState[$$sttState Store]
        transcribeAudioFx[transcribeAudioFx Effect]
        dialogOpened[dialogOpened Event]
        dialogClosed[dialogClosed Event]
        pasteTranscriptionToChat[pasteTranscriptionToChat Event]
    end

    subgraph "API Layer"
        STTAdapter[STT API Adapter]
        VoidAISTT[VoidAI STT Handler]
    end

    AttachmentMenu --> dialogOpened
    TranscriptionDialog --> $sttState
    TranscriptionDialog --> transcribeAudioFx
    transcribeAudioFx --> STTAdapter
    STTAdapter --> VoidAISTT
    pasteTranscriptionToChat --> dialogClosed
```

### 3.3 Provider Capabilities Matrix (Actual Implementation)

| Feature          | VoidAI (OpenAI Compatible)                                       |
| ---------------- | ---------------------------------------------------------------- |
| Models           | `whisper-1`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`       |
| Streaming        | ❌ Not implemented                                               |
| Translation      | ❌ Not implemented (scoped out)                                  |
| Response Formats | `json`, `text`, `srt`, `vtt`, `verbose_json` (filtered by model) |
| Max File Size    | 25MB (enforced client-side)                                      |

### 3.4 State Model (Actual Implementation)

The Effector state model in `features/speech-to-text/model.ts` manages the entire feature lifecycle.

```typescript
// features/speech-to-text/types.ts
export interface TranscriptionResult {
  id: string;
  text: string;
  rawResponse: string;
  fileName: string;
  fileSize: number;
  audioDuration?: number; // Duration in seconds
  textSize: number; // Size of transcribed text in bytes
  model: string;
  prompt?: string;
  timestamp: number;
  responseFormat: ResponseFormat;
}

export interface STTState {
  isDialogOpen: boolean;
  file: File | null;
  audioDuration?: number;
  selectedModel: string;
  prompt: string;
  isLoading: boolean;
  validationError: string | null;
  transcriptionHistory: TranscriptionResult[];
  // ...and more
}

// features/speech-to-text/model.ts
// Events
- dialogOpened: Triggered to show the dialog.
- dialogClosed: Triggered to hide the dialog.
- fileSelected: Handles new file input and validation.
- modelChanged: Updates the selected transcription model.
- responseFormatChanged: Updates and persists the selected format.
- pasteTranscriptionToChat: Pastes text to chat input and closes the dialog.

// Effects
- transcribeAudioFx: Manages the `multipart/form-data` API call to VoidAI.
- loadTranscriptionHistoryFx: Loads past results from localStorage.
- saveTranscriptionFx: Saves a new result to localStorage.
```

## 4. Audio Input/Output in Chat

### 4.1 User Experience

Users can send and receive audio messages:

- **Recording**: Click microphone button to record voice message
- **Playback**: Audio messages show inline player with controls
- **Transcription**: Option to show/hide transcript for audio messages
- **Text-to-Speech**: Click speaker icon to hear any text message read aloud
- **Transcription**: Option to show/hide transcript for audio messages
- **Multi-modal**: Mix text and audio in same conversation

Audio message UI includes:

- Waveform visualization
- Play/pause button
- Progress bar with time
- Speed control (1x, 1.5x, 2x)
- Download button
- Transcript toggle

### 4.2 Architecture

```mermaid
graph TB
    subgraph "UI Layer"
        AudioRecorder[Audio Recorder Component]
        AudioPlayer[Audio Player Component]
        AudioMessage[Audio Message Component]
    end

    subgraph "State Management"
        $recording[$$recording Store]
        $audioMessages[$$audioMessages Store]
        $playbackState[$$playbackState Store]
        recordAudioFx[recordAudioFx Effect]
        processAudioResponseFx[processAudioResponseFx Effect]
    end

    subgraph "Chat Integration"
        ChatModel[Chat Model]
        MessageStore[$$messages Store]
    end

    subgraph "API Layer"
        AudioChatAdapter[Audio Chat Adapter]
        VoidAIAudio[VoidAI Audio Handler]
        OpenAIAudio[OpenAI Audio Handler]
    end

    AudioRecorder --> $recording
    AudioRecorder --> recordAudioFx
    recordAudioFx --> ChatModel
    ChatModel --> AudioChatAdapter
    AudioMessage --> $playbackState
    processAudioResponseFx --> $audioMessages
```

### 4.3 Message Format Extension

```typescript
// Extend existing message type
interface AudioMessage extends Message {
  type: "audio";
  audio?: {
    url: string;
    duration: number;
    format: string;
    transcript?: string;
    waveform?: number[];
  };
}
```

### 4.4 State Model

```typescript
// Features/audio-chat/model.ts structure
interface AudioChatState {
  isRecording: boolean
  recordingDuration: number
  audioBlob: Blob | null
  playbackStates: Record<string, PlaybackState>
  activePlayer: string | null
}

interface PlaybackState {
  isPlaying: boolean
  currentTime: number
  playbackRate: number
}

// Events
- recordingStarted: Begin audio recording
- recordingStopped: End recording
- audioMessageSent: Send audio to chat
- playbackToggled: Play/pause audio
- playbackRateChanged: Change speed
- transcriptToggled: Show/hide transcript

// Effects
- startRecordingFx: Access microphone
- stopRecordingFx: Process recorded audio
- sendAudioMessageFx: Upload and send audio
- generateTranscriptFx: Create transcript for audio
```

## 5. Voice Model Selection

### 5.1 User Experience

Voice selection integrated into:

- Main model selector (filter by audio capability)
- TTS dialog voice dropdown
- Settings page audio preferences
- Quick voice switcher in toolbar

Features:

- Voice preview/sample playback
- Favorite voices
- Voice search/filter
- Provider indicator
- Language support badges

### 5.2 Architecture

```mermaid
graph TB
    subgraph "UI Layer"
        VoiceSelector[Voice Selector Component]
        VoicePreview[Voice Preview Component]
        AudioSettings[Audio Settings Panel]
    end

    subgraph "State Management"
        $availableVoices[$$availableVoices Store]
        $selectedVoice[$$selectedVoice Store]
        $voicePreferences[$$voicePreferences Store]
        loadVoicesFx[loadVoicesFx Effect]
        previewVoiceFx[previewVoiceFx Effect]
    end

    subgraph "Model Integration"
        ModelStore[$$models Store]
        AudioModels[Audio Models Config]
    end

    VoiceSelector --> $selectedVoice
    VoicePreview --> previewVoiceFx
    loadVoicesFx --> $availableVoices
    AudioModels --> ModelStore
```

### 5.3 Voice Configuration Schema

```typescript
interface VoiceModel {
  id: string;
  name: string;
  provider: "voidai" | "openai" | "gemini";
  capabilities: {
    tts: boolean;
    stt: boolean;
    audioChat: boolean;
  };
  voices: VoiceOption[];
  languages: string[];
  formats: AudioFormat[];
}

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  previewUrl?: string;
  tags: string[]; // ['male', 'female', 'neutral', 'warm', 'professional']
}
```

## 6. Integration with Existing Architecture

### 6.1 File Structure (Actual Implementation)

```
src/features/
├── text-to-speech/          ✅ Fully implemented
│   ├── model.ts            # TTS state management with preferences
│   ├── index.ts            # Public API exports
│   ├── types.ts            # TypeScript interfaces
│   ├── api.ts              # Unified API adapter with hybrid format
│   └── components/
|       ├── TTSDialog.tsx   # Main TTS UI dialog
|       └── VoiceSelector.tsx # Voice selection component
├── speech-to-text/          ✅ Fully implemented
|   ├── model.ts            # STT state management
|   ├── api.ts              # API adapter for VoidAI
|   ├── types.ts            # TypeScript interfaces
|   └── components/
|       └── TranscriptionDialog.tsx # Main STT UI dialog
├── audio-chat/              ❌ Not implemented
└── voice-models/            ✅ Implemented
    ├── model.ts            # Voice model loading and state
    ├── index.ts            # Public exports
    └── config/
        ├── models.json     # TTS/STT model definitions
        └── voices.json     # Voice configurations per model
```

### 6.2 API Integration Points

```mermaid
graph LR
    subgraph "Existing API Config"
        APIConfig[API Configuration]
        APIKey[API Key Store]
        BaseURL[Base URL Store]
    end

    subgraph "Audio APIs"
        TTSAPI[TTS Endpoints]
        STTAPI[STT Endpoints]
        AudioChatAPI[Audio Chat Endpoints]
    end

    subgraph "Provider Routing"
        Router[API Router]
        VoidAI[VoidAI]
        OpenAI[OpenAI]
        Gemini[Gemini]
    end

    APIConfig --> Router
    Router --> TTSAPI
    Router --> STTAPI
    Router --> AudioChatAPI
    TTSAPI --> VoidAI
    TTSAPI --> OpenAI
    TTSAPI --> Gemini
```

## 7. Provider-Specific Handling (Actual Implementation)

### 7.1 API Format Differences

**VoidAI (OpenAI-compatible)**:

- TTS: `/audio/speech` endpoint ✅
- GPT-4o audio models: `/chat/completions` endpoint ✅
- Response: Binary audio data (MP3, WAV, etc.) ✅
- Speed parameter: 0.25 to 4.0 (tts-1, tts-1-hd only) ✅
- Instructions parameter: Supported on gpt-4o-mini-tts ✅

**Gemini (Hybrid Implementation)**:

- TTS: `/audio/speech` endpoint (using VoidAI proxy) ✅
- Request format: Hybrid OpenAI + Gemini native ✅
- Response format: JSON with base64 audio or binary ✅
- Supported models: gemini-2.5-flash-preview-tts, gemini-2.5-pro-preview-tts ✅
- Audio format: WAV only ✅
- Multi-speaker: Not implemented (single speaker only)

### 7.2 Model-Specific Audio Support Tracking

| Model                           | Provider | Audio Format | TTS Support | STT Support | Notes                                        |
| ------------------------------- | -------- | ------------ | ----------- | ----------- | -------------------------------------------- |
| tts-1                           | VoidAI   | OpenAI       | ✓           | ✗           | Standard quality, low latency                |
| tts-1-hd                        | VoidAI   | OpenAI       | ✓           | ✗           | High definition audio                        |
| gpt-4o-mini-tts                 | VoidAI   | OpenAI       | ✓           | ✗           | Voice control via instructions               |
| elevenlabs                      | VoidAI   | OpenAI       | ✓           | ✗           | Premium voice synthesis with emotion control |
| gpt-4o-audio-preview            | VoidAI   | OpenAI       | ✓           | ✗           | Audio generation in chat                     |
| gpt-4o-audio-preview-2024-12-17 | VoidAI   | OpenAI       | ✓           | ✗           | Dated version of audio preview               |
| whisper-1                       | VoidAI   | OpenAI       | ✗           | ✓           | Transcription only                           |
| gpt-4o-transcribe               | VoidAI   | OpenAI       | ✗           | ✓           | Advanced transcription                       |
| gpt-4o-mini-transcribe          | VoidAI   | OpenAI       | ✗           | ✓           | Cost-effective transcription                 |
| gemini-2.5-flash-preview-tts    | Gemini   | Gemini       | ✓           | ✗           | Multi-speaker support                        |
| gemini-2.5-pro-preview-tts      | Gemini   | Gemini       | ✓           | ✗           | Higher quality                               |

### 7.3 Provider Adapter Pattern (Actual Implementation)

```typescript
// Unified API adapter in api.ts
const getProviderConfig = (
  model: string,
  text: string,
  voice: string,
  format: AudioFormat,
  speed?: number,
  instructions?: string
) => {
  const isGeminiModel = model.includes("gemini");
  const isGPT4oAudioModel =
    model === "gpt-4o-audio-preview" ||
    model === "gpt-4o-audio-preview-2024-12-17";

  if (isGPT4oAudioModel) {
    // Use chat completions endpoint
    return {
      endpoint: `${providerUrl}/chat/completions`,
      body: {
        model,
        modalities: ["text", "audio"],
        audio: { voice, format },
        messages: [{ role: "user", content: text }],
      },
    };
  } else if (isGeminiModel) {
    // Hybrid format for Gemini
    return {
      endpoint: `${providerUrl}/audio/speech`,
      body: {
        // OpenAI format
        model,
        input: text,
        voice,
        response_format: format,
        // Gemini format
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      },
    };
  } else {
    // Standard OpenAI format
    return {
      endpoint: `${providerUrl}/audio/speech`,
      body: {
        model,
        input: text,
        voice,
        response_format: format,
        speed,
        instructions,
      },
    };
  }
};
```

## 8. User Interface Changes

### 8.1 Main Chat Interface

```
┌─────────────────────────────────────────────────┐
│ Chat Application                            [⚙️]│
├─────────────────────────────────────────────────┤
│ Model: [gpt-4-turbo ▼]                          │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Previous messages with audio playback...]     │
│                                                 │
├─────────────────────────────────────────────────┤
│ [📎][🎤] Type a message...              [Send] │
└─────────────────────────────────────────────────┘

Attachment Menu (📎):
- Upload Image
- Upload Audio
- Upload Document
- Record Audio
- Generate Image
- Text to Speech ← TTS Access Point
```

### 8.2 TTS Dialog Design (Actual Implementation)

```
┌─────────────────────────────────────────────────┐
│ 🔊 Text to Speech                           [X] │
├─────────────────────────────────────────────────┤
│                                                 │
│ Text to convert:                               │
│ ┌─────────────────────────────────────────────┐ │
│ │                                             │ │
│ │ [Multi-line text input area]                │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│ 0/4000 characters                              │
│                                                 │
│ TTS Model: [tts-1-hd ▼]                        │
│ Voice: [Nova ▼]         Format: [MP3 ▼]        │
│                                                 │
│ Voice Instructions: (only for gpt-4o-mini-tts)  │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Optional instructions field]               │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ⚠️ Error: [Error message with working X button] │
│                                                 │
│ Generated Audio Files (2)                       │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🎵 tts_20241206_143022.mp3                  │ │
│ │ tts-1-hd • nova • MP3 • 45.2 KB            │ │
│ │ 2:30:22 PM              [📥] [🗑️]          │ │
│ │ "Hello, this is a test..."                 │ │
│ │ [════════════════════━━━━] 0:12/0:45       │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Cancel] [🔄 Stream audio] [🔊 Generate Audio]  │
└─────────────────────────────────────────────────┘
```

### 8.3 Audio Message Component

```
┌─────────────────────────────────────────────────┐
│ Assistant:                                      │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🔊 Audio Message (0:45)                     │ │
│ │ [▶️] ━━━━━━━━────────────── 0:12/0:45      │ │
│ │ [1x ▼] [📥] [📝 Show transcript]            │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## 9. State Management Summary

### 9.1 New Stores

- `$ttsState`: Text-to-speech configuration and status
- `$sttState`: Speech-to-text processing state
- `$audioRecording`: Audio recording state
- `$audioPlayback`: Audio playback states
- `$voiceModels`: Available voice models
- `$audioPreferences`: User audio preferences

### 9.2 Integration with Existing Stores

- Extend `$messages` to support audio message type
- Update `$models` to include audio capabilities
- Enhance `$chatSettings` with audio preferences
- Modify `$uiState` for audio-related dialogs

### 9.3 Key Effects

- `generateTTSFx`: Generate speech from text
- `transcribeAudioFx`: Convert audio to text
- `sendAudioMessageFx`: Send audio in chat
- `processAudioResponseFx`: Handle audio responses
- `loadVoiceModelsFx`: Load available voices

## 10. Implementation Status

### Phase 1: Foundation ✅ (Completed)

1. ✅ Created text-to-speech feature module
2. ✅ Implemented unified API adapter with hybrid format support
3. ✅ Created voice-models configuration system

### Phase 2: TTS Feature ✅ (Completed)

1. ✅ Built TTSDialog component with full UI
2. ✅ Implemented TTS state management with preferences persistence
3. ✅ Added support for all VoidAI TTS models (tts-1, tts-1-hd, gpt-4o-mini-tts, elevenlabs)
4. ✅ Added support for GPT-4o audio models using chat completions
5. ✅ Implemented hybrid API format for Gemini TTS models
6. ✅ Added generated audio history with playback and download
7. ✅ Implemented model-specific voice and format filtering
8. ✅ Added instructions field for gpt-4o-mini-tts
9. ✅ Fixed error message close button functionality
10. ✅ Added streaming toggle (falls back to regular generation)

### Phase 3: STT Feature ✅ (Completed)

1. ✅ **Feature Module**: Created a self-contained module at `src/features/speech-to-text/`.
2. ✅ **Transcription Dialog**: Built a comprehensive `TranscriptionDialog` component with robust state management via Effector.
3. ✅ **File Handling**: Implemented file selection (drag-and-drop, picker), validation (size, type), and client-side audio analysis to display duration, format, and sample rate.
4. ✅ **Audio Preview**: Integrated a native HTML `<audio>` player for file previews.
5. ✅ **Dynamic Configuration**: Added model and response format selectors, with options filtered by model capabilities and preferences saved to local storage.
6. ✅ **API Integration**: Successfully integrated with the VoidAI `/v1/audio/transcriptions` endpoint.
7. ✅ **Result Handling**: Implemented a history of transcription results with display of audio duration, text size, and the raw API response.
8. ✅ **User Actions**: Added actions to download, copy, or paste the transcription into the main chat input.
9. ✅ **State Management Refactoring**: Refactored the dialog's visibility logic to use a single source of truth in the Effector store, fixing a critical re-opening bug and removing anti-patterns.

### Phase 4: Audio Chat ❌ (Not Implemented)

1. ❌ Audio recording not implemented
2. ❌ Audio messages not integrated into chat
3. ❌ No audio playback in messages

### Phase 5: Voice Models ✅ (Completed)

1. ✅ Implemented voice models configuration
2. ✅ Added all TTS models from VoidAI and Gemini
3. ✅ Created model-specific voice mappings
4. ✅ Dynamic voice loading based on selected model
5. ✅ Model preferences persistence

## 11. API Request/Response Examples

### 11.1 TTS Request Examples (Actual Implementation)

**Standard TTS Models (tts-1, tts-1-hd, elevenlabs)**:

```json
{
  "model": "tts-1-hd",
  "input": "Hello, this is a test.",
  "voice": "nova",
  "response_format": "mp3",
  "speed": 1.0
}
```

**GPT-4o-mini-tts (with instructions)**:

```json
{
  "model": "gpt-4o-mini-tts",
  "input": "Hello, this is a test.",
  "voice": "alloy",
  "response_format": "mp3",
  "instructions": "Speak in a cheerful tone with emphasis on 'Hello'"
}
```

**GPT-4o Audio Models (via chat completions)**:

```json
{
  "model": "gpt-4o-audio-preview",
  "modalities": ["text", "audio"],
  "audio": {
    "voice": "nova",
    "format": "mp3"
  },
  "messages": [
    {
      "role": "user",
      "content": "Hello, this is a test."
    }
  ]
}
```

**Gemini Hybrid Format (as implemented)**:

```json
{
  // OpenAI-style fields
  "model": "gemini-2.5-flash-preview-tts",
  "input": "Hello, this is a test.",
  "voice": "Aoede",
  "response_format": "wav",

  // Gemini-native fields
  "contents": [
    {
      "parts": [
        {
          "text": "Hello, this is a test."
        }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["AUDIO"],
    "speechConfig": {
      "voiceConfig": {
        "prebuiltVoiceConfig": {
          "voiceName": "Aoede"
        }
      }
    }
  }
}
```

### 11.2 Audio Processing Considerations

**Client-Side Processing**:

- Audio recording using MediaRecorder API
- Format conversion using Web Audio API
- Waveform visualization using Canvas API
- Audio playback using HTML5 Audio element

**File Size Limits**:

- VoidAI: Provider-specific limits
- OpenAI: 25MB for transcription
- Gemini: Provider-specific limits
- Client-side chunking for large files

**Browser Compatibility**:

- MediaRecorder: Chrome 47+, Firefox 25+, Safari 14.1+
- Web Audio API: All modern browsers
- getUserMedia: HTTPS required

## 12. Error Handling and Edge Cases

### 12.1 Common Error Scenarios

- **Microphone Permission Denied**: Show clear instructions for enabling
- **Unsupported Audio Format**: Convert client-side or show format requirements
- **API Rate Limits**: Queue requests and show progress
- **Network Interruptions**: Retry with exponential backoff
- **Large File Handling**: Chunk uploads or compress audio

### 12.2 Graceful Degradation

- Fallback to text input if audio recording fails
- Alternative download formats if primary format fails
- Show transcription errors with option to retry
- Cache successful TTS generations for reuse

## 13. Summary

This document has been updated to reflect the actual TTS implementation completed in December 2024. The implementation successfully delivered a working Text-to-Speech feature with the following achievements:

### Completed Features:

1. **Full TTS Support**: All TTS models from VoidAI and Gemini are working
2. **Hybrid API Format**: Successfully implemented a unified approach that supports both OpenAI-style and Gemini-native formats
3. **Rich UI**: TTSDialog with model selection, voice filtering, format options, and generated audio history
4. **Model Preferences**: Persistent storage of user preferences per model
5. **Error Handling**: Proper error display with functional close button
6. **Audio Management**: Native HTML5 audio playback with download functionality

### Key Technical Achievements:

- **Unified API Adapter**: Single `api.ts` file handles all provider differences elegantly
- **Dynamic Configuration**: Voice and format options update based on selected model
- **Memory Management**: Proper cleanup of blob URLs to prevent memory leaks
- **GPT-4o Audio Models**: Successfully integrated using chat completions endpoint
- **Instructions Support**: Added for gpt-4o-mini-tts model

### Remaining Work:

- Audio chat integration not implemented
- Speed control UI not added (backend support exists)
- Context menu TTS option not implemented
- Voice preview functionality not implemented

The implementation demonstrates a solid foundation for audio features with clean architecture, good error handling, and excellent user experience. The hybrid API approach for Gemini models is particularly noteworthy as it allows seamless integration through the VoidAI proxy. The successful completion of the Standalone Transcription Dialog in Phase 3 provides another reusable architectural pattern for future features.
