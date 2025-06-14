// Export all public APIs for the image generation feature

export {
  // Stores
  $selectedImageGenModel,
  $generatedImages,
  $isGeneratingImage,
  $imageGenerationError,
  $imageGenerationSettings,
  $availableImageGenModels,
  $selectedImageGenModelInfo,
  $currentModelSupportsEditing,
  $currentModelSupportsVariations,
  $currentModelSupportedSizes,
  $currentModelSupportedQualities,
  $currentModelSupportedStyles,
  $isDialogOpen,
  $imagePrompt,
  $imageGenerationState,
  
  // Events
  dialogOpened,
  dialogClosed,
  promptChanged,
  imageGenModelSelected,
  generateImage,
  updateImageGenSettings,
  clearGeneratedImages,
  removeGeneratedImage,
  sendImageToChat,
  imageGenerationStarted,
  imageGenerationUpdated,
  imageGenerationCompleted,
  
  // Effects
  generateImageFx,
  loadGeneratedImagesFx,
  saveGeneratedImagesFx,
  saveGeneratedImageFx,
  clearGeneratedImagesFx,
  removeGeneratedImageFx,
  migrateFromLocalStorageFx,
} from "./model";

export {
  // Types
  type ImageGenerationParams,
  type ImageGenerationResult,
  type ImageGenerationResponse,
  type GeneratedImage,
  type ImageGenerationModelInfo,
  type ImageGenerationStatus,
  
  // Constants and helpers
  IMAGE_GENERATION_MODELS,
  getImageGenerationModelInfo,
  isImageGenerationCommand,
  extractImagePrompt,
  parseImageGenerationCommand,
} from "./types";