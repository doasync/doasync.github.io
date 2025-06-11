export {
  // Stores
  $isRecording,
  $recordingDuration,
  $audioBlob,
  $recordingWaveform,
  $playbackStates,
  $activePlayer,
  $audioChatError,
  $recordingState,
  $audioChatState,
  
  // Events
  recordingStarted,
  recordingStopped,
  recordingCancelled,
  audioMessageSent,
  playbackToggled,
  playbackRateChanged,
  playbackTimeUpdated,
  playbackEnded,
  transcriptToggled,
  waveformUpdated,
  clearAudioError,
  initializePlayback,
  
  // Effects
  startRecordingFx,
  stopRecordingFx,
  processAudioBlobFx,
  generateTranscriptFx,
} from './model';

export type {
  PlaybackState,
  AudioRecordingState,
  AudioMessageData,
  AudioChatState,
  AudioProcessingOptions,
} from './types';

export {
  createAudioPlayer,
  convertAudioFormat,
} from './utils/audio-processing';