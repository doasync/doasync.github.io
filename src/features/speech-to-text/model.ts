import { createDomain, createEffect, sample, combine } from 'effector';
import { debug } from 'patronum/debug';
import { AudioFileInfo, STTParams, STTResponse, STTState, TranscriptionSegment } from './types';
import { transcribeAudio } from './api';

const domain = createDomain('speech-to-text');

// Stores
export const $sttFile = domain.createStore<File | null>(null);
export const $sttProgress = domain.createStore<number>(0);
export const $isTranscribing = domain.createStore<boolean>(false);
export const $sttResult = domain.createStore<string | null>(null);
export const $sttLanguage = domain.createStore<string | null>(null);
export const $sttError = domain.createStore<string | null>(null);
export const $sttProvider = domain.createStore<'voidai' | 'openai' | 'gemini'>('voidai');
export const $sttSegments = domain.createStore<TranscriptionSegment[]>([]);

export const $sttState = combine({
  file: $sttFile,
  progress: $sttProgress,
  isTranscribing: $isTranscribing,
  result: $sttResult,
  language: $sttLanguage,
  error: $sttError,
  provider: $sttProvider,
  segments: $sttSegments,
});

// Events
export const audioFileDropped = domain.createEvent<File>();
export const transcriptionStarted = domain.createEvent();
export const progressUpdated = domain.createEvent<number>();
export const transcriptionCompleted = domain.createEvent<STTResponse>();
export const transcriptionFailed = domain.createEvent<string>();
export const insertToChat = domain.createEvent();
export const createNewMessage = domain.createEvent();
export const clearTranscription = domain.createEvent();
export const providerChanged = domain.createEvent<'voidai' | 'openai' | 'gemini'>();

// Effects
export const transcribeAudioFx = createEffect<STTParams, STTResponse, Error>({
  handler: transcribeAudio,
});

export const processAudioFileFx = createEffect<File, AudioFileInfo, Error>({
  handler: async (file) => {
    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 
                       'audio/ogg', 'audio/opus', 'audio/flac', 'audio/webm', 'audio/mp4'];
    
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid audio file type. Supported formats: MP3, WAV, OGG, OPUS, FLAC, WebM, MP4');
    }
    
    // Check file size (25MB limit for OpenAI)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 25MB limit');
    }
    
    // Generate waveform (simplified - in real app would use Web Audio API)
    const waveform = Array(100).fill(0).map(() => Math.random());
    
    // Get duration (would use Web Audio API in real implementation)
    const duration = 0; // Placeholder
    
    return {
      file,
      duration,
      waveform,
    };
  },
});

export const detectLanguageFx = createEffect<string, string | null, Error>({
  handler: async (text) => {
    // Simple language detection based on character sets
    // In production, would use a proper language detection library or API
    
    if (/[\u4e00-\u9fa5]/.test(text)) return 'zh';
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
    if (/[\u0400-\u04ff]/.test(text)) return 'ru';
    if (/[\u0600-\u06ff]/.test(text)) return 'ar';
    
    return 'en'; // Default to English
  },
});

// Store updates
$sttFile.on(audioFileDropped, (_, file) => file);
$sttProgress.on(progressUpdated, (_, progress) => progress);
$sttProvider.on(providerChanged, (_, provider) => provider);
$sttError.on(transcriptionFailed, (_, error) => error);

// Clear state
sample({
  clock: clearTranscription,
  fn: () => null,
  target: [
    $sttFile.reinit,
    $sttProgress.reinit,
    $sttResult.reinit,
    $sttLanguage.reinit,
    $sttError.reinit,
    $sttSegments.reinit,
  ],
});

// Loading state
$isTranscribing
  .on(transcribeAudioFx, () => true)
  .on(transcribeAudioFx.done, () => false)
  .on(transcribeAudioFx.fail, () => false);

// Error handling
$sttError
  .on(transcribeAudioFx.fail, (_, { error }) => error.message)
  .on(processAudioFileFx.fail, (_, { error }) => error.message)
  .reset(audioFileDropped);

// Process file when dropped
sample({
  clock: audioFileDropped,
  target: processAudioFileFx,
});

// Start transcription after file processing
sample({
  clock: processAudioFileFx.doneData,
  fn: (info) => ({
    audio: info.file,
  }),
  target: transcribeAudioFx,
});

// Handle transcription result
sample({
  clock: transcribeAudioFx.doneData,
  target: transcriptionCompleted,
});

// Update stores with transcription result
$sttResult.on(transcriptionCompleted, (_, { text }) => text);
$sttLanguage.on(transcriptionCompleted, (_, { language }) => language || null);
$sttSegments.on(transcriptionCompleted, (_, { segments }) => segments || []);

// Detect language after transcription
sample({
  clock: transcriptionCompleted,
  fn: ({ text }) => text,
  target: detectLanguageFx,
});

// Update detected language
sample({
  clock: detectLanguageFx.doneData,
  target: $sttLanguage,
});

// Progress simulation (in real app, would track actual upload/processing progress)
sample({
  clock: transcribeAudioFx,
  fn: () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress <= 90) {
        progressUpdated(progress);
      } else {
        clearInterval(interval);
      }
    }, 200);
    return interval;
  },
});

// Complete progress on success
sample({
  clock: transcribeAudioFx.done,
  fn: () => 100,
  target: progressUpdated,
});

// Debug
if (process.env.NODE_ENV === 'development') {
  debug(domain);
}