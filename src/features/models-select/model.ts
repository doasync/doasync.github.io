import { createDomain, sample } from "effector";
import { debug } from "patronum/debug";
import { persist } from "effector-storage/local";

const modelsDomain = createDomain("models");

// --- Types ---

// Structure based on docs/essentials.md (OpenRouter /models response)
export interface ModelInfo {
  id: string; // Model ID (e.g., "openai/gpt-4o") - USE THIS
  name: string; // Display name (e.g., "OpenAI: GPT-4o") - USE THIS
  description: string;
  context_length: number;
  created?: number; // epoch seconds
  architecture: {
    modality: string;
    input_modalities: string[]; // Check this array for image support
    output_modalities: string[];
  };
  pricing?: {
    prompt: string;
    completion: string;
    [key: string]: string;
  };
}

interface ModelsApiResponse {
  data: ModelInfo[];
}

// --- Stores ---
// Holds the full list of models fetched from the API
export const $availableModels = modelsDomain.store<ModelInfo[]>([], {
  name: "availableModels",
});
// Holds the ID of the currently selected model
// Initialize with a sensible default or the first model after fetch
export const $selectedModelId = modelsDomain.store<string>(
  "openrouter/quasar-alpha",
  { name: "selectedModelId" }
); // Default to free model initially
// Loading state for the models fetch
export const $isLoadingModels = modelsDomain.store<boolean>(false, {
  name: "isLoadingModels",
});
export const $showFreeOnly = modelsDomain.store<boolean>(false, {
  name: "showFreeOnly",
});

// --- Events ---
/**
 * Toggle or set the "show only free models" filter.
 */
export const setShowFreeOnly = modelsDomain.event<boolean>("setShowFreeOnly");

// Set the "show only free models" filter.
$showFreeOnly.on(setShowFreeOnly, (_, payload) => payload);

persist({ store: $showFreeOnly, key: "showFreeOnly" });

persist({ store: $selectedModelId, key: "selectedModelId" });

export const $autoTitleModelId = modelsDomain.store<string>(
  "google/gemini-2.0-flash-lite-001",
  { name: "autoTitleModelId" }
);

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

// --- Effects ---
const fetchModelsFx = modelsDomain.effect<void, ModelInfo[], Error>({
  name: "fetchModelsFx",
  handler: async () => {
    const response = await fetch("https://openrouter.ai/api/v1/models");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: ModelsApiResponse = await response.json();
    // Sort models descending by created timestamp (newest first)
    return data.data.sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
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

// --- Debugging ---
/*
debug(
  // Stores
  $availableModels,
  $selectedModelId,
  $isLoadingModels,
  $modelsError,

  // Events
  fetchModels,
  modelSelected,

  // Effects
  fetchModelsFx
);
*/
