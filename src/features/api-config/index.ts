// Central API configuration for OpenAI-compatible providers

import { $providerApiUrl } from "@/features/chat-settings";

// Computed stores for different API endpoints
export const $chatCompletionsUrl = $providerApiUrl.map(
  (baseUrl) => `${baseUrl}/chat/completions`
);

export const $imageGenerationsUrl = $providerApiUrl.map(
  (baseUrl) => `${baseUrl}/images/generations`
);

export const $modelsUrl = $providerApiUrl.map(
  (baseUrl) => `${baseUrl}/models`
);

/**
 * Generate standard headers for API requests
 */
export function getApiHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

/**
 * Build chat completions URL with base URL
 */
export function buildChatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl}/chat/completions`;
}

/**
 * Build images generations URL with base URL
 */
export function buildImageGenerationsUrl(baseUrl: string): string {
  return `${baseUrl}/images/generations`;
}

/**
 * Build models URL with base URL
 */
export function buildModelsUrl(baseUrl: string): string {
  return `${baseUrl}/models`;
}