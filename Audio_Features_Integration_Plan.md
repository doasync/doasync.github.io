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

- A dedicated TTS dialog accessible via attachment menu (📎 → "Text to Speech")
- Text selection with right-click context menu option (planned)
- Keyboard shortcut (Ctrl/Cmd + Shift + S) (planned)

The TTS dialog includes:

- Text input area with character counter (4000 max)
- TTS model selector dropdown with provider information
- Voice selector dropdown with search, favorites, and gender indicators
- Audio format selector (MP3, WAV, OPUS, AAC, FLAC, PCM)
- Always-visible audio player for preview (no separate preview button)
- Generate Audio button to create the audio
- Download button to save the audio file

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

### 2.3 Provider Capabilities Matrix

| Feature          | VoidAI                                                                                              | Gemini                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Voices           | alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer, verse                            | 30+ voices (Zephyr, Puck, Kore, Fenrir, etc.)            |
| Formats          | MP3, OPUS, AAC, FLAC, WAV, PCM                                                                      | WAV (PCM 24kHz)                                          |
| Models           | tts-1, tts-1-hd, gpt-4o-mini-tts, elevenlabs, gpt-4o-audio-preview, gpt-4o-audio-preview-2024-12-17 | gemini-2.5-flash-preview-tts, gemini-2.5-pro-preview-tts |
| Multi-speaker    | No (except Gemini models)                                                                           | Yes (up to 2 speakers)                                   |
| Style Control    | Yes (gpt-4o-mini-tts, elevenlabs)                                                                   | Yes (via prompt)                                         |
| Languages        | Multiple (16+ for ElevenLabs)                                                                       | 24 languages                                             |
| Special Features | ElevenLabs: emotion & accent control                                                                | Multi-speaker synthesis                                  |

### 2.4 State Model

```typescript
// Features/text-to-speech/model.ts structure
interface TTSState {
  text: string
  selectedVoice: string
  selectedFormat: AudioFormat
  selectedModel: string
  selectedProvider: 'voidai' | 'gemini'
  isLoading: boolean
  error: string | null
  previewUrl: string | null
  audioUrl: string | null
  speed: number
}

// Events
- textChanged: Update text to convert
- voiceSelected: Change voice option
- formatSelected: Change output format
- modelSelected: Change TTS model
- generateTTSClicked: Start TTS generation
- downloadRequested: Save audio file
- ttsDialogOpened: Initialize dialog
- ttsDialogClosed: Cleanup dialog

// Effects
- generateTTSFx: Call appropriate provider API
- downloadAudioFx: Save audio to file system
- playPreviewFx: Integrated into AudioPlayer component
```

## 3. Speech-to-Text (STT) Feature

### 3.1 User Experience

Users can transcribe audio files through:

- Drag-and-drop audio files onto chat input
- Click attachment button and select audio file
- Paste audio file from clipboard

The transcription process shows:

- Upload progress indicator
- Audio waveform visualization
- Transcription progress bar
- Option to insert transcribed text or create new message
- Language detection indicator

### 3.2 Architecture

```mermaid
graph TB
    subgraph "UI Layer"
        AudioUpload[Audio Upload Component]
        TranscriptionProgress[Progress Component]
        WaveformViz[Waveform Visualizer]
    end

    subgraph "State Management"
        $sttFile[$$sttFile Store]
        $sttProgress[$$sttProgress Store]
        $sttResult[$$sttResult Store]
        $sttLanguage[$$sttLanguage Store]
        transcribeAudioFx[transcribeAudioFx Effect]
    end

    subgraph "API Layer"
        STTAdapter[STT API Adapter]
        VoidAISTT[VoidAI STT Handler]
        OpenAISTT[OpenAI STT Handler]
        GeminiSTT[Gemini STT Handler]
    end

    AudioUpload --> $sttFile
    AudioUpload --> transcribeAudioFx
    transcribeAudioFx --> STTAdapter
    STTAdapter --> VoidAISTT
    STTAdapter --> OpenAISTT
    STTAdapter --> GeminiSTT
```

### 3.3 Provider Capabilities Matrix

| Feature   | VoidAI                                               | Gemini               |
| --------- | ---------------------------------------------------- | -------------------- |
| Models    | whisper-1, gpt-4o-transcribe, gpt-4o-mini-transcribe | Via multimodal input |
| Streaming | No                                                   | No                   |
| Languages | Multiple                                             | Auto-detect          |
| Formats   | Common audio formats                                 | Common audio formats |
| Max Size  | 25MB                                                 | Provider limits      |

### 3.4 State Model

```typescript
// Features/speech-to-text/model.ts structure
interface STTState {
  file: File | null
  progress: number
  isTranscribing: boolean
  result: string | null
  language: string | null
  error: string | null
  provider: 'voidai' | 'openai' | 'gemini'
}

// Events
- audioFileDropped: Handle file drop
- transcriptionStarted: Begin transcription
- progressUpdated: Update progress
- transcriptionCompleted: Process result
- insertToChat: Add to current message
- createNewMessage: Create new chat message

// Effects
- transcribeAudioFx: Call STT API
- detectLanguageFx: Identify audio language
- processAudioFileFx: Validate and prepare file
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

### 6.1 File Structure

```
src/features/
├── text-to-speech/
│   ├── model.ts          # TTS state management
│   ├── index.ts          # Public API
│   ├── types.ts          # TypeScript types
│   ├── components/
│   │   ├── TTSDialog.tsx
│   │   └── VoiceSelector.tsx
│   └── api/
│       ├── adapter.ts
│       └── providers/
├── speech-to-text/
│   ├── model.ts          # STT state management
│   ├── index.ts
│   ├── types.ts
│   ├── components/
│   │   ├── AudioUpload.tsx
│   │   └── TranscriptionProgress.tsx
│   └── api/
├── audio-chat/
│   ├── model.ts          # Audio chat state
│   ├── index.ts
│   ├── types.ts
│   ├── components/
│   │   ├── AudioRecorder.tsx
│   │   ├── AudioPlayer.tsx
│   │   └── AudioMessage.tsx
│   └── utils/
│       └── audio-processing.ts
└── voice-models/
    ├── model.ts          # Voice model state
    ├── index.ts
    ├── types.ts
    └── config/
        ├── voices.json
        └── providers.json
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

## 7. Provider-Specific Handling

### 7.1 API Format Differences

**VoidAI (OpenAI-compatible)**:

- TTS: `/audio/speech` endpoint (fixed: no duplicate v1)
- STT: `/audio/transcriptions` endpoint
- Audio Chat: `/chat/completions` with audio modality
- Speed parameter: 0.25 to 4.0 (tts-1, tts-1-hd only)
- Instructions parameter: Supported on gpt-4o-mini-tts

**OpenAI**:

- Same endpoints as VoidAI
- Additional models: `gpt-4o-mini-tts`, `gpt-4o-transcribe`
- Speed parameter: Not supported on gpt-4o-mini-tts
- Instructions parameter: Supported on gpt-4o-mini-tts for voice control
- Streaming transcription: Supported

**Gemini**:

- TTS: `/v1beta/models/{model}:generateContent` with audio response
- STT: Multimodal input to chat endpoint
- Requires different request/response format
- Multi-speaker support: Up to 2 speakers
- Audio output: Base64 encoded PCM data (24kHz, 16-bit)
- Voice control: Via natural language prompts

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

### 7.3 Provider Adapter Pattern

```typescript
interface AudioProvider {
  generateSpeech(params: TTSParams): Promise<AudioBlob>;
  transcribeAudio(params: STTParams): Promise<Transcript>;
  chatWithAudio(params: AudioChatParams): Promise<AudioResponse>;
}

// Each provider implements the interface
class VoidAIProvider implements AudioProvider {}
class OpenAIProvider implements AudioProvider {}
class GeminiProvider implements AudioProvider {}
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

### 8.2 TTS Dialog Design

```
┌─────────────────────────────────────────────────┐
│ Text to Speech                              [X] │
├─────────────────────────────────────────────────┤
│                                                 │
│ Text to convert:                               │
│ ┌─────────────────────────────────────────────┐ │
│ │                                             │ │
│ │ [Multi-line text input area]                │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│ Characters: 0/4000                             │
│                                                 │
│ TTS Model: [tts-1-hd ▼] (VoidAI)               │
│ Voice: [Nova ▼]         Format: [MP3 ▼]        │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Generated Audio:                            │ │
│ │ [Audio Player Component]                    │ │
│ │ • Play/pause button                         │ │
│ │ • Seek slider                               │ │
│ │ • Time display                              │ │
│ │ • No separate download button               │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Cancel]                     [Generate Audio]   │
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

1. ✅ Created audio feature modules structure
2. ✅ Implemented provider adapter pattern
3. ✅ Extended message types for audio support

### Phase 2: TTS Feature ✅ (Completed)

1. ✅ Built TTS dialog and UI components
2. ✅ Implemented TTS state management
3. ✅ Added provider-specific TTS handlers
4. ✅ Moved TTS access to attachment menu
5. ✅ Added model selector to TTS dialog
6. ✅ Replaced preview button with audio player
7. ✅ Fixed API endpoint URL issues

### Phase 3: STT Feature ✅ (Partially Completed)

1. ✅ Created STT module structure
2. ✅ Implemented transcription API adapters
3. ⏳ Create audio upload components (pending UI)
4. ⏳ Add progress tracking and visualization

### Phase 4: Audio Chat ✅ (Structure Completed)

1. ✅ Created audio-chat module structure
2. ✅ Added recording state management
3. ⏳ Build audio recorder component UI
4. ⏳ Integrate audio messages into chat

### Phase 5: Voice Models ✅ (Completed)

1. ✅ Implemented voice models configuration
2. ✅ Added all TTS/STT models from VoidAI
3. ✅ Created voice preferences system
4. ✅ Added voice selection with search & favorites

## 11. API Request/Response Examples

### 11.1 TTS Request Examples

**VoidAI/OpenAI Format**:

```json
{
  "model": "tts-1-hd",
  "input": "Hello, this is a test.",
  "voice": "nova",
  "response_format": "mp3",
  "speed": 1.0
}
```

**Gemini Format**:

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "Speaker1: Hello!\nSpeaker2: Hi there!"
        }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["AUDIO"],
    "speechConfig": {
      "multiSpeakerVoiceConfig": {
        "speakerVoiceConfigs": [
          {
            "speaker": "Speaker1",
            "voiceConfig": {
              "prebuiltVoiceConfig": {
                "voiceName": "Puck"
              }
            }
          },
          {
            "speaker": "Speaker2",
            "voiceConfig": {
              "prebuiltVoiceConfig": {
                "voiceName": "Kore"
              }
            }
          }
        ]
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

This plan provides a comprehensive architecture for integrating audio features into the chat application while maintaining clean separation of concerns and supporting multiple providers. The phased approach allows incremental implementation while ensuring each feature is fully functional before moving to the next.

Key architectural decisions:

- Feature-based module structure aligns with existing codebase
- Provider adapter pattern handles API differences elegantly
- Model-specific format tracking for VoidAI/OpenAI vs Gemini
- Effector state management ensures predictable updates
- Progressive enhancement maintains app stability
- Clear UI/UX design focuses on user needs

The implementation will extend the existing chat application with powerful audio capabilities while preserving the current architecture and user experience patterns.
