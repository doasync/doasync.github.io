/**
 * Ephemeral Audio Chat Feature
 *
 * CRITICAL: This module manages TEMPORARY audio data only.
 * Generated TTS audio and STT transcripts are session-only and must NEVER:
 * - Be saved to IndexedDB
 * - Be sent to chat completions API
 * - Be persisted beyond the current session
 */

import { createEffect, sample, createDomain } from 'effector';
import { debug } from 'patronum/debug';
import { persist } from 'effector-storage/local';
import type {
  EphemeralMessageData,
  InChatSettings,
  ToggleMessageAudioPayload,
  ToggleMessageTranscriptPayload,
  AudioGenerationPayload,
  TranscriptionPayload,
  AudioGenerationResult,
  TranscriptionResult,
  AudioGenerationError,
  TranscriptionError,
  AudioToggleAction,
  TranscriptToggleAction,
} from './types';

// Create domain for audio chat
const audioChatDomain = createDomain('audio-chat');

// =====================================================================
// EPHEMERAL DATA STORES (Session-only, never persisted)
// =====================================================================

/**
 * Core ephemeral data store - contains temporary audio/transcript data
 * CRITICAL: This store is deliberately NOT persisted to avoid pollution of chat history
 */
export const $ephemeralMessageData =
  audioChatDomain.createStore<EphemeralMessageData>({});

// =====================================================================
// SETTINGS STORES (Persisted to localStorage only)
// =====================================================================

/**
 * In-Chat TTS Model selection (persisted to localStorage)
 */
export const $inChatTtsModel = audioChatDomain.createStore<string>('tts-1-hd');

/**
 * In-Chat Transcription Model selection (persisted to localStorage)
 */
export const $inChatTranscriptionModel =
  audioChatDomain.createStore<string>('whisper-1');

// Persist settings to localStorage (NOT IndexedDB)
persist({
  store: $inChatTtsModel,
  key: 'inChatTtsModel',
});

persist({
  store: $inChatTranscriptionModel,
  key: 'inChatTranscriptionModel',
});

// =====================================================================
// PUBLIC EVENTS
// =====================================================================

/**
 * Toggle TTS audio for a text message
 */
export const toggleMessageAudio =
  audioChatDomain.createEvent<ToggleMessageAudioPayload>();

/**
 * Toggle STT transcript for an audio message
 */
export const toggleMessageTranscript =
  audioChatDomain.createEvent<ToggleMessageTranscriptPayload>();

/**
 * Clear ephemeral data for a specific message
 */
export const clearEphemeralData = audioChatDomain.createEvent<string>();

/**
 * Clear all ephemeral data (e.g., on chat change)
 */
export const clearAllEphemeralData = audioChatDomain.createEvent<void>();

/**
 * Update in-chat TTS model selection
 */
export const setInChatTtsModel = audioChatDomain.createEvent<string>();

/**
 * Update in-chat transcription model selection
 */
export const setInChatTranscriptionModel =
  audioChatDomain.createEvent<string>();

// =====================================================================
// INTERNAL EVENTS
// =====================================================================

/**
 * Internal event for processing audio toggle actions
 */
const audioToggleProcessed = audioChatDomain.createEvent<AudioToggleAction>();

/**
 * Internal event for processing transcript toggle actions
 */
const transcriptToggleProcessed =
  audioChatDomain.createEvent<TranscriptToggleAction>();

/**
 * Internal events for audio generation lifecycle
 */
const audioGenerationStarted = audioChatDomain.createEvent<{
  messageId: string;
  model: string;
}>();
const audioGenerationCompleted =
  audioChatDomain.createEvent<AudioGenerationResult>();
const audioGenerationFailed =
  audioChatDomain.createEvent<AudioGenerationError>();

/**
 * Internal events for transcription lifecycle
 */
const transcriptionStarted = audioChatDomain.createEvent<{
  messageId: string;
  model: string;
}>();
const transcriptionCompleted =
  audioChatDomain.createEvent<TranscriptionResult>();
const transcriptionFailed = audioChatDomain.createEvent<TranscriptionError>();

// =====================================================================
// EFFECTS (API Integration)
// =====================================================================

/**
 * Generate TTS audio for in-message use
 * Reuses existing TTS API adapter from text-to-speech feature
 */
export const generateInMessageTTSFx = createEffect<
  AudioGenerationPayload,
  AudioGenerationResult
>();

/**
 * Generate STT transcript for in-message use
 * Reuses existing STT API adapter from speech-to-text feature
 */
export const generateInMessageSTTFx = createEffect<
  TranscriptionPayload,
  TranscriptionResult
>();

// =====================================================================
// API INTEGRATION IMPLEMENTATIONS
// =====================================================================

/**
 * TTS Effect Implementation
 * Reuses the existing TTS API from text-to-speech feature
 */
generateInMessageTTSFx.use(async ({ messageId, text, model }) => {
  try {
    // Import TTS API from existing feature
    const { generateSpeech } = await import('../text-to-speech/api');
    const { getDefaultVoiceForModel } = await import('../voice-models');

    // Get default voice for the selected model
    const voice = getDefaultVoiceForModel(model) || 'nova';

    // Generate audio using existing TTS API
    const ttsResult = await generateSpeech({
      text,
      model,
      voice,
      format: 'mp3' as const,
      speed: 1.0,
    });

    // Create blob from ArrayBuffer
    const audioBlob = new Blob([ttsResult.audio], { type: 'audio/mp3' });

    // Create blob URL for temporary use
    const audioUrl = URL.createObjectURL(audioBlob);

    return {
      messageId,
      audioUrl,
      voice,
    };
  } catch (error) {
    console.error('TTS generation failed:', error);
    throw new Error(
      error instanceof Error ? error.message : 'TTS generation failed',
    );
  }
});

/**
 * STT Effect Implementation
 * Reuses the existing STT API from speech-to-text feature
 */
generateInMessageSTTFx.use(async ({ messageId, audioUrl, model }) => {
  try {
    // Import STT API from existing feature
    const { transcribeAudio } = await import('../speech-to-text/api');

    // Convert blob URL to File object for STT API
    const response = await fetch(audioUrl);
    const audioBlob = await response.blob();
    const audioFile = new File([audioBlob], 'audio.mp3', { type: 'audio/mp3' });

    // Transcribe audio using existing STT API
    const result = await transcribeAudio({
      file: audioFile,
      model,
      responseFormat: 'text' as const,
      prompt: '', // No context prompt for in-message transcription
    });

    return {
      messageId,
      transcript: result.text || result.toString(),
      format: 'text',
    };
  } catch (error) {
    console.error('Transcription failed:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Transcription failed',
    );
  }
});

/**
 * Load in-chat settings from localStorage
 */
export const loadInChatSettingsFx = createEffect<void, InChatSettings>();

/**
 * Save TTS model selection to localStorage
 */
export const saveInChatTtsModelFx = createEffect<string, void>();

/**
 * Save transcription model selection to localStorage
 */
export const saveInChatTranscriptionModelFx = createEffect<string, void>();

// =====================================================================
// STATE FLOW LOGIC
// =====================================================================

// Update settings stores
$inChatTtsModel.on(setInChatTtsModel, (_, model) => model);
$inChatTranscriptionModel.on(setInChatTranscriptionModel, (_, model) => model);

// Process TTS toggle requests
sample({
  clock: toggleMessageAudio,
  source: [$ephemeralMessageData, $inChatTtsModel],
  fn: ([ephemeralData, ttsModel], { messageId, messageText }) => {
    const currentData = (ephemeralData as EphemeralMessageData)[messageId]
      ?.audio;

    if (currentData?.isVisible) {
      // Hide existing audio
      return { type: 'hide' as const, messageId };
    } else if (currentData?.url && !currentData.error) {
      // Show existing audio (if no error)
      return { type: 'show' as const, messageId };
    } else {
      // Generate new audio
      return {
        type: 'generate' as const,
        messageId,
        text: messageText,
        model: ttsModel as string,
      };
    }
  },
  target: audioToggleProcessed,
});

// Process STT toggle requests
sample({
  clock: toggleMessageTranscript,
  source: [$ephemeralMessageData, $inChatTranscriptionModel],
  fn: ([ephemeralData, sttModel], { messageId, audioUrl }) => {
    const currentData = (ephemeralData as EphemeralMessageData)[messageId]
      ?.transcript;

    if (currentData?.isVisible) {
      // Hide existing transcript
      return { type: 'hide' as const, messageId };
    } else if (currentData?.text && !currentData.error) {
      // Show existing transcript (if no error)
      return { type: 'show' as const, messageId };
    } else {
      // Generate new transcript
      return {
        type: 'generate' as const,
        messageId,
        audioUrl,
        model: sttModel as string,
      };
    }
  },
  target: transcriptToggleProcessed,
});

// Handle audio toggle actions
sample({
  clock: audioToggleProcessed,
  filter: (action) => action.type === 'generate',
  fn: (action) => {
    if (action.type === 'generate') {
      return {
        messageId: action.messageId,
        text: action.text,
        model: action.model,
      };
    }
    throw new Error('Invalid action type');
  },
  target: generateInMessageTTSFx,
});

// Handle transcript toggle actions
sample({
  clock: transcriptToggleProcessed,
  filter: (action) => action.type === 'generate',
  fn: (action) => {
    if (action.type === 'generate') {
      return {
        messageId: action.messageId,
        audioUrl: action.audioUrl,
        model: action.model,
      };
    }
    throw new Error('Invalid action type');
  },
  target: generateInMessageSTTFx,
});

// Update ephemeral store for show/hide actions
sample({
  clock: audioToggleProcessed,
  source: $ephemeralMessageData,
  filter: (_, action) => action.type === 'show' || action.type === 'hide',
  fn: (ephemeralData, action) => {
    const messageData = ephemeralData[action.messageId];
    if (!messageData?.audio) return ephemeralData;

    return {
      ...ephemeralData,
      [action.messageId]: {
        ...messageData,
        audio: {
          ...messageData.audio,
          isVisible: action.type === 'show',
        },
      },
    };
  },
  target: $ephemeralMessageData,
});

sample({
  clock: transcriptToggleProcessed,
  source: $ephemeralMessageData,
  filter: (_, action) => action.type === 'show' || action.type === 'hide',
  fn: (ephemeralData, action) => {
    const messageData = ephemeralData[action.messageId];
    if (!messageData?.transcript) return ephemeralData;

    return {
      ...ephemeralData,
      [action.messageId]: {
        ...messageData,
        transcript: {
          ...messageData.transcript,
          isVisible: action.type === 'show',
        },
      },
    };
  },
  target: $ephemeralMessageData,
});

// Handle TTS generation start
sample({
  clock: generateInMessageTTSFx,
  source: $inChatTtsModel,
  fn: (model, { messageId }) => ({ messageId, model }),
  target: audioGenerationStarted,
});

// Handle STT generation start
sample({
  clock: generateInMessageSTTFx,
  source: $inChatTranscriptionModel,
  fn: (model, { messageId }) => ({ messageId, model }),
  target: transcriptionStarted,
});

// Update ephemeral store for generation start (loading state)
sample({
  clock: audioGenerationStarted,
  source: $ephemeralMessageData,
  fn: (ephemeralData, { messageId, model }) => ({
    ...ephemeralData,
    [messageId]: {
      ...ephemeralData[messageId],
      audio: {
        url: '',
        isLoading: true,
        isVisible: true,
        model,
        voice: '', // Will be filled on completion
        timestamp: Date.now(),
      },
    },
  }),
  target: $ephemeralMessageData,
});

sample({
  clock: transcriptionStarted,
  source: $ephemeralMessageData,
  fn: (ephemeralData, { messageId, model }) => ({
    ...ephemeralData,
    [messageId]: {
      ...ephemeralData[messageId],
      transcript: {
        text: '',
        isLoading: true,
        isVisible: true,
        model,
        format: 'text',
        timestamp: Date.now(),
      },
    },
  }),
  target: $ephemeralMessageData,
});

// Handle successful generation completion
sample({
  clock: generateInMessageTTSFx.doneData,
  target: audioGenerationCompleted,
});

sample({
  clock: generateInMessageSTTFx.doneData,
  target: transcriptionCompleted,
});

// Handle generation failures
sample({
  clock: generateInMessageTTSFx.fail,
  fn: ({ params, error }) => ({
    messageId: params.messageId,
    error: error.message || 'TTS generation failed',
  }),
  target: audioGenerationFailed,
});

sample({
  clock: generateInMessageSTTFx.fail,
  fn: ({ params, error }) => ({
    messageId: params.messageId,
    error: error.message || 'Transcription failed',
  }),
  target: transcriptionFailed,
});

// Update ephemeral store for successful completion
$ephemeralMessageData.on(
  audioGenerationCompleted,
  (ephemeralData, { messageId, audioUrl, voice }) => ({
    ...ephemeralData,
    [messageId]: {
      ...(ephemeralData[messageId] || {}),
      audio: {
        ...(ephemeralData[messageId]?.audio || {}),
        url: audioUrl,
        isLoading: false,
        isVisible: ephemeralData[messageId]?.audio?.isVisible ?? true,
        model: ephemeralData[messageId]?.audio?.model ?? '',
        voice,
        timestamp: Date.now(),
      },
    },
  }),
);

$ephemeralMessageData.on(
  transcriptionCompleted,
  (ephemeralData, { messageId, transcript, format }) => ({
    ...ephemeralData,
    [messageId]: {
      ...(ephemeralData[messageId] || {}),
      transcript: {
        ...(ephemeralData[messageId]?.transcript || {}),
        text: transcript,
        isLoading: false,
        isVisible: ephemeralData[messageId]?.transcript?.isVisible ?? true,
        model: ephemeralData[messageId]?.transcript?.model ?? '',
        format,
        timestamp: Date.now(),
      },
    },
  }),
);

// Update ephemeral store for failures
$ephemeralMessageData.on(
  audioGenerationFailed,
  (ephemeralData, { messageId, error }) => ({
    ...ephemeralData,
    [messageId]: {
      ...(ephemeralData[messageId] || {}),
      audio: {
        ...(ephemeralData[messageId]?.audio || {}),
        url: ephemeralData[messageId]?.audio?.url ?? '',
        isLoading: false,
        isVisible: ephemeralData[messageId]?.audio?.isVisible ?? true,
        model: ephemeralData[messageId]?.audio?.model ?? '',
        voice: ephemeralData[messageId]?.audio?.voice ?? '',
        error,
        timestamp: Date.now(),
      },
    },
  }),
);

$ephemeralMessageData.on(
  transcriptionFailed,
  (ephemeralData, { messageId, error }) => ({
    ...ephemeralData,
    [messageId]: {
      ...(ephemeralData[messageId] || {}),
      transcript: {
        ...(ephemeralData[messageId]?.transcript || {}),
        text: ephemeralData[messageId]?.transcript?.text ?? '',
        isLoading: false,
        isVisible: ephemeralData[messageId]?.transcript?.isVisible ?? true,
        model: ephemeralData[messageId]?.transcript?.model ?? '',
        format: ephemeralData[messageId]?.transcript?.format ?? '',
        error,
        timestamp: Date.now(),
      },
    },
  }),
);

// Clear ephemeral data
sample({
  clock: clearEphemeralData,
  source: $ephemeralMessageData,
  fn: (ephemeralData, messageId) => {
    const { [messageId]: removed, ...rest } = ephemeralData;

    // Clean up blob URLs to prevent memory leaks
    if (removed?.audio?.url) {
      URL.revokeObjectURL(removed.audio.url);
    }

    return rest;
  },
  target: $ephemeralMessageData,
});

// Clear all ephemeral data
sample({
  clock: clearAllEphemeralData,
  source: $ephemeralMessageData,
  fn: (ephemeralData) => {
    // Clean up all blob URLs to prevent memory leaks
    Object.values(ephemeralData).forEach((messageData) => {
      if (messageData.audio?.url) {
        URL.revokeObjectURL(messageData.audio.url);
      }
    });

    return {};
  },
  target: $ephemeralMessageData,
});

// =====================================================================
// MEMORY MANAGEMENT
// =====================================================================

/**
 * Auto-cleanup effect to prevent memory leaks
 * Cleans up ephemeral data older than 1 hour
 */
const autoCleanupFx = createEffect(() => {
  const ephemeralData = $ephemeralMessageData.getState();
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  Object.entries(ephemeralData).forEach(([messageId, data]) => {
    const audioOld = data.audio && data.audio.timestamp < oneHourAgo;
    const transcriptOld =
      data.transcript && data.transcript.timestamp < oneHourAgo;

    if (audioOld || transcriptOld) {
      clearEphemeralData(messageId);
    }
  });
});

// Run auto-cleanup every 30 minutes
setInterval(
  () => {
    autoCleanupFx();
  },
  30 * 60 * 1000,
);

// =====================================================================
// DEBUGGING
// =====================================================================

if (process.env.NODE_ENV === 'development') {
  debug(audioChatDomain);
}
