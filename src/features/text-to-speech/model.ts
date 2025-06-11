import { createDomain, createEffect, sample, combine } from 'effector';
import { debug } from 'patronum/debug';
import { AudioFormat, TTSParams, TTSResponse, TTSState, VoiceOption, VoiceProvider, GeneratedAudio } from './types';
import { generateSpeech, generateSpeechStream } from './api';

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
export const $audioUrl = domain.createStore<string | null>(null);
export const $availableVoices = domain.createStore<VoiceOption[]>([]);
export const $speed = domain.createStore<number>(1.0);
export const $instructions = domain.createStore<string>('');
export const $generatedAudios = domain.createStore<GeneratedAudio[]>([]);
export const $isStreaming = domain.createStore<boolean>(false);
export const $streamingAudioUrl = domain.createStore<string | null>(null);

export const $ttsState = combine({
  text: $ttsText,
  selectedVoice: $selectedVoice,
  selectedFormat: $selectedFormat,
  selectedModel: $selectedModel,
  selectedProvider: $selectedProvider,
  isLoading: $isLoading,
  error: $error,
  previewUrl: $previewUrl,
  audioUrl: $audioUrl,
  availableVoices: $availableVoices,
  speed: $speed,
  instructions: $instructions,
});

// Events
export const textChanged = domain.createEvent<string>();
export const voiceSelected = domain.createEvent<string>();
export const formatSelected = domain.createEvent<AudioFormat>();
export const modelSelected = domain.createEvent<string>();
export const providerSelected = domain.createEvent<VoiceProvider>();
export const speedChanged = domain.createEvent<number>();
export const instructionsChanged = domain.createEvent<string>();
export const generateTTSClicked = domain.createEvent();
export const generateTTSStreamClicked = domain.createEvent();
export const downloadRequested = domain.createEvent();
export const previewRequested = domain.createEvent();
export const clearError = domain.createEvent();
export const clearPreview = domain.createEvent();
export const ttsDialogOpened = domain.createEvent();
export const ttsDialogClosed = domain.createEvent();
export const deleteAudio = domain.createEvent<string>(); // Delete by ID

// Effects
export const generateTTSFx = createEffect<TTSParams, TTSResponse, Error>({
  handler: generateSpeech,
});

export const generateTTSStreamFx = createEffect<TTSParams, TTSResponse, Error>({
  handler: async (params) => {
    try {
      // For now, use a simpler streaming approach
      // Create an audio element that will start playing as soon as data is available
      const audioElement = new Audio();
      audioElement.autoplay = true;
      
      // Generate speech
      const response = await generateSpeechStream(params);
      
      // Create a blob URL from the response
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      audioElement.src = url;
      
      // Get array buffer for saving
      const audio = await blob.arrayBuffer();
      
      return {
        audio,
        format: params.format,
      };
    } catch (error) {
      // Fallback to non-streaming generation
      console.warn('Streaming failed, falling back to regular generation:', error);
      return generateSpeech(params);
    }
  },
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
$instructions.on(instructionsChanged, (_, instructions) => instructions);
$error.on(clearError, () => null);
$previewUrl.on(clearPreview, () => null);

// Loading state
$isLoading
  .on(generateTTSFx, () => true)
  .on(generateTTSFx.done, () => false)
  .on(generateTTSFx.fail, () => false)
  .on(generateTTSStreamFx, () => true)
  .on(generateTTSStreamFx.done, () => false)
  .on(generateTTSStreamFx.fail, () => false);

// Streaming state
$isStreaming
  .on(generateTTSStreamFx, () => true)
  .on(generateTTSStreamFx.done, () => false)
  .on(generateTTSStreamFx.fail, () => false);

// Error handling
$error
  .on(generateTTSFx.fail, (_, { error }) => error.message)
  .on(generateTTSStreamFx.fail, (_, { error }) => error.message)
  .on(playPreviewFx.fail, (_, { error }) => error.message)
  .on(downloadAudioFx.fail, (_, { error }) => error.message);

// Load voices when provider changes
sample({
  clock: providerSelected,
  target: loadVoicesFx,
});

// Update available voices
$availableVoices.on(loadVoicesFx.doneData, (_, voices) => voices);

// Handle audio deletion
$generatedAudios.on(deleteAudio, (audios, audioId) => {
  const audioToDelete = audios.find(a => a.id === audioId);
  if (audioToDelete) {
    // Revoke the object URL to free memory
    URL.revokeObjectURL(audioToDelete.url);
  }
  return audios.filter(a => a.id !== audioId);
});

// Generate TTS when requested
sample({
  clock: generateTTSClicked,
  source: $ttsState,
  filter: (state) => state.text.trim().length > 0,
  fn: (state) => ({
    text: state.text,
    voice: state.selectedVoice,
    model: state.selectedModel,
    format: state.selectedFormat,
    speed: state.speed,
    instructions: state.instructions,
  }),
  target: generateTTSFx,
});

// Generate TTS with streaming when requested
sample({
  clock: generateTTSStreamClicked,
  source: $ttsState,
  filter: (state) => state.text.trim().length > 0,
  fn: (state) => ({
    text: state.text,
    voice: state.selectedVoice,
    model: state.selectedModel,
    format: state.selectedFormat,
    speed: state.speed,
    instructions: state.instructions,
  }),
  target: generateTTSStreamFx,
});

// Handle successful generation - add to generatedAudios
sample({
  clock: [generateTTSFx.doneData, generateTTSStreamFx.doneData],
  source: { state: $ttsState, audios: $generatedAudios },
  fn: ({ state, audios }, response) => {
    const blob = new Blob([response.audio], { type: `audio/${response.format}` });
    const url = URL.createObjectURL(blob);
    
    // Generate unique filename based on timestamp
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    }).replace(/[\s,/:]/g, '-');
    const count = audios.filter(a => a.timestamp > Date.now() - 1000).length + 1; // Count within same second
    const filename = `tts-${dateStr}-${count}.${response.format}`;
    
    const newAudio: GeneratedAudio = {
      id: `audio-${Date.now()}`,
      url,
      text: state.text,
      model: state.selectedModel,
      voice: state.selectedVoice,
      format: response.format,
      timestamp: Date.now(),
      size: response.audio.byteLength,
      filename,
    };
    
    // Add to the beginning of array (newest first)
    return [newAudio, ...audios];
  },
  target: $generatedAudios,
});

// Store current audio URL
sample({
  clock: [generateTTSFx.doneData, generateTTSStreamFx.doneData],
  fn: (response) => {
    const blob = new Blob([response.audio], { type: `audio/${response.format}` });
    return URL.createObjectURL(blob);
  },
  target: $audioUrl,
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

// Clean up errors on dialog close (but keep generated audios)
sample({
  clock: ttsDialogClosed,
  target: clearError,
});

// Load initial voices
sample({
  clock: ttsDialogOpened,
  source: $selectedProvider,
  target: loadVoicesFx,
});

// Debug
if (process.env.NODE_ENV === 'development') {
  debug(domain);
}