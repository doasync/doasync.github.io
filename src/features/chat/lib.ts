// Import only the types still used or needed by the remaining functions
import {
  Message,
  MessageContentPart,
  GeneratedImageContentPart,
  // CalculatedRetryUpdatePayload, // No longer used as calculateRetryUpdatePayloadFn is removed
  MessageRetryInitiatedPayload,
  // RequestContext, // No longer used directly in this file
} from "./types";
import { StreamMessageContentPart } from "@/features/chat-stream";

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

/**
 * Formats and validates messages for API consumption.
 * VoidAI expects OpenAI-compatible format for all models and handles provider-specific conversion internally.
 */
export const formatMessagesForAPI = (
  messages: (Message | { role: "system" | "user" | "assistant"; content: string | MessageContentPart[] })[],
  modelId: string
): Array<{
  role: "system" | "user" | "assistant";
  content: string | StreamMessageContentPart[];
}> => {
  const isGPTModel = modelId.includes("gpt") || modelId.includes("chatgpt");

  return messages.map((message) => {
    // If content is a string, pass it through as-is
    if (typeof message.content === "string") {
      return {
        role: message.role,
        content: message.content,
      };
    }

    // If content is an array (multimodal), validate and format it
    if (Array.isArray(message.content)) {
      // Transform and filter content parts for API consumption
      const transformedContentParts: StreamMessageContentPart[] = [];
      
      for (const part of message.content) {
        // Convert document parts to text parts for API
        if (part.type === "document") {
          if (
            part.document &&
            typeof part.document.text === "string" &&
            part.document.text.trim().length > 0 &&
            part.document.metadata &&
            typeof part.document.metadata.fileName === "string"
          ) {
            // Create a text part with document content and metadata
            const documentHeader = `--- Document: ${part.document.metadata.fileName} ---\n` +
              `Type: ${part.document.metadata.mimeType}\n` +
              `Word Count: ${part.document.metadata.wordCount.toLocaleString()}\n` +
              (part.document.metadata.pageCount ? `Pages: ${part.document.metadata.pageCount}\n` : '') +
              (part.document.metadata.title ? `Title: ${part.document.metadata.title}\n` : '') +
              (part.document.metadata.author ? `Author: ${part.document.metadata.author}\n` : '') +
              `--- Content ---\n`;
            
            transformedContentParts.push({
              type: "text",
              text: documentHeader + part.document.text
            });
          }
          continue;
        }
        
        // Keep other valid parts as-is (excluding generated images which are UI-only)
        if (part.type !== "generated_image") {
          transformedContentParts.push(part as StreamMessageContentPart);
        }
      }
      
      // Filter out any invalid content parts and generated images - keep OpenAI format for all models
      const validContentParts = transformedContentParts.filter((part): part is StreamMessageContentPart => {
        if (part.type === "text") {
          return typeof part.text === "string" && part.text.trim().length > 0;
        }
        if (part.type === "image_url") {
          return (
            part.image_url &&
            typeof part.image_url.url === "string" &&
            part.image_url.url.length > 0 &&
            (part.image_url.url.startsWith("data:image/") ||
              part.image_url.url.startsWith("https://"))
          );
        }
        if (part.type === "input_audio") {
          return (
            part.input_audio &&
            typeof part.input_audio.data === "string" &&
            part.input_audio.data.length > 0
          );
        }
        return false;
      });

      // If no valid content parts, fallback to empty text
      if (validContentParts.length === 0) {
        const messageId = 'id' in message ? message.id : 'system';
        console.warn(`Message ${messageId} has no valid content parts, using empty string`);
        return {
          role: message.role,
          content: "",
        };
      }

      // For GPT models, ensure at least one text part exists if there are media attachments
      if (isGPTModel) {
        const hasText = validContentParts.some(part => part.type === "text");
        const hasImages = validContentParts.some(part => part.type === "image_url");
        const hasAudio = validContentParts.some(part => part.type === "input_audio");
        
        if ((hasImages || hasAudio) && !hasText) {
          // Add a text part for GPT models that require text with media
          let defaultText = "Please analyze this content.";
          if (hasImages && hasAudio) {
            defaultText = "Please analyze this image and audio content.";
          } else if (hasImages) {
            defaultText = "What do you see in this image?";
          } else if (hasAudio) {
            defaultText = "Please transcribe or analyze this audio.";
          }
          
          validContentParts.push({
            type: "text",
            text: defaultText,
          });
        }
      }

      return {
        role: message.role,
        content: validContentParts,
      };
    }

    // Fallback for unexpected content types
    const messageId = 'id' in message ? message.id : 'system';
    console.warn(`Unexpected content type for message ${messageId}:`, typeof message.content);
    return {
      role: message.role,
      content: "",
    };
  });
};
