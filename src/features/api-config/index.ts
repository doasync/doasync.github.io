// Central API configuration for OpenAI-compatible providers
// This module provides pure functions for building API URLs
// It does not depend on any other features to avoid circular dependencies

/**
 * Generate standard headers for API requests
 */
export function getApiHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
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
