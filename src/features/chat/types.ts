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

// Removed internal types related to the old OpenRouter non-streaming API structure
// (OpenRouterMessage, OpenRouterRequestBody, OpenRouterUsage, OpenRouterResponseChoice, OpenRouterResponseBody, OpenRouterErrorBody)
// These are replaced by the types provided by the chat-stream feature.

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

// Removed SendApiRequestParams as API calls are now handled by chat-stream feature
// The parameters for the new streamChatFx effect are defined in chat-stream/types.ts

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
