/**
 * Public API for Ephemeral Audio Chat Feature
 *
 * This module exports only the public interface for in-message audio features.
 * All exports relate to TEMPORARY data that is never persisted.
 */

export {
  // Ephemeral Data Stores
  $ephemeralMessageData,
  $inChatTranscriptionModel,
  $inChatTtsModel,
  clearAllEphemeralData,
  clearEphemeralData,
  generateInMessageSTTFx,
  // Effects (for debugging/monitoring)
  generateInMessageTTSFx,
  setInChatTranscriptionModel,
  setInChatTtsModel,
  // Public Events
  toggleMessageAudio,
  toggleMessageTranscript,
} from './model';
export type {
  AudioGenerationError,
  AudioGenerationPayload,
  AudioGenerationResult,
  EphemeralAudioData,
  EphemeralMessageData,
  EphemeralTranscriptData,
  InChatSettings,
  ToggleMessageAudioPayload,
  ToggleMessageTranscriptPayload,
  TranscriptionError,
  TranscriptionPayload,
  TranscriptionResult,
} from './types';
