import {
  Message,
  OpenRouterMessage,
  OpenRouterRequestBody,
  OpenRouterResponseBody,
  OpenRouterErrorBody,
  SendApiRequestParams,
  CalculatedRetryUpdatePayload,
  MessageRetryInitiatedPayload,
} from "./types";

/**
 * Sends a chat completion request to the OpenRouter API.
 */
export const sendApiRequestFn = async ({
  modelId,
  messages,
  apiKey,
  temperature,
  systemPrompt,
}: SendApiRequestParams): Promise<OpenRouterResponseBody> => {
  const apiMessages: OpenRouterMessage[] = [];
  if (systemPrompt && systemPrompt.trim()) {
    apiMessages.push({ role: "system", content: systemPrompt });
  }
  messages.forEach((msg) => {
    // Ensure only user and assistant messages are sent
    if (msg.role === "user" || msg.role === "assistant") {
      apiMessages.push({
        role: msg.role,
        // Use edited content if available (content property is updated by editMessage handler)
        content: msg.content,
      });
    }
  });
  const body: OpenRouterRequestBody = {
    model: modelId,
    messages: apiMessages,
    temperature,
  };
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    }
  );
  if (!response.ok) {
    let errorMsg = `HTTP error! status: ${response.status}`;
    try {
      const errorBody: OpenRouterErrorBody = await response.json();
      errorMsg = `API Error (${response.status}): ${errorBody.error.message}`;
    } catch {}
    throw new Error(errorMsg);
  }
  const data: OpenRouterResponseBody = await response.json();
  return data;
};

/**
 * Creates a new assistant message from an API response and adds it to the message list.
 * Used in the sample for handling successful API responses (non-retry flow).
 */
export const addAssistantMessageFn = (
  { messages }: { messages: Message[] }, // Removed unused retryingId from source
  response: OpenRouterResponseBody
): Message[] => {
  const content = response.choices?.[0]?.message?.content;
  const newMessage: Message = content
    ? {
        id: response.id || crypto.randomUUID(),
        role: "assistant",
        content,
        timestamp: Date.now(),
      }
    : {
        id: response.id || crypto.randomUUID(),
        role: "assistant",
        content: "Error: Empty response",
        timestamp: Date.now(),
      };
  return [...messages, newMessage];
};

/**
 * Prepares the parameters needed to send an API request for a message retry.
 * Determines the correct message history slice based on the role of the message being retried.
 * Used in the sample triggered by the `messageRetry` event.
 */
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
): SendApiRequestParams => {
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

  return {
    modelId: selectedModelId,
    messages: historyToSend,
    apiKey,
    temperature,
    systemPrompt,
  };
};

/**
 * Calculates the payload needed to update the message list after a successful retry API call.
 * Determines the target index and whether to insert or replace the new assistant message.
 * Used in the sample triggered by `apiRequestSuccess` when a retry is in progress.
 */
export const calculateRetryUpdatePayloadFn = (
  payload: {
    // Renamed parameter to 'payload' for clarity
    messages: Message[];
    retryContext: { messageId: string; role: "user" | "assistant" } | null;
    placeholderInfo: { id: string; originalUserId: string } | null; // Added placeholderInfo
  },
  response: OpenRouterResponseBody
): CalculatedRetryUpdatePayload => {
  const { messages, retryContext, placeholderInfo } = payload;

  // If no retry context was captured when the API call succeeded, this wasn't a retry.
  // Return null to indicate no retry-specific update is needed.
  if (!retryContext) {
    return null;
  }

  const { messageId: originalRetryMessageId, role: originalRetryMessageRole } =
    retryContext;

  let newAssistantMessage: Message;
  let targetIndex = -1;
  let insert = false;

  // Check if we are replacing a placeholder created in Scenario 1.2.b
  if (
    placeholderInfo &&
    originalRetryMessageId === placeholderInfo.originalUserId &&
    originalRetryMessageRole === "user" // Double-check role consistency
  ) {
    targetIndex = messages.findIndex((msg) => msg.id === placeholderInfo!.id);
    if (targetIndex === -1) {
      console.error(
        "Placeholder message not found for replacement:",
        placeholderInfo.id
      );
      return null; // Cannot proceed
    }
    insert = false; // We are replacing, not inserting
    newAssistantMessage = {
      // Use the API response ID or generate a new one, DO NOT reuse placeholder ID
      id: response.id || crypto.randomUUID(),
      role: "assistant",
      content:
        response.choices?.[0]?.message?.content ?? "Error: Empty response",
      timestamp: Date.now(),
      isLoading: false, // Mark as no longer loading
    };
  } else {
    // --- Existing logic for other scenarios (assistant retry or user retry -> assistant) ---
    newAssistantMessage = {
      id: crypto.randomUUID(), // Generate a new ID for non-placeholder replacements/insertions
      role: "assistant",
      content:
        response.choices?.[0]?.message?.content ?? "Error: Empty response",
      timestamp: Date.now(),
    };

    // Determine target index based on the role of the *original* message that was retried
    if (originalRetryMessageRole === "assistant") {
      // Retrying an assistant message: Replace the message itself
      targetIndex = messages.findIndex(
        (msg) => msg.id === originalRetryMessageId
      );
    } else if (originalRetryMessageRole === "user") {
      // Retrying a user message: Find the *next* assistant message index to replace, or insert if none
      // (This branch now only handles the case where the next message WAS an assistant)
      const userIndex = messages.findIndex(
        (msg) => msg.id === originalRetryMessageId
      );
      const nextAssistantIndex = messages.findIndex(
        (msg, index) => index > userIndex && msg.role === "assistant"
      );

      if (nextAssistantIndex !== -1) {
        // Found next assistant message to replace
        targetIndex = nextAssistantIndex;
      } else {
        // No next assistant message, insert after the original user message
        // This case *shouldn't* be reached if placeholder logic is correct,
        // but kept as fallback/for clarity. Placeholder logic handles insertion implicitly now.
        targetIndex = userIndex; // Use original index for insertion point
        insert = true;
        console.warn(
          "Insertion case reached in calculateRetryUpdatePayloadFn - check placeholder logic."
        );
      }
    } else {
      // Should not happen
      console.error(
        "Unexpected role for original retried message:",
        originalRetryMessageRole
      );
      return null;
    }
  } // End of the main 'else' block (non-placeholder case)

  // --- Common validation and return ---
  // Validate final targetIndex/insert combination
  if (targetIndex === -1) {
    // Note: insert=true implies targetIndex is the *preceding* user message index, which is valid.
    // So we only fail if targetIndex is -1 AND we weren't inserting based on placeholder logic.
    console.error("Retry logic error: Could not determine target index."); // Restored original message
    return null; // Cannot proceed
  }

  // Redundant validation block removed, handled above

  const result = { targetIndex, newAssistantMessage, insert };
  // Add final validation log
  if (targetIndex === -1) {
    // This check is technically redundant now but kept for safety
    console.error(
      "Retry logic error: Final targetIndex is -1. Returning null."
    ); // Restored original message
    return null;
  }
  return result;
};

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

/**
 * Updates the message list based on a retry action (insert or replace).
 * Used in the sample triggered by `retryUpdate`.
 */
export const updateMessagesOnRetryFn = (
  currentMessages: Message[],
  {
    targetIndex,
    newAssistantMessage,
    insert = false,
  }: {
    targetIndex: number;
    newAssistantMessage: Message;
    insert?: boolean;
  }
): Message[] => {
  if (insert) {
    // Insert the new message after the target index
    const updatedMessages = [...currentMessages];
    if (targetIndex >= -1 && targetIndex < currentMessages.length) {
      updatedMessages.splice(targetIndex + 1, 0, newAssistantMessage);
      return updatedMessages;
    } else {
      console.error(
        "Retry update (insert) received invalid index:",
        targetIndex
      );
      return currentMessages;
    }
  } else if (targetIndex !== -1 && targetIndex < currentMessages.length) {
    // Replace the message at the target index
    return currentMessages.map((msg, index) =>
      index === targetIndex ? newAssistantMessage : msg
    );
  }
  // If index is invalid or insertion wasn't requested
  console.error("Retry update (replace) received invalid index or state.");
  return currentMessages;
};
