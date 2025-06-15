// Public API for the models-select feature

// Import and re-export types from types.ts
export type { ModelInfo, ModelCapabilities, ModelLimits } from './types';

export {
  // Stores - Needed by UI (ModelSelector, Header)
  $availableModels,
  $filteredModels, // Filtered models based on showFreeOnly setting
  $selectedModelId, // Also needed by chat feature
  $selectedModelInfo,
  $visionModels,
  $currentModelSupportsVision,
  $currentModelSupportsAudio,
  $isLoadingModels,
  $modelsError,
  $showFreeOnly,
  $autoTitleModelId, // For auto title generation
  $isModelSelectorActive, // For model selector state

  // Events - Triggered by UI or app initialization
  fetchModels, // Triggered on app start
  modelSelected, // Triggered by ModelSelector component
  setShowFreeOnly,
  modelSelectorFocused,
  autoSelectModelForCapabilities,
  autoTitleModelSelected, // For auto title model selection
  testProviderUrl, // Triggered to test URL connectivity

  // URL Testing stores
  $isTestingUrl,
  $urlTestResult,

  // Model Info Alert (moved from ui-state to avoid circular dependency)
  $isModelInfoAlertOpen,
  openModelInfoAlert,
  closeModelInfoAlert,
} from './model';
