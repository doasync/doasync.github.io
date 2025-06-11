import { createDomain, createEffect, sample, combine } from 'effector';
import { debug } from 'patronum/debug';
import { AudioFormat, TTSParams, TTSResponse, TTSState, VoiceOption, VoiceProvider } from './types';
import { generateSpeech } from './api';

const domain = createDomain('text-to-speech');

// Stores
export const $ttsText = domain.createStore<string>('');
export const $selectedVoice = domain.createStore<string>('nova');
export const $selectedFormat = domain.createStore<AudioFormat>('mp3');
export const $selectedModel = domain.createStore<string>('tts-1');
export const $selectedProvider = domain.createStore<VoiceProvider>('voidai');
export const $isLoading = domain.createStore<boolean>(false);
export const $error = domain.createStore<string | null>(null);
export const $previewUrl = domain.createStore<string | null>(null);
export const $availableVoices = domain.createStore<VoiceOption[]>([]);
export const $speed = domain.createStore<number>(1.0);

export const $ttsState = combine({
  text: $ttsText,
  selectedVoice: $selectedVoice,
  selectedFormat: $selectedFormat,
  selectedModel: $selectedModel,
  selectedProvider: $selectedProvider,
  isLoading: $isLoading,
  error: $error,
  previewUrl: $previewUrl,
  availableVoices: $availableVoices,
  speed: $speed,
});

// Events
export const textChanged = domain.createEvent<string>();
export const voiceSelected = domain.createEvent<string>();
export const formatSelected = domain.createEvent<AudioFormat>();
export const modelSelected = domain.createEvent<string>();
export const providerSelected = domain.createEvent<VoiceProvider>();
export const speedChanged = domain.createEvent<number>();
export const generateClicked = domain.createEvent();
export const downloadRequested = domain.createEvent();
export const previewRequested = domain.createEvent();
export const clearError = domain.createEvent();
export const clearPreview = domain.createEvent();
export const dialogOpened = domain.createEvent();
export const dialogClosed = domain.createEvent();

// Effects
export const generateTTSFx = createEffect<TTSParams, TTSResponse, Error>({
  handler: generateSpeech,
});

export const downloadAudioFx = createEffect<{ audio: ArrayBuffer; filename: string }, void, Error>({
  handler: async ({ audio, filename }) => {
    const blob = new Blob([audio], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
});

export const playPreviewFx = createEffect<ArrayBuffer, void, Error>({
  handler: async (audio) => {
    const blob = new Blob([audio], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audioElement = new Audio(url);
    
    return new Promise<void>((resolve, reject) => {
      audioElement.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audioElement.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to play audio'));
      };
      audioElement.play().catch(reject);
    });
  },
});

export const loadVoicesFx = createEffect<VoiceProvider, VoiceOption[], Error>({
  handler: async (provider) => {
    // This will be implemented when we have the voice configuration
    // For now, return default voices based on provider
    const voiceMap: Record<VoiceProvider, VoiceOption[]> = {
      voidai: [
        { id: 'alloy', name: 'Alloy', provider: 'voidai' },
        { id: 'ash', name: 'Ash', provider: 'voidai' },
        { id: 'ballad', name: 'Ballad', provider: 'voidai' },
        { id: 'coral', name: 'Coral', provider: 'voidai' },
        { id: 'echo', name: 'Echo', provider: 'voidai' },
        { id: 'fable', name: 'Fable', provider: 'voidai' },
        { id: 'onyx', name: 'Onyx', provider: 'voidai' },
        { id: 'nova', name: 'Nova', provider: 'voidai' },
        { id: 'sage', name: 'Sage', provider: 'voidai' },
        { id: 'shimmer', name: 'Shimmer', provider: 'voidai' },
        { id: 'verse', name: 'Verse', provider: 'voidai' },
      ],
      openai: [
        { id: 'alloy', name: 'Alloy', provider: 'openai' },
        { id: 'echo', name: 'Echo', provider: 'openai' },
        { id: 'fable', name: 'Fable', provider: 'openai' },
        { id: 'nova', name: 'Nova', provider: 'openai' },
        { id: 'shimmer', name: 'Shimmer', provider: 'openai' },
      ],
      gemini: [
        { id: 'Zephyr', name: 'Zephyr', provider: 'gemini' },
        { id: 'Puck', name: 'Puck', provider: 'gemini' },
        { id: 'Charon', name: 'Charon', provider: 'gemini' },
        { id: 'Kore', name: 'Kore', provider: 'gemini' },
        { id: 'Fenrir', name: 'Fenrir', provider: 'gemini' },
        { id: 'Aoede', name: 'Aoede', provider: 'gemini' },
      ],
    };
    
    return voiceMap[provider] || [];
  },
});

// Store updates
$ttsText.on(textChanged, (_, text) => text);
$selectedVoice.on(voiceSelected, (_, voice) => voice);
$selectedFormat.on(formatSelected, (_, format) => format);
$selectedModel.on(modelSelected, (_, model) => model);
$selectedProvider.on(providerSelected, (_, provider) => provider);
$speed.on(speedChanged, (_, speed) => speed);
$error.on(clearError, () => null);
$previewUrl.on(clearPreview, () => null);

// Loading state
$isLoading
  .on(generateTTSFx, () => true)
  .on(generateTTSFx.done, () => false)
  .on(generateTTSFx.fail, () => false);

// Error handling
$error
  .on(generateTTSFx.fail, (_, { error }) => error.message)
  .on(playPreviewFx.fail, (_, { error }) => error.message)
  .on(downloadAudioFx.fail, (_, { error }) => error.message);

// Load voices when provider changes
sample({
  clock: providerSelected,
  target: loadVoicesFx,
});

// Update available voices
$availableVoices.on(loadVoicesFx.doneData, (_, voices) => voices);

// Generate TTS when requested
sample({
  clock: generateClicked,
  source: $ttsState,
  filter: (state) => state.text.trim().length > 0,
  fn: (state) => ({
    text: state.text,
    voice: state.selectedVoice,
    model: state.selectedModel,
    format: state.selectedFormat,
    speed: state.speed,
  }),
  target: generateTTSFx,
});

// Handle successful generation
sample({
  clock: generateTTSFx.doneData,
  fn: (response) => response.audio,
  target: playPreviewFx,
});

// Store preview URL
sample({
  clock: generateTTSFx.doneData,
  fn: (response) => {
    const blob = new Blob([response.audio], { type: `audio/${response.format}` });
    return URL.createObjectURL(blob);
  },
  target: $previewUrl,
});

// Download when requested
sample({
  clock: downloadRequested,
  source: generateTTSFx.doneData,
  filter: Boolean,
  fn: (response) => ({
    audio: response.audio,
    filename: `tts-${Date.now()}.${response.format}`,
  }),
  target: downloadAudioFx,
});

// Clean up on dialog close
sample({
  clock: dialogClosed,
  target: [clearError, clearPreview],
});

// Load initial voices
sample({
  clock: dialogOpened,
  source: $selectedProvider,
  target: loadVoicesFx,
});

// Debug
if (process.env.NODE_ENV === 'development') {
  debug(domain);
}