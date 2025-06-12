export interface STTParams {
  audio: File | Blob;
  language?: string;
  model?: string;
  prompt?: string;
  isTranslation?: boolean;
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

export interface TranscriptionResult {
  id: string;
  text: string;
  fileName: string;
  fileSize: number;
  model: string;
  isTranslation: boolean;
  prompt?: string;
  timestamp: number;
  wordCount: number;
  duration?: number;
}

export interface STTModel {
  id: string;
  name: string;
  description: string;
  supportsTranslation: boolean;
  maxFileSize: number;
  supportedFormats: string[];
}

export interface STTState {
  // Current operation
  file: File | null;
  selectedModel: string;
  prompt: string;
  isTranslation: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Results and history
  transcriptionResults: TranscriptionResult[];
  selectedResult: string | null;
  
  // UI state
  isDialogOpen: boolean;
  availableModels: STTModel[];
  
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
  isTranslation: boolean;
}