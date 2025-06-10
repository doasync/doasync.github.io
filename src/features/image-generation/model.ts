import { createDomain, sample } from "effector";
import { debug } from "patronum/debug";
import { persist } from "effector-storage/local";
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

// Store for generated images
export const $generatedImages = imageGenerationDomain.store<GeneratedImage[]>(
  [], 
  { name: "generatedImages" }
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

// Clear generated images
export const clearGeneratedImages = imageGenerationDomain.event<void>("clearGeneratedImages");

// Remove a specific generated image
export const removeGeneratedImage = imageGenerationDomain.event<string>("removeGeneratedImage");

// --- Effects ---

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


// Enhanced image generation to include metadata - append to existing images
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

// Handle errors
$imageGenerationError
  .on(generateImageFx.failData, (_, error) => error.message)
  .reset(generateImageFx);

// Clear generated images
$generatedImages.reset(clearGeneratedImages);

// Remove specific image
$generatedImages.on(removeGeneratedImage, (images, imageId) =>
  images.filter(img => img.id !== imageId)
);

// Clear errors when starting new generation
$imageGenerationError.reset(generateImage);

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
  
  // Events
  imageGenModelSelected,
  generateImage,
  updateImageGenSettings,
  clearGeneratedImages,
  removeGeneratedImage,
  
  // Effects
  generateImageFx
);