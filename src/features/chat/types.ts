// Type definitions for the chat feature

export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string | any; // Consider refining 'any' if possible
  timestamp: number;
  isEdited?: boolean;
  originalContent?: string | any; // Consider refining 'any' if possible
  isLoading?: boolean; // Added for placeholder/retry state
}

// Internal types related to OpenRouter API structure
export interface OpenRouterMessage {
  role: Role;
  content: string | any; // Consider refining 'any' if possible
}

export interface OpenRouterRequestBody {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
}

export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenRouterResponseChoice {
  finish_reason: string;
  message: OpenRouterMessage;
}

export interface OpenRouterResponseBody {
  id: string;
  model: string;
  choices: OpenRouterResponseChoice[];
  usage: OpenRouterUsage;
}

export interface OpenRouterErrorBody {
  error: {
    code: number;
    message: string;
  };
}

// Define the types of request contexts
export type RequestContextNormal = { type: "normal" };
export type RequestContextGenerate = {
  type: "generate";
  placeholderId: string;
};
export type RequestContextRetry = {
  type: "retry";
  originalMessageId: string;
  originalRole: Role;
  retryPlaceholderId?: string; // ID of placeholder added if retrying user -> user/end
};

export type RequestContext =
  | RequestContextNormal
  | RequestContextGenerate
  | RequestContextRetry;

// Type for parameters passed to the API request effect/function
export interface SendApiRequestParams {
  modelId: string;
  messages: Message[]; // History slice to send
  apiKey: string;
  temperature: number;
  systemPrompt: string;
  requestContext: RequestContext | null; // Explicit context for processing the response
}

// Type for the payload of the internal retryUpdate event
export interface RetryUpdatePayload {
  targetIndex: number;
  newAssistantMessage: Message;
  insert?: boolean; // Flag to indicate insertion instead of replacement
}

// Type for the payload of the internal calculatedRetryUpdate event
// This still represents the *result* of the calculation
export type CalculatedRetryUpdatePayload = RetryUpdatePayload | null;

// Type for the payload of the messageRetryInitiated event
export interface MessageRetryInitiatedPayload {
  messageId: string;
  role: Role;
}
