// Public API for the chat-settings feature

export {
  // Stores - Needed by UI and other features (e.g., chat model)
  $apiKey,
  $isApiKeyDialogOpen,
  $providerApiUrl,
  $settingsLoaded, // To know when settings are ready
  $systemPrompt,
  $temperature,
  apiKeyChanged,
  apiKeyMissing, // Event for when API key is missing
  hideApiKeyDialog,
  // Events - Triggered by UI or app initialization
  loadSettings, // Triggered on app start
  providerApiUrlChanged,
  // API Key dialog (moved from ui-state to avoid circular dependency)
  showApiKeyDialog,
  systemPromptChanged,
  temperatureChanged,
} from './model';
