import { createDomain, sample, combine } from "effector";
import { debug } from "patronum/debug";
import { persist } from "effector-storage/local";
import { spread } from "patronum/spread";
import { $apiKey, $providerApiUrl } from "@/features/chat-settings";
import { buildImageGenerationsUrl } from "@/features/api-config";
import { 
  ImageGenerationParams, 
  ImageGenerationResponse, 
  GeneratedImage,
  IMAGE_GENERATION_MODELS,
  getImageGenerationModelInfo
} from "./types";

const imageGenerationDomain = createDomain("imageGeneration");

// --- Stores ---

// Currently selected image generation model
export const $selectedImageGenModel = imageGenerationDomain.store<string>(
  "gpt-image-1", 
  { name: "selectedImageGenModel" }
);

// Dialog state management
export const $isDialogOpen = imageGenerationDomain.store<boolean>(
  false,
  { name: "isDialogOpen" }
);

// Store for generated images (now persistent)
export const $generatedImages = imageGenerationDomain.store<GeneratedImage[]>(
  [], 
  { name: "generatedImages" }
);

// Store for current prompt in dialog
export const $imagePrompt = imageGenerationDomain.store<string>(
  "",
  { name: "imagePrompt" }
);

// Loading state for image generation
export const $isGeneratingImage = imageGenerationDomain.store<boolean>(
  false, 
  { name: "isGeneratingImage" }
);

// Error state for image generation
export const $imageGenerationError = imageGenerationDomain.store<string | null>(
  null, 
  { name: "imageGenerationError" }
);

// Per-model image generation settings
export const $imageGenerationSettingsPerModel = imageGenerationDomain.store<Record<string, {
  size: string;
  quality: string;
  style?: string;
  n: number;
}>>(
  {}, 
  { name: "imageGenerationSettingsPerModel" }
);

// Helper function to get default settings for a model
const getDefaultSettingsForModel = (modelId: string) => {
  const modelInfo = getImageGenerationModelInfo(modelId);
  if (!modelInfo) {
    return {
      size: "1024x1024",
      quality: "standard",
      n: 1
    };
  }
  
  return {
    size: modelInfo.supportedSizes[0] || "1024x1024",
    quality: modelInfo.supportedQualities[0] || "standard",
    style: modelInfo.supportedStyles?.[0],
    n: 1
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
    size: "1024x1024",
    quality: "standard",
    n: 1
  },
  { name: "imageGenerationSettings" }
);

// Update current settings when model changes
sample({
  clock: $selectedImageGenModel,
  source: $imageGenerationSettingsPerModel,
  fn: (settingsPerModel, selectedModel) => {
    // Return settings for current model, or defaults if not set
    return settingsPerModel[selectedModel] || getDefaultSettingsForModel(selectedModel);
  },
  target: $imageGenerationSettings,
});

// Update current settings when per-model settings change
sample({
  clock: $imageGenerationSettingsPerModel,
  source: $selectedImageGenModel,
  fn: (selectedModel, settingsPerModel) => {
    // Return settings for current model, or defaults if not set
    return settingsPerModel[selectedModel] || getDefaultSettingsForModel(selectedModel);
  },
  target: $imageGenerationSettings,
});

// --- Events ---

// Dialog state events
export const dialogOpened = imageGenerationDomain.event<void>("dialogOpened");
export const dialogClosed = imageGenerationDomain.event<void>("dialogClosed");

// Prompt management
export const promptChanged = imageGenerationDomain.event<string>("promptChanged");

// User selects an image generation model
export const imageGenModelSelected = imageGenerationDomain.event<string>("imageGenModelSelected");

// User initiates image generation
export const generateImage = imageGenerationDomain.event<ImageGenerationParams>("generateImage");

// Update image generation settings
export const updateImageGenSettings = imageGenerationDomain.event<Partial<{
  size: string;
  quality: string;
  style?: string;
  n: number;
}>>("updateImageGenSettings");

// History management events
export const clearGeneratedImages = imageGenerationDomain.event<void>("clearGeneratedImages");
export const removeGeneratedImage = imageGenerationDomain.event<string>("removeGeneratedImage");

// Send to chat functionality
export const sendImageToChat = imageGenerationDomain.event<string>("sendImageToChat");

// --- Effects ---

// Load generated images history from localStorage
export const loadGeneratedImagesFx = imageGenerationDomain.effect<void, GeneratedImage[]>({
  name: "loadGeneratedImagesFx",
  handler: async () => {
    try {
      const stored = localStorage.getItem('generatedImagesHistory');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate the structure
        if (Array.isArray(parsed)) {
          return parsed.filter(item => 
            item && 
            typeof item === 'object' && 
            typeof item.id === 'string' &&
            typeof item.prompt === 'string' &&
            typeof item.model === 'string' &&
            typeof item.timestamp === 'number'
          );
        }
      }
      return [];
    } catch (error) {
      console.warn('Failed to load generated images from localStorage:', error);
      return [];
    }
  },
});

// Save generated image to localStorage
export const saveGeneratedImageFx = imageGenerationDomain.effect<GeneratedImage, void>({
  name: "saveGeneratedImageFx",
  handler: async (image) => {
    try {
      const current = $generatedImages.getState();
      const updated = [...current, image];
      localStorage.setItem('generatedImagesHistory', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save generated image to localStorage:', error);
    }
  },
});

// Remove generated image from localStorage
export const removeGeneratedImageFx = imageGenerationDomain.effect<string, void>({
  name: "removeGeneratedImageFx", 
  handler: async (imageId) => {
    try {
      const current = $generatedImages.getState();
      const updated = current.filter(img => img.id !== imageId);
      localStorage.setItem('generatedImagesHistory', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to remove generated image from localStorage:', error);
    }
  },
});

// Save all generated images to localStorage
export const saveGeneratedImagesFx = imageGenerationDomain.effect<GeneratedImage[], void>({
  name: "saveGeneratedImagesFx",
  handler: async (images) => {
    try {
      localStorage.setItem('generatedImagesHistory', JSON.stringify(images));
    } catch (error) {
      console.warn('Failed to save generated images to localStorage:', error);
    }
  },
});

// Clear all generated images from localStorage
export const clearGeneratedImagesFx = imageGenerationDomain.effect<void, void>({
  name: "clearGeneratedImagesFx",
  handler: async () => {
    try {
      localStorage.removeItem('generatedImagesHistory');
    } catch (error) {
      console.warn('Failed to clear generated images from localStorage:', error);
    }
  },
});

// Image generation effect
export const generateImageFx = imageGenerationDomain.effect<
  ImageGenerationParams & { apiKey: string; providerApiUrl: string },
  ImageGenerationResponse,
  Error
>({
  name: "generateImageFx",
  handler: async ({ apiKey, providerApiUrl, ...params }) => {
    if (!apiKey) {
      throw new Error("API key is required for image generation");
    }

    const modelInfo = getImageGenerationModelInfo(params.model);
    if (!modelInfo) {
      throw new Error(`Unsupported image generation model: ${params.model}`);
    }

    // Validate prompt length
    if (params.prompt.length > modelInfo.maxPromptLength) {
      throw new Error(`Prompt too long. Maximum length for ${modelInfo.name} is ${modelInfo.maxPromptLength} characters.`);
    }

    // Validate size
    if (params.size && !modelInfo.supportedSizes.includes(params.size)) {
      throw new Error(`Unsupported size ${params.size} for ${modelInfo.name}. Supported sizes: ${modelInfo.supportedSizes.join(", ")}`);
    }

    // Validate quality
    if (params.quality && !modelInfo.supportedQualities.includes(params.quality)) {
      throw new Error(`Unsupported quality ${params.quality} for ${modelInfo.name}. Supported qualities: ${modelInfo.supportedQualities.join(", ")}`);
    }

    // Validate style (for models that support it)
    if (params.style && modelInfo.supportedStyles && !modelInfo.supportedStyles.includes(params.style)) {
      throw new Error(`Unsupported style ${params.style} for ${modelInfo.name}. Supported styles: ${modelInfo.supportedStyles.join(", ")}`);
    }

    // Validate number of images
    if (params.n && params.n > modelInfo.maxImages) {
      throw new Error(`Too many images requested. Maximum for ${modelInfo.name} is ${modelInfo.maxImages}`);
    }

    // Prepare request body
    const requestBody: any = {
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
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    const result: ImageGenerationResponse = await response.json();
    return result;
  },
});

// --- Store Updates ---

// Dialog state management
$isDialogOpen
  .on(dialogOpened, () => true)
  .on(dialogClosed, () => false);

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
      [newModelId]: validatedSettings
    };
  },
  target: $imageGenerationSettingsPerModel,
});

// Update image generation settings for the current model
$imageGenerationSettingsPerModel.on(updateImageGenSettings, (allSettings, updates) => {
  const currentModel = $selectedImageGenModel.getState();
  const currentSettings = allSettings[currentModel] || getDefaultSettingsForModel(currentModel);
  
  return {
    ...allSettings,
    [currentModel]: {
      ...currentSettings,
      ...updates,
    }
  };
});

// Update loading state
$isGeneratingImage
  .on(generateImageFx, () => true)
  .reset(generateImageFx.finally);


// Load images from localStorage when dialog opens
sample({
  clock: dialogOpened,
  target: loadGeneratedImagesFx,
});

// Update store when images are loaded
$generatedImages.on(loadGeneratedImagesFx.doneData, (_, loadedImages) => loadedImages);

// Enhanced image generation to include metadata and save to localStorage
sample({
  clock: generateImageFx.done,
  source: $generatedImages,
  fn: (existingImages, { params, result }) => {
    const newImages: GeneratedImage[] = result.data.map((imageData) => ({
      id: crypto.randomUUID(),
      url: imageData.url,
      b64_json: imageData.b64_json,
      prompt: params.prompt,
      model: params.model,
      parameters: {
        prompt: params.prompt,
        model: params.model,
        size: params.size,
        quality: params.quality,
        style: params.style,
        n: params.n,
      },
      timestamp: result.created * 1000,
    }));
    
    return [...existingImages, ...newImages];
  },
  target: $generatedImages,
});

// Save all images to localStorage after generation
sample({
  clock: $generatedImages,
  target: saveGeneratedImagesFx,
});

// Handle errors
$imageGenerationError
  .on(generateImageFx.failData, (_, error) => error.message)
  .reset(generateImageFx);

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
  images.filter(img => img.id !== imageId)
);

// Clear errors when starting new generation
$imageGenerationError.reset(generateImage);

// Send image to chat functionality
// This will be connected externally to avoid circular dependencies

// --- Sample Connections ---

// Connect generateImage event to generateImageFx effect with API key and provider URL
sample({
  clock: generateImage,
  source: { apiKey: $apiKey, providerApiUrl: $providerApiUrl },
  filter: ({ apiKey }) => !!apiKey,
  fn: ({ apiKey, providerApiUrl }, params) => ({ ...params, apiKey, providerApiUrl }),
  target: generateImageFx,
});




// --- Computed Stores ---

// Available image generation models
export const $availableImageGenModels = imageGenerationDomain.store(
  IMAGE_GENERATION_MODELS,
  { name: "availableImageGenModels" }
);

// Current model info
export const $selectedImageGenModelInfo = sample({
  source: $selectedImageGenModel,
  fn: (modelId) => getImageGenerationModelInfo(modelId) || null,
});

// Check if current model supports specific features
export const $currentModelSupportsEditing = $selectedImageGenModelInfo.map(
  (modelInfo) => modelInfo?.supportsEditing || false
);

export const $currentModelSupportsVariations = $selectedImageGenModelInfo.map(
  (modelInfo) => modelInfo?.supportsVariations || false
);

export const $currentModelSupportedSizes = $selectedImageGenModelInfo.map(
  (modelInfo) => modelInfo?.supportedSizes || []
);

export const $currentModelSupportedQualities = $selectedImageGenModelInfo.map(
  (modelInfo) => modelInfo?.supportedQualities || []
);

export const $currentModelSupportedStyles = $selectedImageGenModelInfo.map(
  (modelInfo) => modelInfo?.supportedStyles || []
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

persist({ store: $selectedImageGenModel, key: "selectedImageGenModel" });
persist({ store: $imageGenerationSettingsPerModel, key: "imageGenerationSettingsPerModel" });

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
  clearGeneratedImagesFx,
  removeGeneratedImageFx
);