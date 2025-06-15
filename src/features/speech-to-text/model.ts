import {
  createDomain,
  createEffect,
  sample,
  combine,
  createEvent,
} from 'effector';
import { debug } from 'patronum/debug';
import {
  TranscriptionResult,
  STTResponse,
  TranscribeParams,
  ValidationResult,
  ResponseFormat,
} from './types';
import { transcribeAudio, validateAudioFile, STT_MODELS } from './api';
import { messageTextChanged } from '../chat/model';

const domain = createDomain('speech-to-text');

// Core Stores
export const $sttFile = domain.createStore<File | null>(null);
export const $sttModel = domain.createStore<string>('whisper-1');
export const $sttPrompt = domain.createStore<string>('');
export const $isLoading = domain.createStore<boolean>(false);
export const $sttError = domain.createStore<string | null>(null);

// Results and history
export const $transcriptionResults = domain.createStore<TranscriptionResult[]>(
  [],
);
export const $selectedResult = domain.createStore<string | null>(null);

// UI state
export const $isDialogOpen = domain.createStore<boolean>(false);
export const $availableModels = domain.createStore(STT_MODELS);

// Response format settings per model
export const $responseFormatsPerModel = domain.createStore<
  Record<string, ResponseFormat>
>({});

// Derived state
export const $currentModel = combine(
  $sttModel,
  $availableModels,
  (selectedModel, models) =>
    models.find((m) => m.id === selectedModel) || models[0],
);

export const $currentResponseFormat = combine(
  $sttModel,
  $responseFormatsPerModel,
  $currentModel,
  (modelId, formatsPerModel, currentModel) => {
    // Return saved format for this model, or default format
    return (
      formatsPerModel[modelId] || currentModel?.defaultResponseFormat || 'text'
    );
  },
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
      },
    };
  },
);

export const $canTranscribe = combine(
  $sttFile,
  $fileValidation,
  $isLoading,
  (file, validation, loading) =>
    Boolean(file && validation?.isValid && !loading),
);

// Store for audio duration
export const $audioDuration = domain.createStore<number | null>(null);

// Combined state for easy consumption
export const $sttState = combine({
  // Current operation
  file: $sttFile,
  audioDuration: $audioDuration,
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
  currentResponseFormat: $currentResponseFormat,
  responseFormatsPerModel: $responseFormatsPerModel,
  fileValidation: $fileValidation,
  canTranscribe: $canTranscribe,
});

// Events
export const dialogOpened = domain.createEvent<void>();
export const dialogClosed = domain.createEvent<void>();

export const fileSelected = domain.createEvent<File>();
export const fileCleared = domain.createEvent<void>();
export const audioDurationDetected = domain.createEvent<number>();

export const modelChanged = domain.createEvent<string>();
export const promptChanged = domain.createEvent<string>();
export const responseFormatChanged = domain.createEvent<ResponseFormat>();

export const transcribeClicked = domain.createEvent<void>();
export const resultSelected = domain.createEvent<string>();
export const copyTextClicked = domain.createEvent<string>();
export const generateMessageClicked = domain.createEvent<string>();
export const deleteResultClicked = domain.createEvent<string>();
export const clearError = domain.createEvent<void>();

// Effects
export const transcribeAudioFx = createEffect<
  TranscribeParams,
  STTResponse,
  Error
>({
  handler: transcribeAudio,
});

export const saveTranscriptionFx = createEffect<
  TranscriptionResult,
  void,
  Error
>({
  handler: async (result) => {
    try {
      const existingResults = JSON.parse(
        localStorage.getItem('stt-transcriptions') || '[]',
      );
      const updatedResults = [result, ...existingResults.slice(0, 49)]; // Keep last 50
      localStorage.setItem(
        'stt-transcriptions',
        JSON.stringify(updatedResults),
      );

      if (process.env.NODE_ENV === 'development') {
        console.log('Saved transcription result:', result);
        console.log('Total transcriptions in storage:', updatedResults.length);
      }
    } catch (error) {
      console.warn('Failed to save transcription to localStorage:', error);
    }
  },
});

export const loadTranscriptionHistoryFx = createEffect<
  void,
  TranscriptionResult[],
  Error
>({
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

export const loadResponseFormatsSettingsFx = createEffect<
  void,
  Record<string, ResponseFormat>,
  Error
>({
  handler: async () => {
    try {
      const stored = localStorage.getItem('stt-response-formats');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to load response format settings:', error);
      return {};
    }
  },
});

export const saveResponseFormatSettingFx = createEffect<
  { modelId: string; format: ResponseFormat },
  void,
  Error
>({
  handler: async ({ modelId, format }) => {
    try {
      const existing = JSON.parse(
        localStorage.getItem('stt-response-formats') || '{}',
      );
      const updated = { ...existing, [modelId]: format };
      localStorage.setItem('stt-response-formats', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save response format setting:', error);
    }
  },
});

export const deleteTranscriptionFx = createEffect<string, string, Error>({
  handler: async (id) => {
    try {
      const existingResults = JSON.parse(
        localStorage.getItem('stt-transcriptions') || '[]',
      );
      const filteredResults = existingResults.filter(
        (r: TranscriptionResult) => r.id !== id,
      );
      localStorage.setItem(
        'stt-transcriptions',
        JSON.stringify(filteredResults),
      );
      return id;
    } catch (error) {
      console.warn('Failed to delete transcription:', error);
      throw error;
    }
  },
});

// Event for when user wants to paste transcription to chat
export const pasteTranscriptionToChat = domain.createEvent<string>();

// Store updates
$isDialogOpen.on(dialogOpened, () => true).on(dialogClosed, () => false);

$sttFile
  .on(fileSelected, (_, file) => file)
  .on(fileCleared, () => null)
  .reset(dialogClosed);

$audioDuration
  .on(audioDurationDetected, (_, duration) => duration)
  .on(fileCleared, () => null)
  .reset(dialogClosed);

$sttModel.on(modelChanged, (_, model) => model);
$sttPrompt.on(promptChanged, (_, prompt) => prompt);

// Response format settings
$responseFormatsPerModel
  .on(loadResponseFormatsSettingsFx.doneData, (_, formats) => formats)
  .on(
    saveResponseFormatSettingFx.done,
    (state, { params: { modelId, format } }) => ({
      ...state,
      [modelId]: format,
    }),
  );

// Save response format when changed
sample({
  clock: responseFormatChanged,
  source: $sttModel,
  fn: (modelId, format) => ({ modelId, format }),
  target: saveResponseFormatSettingFx,
});

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
    results.filter((r) => r.id !== deletedId),
  );

$selectedResult.on(resultSelected, (_, id) => id);

// Transcription workflow
sample({
  clock: transcribeClicked,
  source: {
    file: $sttFile,
    model: $sttModel,
    prompt: $sttPrompt,
    responseFormat: $currentResponseFormat,
  },
  filter: ({ file }) => Boolean(file),
  fn: ({ file, model, prompt, responseFormat }) => ({
    file: file!,
    model,
    prompt: prompt.trim() || undefined,
    responseFormat,
  }),
  target: transcribeAudioFx,
});

// Save successful transcription
sample({
  clock: transcribeAudioFx.doneData,
  source: {
    file: $sttFile,
    model: $sttModel,
    prompt: $sttPrompt,
    responseFormat: $currentResponseFormat,
    audioDuration: $audioDuration,
  },
  filter: ({ file }) => Boolean(file),
  fn: (
    { file, model, prompt, responseFormat, audioDuration },
    response,
  ): TranscriptionResult => {
    const wordCount = response.text.trim().split(/\s+/).length;
    // Calculate text size in bytes
    const textSize = new TextEncoder().encode(
      response.rawResponse || response.text,
    ).length;

    return {
      id: `stt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: response.text,
      rawResponse: response.rawResponse,
      fileName: file!.name,
      fileSize: file!.size,
      audioDuration: audioDuration || undefined,
      textSize,
      model,
      prompt: prompt.trim() || undefined,
      timestamp: Date.now(),
      wordCount,
      duration: response.duration,
      responseFormat,
    };
  },
  target: saveTranscriptionFx,
});

// Copy text functionality
sample({
  clock: copyTextClicked,
  source: $transcriptionResults,
  fn: (results, id) => {
    const result = results.find((r) => r.id === id);
    if (result) {
      const textToCopy = result.rawResponse || result.text;
      navigator.clipboard.writeText(textToCopy).catch(console.error);
    }
  },
});

// Generate message functionality
sample({
  clock: generateMessageClicked,
  source: $transcriptionResults,
  filter: (results, id) => {
    const result = results.find((r) => r.id === id);
    return Boolean(result?.text?.trim());
  },
  fn: (results, id) => {
    const result = results.find((r) => r.id === id);
    return result!.text;
  },
  target: pasteTranscriptionToChat,
});

// Delete transcription
sample({
  clock: deleteResultClicked,
  target: deleteTranscriptionFx,
});

// Load history and settings when dialog opens
sample({
  clock: dialogOpened,
  target: [loadTranscriptionHistoryFx, loadResponseFormatsSettingsFx],
});

// Clear selected result when dialog closes
sample({
  clock: dialogClosed,
  fn: () => null,
  target: $selectedResult,
});

// When user pastes transcription to chat:
// 1. Update the chat message text
sample({
  clock: pasteTranscriptionToChat,
  target: messageTextChanged,
});

// 2. Close the dialog
sample({
  clock: pasteTranscriptionToChat,
  target: dialogClosed,
});

// Legacy compatibility - maintain existing API for backwards compatibility
export const $sttProgress = domain.createStore<number>(0);
export const $sttResult = domain.createStore<string | null>(null);
export const $sttLanguage = domain.createStore<string | null>(null);
export const $sttProvider = domain.createStore<'voidai' | 'openai' | 'gemini'>(
  'voidai',
);
export const $sttSegments = domain.createStore<unknown[]>([]);

// Legacy events (kept for backward compatibility)
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
$sttLanguage.on(
  transcribeAudioFx.doneData,
  (_, response) => response.language || null,
);

// Debug
if (process.env.NODE_ENV === 'development') {
  debug(domain);
}
