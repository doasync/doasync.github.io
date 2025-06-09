import { createDomain, sample } from "effector";
import { debug } from "patronum/debug";
import { persist } from "effector-storage/local";

const modelsDomain = createDomain("models");

// --- Types ---

// Enhanced ModelInfo interface with capability detection
export interface ModelCapabilities {
  vision: boolean;
  audio: boolean;
  audioGeneration: boolean;
  streaming: boolean;
  functionCalling: boolean;
  imageGeneration: boolean;
  moderation: boolean;
}

export interface ModelLimits {
  maxImageSize?: number; // in bytes
  supportedImageFormats?: string[]; // MIME types
  maxTokens: number;
  contextWindow: number;
  maxImages?: number; // max images per message
  maxAudioDuration?: number; // max audio length in seconds
}

// Structure based on docs/essentials.md (VoidAI /models response)
export interface ModelInfo {
  id: string; // Model ID (e.g., "openai/gpt-4o") - USE THIS
  object: string; // e.g., "model"
  owned_by: string; // e.g., "google", "openai"
  type: string; // e.g., "/v1/chat/completions", "/v1/images/generations"

  // Fields that might be missing or derived from VoidAI's /v1/models response
  name?: string; // Display name (e.g., "OpenAI: GPT-4o") - Will be derived if missing
  description?: string;
  context_length?: number;
  created?: number; // epoch seconds
  pricing?: {
    prompt?: string;
    completion?: string;
    [key: string]: string | undefined;
  };

  // Enhanced metadata for VoidAI integration
  capabilities?: ModelCapabilities;
  limits?: ModelLimits;
  provider?: string; // Normalized provider name (openai, anthropic, google, etc.)
  category?: "chat" | "vision" | "audio" | "image-gen" | "moderation";
  isFree?: boolean;
}

// The raw response from the API, before transformation
interface RawModelsApiResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    owned_by: string;
    type: string;
    // Potentially other fields not in ModelInfo
    [key: string]: any;
  }>;
}

// --- Stores ---
// Holds the full list of models fetched from the API
export const $availableModels = modelsDomain.store<ModelInfo[]>([], {
  name: "availableModels",
});
// Holds the ID of the currently selected model
// Initialize with a sensible default or the first model after fetch
export const $selectedModelId = modelsDomain.store<string>(
  "gemini-2.5-flash-preview-05-20",
  { name: "selectedModelId" }
); // Default to free model initially
// Loading state for the models fetch
export const $isLoadingModels = modelsDomain.store<boolean>(false, {
  name: "isLoadingModels",
});
export const $showFreeOnly = modelsDomain.store<boolean>(false, {
  name: "showFreeOnly",
});
// Store indicating if the main model selector dropdown/input is active/focused
export const $isModelSelectorActive = modelsDomain.store<boolean>(false, {
  name: "isModelSelectorActive",
});

// --- Events ---
/**
 * Toggle or set the "show only free models" filter.
 */
export const setShowFreeOnly = modelsDomain.event<boolean>("setShowFreeOnly");

/**
 * Auto-select best model for given capabilities
 */
export const autoSelectModelForCapabilities = modelsDomain.event<{
  vision?: boolean;
  audio?: boolean;
  preferFree?: boolean;
}>("autoSelectModelForCapabilities");

// Set the "show only free models" filter.
$showFreeOnly.on(setShowFreeOnly, (_, payload) => payload);

persist({ store: $showFreeOnly, key: "showFreeOnly" });

persist({ store: $selectedModelId, key: "selectedModelId" });

export const $autoTitleModelId = modelsDomain.store<string>("gpt-4.1", {
  name: "autoTitleModelId",
});

export const autoTitleModelSelected = modelsDomain.event<string>(
  "autoTitleModelSelected"
);

$autoTitleModelId.on(autoTitleModelSelected, (_, id) => id);

persist({ store: $autoTitleModelId, key: "autoTitleModelId" });

// Error state for the models fetch
export const $modelsError = modelsDomain.store<string | null>(null, {
  name: "modelsError",
});

// --- Events ---
// Triggered to initiate fetching the model list (e.g., on app start)
export const fetchModels = modelsDomain.event("fetchModels");
// Triggered by the UI when a user selects a different model
export const modelSelected = modelsDomain.event<string>("modelSelected"); // Payload is the model ID
// Triggered by the ModelSelector component on focus/blur or dropdown open/close
export const modelSelectorFocused = modelsDomain.event<boolean>( // Ensure this is exported
  "modelSelectorFocused"
); // true for focus/open, false for blur/close

// Comprehensive vision models list (from real VoidAI API testing)
const VISION_MODELS = [
  // OpenAI GPT models with vision (confirmed from OpenAI docs)
  'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
  'gpt-4o', 'gpt-4o-mini', 'gpt-4o-2024-08-06', 'gpt-4o-2024-11-20',
  'gpt-4o-mini-2024-07-18', 'chatgpt-4o-latest',
  'gpt-4o-search-preview-2025-03-11', 'gpt-4o-mini-search-preview-2025-03-11',
  'gpt-4-1106-vision-preview', 'gpt-4.5-preview',
  
  // OpenAI O-series with vision
  'o4-mini', 'o4-mini-high', 'o4-mini-medium', 'o4-mini-low',
  'o3', 'o3-high', 'o3-medium', 'o3-low', 'o3-mini', 'o3-mini-high', 'o3-mini-low',
  'o1', 'o1-preview', 'o1-mini',
  
  // OpenAI Audio models with vision
  'gpt-4o-audio-preview', 'gpt-4o-audio-preview-2024-12-17',
  
  // Anthropic Claude models with vision (3.0+ series)
  'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20240620', 'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307',
  'claude-3-7-sonnet-20250219', 'claude-3-7-sonnet-20250219-thinking',
  'claude-opus-4-20250514', 'claude-opus-4-20250514-thinking',
  'claude-sonnet-4-20250514', 'claude-sonnet-4-20250514-thinking',
  'brainrot-sonnet-4-20250514',
  
  // Google Gemini models with vision (all Gemini models support vision)
  'gemini-2.5-pro-preview-05-06', 'gemini-2.5-pro-preview-06-05',
  'gemini-2.5-flash-preview-04-17', 'gemini-2.5-flash-preview-05-20',
  'gemini-2.5-flash-exp-native-audio-thinking-dialog', 'gemini-2.5-flash-preview-native-audio-dialog',
  'gemini-2.0-flash', 'gemini-2.0-flash-exp', 'gemini-2.0-flash-lite-preview-02-05',
  'gemini-2.0-flash-thinking-exp-01-21', 'gemini-2.0-pro-exp-02-05',
  'gemini-1.5-pro', 'gemini-1.5-pro-latest',
  'gemini-1.5-flash', 'gemini-1.5-flash-latest',
  'gemini-1.5-flash-8b', 'gemini-1.5-flash-8b-latest',
  'gemini-exp-1206', 'learnlm-1.5-pro-experimental', 'learnlm-2.0-flash-experimental',
  
  // xAI Grok models with vision
  'grok-2-vision-1212', 'grok-vision-beta',
  'grok-3-latest', 'grok-3-beta', 'grok-3-fast-beta', 'grok-3-mini-beta', 'grok-3-mini-fast-beta',
  
  // Mistral Pixtral models (vision-specific)
  'pixtral-large-latest', 'pixtral-large-2411', 'pixtral-12b', 'pixtral-12b-2409',
  
  // Qwen VL models
  'Qwen/Qwen2.5-VL-72B-Instruct'
];

// Model capability detection based on comprehensive real VoidAI testing
const detectCapabilities = (
  modelId: string,
  ownedBy: string
): ModelCapabilities => {
  const id = modelId.toLowerCase();

  return {
    // Use comprehensive tested vision models list
    vision: VISION_MODELS.includes(modelId),

    audio:
      id.includes("gpt-4o-audio") ||
      id.includes("whisper") ||
      id.includes("transcribe") ||
      id.includes("native-audio"),

    audioGeneration: 
      id.includes("tts") || 
      id.includes("gpt-4o-audio") ||
      id.includes("gpt-4o-mini-tts") ||
      id.includes("elevenlabs") ||
      id.includes("native-audio"),

    streaming: true, // Most chat models support streaming

    functionCalling:
      ownedBy === "openai" ||
      id.includes("gpt-4") ||
      id.includes("claude") ||
      id.includes("gemini") ||
      id.includes("grok") ||
      id.includes("mistral"),

    imageGeneration: false, // Only specific image generation models
    moderation: id.includes("moderation"),
  };
};

const detectLimits = (
  modelId: string,
  ownedBy: string,
  contextLength?: number
): ModelLimits => {
  const id = modelId.toLowerCase();

  // Default limits based on common patterns
  let maxTokens = 4096;
  let contextWindow = contextLength || 4096;
  let maxImageSize = 20 * 1024 * 1024; // 20MB default

  // Provider-specific adjustments
  if (ownedBy === "openai") {
    if (id.includes("gpt-4o")) {
      maxTokens = 16384;
      contextWindow = 128000;
    } else if (id.includes("gpt-4")) {
      maxTokens = 8192;
      contextWindow = 8192;
    }
  } else if (ownedBy === "anthropic") {
    maxTokens = 8192;
    contextWindow = 200000; // Claude has large context
    maxImageSize = 5 * 1024 * 1024; // 5MB for Claude
  } else if (ownedBy === "google") {
    maxTokens = 8192;
    contextWindow = 2000000; // Gemini has very large context
  }

  return {
    maxTokens,
    contextWindow,
    maxImageSize,
    supportedImageFormats: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ],
    maxImages: 10, // Default
    maxAudioDuration: 25 * 60, // 25 minutes for audio
  };
};

const categorizeModel = (
  modelId: string
): "chat" | "vision" | "audio" | "image-gen" | "moderation" => {
  const id = modelId.toLowerCase();

  if (id.includes("moderation")) return "moderation";
  if (
    id.includes("vision") ||
    id.includes("pixtral") ||
    id.includes("qwen2.5-vl")
  )
    return "vision";
  if (id.includes("whisper") || id.includes("transcribe") || id.includes("tts"))
    return "audio";
  if (id.includes("dall-e") || id.includes("imagen") || id.includes("flux"))
    return "image-gen";

  return "chat";
};

// Free models based on VoidAI documentation patterns
const FREE_MODEL_PATTERNS = [
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gpt-4o-mini",
  "claude-3-haiku",
  "mistral-small",
  "llama",
];

const isFreeModel = (modelId: string): boolean => {
  const id = modelId.toLowerCase();
  return FREE_MODEL_PATTERNS.some((pattern) => id.includes(pattern));
};

// --- Effects ---
const fetchModelsFx = modelsDomain.effect<void, ModelInfo[], Error>({
  name: "fetchModelsFx",
  handler: async () => {
    const response = await fetch("https://api.voidai.app/v1/models");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const rawData: RawModelsApiResponse = await response.json();

    // Filter for chat completion models and transform to ModelInfo
    const chatModels: ModelInfo[] = rawData.data
      .filter((model) => model.type === "/v1/chat/completions")
      .map((model) => {
        const capabilities = detectCapabilities(model.id, model.owned_by);
        const limits = detectLimits(
          model.id,
          model.owned_by,
          model.context_length
        );
        const category = categorizeModel(model.id);
        const isFree = isFreeModel(model.id);

        return {
          id: model.id,
          object: model.object,
          owned_by: model.owned_by,
          type: model.type,
          // Derive a 'name' for display since it's not directly provided
          name: `${model.owned_by}: ${model.id}`,
          // Other fields are optional and will be undefined if not present in rawData
          description: model.description, // Will be undefined
          context_length: model.context_length, // Will be undefined
          created: model.created, // Will be undefined
          pricing: model.pricing, // Will be undefined

          // Enhanced metadata
          capabilities,
          limits,
          provider: model.owned_by,
          category,
          isFree,
        };
      });

    // Sort models: vision models first, then by created timestamp or ID
    return chatModels.sort((a, b) => {
      // Prioritize vision models
      if (a.capabilities?.vision && !b.capabilities?.vision) return -1;
      if (!a.capabilities?.vision && b.capabilities?.vision) return 1;

      // Then by created timestamp if available
      if (a.created && b.created) {
        return b.created - a.created;
      }

      // Fallback to alphabetical by ID
      return a.id.localeCompare(b.id);
    });
  },
});

// --- Logic ---

// Trigger fetch effect when fetchModels event is called
sample({
  clock: fetchModels,
  target: fetchModelsFx,
});

// Update loading state
$isLoadingModels.on(fetchModelsFx, () => true).reset(fetchModelsFx.finally);

// Update models list on successful fetch
$availableModels.on(fetchModelsFx.doneData, (_, models) => models);

// Set the initial selected model to the first one in the list after fetch, if current default isn't available
// Or keep the default if it exists in the fetched list
sample({
  clock: fetchModelsFx.doneData,
  source: $selectedModelId,
  fn: (currentSelectedId, models) => {
    if (models.length > 0) {
      const currentExists = models.some((m) => m.id === currentSelectedId);
      if (currentExists) {
        return currentSelectedId; // Keep current selection if it's valid
      }
      return models[0].id; // Default to the first model if current is invalid or list was empty
    }
    return currentSelectedId; // Keep current ID if fetch returned empty
  },
  target: $selectedModelId,
});

// Update selected model ID when user selects one
$selectedModelId.on(modelSelected, (_, selectedId) => selectedId);

// Handle fetch errors
$modelsError
  .on(fetchModelsFx.failData, (_, error) => error.message)
  .reset(fetchModelsFx); // Clear error on new attempt

// Clear error on success
$modelsError.reset(fetchModelsFx.done);

// Update focus state store when event is triggered
$isModelSelectorActive.on(modelSelectorFocused, (_, isFocused) => isFocused);

// Smart model selection based on required capabilities
sample({
  clock: autoSelectModelForCapabilities,
  source: [$availableModels, $selectedModelId],
  fn: ([models, currentSelection], requirements): string => {
    // Type guard - ensure models is an array
    if (typeof models === 'string') {
      return currentSelection as string;
    }
    
    // Filter models that meet the requirements
    const suitableModels = models.filter((model: ModelInfo) => {
      const caps = model.capabilities;
      if (!caps) return false;

      // Check vision requirement
      if (requirements.vision && !caps.vision) return false;

      // Check audio requirement
      if (requirements.audio && !caps.audio) return false;

      // Check free preference
      if (requirements.preferFree && !model.isFree) return false;

      return true;
    });

    if (suitableModels.length === 0) {
      // No suitable models found, return current selection
      return currentSelection as string;
    }

    // Rank models by preference
    const rankedModels = suitableModels.sort((a: ModelInfo, b: ModelInfo) => {
      // Prefer free models if requested
      if (requirements.preferFree) {
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
      }

      // Prefer newer models (higher created timestamp)
      if (a.created && b.created) {
        return b.created - a.created;
      }

      // Prefer specific high-quality models
      const preferredModels = ["gpt-4o", "claude-3-opus", "gemini-2.0-flash"];
      for (const preferred of preferredModels) {
        if (a.id.includes(preferred) && !b.id.includes(preferred)) return -1;
        if (!a.id.includes(preferred) && b.id.includes(preferred)) return 1;
      }

      return 0;
    });

    return rankedModels[0].id;
  },
  target: $selectedModelId,
});

// Computed store for vision-capable models
export const $visionModels = $availableModels.map((models) =>
  models.filter((model) => model.capabilities?.vision)
);

// Computed store for current model info
export const $selectedModelInfo = sample({
  source: [$availableModels, $selectedModelId],
  fn: ([models, selectedId]) => {
    if (typeof models === 'string') return null;
    return models.find((model: ModelInfo) => model.id === selectedId) || null;
  },
});

// Helper to check if current model supports capability
export const $currentModelSupportsVision = $selectedModelInfo.map(
  (modelInfo) => modelInfo?.capabilities?.vision || false
);

export const $currentModelSupportsAudio = $selectedModelInfo.map(
  (modelInfo) => modelInfo?.capabilities?.audio || false
);

// --- Debugging ---

debug(
  // Stores
  $availableModels,
  $selectedModelId,
  $selectedModelInfo,
  $currentModelSupportsVision,
  $currentModelSupportsAudio,
  $isLoadingModels,
  $modelsError,

  // Events
  fetchModels,
  modelSelected,
  autoSelectModelForCapabilities,

  // Effects
  fetchModelsFx
);
