// Public API for the models-select feature

// Import and re-export types from types.ts
export {
  $autoTitleModelId, // For auto title generation
  // Stores - Needed by UI (ModelSelector, Header)
  $availableModels,
  $currentModelSupportsAudio,
  $currentModelSupportsVision,
  $filteredModels, // Filtered models based on showFreeOnly setting
  $isLoadingModels,
  // Model Info Alert (moved from ui-state to avoid circular dependency)
  $isModelInfoAlertOpen,
  $isModelSelectorActive, // For model selector state
  // URL Testing stores
  $isTestingUrl,
  $modelsError,
  $selectedModelId, // Also needed by chat feature
  $selectedModelInfo,
  $showFreeOnly,
  $urlTestResult,
  $visionModels,
  autoSelectModelForCapabilities,
  autoTitleModelSelected, // For auto title model selection
  closeModelInfoAlert,
  // Events - Triggered by UI or app initialization
  fetchModels, // Triggered on app start
  modelSelected, // Triggered by ModelSelector component
  modelSelectorFocused,
  openModelInfoAlert,
  setShowFreeOnly,
  testProviderUrl, // Triggered to test URL connectivity
} from './model';
export type { ModelCapabilities, ModelInfo, ModelLimits } from './types';
