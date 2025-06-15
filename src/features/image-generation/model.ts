import { createDomain, sample, combine } from 'effector';
import { debug } from 'patronum/debug';
import { persist } from 'effector-storage/local';
import { $apiKey, $providerApiUrl } from '@/features/chat-settings';
import { buildImageGenerationsUrl } from '@/features/api-config';
import {
  ImageGenerationParams,
  ImageGenerationResponse,
  GeneratedImage,
  ImageGenerationStatus,
  IMAGE_GENERATION_MODELS,
  getImageGenerationModelInfo,
} from './types';
import {
  loadGeneratedImagesHandler,
  saveGeneratedImagesHandler,
  saveGeneratedImageHandler,
  removeGeneratedImageHandler,
  clearGeneratedImagesHandler,
  migrateFromLocalStorageHandler,
} from './lib';

const imageGenerationDomain = createDomain('imageGeneration');

// Custom error class to track request ID through failures
class ImageGenerationError extends Error {
  constructor(
    message: string,
    public requestId: string,
  ) {
    super(message);
    this.name = 'ImageGenerationError';
  }
}

// --- Stores ---

// Currently selected image generation model
export const $selectedImageGenModel = imageGenerationDomain.store<string>(
  'gpt-image-1',
  { name: 'selectedImageGenModel' },
);

// Dialog state management
export const $isDialogOpen = imageGenerationDomain.store<boolean>(false, {
  name: 'isDialogOpen',
});

// Store for generated images (now persistent)
export const $generatedImages = imageGenerationDomain.store<GeneratedImage[]>(
  [],
  { name: 'generatedImages' },
);

// Track active generation requests with their IDs (maps effect execution to request ID)
export const $activeGenerationRequests = imageGenerationDomain.store<
  Map<string, string>
>(new Map(), { name: 'activeGenerationRequests' });

// Store for current prompt in dialog
export const $imagePrompt = imageGenerationDomain.store<string>('', {
  name: 'imagePrompt',
});

// Loading state for image generation
export const $isGeneratingImage = imageGenerationDomain.store<boolean>(false, {
  name: 'isGeneratingImage',
});

// Error state for image generation
export const $imageGenerationError = imageGenerationDomain.store<string | null>(
  null,
  { name: 'imageGenerationError' },
);

// Per-model image generation settings
export const $imageGenerationSettingsPerModel = imageGenerationDomain.store<
  Record<
    string,
    {
      size: string;
      quality: string;
      style?: string;
      n: number;
    }
  >
>({}, { name: 'imageGenerationSettingsPerModel' });

// Helper function to get default settings for a model
const getDefaultSettingsForModel = (modelId: string) => {
  const modelInfo = getImageGenerationModelInfo(modelId);
  if (!modelInfo) {
    return {
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    };
  }

  return {
    size: modelInfo.supportedSizes[0] || '1024x1024',
    quality: modelInfo.supportedQualities[0] || 'standard',
    style: modelInfo.supportedStyles?.[0],
    n: 1,
  };
};

// Current model's settings (computed)
export const $imageGenerationSettings = imageGenerationDomain.store<{
  size: string;
  quality: string;
  style?: string;
  n: number;
}>(
  {
    size: '1024x1024',
    quality: 'standard',
    n: 1,
  },
  { name: 'imageGenerationSettings' },
);

// Update current settings when model changes
sample({
  clock: $selectedImageGenModel,
  source: $imageGenerationSettingsPerModel,
  fn: (settingsPerModel, selectedModel) => {
    // Return settings for current model, or defaults if not set
    return (
      settingsPerModel[selectedModel] ||
      getDefaultSettingsForModel(selectedModel)
    );
  },
  target: $imageGenerationSettings,
});

// Update current settings when per-model settings change
sample({
  clock: $imageGenerationSettingsPerModel,
  source: $selectedImageGenModel,
  fn: (selectedModel, settingsPerModel) => {
    // Return settings for current model, or defaults if not set
    return (
      settingsPerModel[selectedModel] ||
      getDefaultSettingsForModel(selectedModel)
    );
  },
  target: $imageGenerationSettings,
});

// --- Events ---

// Dialog state events
export const dialogOpened = imageGenerationDomain.event<void>('dialogOpened');
export const dialogClosed = imageGenerationDomain.event<void>('dialogClosed');

// Prompt management
export const promptChanged =
  imageGenerationDomain.event<string>('promptChanged');

// User selects an image generation model
export const imageGenModelSelected = imageGenerationDomain.event<string>(
  'imageGenModelSelected',
);

// User initiates image generation
export const generateImage =
  imageGenerationDomain.event<ImageGenerationParams>('generateImage');

// Update image generation settings
export const updateImageGenSettings = imageGenerationDomain.event<
  Partial<{
    size: string;
    quality: string;
    style?: string;
    n: number;
  }>
>('updateImageGenSettings');

// History management events
export const clearGeneratedImages = imageGenerationDomain.event<void>(
  'clearGeneratedImages',
);
export const removeGeneratedImage = imageGenerationDomain.event<string>(
  'removeGeneratedImage',
);

// Send to chat functionality
export const sendImageToChat =
  imageGenerationDomain.event<string>('sendImageToChat');

// Parallel generation events
export const imageGenerationStarted = imageGenerationDomain.event<{
  id: string;
  prompt: string;
  model: string;
  parameters: ImageGenerationParams;
}>('imageGenerationStarted');

export const imageGenerationUpdated = imageGenerationDomain.event<{
  id: string;
  status: ImageGenerationStatus;
  error?: string;
  progress?: number;
}>('imageGenerationUpdated');

export const imageGenerationCompleted = imageGenerationDomain.event<{
  id: string;
  url?: string;
  b64_json?: string;
}>('imageGenerationCompleted');

// --- Effects ---

// Load generated images history from IndexedDB
export const loadGeneratedImagesFx = imageGenerationDomain.effect<
  void,
  GeneratedImage[]
>({
  name: 'loadGeneratedImagesFx',
  handler: loadGeneratedImagesHandler,
});

// Save generated image to IndexedDB
export const saveGeneratedImageFx = imageGenerationDomain.effect<
  GeneratedImage,
  void
>({
  name: 'saveGeneratedImageFx',
  handler: saveGeneratedImageHandler,
});

// Remove generated image from IndexedDB
export const removeGeneratedImageFx = imageGenerationDomain.effect<
  string,
  void
>({
  name: 'removeGeneratedImageFx',
  handler: removeGeneratedImageHandler,
});

// Save all generated images to IndexedDB
export const saveGeneratedImagesFx = imageGenerationDomain.effect<
  GeneratedImage[],
  void
>({
  name: 'saveGeneratedImagesFx',
  handler: saveGeneratedImagesHandler,
});

// Clear all generated images from IndexedDB
export const clearGeneratedImagesFx = imageGenerationDomain.effect<void, void>({
  name: 'clearGeneratedImagesFx',
  handler: clearGeneratedImagesHandler,
});

// Migrate from localStorage to IndexedDB (one-time operation)
export const migrateFromLocalStorageFx = imageGenerationDomain.effect<
  void,
  GeneratedImage[]
>({
  name: 'migrateFromLocalStorageFx',
  handler: migrateFromLocalStorageHandler,
});

// Image generation effect
export const generateImageFx = imageGenerationDomain.effect<
  ImageGenerationParams & {
    apiKey: string;
    providerApiUrl: string;
    requestId?: string;
  },
  { requestId: string; response: ImageGenerationResponse },
  Error
>({
  name: 'generateImageFx',
  handler: async ({ apiKey, providerApiUrl, requestId, ...params }) => {
    const currentRequestId = requestId || 'unknown';

    if (!apiKey) {
      throw new ImageGenerationError(
        'API key is required for image generation',
        currentRequestId,
      );
    }

    const modelInfo = getImageGenerationModelInfo(params.model);
    if (!modelInfo) {
      throw new ImageGenerationError(
        `Unsupported image generation model: ${params.model}`,
        currentRequestId,
      );
    }

    // Validate prompt length
    if (params.prompt.length > modelInfo.maxPromptLength) {
      throw new ImageGenerationError(
        `Prompt too long. Maximum length for ${modelInfo.name} is ${modelInfo.maxPromptLength} characters.`,
        currentRequestId,
      );
    }

    // Validate size
    if (params.size && !modelInfo.supportedSizes.includes(params.size)) {
      throw new ImageGenerationError(
        `Unsupported size ${params.size} for ${modelInfo.name}. Supported sizes: ${modelInfo.supportedSizes.join(', ')}`,
        currentRequestId,
      );
    }

    // Validate quality
    if (
      params.quality &&
      !modelInfo.supportedQualities.includes(params.quality)
    ) {
      throw new ImageGenerationError(
        `Unsupported quality ${params.quality} for ${modelInfo.name}. Supported qualities: ${modelInfo.supportedQualities.join(', ')}`,
        currentRequestId,
      );
    }

    // Validate style (for models that support it)
    if (
      params.style &&
      modelInfo.supportedStyles &&
      !modelInfo.supportedStyles.includes(params.style)
    ) {
      throw new ImageGenerationError(
        `Unsupported style ${params.style} for ${modelInfo.name}. Supported styles: ${modelInfo.supportedStyles.join(', ')}`,
        currentRequestId,
      );
    }

    // Validate number of images
    if (params.n && params.n > modelInfo.maxImages) {
      throw new ImageGenerationError(
        `Too many images requested. Maximum for ${modelInfo.name} is ${modelInfo.maxImages}`,
        currentRequestId,
      );
    }

    // Prepare request body
    const requestBody: Record<string, unknown> = {
      model: params.model,
      prompt: params.prompt,
      n: params.n || 1,
    };

    // Add optional parameters based on model support
    if (params.size) {
      requestBody.size = params.size;
    }

    if (params.quality) {
      requestBody.quality = params.quality;
    }

    if (params.style && modelInfo.supportedStyles) {
      requestBody.style = params.style;
    }

    const imageGenerationsUrl = buildImageGenerationsUrl(providerApiUrl);
    const response = await fetch(imageGenerationsUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: { message: 'Unknown error' } }));
      throw new ImageGenerationError(
        errorData.error?.message || `HTTP error! status: ${response.status}`,
        currentRequestId,
      );
    }

    const result: ImageGenerationResponse = await response.json();
    return {
      requestId: requestId || 'unknown',
      response: result,
    };
  },
});

// --- Store Updates ---

// Dialog state management
$isDialogOpen.on(dialogOpened, () => true).on(dialogClosed, () => false);

// Prompt management
$imagePrompt.on(promptChanged, (_, prompt) => prompt);

// Update selected model
$selectedImageGenModel.on(imageGenModelSelected, (_, modelId) => modelId);

// Validate and fix settings when model changes
sample({
  clock: imageGenModelSelected,
  source: $imageGenerationSettingsPerModel,
  fn: (allSettings, newModelId) => {
    const modelInfo = getImageGenerationModelInfo(newModelId);
    if (!modelInfo) return allSettings;

    const currentSettings = allSettings[newModelId];
    if (!currentSettings) {
      // No settings for this model yet, will use defaults
      return allSettings;
    }

    // Validate and fix current settings for the new model
    const validatedSettings = { ...currentSettings };

    // Validate size
    if (!modelInfo.supportedSizes.includes(currentSettings.size)) {
      validatedSettings.size = modelInfo.supportedSizes[0];
    }

    // Validate quality
    if (!modelInfo.supportedQualities.includes(currentSettings.quality)) {
      validatedSettings.quality = modelInfo.supportedQualities[0];
    }

    // Validate style (if model supports styles)
    if (currentSettings.style) {
      if (!modelInfo.supportedStyles?.includes(currentSettings.style)) {
        validatedSettings.style = modelInfo.supportedStyles?.[0];
      }
    } else if (modelInfo.supportedStyles?.length) {
      // Model supports styles but none is set, don't set a default
      delete validatedSettings.style;
    }

    // Validate number of images
    if (currentSettings.n > modelInfo.maxImages) {
      validatedSettings.n = modelInfo.maxImages;
    }

    return {
      ...allSettings,
      [newModelId]: validatedSettings,
    };
  },
  target: $imageGenerationSettingsPerModel,
});

// Update image generation settings for the current model
$imageGenerationSettingsPerModel.on(
  updateImageGenSettings,
  (allSettings, updates) => {
    const currentModel = $selectedImageGenModel.getState();
    const currentSettings =
      allSettings[currentModel] || getDefaultSettingsForModel(currentModel);

    return {
      ...allSettings,
      [currentModel]: {
        ...currentSettings,
        ...updates,
      },
    };
  },
);

// Update loading state to reflect any active generations
$isGeneratingImage.on($generatedImages, (_, images) =>
  images.some((img) => img.status === 'pending' || img.status === 'generating'),
);

// Migrate from localStorage on first dialog open, then load from IndexedDB
sample({
  clock: dialogOpened,
  target: migrateFromLocalStorageFx,
});

// Load images from IndexedDB after migration (or if migration returns empty)
sample({
  clock: [
    migrateFromLocalStorageFx.doneData,
    migrateFromLocalStorageFx.failData,
  ],
  target: loadGeneratedImagesFx,
});

// Update store when images are loaded
$generatedImages.on(
  loadGeneratedImagesFx.doneData,
  (_, loadedImages) => loadedImages,
);

// Update store when migration completes with data
$generatedImages.on(migrateFromLocalStorageFx.doneData, (_, migratedImages) =>
  migratedImages.length > 0 ? migratedImages : [],
);

// Note: Image generation completion is now handled by imageGenerationCompleted event
// to support parallel generation with per-request tracking

// Save all images to localStorage after generation
sample({
  clock: $generatedImages,
  target: saveGeneratedImagesFx,
});

// Handle errors
$imageGenerationError
  .on(generateImageFx.failData, (_, error) => error.message)
  .on(saveGeneratedImagesFx.failData, (_, error) => error.message)
  .on(saveGeneratedImageFx.failData, (_, error) => error.message)
  .on(
    loadGeneratedImagesFx.failData,
    (_, error) => `Failed to load image history: ${error.message}`,
  )
  .on(
    migrateFromLocalStorageFx.failData,
    (_, error) => `Failed to migrate image history: ${error.message}`,
  )
  .reset([
    generateImageFx,
    saveGeneratedImagesFx,
    saveGeneratedImageFx,
    loadGeneratedImagesFx,
    migrateFromLocalStorageFx,
  ]);

// Clear generated images from both store and localStorage
sample({
  clock: clearGeneratedImages,
  target: clearGeneratedImagesFx,
});

$generatedImages.reset(clearGeneratedImages);

// Remove specific image from both store and localStorage
sample({
  clock: removeGeneratedImage,
  target: removeGeneratedImageFx,
});

$generatedImages.on(removeGeneratedImage, (images, imageId) =>
  images.filter((img) => img.id !== imageId),
);

// Clear errors when starting new generation
$imageGenerationError.reset(generateImage);

// Send image to chat functionality
// This will be connected externally to avoid circular dependencies

// --- Sample Connections ---

// Create immediate placeholder when generation is requested
sample({
  clock: generateImage,
  source: $selectedImageGenModel,
  fn: (selectedModel, params) => {
    const id = crypto.randomUUID();
    return {
      id,
      prompt: params.prompt,
      model: selectedModel,
      parameters: params,
    };
  },
  target: imageGenerationStarted,
});

// Add placeholder to generated images store
$generatedImages.on(
  imageGenerationStarted,
  (images, { id, prompt, model, parameters }) => {
    const newPlaceholder: GeneratedImage = {
      id,
      prompt,
      model,
      parameters,
      timestamp: Date.now(),
      status: 'pending' as ImageGenerationStatus,
    };
    return [newPlaceholder, ...images];
  },
);

// Trigger actual API call after placeholder is created
sample({
  clock: imageGenerationStarted,
  source: { apiKey: $apiKey, providerApiUrl: $providerApiUrl },
  filter: ({ apiKey }) => !!apiKey,
  fn: ({ apiKey, providerApiUrl }, { id, parameters }) => ({
    ...parameters,
    apiKey,
    providerApiUrl,
    requestId: id, // Pass the ID to track this specific request
  }),
  target: generateImageFx,
});

// Update placeholder status when generation starts
sample({
  clock: generateImageFx,
  fn: (params) => ({
    id:
      (params as ImageGenerationParams & { requestId?: string }).requestId ||
      'unknown',
    status: 'generating' as ImageGenerationStatus,
  }),
  target: imageGenerationUpdated,
});

// Handle generation completion
sample({
  clock: generateImageFx.doneData,
  fn: ({ requestId, response }) => {
    // Extract the first (and typically only) image from the response
    const imageData = response.data[0];
    return {
      id: requestId,
      url: imageData?.url,
      b64_json: imageData?.b64_json,
    };
  },
  target: imageGenerationCompleted,
});

// Handle generation errors
sample({
  clock: generateImageFx.failData,
  fn: (error) => {
    // Extract requestId from custom error or fallback
    const requestId =
      error instanceof ImageGenerationError ? error.requestId : 'error-unknown';
    return {
      id: requestId,
      status: 'error' as ImageGenerationStatus,
      error: error.message,
    };
  },
  target: imageGenerationUpdated,
});

// Update images when status changes
$generatedImages.on(
  imageGenerationUpdated,
  (images, { id, status, error, progress }) =>
    images.map((img) =>
      img.id === id ? { ...img, status, error, progress } : img,
    ),
);

// Update images when generation completes
$generatedImages.on(imageGenerationCompleted, (images, { id, url, b64_json }) =>
  images.map((img) =>
    img.id === id
      ? { ...img, status: 'completed' as ImageGenerationStatus, url, b64_json }
      : img,
  ),
);

// --- Computed Stores ---

// Available image generation models
export const $availableImageGenModels = imageGenerationDomain.store(
  IMAGE_GENERATION_MODELS,
  { name: 'availableImageGenModels' },
);

// Current model info
export const $selectedImageGenModelInfo = sample({
  source: $selectedImageGenModel,
  fn: (modelId) => getImageGenerationModelInfo(modelId) || null,
});

// Check if current model supports specific features
export const $currentModelSupportsEditing = $selectedImageGenModelInfo.map(
  (modelInfo) => modelInfo?.supportsEditing || false,
);

export const $currentModelSupportsVariations = $selectedImageGenModelInfo.map(
  (modelInfo) => modelInfo?.supportsVariations || false,
);

export const $currentModelSupportedSizes = $selectedImageGenModelInfo.map(
  (modelInfo) => modelInfo?.supportedSizes || [],
);

export const $currentModelSupportedQualities = $selectedImageGenModelInfo.map(
  (modelInfo) => modelInfo?.supportedQualities || [],
);

export const $currentModelSupportedStyles = $selectedImageGenModelInfo.map(
  (modelInfo) => modelInfo?.supportedStyles || [],
);

// Combined state for easy consumption in components
export const $imageGenerationState = combine({
  // Dialog state
  isDialogOpen: $isDialogOpen,
  prompt: $imagePrompt,

  // Generation state
  isGenerating: $isGeneratingImage,
  error: $imageGenerationError,

  // Model and settings
  selectedModel: $selectedImageGenModel,
  modelInfo: $selectedImageGenModelInfo,
  settings: $imageGenerationSettings,
  availableModels: $availableImageGenModels,

  // History
  generatedImages: $generatedImages,

  // Capabilities
  supportsEditing: $currentModelSupportsEditing,
  supportsVariations: $currentModelSupportsVariations,
  supportedSizes: $currentModelSupportedSizes,
  supportedQualities: $currentModelSupportedQualities,
  supportedStyles: $currentModelSupportedStyles,
});

// --- Persistence ---

persist({ store: $selectedImageGenModel, key: 'selectedImageGenModel' });
persist({
  store: $imageGenerationSettingsPerModel,
  key: 'imageGenerationSettingsPerModel',
});

// --- Debugging ---

debug(
  // Stores
  $selectedImageGenModel,
  $generatedImages,
  $isGeneratingImage,
  $imageGenerationError,
  $imageGenerationSettings,
  $imageGenerationSettingsPerModel,
  $selectedImageGenModelInfo,
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

  // Effects
  generateImageFx,
  loadGeneratedImagesFx,
  saveGeneratedImagesFx,
  saveGeneratedImageFx,
  clearGeneratedImagesFx,
  removeGeneratedImageFx,
  migrateFromLocalStorageFx,
);
