import { combine, createDomain, sample } from 'effector';
import { debug } from 'patronum/debug';

import { appStarted } from '@/app';

// Define LocalStorage keys
const API_KEY_LS_KEY = 'provider_api_key';
const PROVIDER_API_URL_LS_KEY = 'provider_api_url';
const TEMPERATURE_LS_KEY = 'default_temperature';
const SYSTEM_PROMPT_LS_KEY = 'default_system_prompt';

// Legacy key for migration
const LEGACY_API_KEY_LS_KEY = 'voidai_api_key';

// Default values
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_SYSTEM_PROMPT = '';
const DEFAULT_PROVIDER_API_URL = 'https://api.voidai.app/v1';

const settingsDomain = createDomain('settings');

// --- Events ---
// Triggered to initiate loading settings from LocalStorage (e.g., on app start)
export const loadSettings = settingsDomain.event('loadSettings');
// Triggered when settings have been successfully loaded from LocalStorage
const settingsLoaded = settingsDomain.event<{
  apiKey: string;
  providerApiUrl: string;
  temperature: number;
  systemPrompt: string;
}>('settingsLoaded');
// Triggered by UI input changes
export const apiKeyChanged = settingsDomain.event<string>('apiKeyChanged');
export const providerApiUrlChanged = settingsDomain.event<string>(
  'providerApiUrlChanged',
);
export const temperatureChanged =
  settingsDomain.event<number>('temperatureChanged');
export const systemPromptChanged = settingsDomain.event<string>(
  'systemPromptChanged',
);

// Event triggered when API key is missing (moved from chat feature)
export const apiKeyMissing = settingsDomain.event('apiKeyMissing');

// API Key dialog events (moved from ui-state to avoid circular dependency)
export const showApiKeyDialog = settingsDomain.event('showApiKeyDialog');
export const hideApiKeyDialog = settingsDomain.event('hideApiKeyDialog');

// --- Stores ---
export const $apiKey = settingsDomain.store<string>('', { name: 'apiKey' });
export const $providerApiUrl = settingsDomain.store<string>(
  DEFAULT_PROVIDER_API_URL,
  { name: 'providerApiUrl' },
);
export const $temperature = settingsDomain.store<number>(DEFAULT_TEMPERATURE, {
  name: 'temperature',
});
export const $systemPrompt = settingsDomain.store<string>(
  DEFAULT_SYSTEM_PROMPT,
  { name: 'systemPrompt' },
);
// Store to track if initial settings load is complete
export const $settingsLoaded = settingsDomain
  .store<boolean>(false, { name: 'settingsLoaded' })
  .on(settingsLoaded, () => true);

// API Key dialog store (moved from ui-state to avoid circular dependency)
export const $isApiKeyDialogOpen = settingsDomain
  .store(false, { name: 'isApiKeyDialogOpen' })
  .on(showApiKeyDialog, () => true)
  .on(hideApiKeyDialog, () => false);

// Combine settings into a single store for easier saving
const $settings = combine({
  apiKey: $apiKey,
  providerApiUrl: $providerApiUrl,
  temperature: $temperature,
  systemPrompt: $systemPrompt,
});

// --- Effects ---
// Effect to load settings from LocalStorage
const loadSettingsFx = settingsDomain.effect<
  void,
  {
    apiKey: string;
    providerApiUrl: string;
    temperature: number;
    systemPrompt: string;
  },
  Error
>({
  name: 'loadSettingsFx',
  handler: async () => {
    // Load API key with migration from legacy key
    let apiKey = localStorage.getItem(API_KEY_LS_KEY) ?? '';
    if (!apiKey) {
      // Migrate from legacy key
      const legacyApiKey = localStorage.getItem(LEGACY_API_KEY_LS_KEY) ?? '';
      if (legacyApiKey) {
        apiKey = legacyApiKey;
        // Save to new key and remove legacy key
        localStorage.setItem(API_KEY_LS_KEY, apiKey);
        localStorage.removeItem(LEGACY_API_KEY_LS_KEY);
      }
    }

    const providerApiUrl =
      localStorage.getItem(PROVIDER_API_URL_LS_KEY) ?? DEFAULT_PROVIDER_API_URL;
    const temporaryRaw = localStorage.getItem(TEMPERATURE_LS_KEY);
    const systemPrompt =
      localStorage.getItem(SYSTEM_PROMPT_LS_KEY) ?? DEFAULT_SYSTEM_PROMPT;

    let temperature = DEFAULT_TEMPERATURE;
    if (temporaryRaw) {
      const parsedTemporary = Number.parseFloat(temporaryRaw);
      if (!Number.isNaN(parsedTemporary)) {
        temperature = parsedTemporary;
      }
    }
    return { apiKey, providerApiUrl, temperature, systemPrompt };
  },
});

// Effect to save settings to LocalStorage
const saveSettingsFx = settingsDomain.effect<
  {
    apiKey: string;
    providerApiUrl: string;
    temperature: number;
    systemPrompt: string;
  },
  void,
  Error
>({
  name: 'saveSettingsFx',
  handler: async ({ apiKey, providerApiUrl, temperature, systemPrompt }) => {
    localStorage.setItem(API_KEY_LS_KEY, apiKey);
    localStorage.setItem(PROVIDER_API_URL_LS_KEY, providerApiUrl);
    localStorage.setItem(TEMPERATURE_LS_KEY, String(temperature));
    localStorage.setItem(SYSTEM_PROMPT_LS_KEY, systemPrompt);
  },
});

// --- Logic ---

// When loadSettings is triggered, call the loadSettingsFx effect
sample({
  clock: loadSettings,
  target: loadSettingsFx,
});

// When loadSettingsFx succeeds, update the stores via the settingsLoaded event
sample({
  clock: loadSettingsFx.doneData,
  target: settingsLoaded,
});

// Update individual stores when settingsLoaded event fires
$apiKey.on(settingsLoaded, (_, payload) => payload.apiKey);
$providerApiUrl.on(settingsLoaded, (_, payload) => payload.providerApiUrl);
$temperature.on(settingsLoaded, (_, payload) => payload.temperature);
$systemPrompt.on(settingsLoaded, (_, payload) => payload.systemPrompt);

// Update stores based on UI change events
$apiKey.on(apiKeyChanged, (_, newApiKey) => newApiKey);
$providerApiUrl.on(
  providerApiUrlChanged,
  (_, newProviderApiUrl) => newProviderApiUrl,
);
$temperature.on(temperatureChanged, (_, newTemperature) => newTemperature);
$systemPrompt.on(systemPromptChanged, (_, newSystemPrompt) => newSystemPrompt);

// When any setting store changes (after initial load), trigger saveSettingsFx
sample({
  clock: $settings, // Trigger whenever the combined settings change
  filter: $settingsLoaded, // Only save *after* initial load is complete
  target: saveSettingsFx,
});

// Show API Key dialog if app starts and API key is missing
sample({
  clock: [appStarted, apiKeyMissing],
  source: $apiKey,
  filter: (key): key is string =>
    typeof key === 'string' && key.trim().length === 0,
  target: showApiKeyDialog,
});

// Hide API Key dialog if API key is provided later
sample({
  clock: $apiKey,
  source: $isApiKeyDialogOpen,
  filter: (isOpen, key): key is string =>
    isOpen && typeof key === 'string' && key.trim().length > 0,
  target: hideApiKeyDialog,
});

// Handle potential loading errors (optional: could show an error message)

// eslint-disable-next-line effector/no-watch
loadSettingsFx.fail.watch(({ error }) => {
  console.error('Failed to load settings:', error);
});

// eslint-disable-next-line effector/no-watch
saveSettingsFx.fail.watch(({ error }) => {
  console.error('Failed to save settings:', error);
});

// --- Debugging ---

debug(
  // Stores
  $apiKey,
  $providerApiUrl,
  $temperature,
  $systemPrompt,
  $settingsLoaded,
  $isApiKeyDialogOpen,

  // Events
  loadSettings,
  apiKeyChanged,
  providerApiUrlChanged,
  temperatureChanged,
  systemPromptChanged,
  apiKeyMissing,
  showApiKeyDialog,
  hideApiKeyDialog,

  // Effects
  loadSettingsFx,
  saveSettingsFx,
);
