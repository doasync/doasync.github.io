// Public API for the chat-settings feature

export {
  // Stores - Needed by UI and other features (e.g., chat model)
  $apiKey,
  $temperature,
  $systemPrompt,
  $settingsLoaded, // To know when settings are ready
  $assistantModel,
  // Events - Triggered by UI or app initialization
  loadSettings, // Triggered on app start
  apiKeyChanged,
  temperatureChanged,
  systemPromptChanged,
  assistantModelChanged,
} from "./model";
