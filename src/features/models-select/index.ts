// Public API for the models-select feature

export {
  // Types
  type ModelInfo,
  type ModelCapabilities,
  type ModelLimits,

  // Stores - Needed by UI (ModelSelector, Header)
  $availableModels,
  $selectedModelId, // Also needed by chat feature
  $selectedModelInfo,
  $visionModels,
  $currentModelSupportsVision,
  $currentModelSupportsAudio,
  $isLoadingModels,
  $modelsError,
  $showFreeOnly,

  // Events - Triggered by UI or app initialization
  fetchModels, // Triggered on app start
  modelSelected, // Triggered by ModelSelector component
  setShowFreeOnly,
  modelSelectorFocused,
  autoSelectModelForCapabilities,
} from "./model";
