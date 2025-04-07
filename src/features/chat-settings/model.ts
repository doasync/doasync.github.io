import {
  createDomain,
  createEffect,
  createEvent,
  createStore,
  sample,
  combine,
} from "effector";
import { debug } from "patronum/debug";

// Define LocalStorage keys
const API_KEY_LS_KEY = "openrouter_api_key";
const TEMPERATURE_LS_KEY = "default_temperature";
const SYSTEM_PROMPT_LS_KEY = "default_system_prompt";

// Default values
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_SYSTEM_PROMPT = "";

const settingsDomain = createDomain("settings");

// --- Events ---
// Triggered to initiate loading settings from LocalStorage (e.g., on app start)
export const loadSettings = settingsDomain.event("loadSettings");
// Triggered when settings have been successfully loaded from LocalStorage
const settingsLoaded = settingsDomain.event<{
  apiKey: string;
  temperature: number;
  systemPrompt: string;
}>("settingsLoaded");
// Triggered by UI input changes
export const apiKeyChanged = settingsDomain.event<string>("apiKeyChanged");
export const temperatureChanged =
  settingsDomain.event<number>("temperatureChanged");
export const systemPromptChanged = settingsDomain.event<string>(
  "systemPromptChanged"
);

// --- Stores ---
export const $apiKey = settingsDomain.store<string>("", { name: "apiKey" });
export const $temperature = settingsDomain.store<number>(DEFAULT_TEMPERATURE, {
  name: "temperature",
});
export const $systemPrompt = settingsDomain.store<string>(
  DEFAULT_SYSTEM_PROMPT,
  { name: "systemPrompt" }
);
// Store to track if initial settings load is complete
export const $settingsLoaded = settingsDomain
  .store<boolean>(false, { name: "settingsLoaded" })
  .on(settingsLoaded, () => true);

// Combine settings into a single store for easier saving
const $settings = combine({
  apiKey: $apiKey,
  temperature: $temperature,
  systemPrompt: $systemPrompt,
});

// --- Effects ---
// Effect to load settings from LocalStorage
const loadSettingsFx = settingsDomain.effect<
  void,
  { apiKey: string; temperature: number; systemPrompt: string },
  Error
>({
  name: "loadSettingsFx",
  handler: async () => {
    const apiKey = localStorage.getItem(API_KEY_LS_KEY) ?? "";
    const tempRaw = localStorage.getItem(TEMPERATURE_LS_KEY);
    const systemPrompt =
      localStorage.getItem(SYSTEM_PROMPT_LS_KEY) ?? DEFAULT_SYSTEM_PROMPT;

    let temperature = DEFAULT_TEMPERATURE;
    if (tempRaw) {
      const parsedTemp = parseFloat(tempRaw);
      if (!isNaN(parsedTemp)) {
        temperature = parsedTemp;
      }
    }
    return { apiKey, temperature, systemPrompt };
  },
});

// Effect to save settings to LocalStorage
const saveSettingsFx = settingsDomain.effect<
  { apiKey: string; temperature: number; systemPrompt: string },
  void,
  Error
>({
  name: "saveSettingsFx",
  handler: async ({ apiKey, temperature, systemPrompt }) => {
    localStorage.setItem(API_KEY_LS_KEY, apiKey);
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
$temperature.on(settingsLoaded, (_, payload) => payload.temperature);
$systemPrompt.on(settingsLoaded, (_, payload) => payload.systemPrompt);

// Update stores based on UI change events
$apiKey.on(apiKeyChanged, (_, newApiKey) => newApiKey);
$temperature.on(temperatureChanged, (_, newTemperature) => newTemperature);
$systemPrompt.on(systemPromptChanged, (_, newSystemPrompt) => newSystemPrompt);

// When any setting store changes (after initial load), trigger saveSettingsFx
sample({
  clock: $settings, // Trigger whenever the combined settings change
  filter: $settingsLoaded, // Only save *after* initial load is complete
  target: saveSettingsFx,
});

// Handle potential loading errors (optional: could show an error message)
loadSettingsFx.fail.watch(({ error }) => {
  console.error("Failed to load settings:", error);
});

saveSettingsFx.fail.watch(({ error }) => {
  console.error("Failed to save settings:", error);
});

debug(
  // Stores
  $apiKey,
  $temperature,
  $systemPrompt,
  $settingsLoaded,

  // Events
  loadSettings,
  apiKeyChanged,
  temperatureChanged,
  systemPromptChanged,

  // Effects
  loadSettingsFx,
  saveSettingsFx
);
