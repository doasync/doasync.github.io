// Import only the types still used or needed by the remaining functions
import {
  Message,
  // CalculatedRetryUpdatePayload, // No longer used as calculateRetryUpdatePayloadFn is removed
  MessageRetryInitiatedPayload,
  // RequestContext, // No longer used directly in this file
} from "./types";

// Removed sendApiRequestFn and addAssistantMessageFn as they are replaced by chat-stream logic

/**
 * Prepares the parameters needed to send an API request for a message retry.
 * Determines the correct message history slice based on the role of the message being retried.
 * Used in the sample triggered by the `messageRetry` event.
 */
// Type for the base parameters needed for a stream request (used by prepareRetryRequestParamsFn)
interface StreamParamsBase {
  modelId: string;
  messages: Message[]; // History slice
  apiKey: string;
  temperature: number;
  systemPrompt: string;
}

export const prepareRetryRequestParamsFn = (
  {
    messages,
    apiKey,
    temperature,
    systemPrompt,
    selectedModelId,
  }: {
    messages: Message[];
    apiKey: string;
    temperature: number;
    systemPrompt: string;
    selectedModelId: string;
  },
  messageRetried: Message // Type is narrowed by filter in model.ts
): StreamParamsBase => {
  // Updated return type
  // Fix return type annotation
  const retryIndex = messages.findIndex((msg) => msg.id === messageRetried.id);

  if (retryIndex === -1) {
    throw new Error("Message to retry not found: " + messageRetried.id);
  }

  let historyToSend: Message[];
  if (messageRetried.role === "user") {
    historyToSend = messages.slice(0, retryIndex + 1);
  } else {
    // Retrying an assistant message
    // Send all messages *before* the one being retried.
    // This includes any preceding user messages AND assistant messages.
    if (retryIndex < 0) {
      // Should not happen based on previous check, but safety first
      throw new Error("Invalid retryIndex for assistant message retry.");
    }
    historyToSend = messages.slice(0, retryIndex);
  }

  // Return only the base parameters, context is added in the model sample
  return {
    modelId: selectedModelId,
    messages: historyToSend,
    apiKey,
    temperature,
    systemPrompt,
    // requestContext is intentionally omitted here
  };
};

// Removed calculateRetryUpdatePayloadFn as message updates are handled by streaming callbacks

/**
 * Determines the ID of the message that should show the "retrying" spinner.
 * Used in the sample triggered by `messageRetryInitiated`.
 */
export const determineRetryingMessageIdFn = (
  messages: Message[],
  { messageId, role }: MessageRetryInitiatedPayload
): string | null => {
  if (role === "assistant") {
    return messageId; // Retrying assistant message, spinner on it
  } else {
    // Retrying user message: find next assistant message
    const userIndex = messages.findIndex((msg) => msg.id === messageId);
    if (userIndex === -1) {
      console.error("Retrying user message not found:", messageId);
      return null; // Message not found
    }
    const nextAssistant = messages.find(
      (msg, idx) => idx > userIndex && msg.role === "assistant"
    );
    return nextAssistant ? nextAssistant.id : null; // Return ID of next assistant or null
  }
};

// Removed updateMessagesOnRetryFn as message updates are handled by streaming callbacks
