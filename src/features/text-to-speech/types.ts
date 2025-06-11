export type AudioFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';

export type VoiceProvider = 'voidai' | 'openai' | 'gemini';

export interface VoiceOption {
  id: string;
  name: string;
  provider: VoiceProvider;
  description?: string;
  previewUrl?: string;
  tags?: string[];
}

export interface TTSParams {
  text: string;
  voice: string;
  model: string;
  format: AudioFormat;
  speed?: number;
  instructions?: string;
}

export interface TTSResponse {
  audio: ArrayBuffer;
  format: AudioFormat;
  duration?: number;
}

export interface TTSState {
  text: string;
  selectedVoice: string;
  selectedFormat: AudioFormat;
  selectedModel: string;
  selectedProvider: VoiceProvider;
  isLoading: boolean;
  error: string | null;
  previewUrl: string | null;
  availableVoices: VoiceOption[];
  speed: number;
  instructions: string;
}

export interface TTSProvider {
  id: VoiceProvider;
  name: string;
  models: string[];
  voices: VoiceOption[];
  formats: AudioFormat[];
  supportsSpeed: boolean;
  supportsInstructions: boolean;
  speedRange?: {
    min: number;
    max: number;
  };
}

export interface GeneratedAudio {
  id: string;
  url: string;
  text: string;
  model: string;
  voice: string;
  format: AudioFormat;
  timestamp: number;
  size: number; // Size in bytes
  filename: string; // Unique filename for download
}