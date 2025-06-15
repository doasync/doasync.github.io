export interface STTParams {
  audio: File | Blob;
  language?: string;
  model?: string;
  prompt?: string;
  responseFormat?: ResponseFormat;
}

export interface STTResponse {
  text: string;
  rawResponse: string; // Store the actual API response
  language?: string;
  duration?: number;
  segments?: TranscriptionSegment[];
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  id: string;
  text: string;
  rawResponse: string; // Store the actual API response
  fileName: string;
  fileSize: number;
  audioDuration?: number; // Duration of the original audio in seconds
  textSize: number; // Size of the transcribed text in bytes
  model: string;
  prompt?: string;
  timestamp: number;
  wordCount: number;
  duration?: number;
  responseFormat: ResponseFormat;
}

export type ResponseFormat = 'json' | 'text' | 'srt' | 'vtt' | 'verbose_json';

export interface ResponseFormatOption {
  value: ResponseFormat;
  label: string;
  description: string;
}

export interface STTModel {
  id: string;
  name: string;
  description: string;
  maxFileSize: number;
  supportedFormats: string[];
  supportedResponseFormats: ResponseFormat[];
  defaultResponseFormat: ResponseFormat;
  hasLimitedParams: boolean;
}

export interface STTState {
  // Current operation
  file: File | null;
  audioDuration?: number; // Duration of the selected audio file
  selectedModel: string;
  prompt: string;
  isLoading: boolean;
  error: string | null;

  // Results and history
  transcriptionResults: TranscriptionResult[];
  selectedResult: string | null;

  // UI state
  isDialogOpen: boolean;
  availableModels: STTModel[];

  // Response format settings per model
  responseFormatsPerModel: Record<string, ResponseFormat>;

  // Legacy compatibility
  progress: number;
  result: string | null;
  language: string | null;
  provider: 'voidai' | 'openai' | 'gemini';
  segments: TranscriptionSegment[];
}

export interface AudioFileInfo {
  file: File;
  duration: number;
  waveform: number[];
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  fileInfo: {
    name: string;
    size: number;
    format: string;
  };
}

export interface TranscribeParams {
  file: File;
  model: string;
  prompt?: string;
  responseFormat: ResponseFormat;
}
