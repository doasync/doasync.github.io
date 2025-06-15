import { createDomain, createEffect, sample, combine } from 'effector';
import { persist } from 'effector-storage/local';
import { debug } from 'patronum/debug';
import { VoiceModel, VoicePreferences, VoiceInfo } from './types';
import voicesConfig from './config/voices.json';
import modelsConfig from './config/models.json';

const domain = createDomain('voice-models');

// Default preferences
const defaultPreferences: VoicePreferences = {
  favoriteVoices: [],
  defaultVoice: 'nova',
  defaultFormat: 'mp3',
  defaultSpeed: 1.0,
  autoTranscribe: false,
};

// Stores
export const $voiceModels = domain.createStore<VoiceModel[]>([]);
export const $selectedVoiceModelId = domain.createStore<string | null>(null);
export const $selectedVoiceId = domain.createStore<string | null>(null);
export const $voicePreferences =
  domain.createStore<VoicePreferences>(defaultPreferences);
export const $voiceModelsLoading = domain.createStore<boolean>(false);
export const $voiceModelsError = domain.createStore<string | null>(null);

export const $voiceModelsState = combine({
  models: $voiceModels,
  selectedModelId: $selectedVoiceModelId,
  selectedVoiceId: $selectedVoiceId,
  preferences: $voicePreferences,
  isLoading: $voiceModelsLoading,
  error: $voiceModelsError,
});

// Derived stores
export const $selectedVoiceModel = combine(
  $voiceModels,
  $selectedVoiceModelId,
  (models, id) => models.find((m) => m.id === id) || null,
);

export const $availableVoices = combine(
  $selectedVoiceModel,
  (model) => model?.voices || [],
);

export const $selectedVoice = combine(
  $availableVoices,
  $selectedVoiceId,
  (voices, id) => voices.find((v) => v.id === id) || null,
);

export const $ttsModels = $voiceModels.map((models) =>
  models.filter((m) => m.capabilities.tts),
);

export const $sttModels = $voiceModels.map((models) =>
  models.filter((m) => m.capabilities.stt),
);

export const $audioChatModels = $voiceModels.map((models) =>
  models.filter((m) => m.capabilities.audioChat),
);

// Events
export const voiceModelSelected = domain.createEvent<string>();
export const voiceSelected = domain.createEvent<string>();
export const voiceModelsClearError = domain.createEvent();
export const favoriteVoiceToggled = domain.createEvent<string>();
export const defaultVoiceSet = domain.createEvent<string>();
export const defaultFormatChanged = domain.createEvent<
  'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm'
>();
export const defaultSpeedChanged = domain.createEvent<number>();
export const autoTranscribeToggled = domain.createEvent();
export const loadVoiceModels = domain.createEvent();

// Helper functions
export const getDefaultVoiceForModel = (modelId: string): string => {
  const models = $voiceModels.getState();
  const model = models.find((m) => m.id === modelId);

  if (!model || model.voices.length === 0) {
    return 'nova'; // Fallback to 'nova' if model not found or no voices
  }

  // Return the first voice as default
  return model.voices[0].id;
};

// Effects
export const loadVoiceModelsFx = createEffect<void, VoiceModel[], Error>({
  handler: async () => {
    // Load models configuration and merge with voice data
    const models = modelsConfig.models.map((model) => {
      // Special handling for specific models
      let voiceKey = model.provider as string;

      // ElevenLabs uses voidai provider but has its own voice set
      if (model.id === 'elevenlabs') {
        voiceKey = 'elevenlabs';
      }

      const voiceData = voicesConfig[voiceKey as keyof typeof voicesConfig];

      const voices: VoiceInfo[] = (voiceData?.voices || []).map((v) => ({
        ...v,
        gender: v.gender as 'male' | 'female' | 'neutral' | undefined,
      }));

      return {
        ...model,
        voices,
      } as VoiceModel;
    });

    return models;
  },
});

export const previewVoiceFx = createEffect<
  { modelId: string; voiceId: string },
  void,
  Error
>({
  handler: async ({ modelId, voiceId }) => {
    // In a real implementation, this would:
    // 1. Call TTS API with sample text
    // 2. Play the generated audio
    console.log(`Preview voice: ${voiceId} from model: ${modelId}`);
  },
});

// Store updates
$voiceModels.on(loadVoiceModelsFx.doneData, (_, models) => models);

$selectedVoiceModelId
  .on(voiceModelSelected, (_, id) => id)
  .on(loadVoiceModelsFx.doneData, (current, models) => {
    // If no model selected, select first TTS model
    if (!current && models.length > 0) {
      const firstTTSModel = models.find((m) => m.capabilities.tts);
      return firstTTSModel?.id || null;
    }
    return current;
  });

$selectedVoiceId
  .on(voiceSelected, (_, id) => id)
  .on(voiceModelSelected, (_, modelId) => {
    // Reset voice selection when model changes
    const model = $voiceModels.getState().find((m) => m.id === modelId);
    return model?.voices[0]?.id || null;
  });

// Preferences updates
$voicePreferences
  .on(favoriteVoiceToggled, (prefs, voiceId) => ({
    ...prefs,
    favoriteVoices: prefs.favoriteVoices.includes(voiceId)
      ? prefs.favoriteVoices.filter((id) => id !== voiceId)
      : [...prefs.favoriteVoices, voiceId],
  }))
  .on(defaultVoiceSet, (prefs, voiceId) => ({
    ...prefs,
    defaultVoice: voiceId,
  }))
  .on(defaultFormatChanged, (prefs, format) => ({
    ...prefs,
    defaultFormat: format,
  }))
  .on(defaultSpeedChanged, (prefs, speed) => ({
    ...prefs,
    defaultSpeed: speed,
  }))
  .on(autoTranscribeToggled, (prefs) => ({
    ...prefs,
    autoTranscribe: !prefs.autoTranscribe,
  }));

// Loading state
$voiceModelsLoading
  .on(loadVoiceModelsFx, () => true)
  .on(loadVoiceModelsFx.done, () => false)
  .on(loadVoiceModelsFx.fail, () => false);

// Error handling
$voiceModelsError
  .on(loadVoiceModelsFx.fail, (_, { error }) => error.message)
  .on(previewVoiceFx.fail, (_, { error }) => error.message)
  .reset(voiceModelsClearError);

// Load models on initialization
sample({
  clock: loadVoiceModels,
  target: loadVoiceModelsFx,
});

// Auto-select first voice when model changes
sample({
  clock: voiceModelSelected,
  source: $voiceModels,
  fn: (models, modelId) => {
    const model = models.find((m) => m.id === modelId);
    return model?.voices[0]?.id || '';
  },
  filter: (voiceId) => Boolean(voiceId),
  target: voiceSelected,
});

// Persist preferences
persist({
  store: $voicePreferences,
  key: 'voice-preferences',
});

// Initialize
loadVoiceModels();

// Debug
if (process.env.NODE_ENV === 'development') {
  debug(domain);
}
