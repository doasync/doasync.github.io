// Type definitions for the models-select feature

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
  maxAudioSize?: number; // in bytes
  supportedAudioFormats?: string[]; // MIME types
}

// Structure based on docs/essentials.md (API provider /models response)
export interface ModelInfo {
  id: string; // Model ID (e.g., "openai/gpt-4o") - USE THIS
  object: string; // e.g., "model"
  owned_by: string; // e.g., "google", "openai"
  type: string; // e.g., "/v1/chat/completions", "/v1/images/generations"

  // Fields that might be missing or derived from API provider's /v1/models response
  name?: string; // Display name (e.g., "OpenAI: GPT-4o") - Will be derived if missing
  description?: string;
  context_length?: number;
  created?: number; // epoch seconds
  pricing?: {
    prompt?: string;
    completion?: string;
    [key: string]: string | undefined;
  };

  // Enhanced metadata for API provider integration
  capabilities?: ModelCapabilities;
  limits?: ModelLimits;
  provider?: string; // Normalized provider name (openai, anthropic, google, etc.)
  category?: 'chat' | 'vision' | 'audio' | 'image-gen' | 'moderation';
  isFree?: boolean;
}

// The raw response from the API, before transformation
export interface RawModelsApiResponse {
  object?: string; // VoidAI has this, OpenRouter might not
  data: Array<{
    id: string; // REQUIRED - the only field guaranteed to exist
    object?: string; // VoidAI format
    owned_by?: string; // VoidAI/third-party format
    type?: string; // VoidAI format - "/v1/chat/completions", "/v1/images/generations", etc.
    endpoint?: string; // Third-party format - "/v1/chat/completions", etc.

    // OpenRouter format fields
    name?: string; // Display name like "OpenAI: GPT-4"
    created?: number; // Unix timestamp
    description?: string;
    context_length?: number;
    architecture?: {
      modality: string; // "text->text", "text+image->text", etc.
      input_modalities?: string[];
      output_modalities?: string[];
      tokenizer?: string;
      instruct_type?: string | null;
    };
    pricing?: {
      prompt?: string;
      completion?: string;
      request?: string;
      image?: string;
      [key: string]: string | undefined;
    };

    // Potentially other fields not in ModelInfo
    [key: string]: unknown;
  }>;
}
