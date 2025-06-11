export interface STTParams {
  audio: File | Blob;
  language?: string;
  model?: string;
  prompt?: string;
}

export interface STTResponse {
  text: string;
  language?: string;
  duration?: number;
  segments?: TranscriptionSegment[];
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface STTState {
  file: File | null;
  progress: number;
  isTranscribing: boolean;
  result: string | null;
  language: string | null;
  error: string | null;
  provider: 'voidai' | 'openai' | 'gemini';
  segments: TranscriptionSegment[];
}

export interface AudioFileInfo {
  file: File;
  duration: number;
  waveform: number[];
}