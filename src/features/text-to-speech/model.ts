import { createDomain, createEffect, sample, combine } from 'effector';
import { persist } from 'effector-storage/local';
import { debug } from 'patronum/debug';
import { spread } from 'patronum/spread';
import { AudioFormat, TTSParams, TTSResponse, TTSState, VoiceOption, VoiceProvider, GeneratedAudio } from './types';
import { generateSpeech, generateSpeechStream } from './api';

const domain = createDomain('text-to-speech');

// Get proper MIME type for audio format
const getAudioMimeType = (format: AudioFormat): string => {
  switch (format) {
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'aac':
      return 'audio/aac';
    case 'opus':
      return 'audio/opus';
    case 'flac':
      return 'audio/flac';
    case 'pcm':
      return 'audio/wav'; // PCM data is typically in WAV container
    default:
      return 'audio/mpeg'; // fallback
  }
};

// Type for model preferences
type ModelPreferences = {
  voice: string;
  format: AudioFormat;
  speed: number;
  instructions?: string;
};

// Model-specific supported formats
const getSupportedFormats = (modelId: string): AudioFormat[] => {
  if (modelId === 'elevenlabs') {
    // ElevenLabs supports: mp3, opus, aac, flac, wav, pcm
    return ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'];
  } else if (modelId.startsWith('gemini-')) {
    // Gemini supports: wav only (PCM format)
    return ['wav'];
  } else if (modelId === 'gpt-4o-audio-preview' || modelId === 'gpt-4o-audio-preview-2024-12-17') {
    // GPT-4o audio models using chat completions endpoint support: mp3, wav, opus, flac, pcm
    // Note: AAC is not supported by chat completions audio format
    return ['mp3', 'wav', 'opus', 'flac', 'pcm'];
  } else {
    // Standard OpenAI models support: mp3, opus, aac, flac, wav, pcm
    return ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'];
  }
};

// Stores
export const $ttsText = domain.createStore<string>('');
export const $selectedVoice = domain.createStore<string>('nova');
export const $selectedFormat = domain.createStore<AudioFormat>('mp3');
export const $selectedModel = domain.createStore<string>('tts-1');

// Current model's supported formats (computed)
export const $supportedFormats = $selectedModel.map(getSupportedFormats);
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

// Store for model-specific preferences
export const $modelPreferences = domain.createStore<Record<string, ModelPreferences>>({
  'tts-1': { voice: 'nova', format: 'mp3', speed: 1.0 },
  'tts-1-hd': { voice: 'nova', format: 'mp3', speed: 1.0 },
  'gpt-4o-audio-preview': { voice: 'alloy', format: 'mp3', speed: 1.0 },
  'gpt-4o-mini-audio-preview': { voice: 'echo', format: 'mp3', speed: 1.0 },
  'gpt-4o-mini-tts': { voice: 'ash', format: 'mp3', speed: 1.0 },
  'elevenlabs': { voice: 'Will (US male)', format: 'mp3', speed: 1.0 },
  'gemini-2.5-flash-preview-tts': { voice: 'Aoede', format: 'wav', speed: 1.0 },
  'gemini-2.5-pro-preview-tts': { voice: 'Kore', format: 'wav', speed: 1.0 },
});

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

export const downloadAudioFx = createEffect<{ audio: ArrayBuffer; filename: string; format: AudioFormat }, void, Error>({
  handler: async ({ audio, filename, format }) => {
    const mimeType = getAudioMimeType(format);
    const blob = new Blob([audio], { type: mimeType });
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

export const playPreviewFx = createEffect<{ audio: ArrayBuffer; format: AudioFormat }, void, Error>({
  handler: async ({ audio, format }) => {
    const mimeType = getAudioMimeType(format);
    const blob = new Blob([audio], { type: mimeType });
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

export const loadVoicesFx = createEffect<string, VoiceOption[], Error>({
  handler: async (modelId) => {
    // Load voices from voice-models feature based on model ID
    const { $voiceModels } = await import('../voice-models');
    const models = $voiceModels.getState();
    const model = models.find(m => m.id === modelId);
    
    if (!model) {
      console.warn(`No voice model found for ${modelId}`);
      return [];
    }
    
    // Map VoiceInfo to VoiceOption format
    return (model.voices || []).map(voice => ({
      id: voice.id,
      name: voice.name,
      provider: model.provider as VoiceProvider,
      gender: voice.gender,
      style: voice.style,
      description: voice.description,
    }));
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

// Update preferences when settings change
sample({
  clock: [voiceSelected, formatSelected, speedChanged, instructionsChanged],
  source: { 
    model: $selectedModel, 
    voice: $selectedVoice, 
    format: $selectedFormat, 
    speed: $speed,
    instructions: $instructions,
    preferences: $modelPreferences 
  },
  fn: ({ model, voice, format, speed, instructions, preferences }) => ({
    ...preferences,
    [model]: { voice, format, speed, instructions }
  }),
  target: $modelPreferences,
});

// Load preferences when model changes and voices are loaded
sample({
  clock: loadVoicesFx.doneData,
  source: { preferences: $modelPreferences, model: $selectedModel },
  fn: ({ preferences, model }, voices) => {
    const prefs = preferences[model];
    const supportedFormats = getSupportedFormats(model);
    
    // Find a valid voice for this model
    let voice = prefs?.voice || 'nova';
    if (voices.length > 0 && !voices.some(v => v.id === voice)) {
      voice = voices[0].id;
    }
    
    // Find a valid format for this model
    let format = prefs?.format || 'mp3';
    if (!supportedFormats.includes(format)) {
      format = supportedFormats[0] || 'mp3';
    }
    
    return {
      voice,
      format,
      speed: prefs?.speed || 1.0,
      instructions: prefs?.instructions || ''
    };
  },
  target: spread({
    voice: $selectedVoice,
    format: $selectedFormat,
    speed: $speed,
    instructions: $instructions,
  }),
});

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

// Load voices when model changes
sample({
  clock: modelSelected,
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
    const mimeType = getAudioMimeType(response.format);
    const blob = new Blob([response.audio], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    // Generate unique filename based on timestamp
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }).replace(/[\s,/:]/g, '-');
    const count = audios.filter(a => a.timestamp > Date.now() - 60000).length + 1; // Count within same minute
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
    const mimeType = getAudioMimeType(response.format);
    const blob = new Blob([response.audio], { type: mimeType });
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
    format: response.format,
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
  source: $selectedModel,
  target: loadVoicesFx,
});

// Persist preferences
persist({
  store: $modelPreferences,
  key: 'tts-model-preferences',
});

// Debug
if (process.env.NODE_ENV === 'development') {
  debug(domain);
}