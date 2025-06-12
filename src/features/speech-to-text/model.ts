import { createDomain, createEffect, sample, combine, createEvent, createStore } from 'effector';
import { debug } from 'patronum/debug';
import { TranscriptionResult, STTResponse, TranscribeParams, ValidationResult } from './types';
import { transcribeAudio, validateAudioFile, STT_MODELS } from './api';
import { messageSent, messageTextChanged } from '../chat/model';

const domain = createDomain('speech-to-text');

// Core Stores
export const $sttFile = domain.createStore<File | null>(null);
export const $sttModel = domain.createStore<string>('whisper-1');
export const $sttPrompt = domain.createStore<string>('');
export const $isLoading = domain.createStore<boolean>(false);
export const $sttError = domain.createStore<string | null>(null);

// Results and history
export const $transcriptionResults = domain.createStore<TranscriptionResult[]>([]);
export const $selectedResult = domain.createStore<string | null>(null);

// UI state
export const $isDialogOpen = domain.createStore<boolean>(false);
export const $availableModels = domain.createStore(STT_MODELS);

// Derived state
export const $currentModel = combine(
  $sttModel,
  $availableModels,
  (selectedModel, models) => models.find(m => m.id === selectedModel) || models[0]
);


export const $fileValidation = combine(
  $sttFile,
  (file): ValidationResult | null => {
    if (!file) return null;
    
    const validation = validateAudioFile(file);
    return {
      ...validation,
      fileInfo: {
        name: file.name,
        size: file.size,
        format: file.type,
      }
    };
  }
);

export const $canTranscribe = combine(
  $sttFile,
  $fileValidation,
  $isLoading,
  (file, validation, loading) => 
    Boolean(file && validation?.isValid && !loading)
);

// Combined state for easy consumption
export const $sttState = combine({
  // Current operation
  file: $sttFile,
  selectedModel: $sttModel,
  prompt: $sttPrompt,
  isLoading: $isLoading,
  error: $sttError,
  
  // Results and history
  transcriptionResults: $transcriptionResults,
  selectedResult: $selectedResult,
  
  // UI state
  isDialogOpen: $isDialogOpen,
  availableModels: $availableModels,
  currentModel: $currentModel,
  fileValidation: $fileValidation,
  canTranscribe: $canTranscribe,
});

// Events
export const dialogOpened = domain.createEvent<void>();
export const dialogClosed = domain.createEvent<void>();

export const fileSelected = domain.createEvent<File>();
export const fileCleared = domain.createEvent<void>();

export const modelChanged = domain.createEvent<string>();
export const promptChanged = domain.createEvent<string>();

export const transcribeClicked = domain.createEvent<void>();
export const resultSelected = domain.createEvent<string>();
export const copyTextClicked = domain.createEvent<string>();
export const generateMessageClicked = domain.createEvent<string>();
export const deleteResultClicked = domain.createEvent<string>();
export const clearError = domain.createEvent<void>();

// Effects
export const transcribeAudioFx = createEffect<TranscribeParams, STTResponse, Error>({
  handler: transcribeAudio,
});

export const saveTranscriptionFx = createEffect<TranscriptionResult, void, Error>({
  handler: async (result) => {
    try {
      const existingResults = JSON.parse(localStorage.getItem('stt-transcriptions') || '[]');
      const updatedResults = [result, ...existingResults.slice(0, 49)]; // Keep last 50
      localStorage.setItem('stt-transcriptions', JSON.stringify(updatedResults));
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Saved transcription result:', result);
        console.log('Total transcriptions in storage:', updatedResults.length);
      }
    } catch (error) {
      console.warn('Failed to save transcription to localStorage:', error);
    }
  },
});

export const loadTranscriptionHistoryFx = createEffect<void, TranscriptionResult[], Error>({
  handler: async () => {
    try {
      const stored = localStorage.getItem('stt-transcriptions');
      const results = stored ? JSON.parse(stored) : [];
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Loaded transcription history:', results);
        console.log('Number of transcriptions loaded:', results.length);
      }
      
      return results;
    } catch (error) {
      console.warn('Failed to load transcription history:', error);
      return [];
    }
  },
});

export const deleteTranscriptionFx = createEffect<string, string, Error>({
  handler: async (id) => {
    try {
      const existingResults = JSON.parse(localStorage.getItem('stt-transcriptions') || '[]');
      const filteredResults = existingResults.filter((r: TranscriptionResult) => r.id !== id);
      localStorage.setItem('stt-transcriptions', JSON.stringify(filteredResults));
      return id;
    } catch (error) {
      console.warn('Failed to delete transcription:', error);
      throw error;
    }
  },
});

export const addToChatFx = createEffect<string, void, Error>({
  handler: async (text) => {
    // Set the message text and then send it as a new message to the main chat
    messageTextChanged(text);
    messageSent();
  },
});

// Store updates
$isDialogOpen
  .on(dialogOpened, () => true)
  .on(dialogClosed, () => false);

$sttFile
  .on(fileSelected, (_, file) => file)
  .on(fileCleared, () => null)
  .reset(dialogClosed);

$sttModel.on(modelChanged, (_, model) => model);
$sttPrompt.on(promptChanged, (_, prompt) => prompt);


$sttError
  .on(transcribeAudioFx.failData, (_, { message }) => message)
  .on(clearError, () => null)
  .reset([fileSelected, transcribeClicked]);

// Loading state
$isLoading
  .on(transcribeAudioFx, () => true)
  .on(transcribeAudioFx.finally, () => false);

// Transcription history
$transcriptionResults
  .on(loadTranscriptionHistoryFx.doneData, (_, results) => results)
  .on(saveTranscriptionFx.done, (results, { params }) => [params, ...results])
  .on(deleteTranscriptionFx.doneData, (results, deletedId) => 
    results.filter(r => r.id !== deletedId)
  );

$selectedResult.on(resultSelected, (_, id) => id);

// Transcription workflow
sample({
  clock: transcribeClicked,
  source: { file: $sttFile, model: $sttModel, prompt: $sttPrompt },
  filter: ({ file }) => Boolean(file),
  fn: ({ file, model, prompt }) => ({
    file: file!,
    model,
    prompt: prompt.trim() || undefined,
  }),
  target: transcribeAudioFx,
});

// Save successful transcription
sample({
  clock: transcribeAudioFx.doneData,
  source: { file: $sttFile, model: $sttModel, prompt: $sttPrompt },
  filter: ({ file }) => Boolean(file),
  fn: ({ file, model, prompt }, response): TranscriptionResult => {
    const wordCount = response.text.trim().split(/\s+/).length;
    return {
      id: `stt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: response.text,
      fileName: file!.name,
      fileSize: file!.size,
      model,
      prompt: prompt.trim() || undefined,
      timestamp: Date.now(),
      wordCount,
      duration: response.duration,
    };
  },
  target: saveTranscriptionFx,
});

// Copy text functionality
sample({
  clock: copyTextClicked,
  source: $transcriptionResults,
  fn: (results, id) => {
    const result = results.find(r => r.id === id);
    if (result) {
      navigator.clipboard.writeText(result.text).catch(console.error);
    }
  },
});

// Generate message functionality
sample({
  clock: generateMessageClicked,
  source: $transcriptionResults,
  filter: (results, id) => {
    const result = results.find(r => r.id === id);
    return Boolean(result?.text?.trim());
  },
  fn: (results, id) => {
    const result = results.find(r => r.id === id);
    return result!.text;
  },
  target: addToChatFx,
});

// Delete transcription
sample({
  clock: deleteResultClicked,
  target: deleteTranscriptionFx,
});

// Load history when dialog opens
sample({
  clock: dialogOpened,
  target: loadTranscriptionHistoryFx,
});

// Clear selected result when dialog closes
sample({
  clock: dialogClosed,
  fn: () => null,
  target: $selectedResult,
});

// Legacy compatibility - maintain existing API for backwards compatibility
export const $sttProgress = domain.createStore<number>(0);
export const $sttResult = domain.createStore<string | null>(null);
export const $sttLanguage = domain.createStore<string | null>(null);
export const $sttProvider = domain.createStore<'voidai' | 'openai' | 'gemini'>('voidai');
export const $sttSegments = domain.createStore<any[]>([]);

// Legacy events
export const audioFileDropped = fileSelected;
export const transcriptionStarted = transcribeClicked;
export const progressUpdated = createEvent<number>();
export const transcriptionCompleted = createEvent<STTResponse>();
export const transcriptionFailed = createEvent<string>();
export const insertToChat = generateMessageClicked;
export const createNewMessage = generateMessageClicked;
export const clearTranscription = fileCleared;
export const providerChanged = createEvent<'voidai' | 'openai' | 'gemini'>();

// Update legacy stores
$sttResult.on(transcribeAudioFx.doneData, (_, response) => response.text);
$sttLanguage.on(transcribeAudioFx.doneData, (_, response) => response.language || null);

// Debug
if (process.env.NODE_ENV === 'development') {
  debug(domain);
}