// Public API for the chat-settings feature

export {
  // Stores - Needed by UI and other features (e.g., chat model)
  $apiKey,
  $providerApiUrl,
  $temperature,
  $systemPrompt,
  $settingsLoaded, // To know when settings are ready

  // Events - Triggered by UI or app initialization
  loadSettings, // Triggered on app start
  apiKeyChanged,
  providerApiUrlChanged,
  temperatureChanged,
  systemPromptChanged,
  apiKeyMissing, // Event for when API key is missing

  // API Key dialog (moved from ui-state to avoid circular dependency)
  showApiKeyDialog,
  hideApiKeyDialog,
  $isApiKeyDialogOpen,
} from './model';
