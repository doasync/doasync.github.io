export interface VoiceModel {
  id: string;
  name: string;
  provider: 'voidai' | 'openai' | 'gemini';
  capabilities: {
    tts: boolean;
    stt: boolean;
    audioChat: boolean;
  };
  voices: VoiceInfo[];
  languages: string[];
  formats: AudioFormat[];
  apiFormat: 'openai' | 'gemini';
  maxDuration?: number;
  pricing?: {
    tts?: number; // per 1M characters
    stt?: number; // per minute
  };
}

export interface VoiceInfo {
  id: string;
  name: string;
  description?: string;
  gender?: 'male' | 'female' | 'neutral';
  age?: 'young' | 'middle' | 'old';
  style?: string[];
  previewUrl?: string;
  languages?: string[];
}

export type AudioFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';

export interface VoicePreferences {
  favoriteVoices: string[];
  defaultVoice: string | null;
  defaultFormat: AudioFormat;
  defaultSpeed: number;
  autoTranscribe: boolean;
}

export interface VoiceModelsState {
  models: VoiceModel[];
  selectedModelId: string | null;
  selectedVoiceId: string | null;
  preferences: VoicePreferences;
  isLoading: boolean;
  error: string | null;
}