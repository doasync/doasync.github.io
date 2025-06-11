export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  duration: number;
}

export interface AudioRecordingState {
  isRecording: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  waveform: number[];
}

export interface AudioMessageData {
  url: string;
  duration: number;
  format: string;
  transcript?: string;
  waveform?: number[];
  size?: number;
}

export interface AudioChatState {
  recording: AudioRecordingState;
  playbackStates: Record<string, PlaybackState>;
  activePlayer: string | null;
  error: string | null;
}

export interface AudioProcessingOptions {
  format?: 'webm' | 'mp3' | 'wav';
  quality?: number;
  sampleRate?: number;
}