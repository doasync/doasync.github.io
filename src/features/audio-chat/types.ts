/**
 * Types for ephemeral audio features in chat messages
 *
 * CRITICAL: These interfaces are for TEMPORARY data only.
 * This data must NEVER be persisted to IndexedDB or sent to chat API.
 */

export interface EphemeralAudioData {
  url: string;
  isLoading: boolean;
  isVisible: boolean;
  model: string;
  voice: string;
  timestamp: number;
  error?: string;
}

export interface EphemeralTranscriptData {
  text: string;
  isLoading: boolean;
  isVisible: boolean;
  model: string;
  format: string;
  timestamp: number;
  error?: string;
}

export interface EphemeralMessageData {
  [messageId: string]: {
    audio?: EphemeralAudioData;
    transcript?: EphemeralTranscriptData;
  };
}

export interface InChatSettings {
  ttsModel: string;
  transcriptionModel: string;
}

// Event payload types
export interface ToggleMessageAudioPayload {
  messageId: string;
  messageText: string;
}

export interface ToggleMessageTranscriptPayload {
  messageId: string;
  audioUrl: string;
}

export interface AudioGenerationPayload {
  messageId: string;
  text: string;
  model: string;
}

export interface TranscriptionPayload {
  messageId: string;
  audioUrl: string;
  model: string;
}

export interface AudioGenerationResult {
  messageId: string;
  audioUrl: string;
  voice: string;
}

export interface TranscriptionResult {
  messageId: string;
  transcript: string;
  format: string;
}

export interface AudioGenerationError {
  messageId: string;
  error: string;
}

export interface TranscriptionError {
  messageId: string;
  error: string;
}

// Action types for toggle processing
export type AudioToggleAction =
  | { type: 'hide'; messageId: string }
  | { type: 'show'; messageId: string }
  | { type: 'generate'; messageId: string; text: string; model: string };

export type TranscriptToggleAction =
  | { type: 'hide'; messageId: string }
  | { type: 'show'; messageId: string }
  | { type: 'generate'; messageId: string; audioUrl: string; model: string };
