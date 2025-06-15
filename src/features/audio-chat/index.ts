/**
 * Public API for Ephemeral Audio Chat Feature
 *
 * This module exports only the public interface for in-message audio features.
 * All exports relate to TEMPORARY data that is never persisted.
 */

export {
  // Ephemeral Data Stores
  $ephemeralMessageData,
  $inChatTtsModel,
  $inChatTranscriptionModel,

  // Public Events
  toggleMessageAudio,
  toggleMessageTranscript,
  clearEphemeralData,
  clearAllEphemeralData,
  setInChatTtsModel,
  setInChatTranscriptionModel,

  // Effects (for debugging/monitoring)
  generateInMessageTTSFx,
  generateInMessageSTTFx,
} from './model';

export type {
  EphemeralMessageData,
  EphemeralAudioData,
  EphemeralTranscriptData,
  InChatSettings,
  ToggleMessageAudioPayload,
  ToggleMessageTranscriptPayload,
  AudioGenerationPayload,
  TranscriptionPayload,
  AudioGenerationResult,
  TranscriptionResult,
  AudioGenerationError,
  TranscriptionError,
} from './types';
