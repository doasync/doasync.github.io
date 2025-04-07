// Public API for the models-select feature

export {
  // Types
  type ModelInfo,

  // Stores - Needed by UI (ModelSelector, Header)
  $availableModels,
  $selectedModelId, // Also needed by chat feature
  $isLoadingModels,
  $modelsError,

  // Events - Triggered by UI or app initialization
  fetchModels, // Triggered on app start
  modelSelected, // Triggered by ModelSelector component
} from "./model";
