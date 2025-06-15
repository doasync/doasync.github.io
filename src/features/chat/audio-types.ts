// Extended types for audio message support
import { Message, MessageContentPart } from './types';

// Extended audio content part with playback data
export interface AudioContentPartExtended {
  type: 'input_audio';
  input_audio: {
    data: string; // Base64 encoded audio data
    format?: 'wav' | 'mp3' | 'flac' | 'opus';
    // Extended properties for playback
    url?: string; // Object URL for playback
    duration?: number; // Duration in seconds
    transcript?: string; // Optional transcript
    waveform?: number[]; // Waveform data for visualization
  };
}

// Audio output from assistant (TTS or generated audio)
export interface AudioOutputPart {
  type: 'output_audio';
  output_audio: {
    url: string; // URL to audio file
    format: 'mp3' | 'wav' | 'opus' | 'flac';
    duration: number;
    text?: string; // Original text that was synthesized
    voice?: string; // Voice ID used
    model?: string; // TTS model used
    transcript?: string; // For audio responses from chat
    waveform?: number[];
  };
}

// Update MessageContentPart union type
export type ExtendedMessageContentPart = MessageContentPart | AudioOutputPart;

// Extended message type with audio support
export interface AudioMessage extends Omit<Message, 'content'> {
  content: string | ExtendedMessageContentPart[];
}

// Helper type guards
export function isAudioInputPart(
  part: unknown,
): part is AudioContentPartExtended {
  return (
    typeof part === 'object' &&
    part !== null &&
    'type' in part &&
    (part as { type: unknown }).type === 'input_audio'
  );
}

export function isAudioOutputPart(part: unknown): part is AudioOutputPart {
  return (
    typeof part === 'object' &&
    part !== null &&
    'type' in part &&
    (part as { type: unknown }).type === 'output_audio'
  );
}

export function hasAudioContent(message: Message | AudioMessage): boolean {
  if (typeof message.content === 'string') return false;

  return message.content.some(
    (part) => part.type === 'input_audio' || part.type === 'output_audio',
  );
}

// Convert audio blob to content part
export async function createAudioContentPart(
  blob: Blob,
  transcript?: string,
): Promise<AudioContentPartExtended> {
  // Convert blob to base64
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  // Detect format from MIME type
  const format = blob.type.replace('audio/', '') as
    | 'wav'
    | 'mp3'
    | 'flac'
    | 'opus';

  return {
    type: 'input_audio',
    input_audio: {
      data: base64,
      format,
      transcript,
    },
  };
}

// Create audio output part for TTS
export function createAudioOutputPart(
  url: string,
  format: 'mp3' | 'wav' | 'opus' | 'flac',
  options: {
    duration?: number;
    text?: string;
    voice?: string;
    model?: string;
    transcript?: string;
    waveform?: number[];
  } = {},
): AudioOutputPart {
  return {
    type: 'output_audio',
    output_audio: {
      url,
      format,
      duration: options.duration || 0,
      text: options.text,
      voice: options.voice,
      model: options.model,
      transcript: options.transcript,
      waveform: options.waveform,
    },
  };
}
