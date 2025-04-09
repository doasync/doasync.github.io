import {
  Message,
  OpenRouterMessage,
  OpenRouterRequestBody,
  OpenRouterResponseBody,
  OpenRouterErrorBody,
  SendApiRequestParams,
  CalculatedRetryUpdatePayload,
  MessageRetryInitiatedPayload,
  RequestContext, // <-- Import RequestContext
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
): Omit<SendApiRequestParams, "requestContext"> => {
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

/**
 * Calculates the payload needed to update the message list after a successful retry API call.
 * Determines the target index and whether to insert or replace the new assistant message.
 * Used in the sample triggered by `apiRequestSuccess` when a retry is in progress.
 */
export const calculateRetryUpdatePayloadFn = (
  payload: {
    // This object contains the necessary data from the sample's source/params
    messages: Message[];
    requestContext: RequestContext | null; // Use the explicit context passed in params
  },
  response: OpenRouterResponseBody
): CalculatedRetryUpdatePayload => {
  const { messages, requestContext } = payload; // Destructure messages and context

  // --- Determine action based on context ---
  let newAssistantMessage: Message;
  let targetIndex = -1;
  let insert = false; // Default to replacement

  // Case 1: Generating a new response
  if (requestContext?.type === "generate") {
    targetIndex = messages.findIndex(
      (msg) => msg.id === requestContext.placeholderId
    );
    if (targetIndex === -1) {
      console.error(
        "Generating placeholder message not found for replacement:",
        requestContext.placeholderId
      );
      return null;
    }
    insert = false; // Replacing the placeholder
    newAssistantMessage = {
      id: response.id || crypto.randomUUID(),
      role: "assistant",
      content:
        response.choices?.[0]?.message?.content ?? "Error: Empty response",
      timestamp: Date.now(),
      isLoading: false,
    };
    console.log(
      "[DEBUG][lib] calculateRetryUpdatePayloadFn: GENERATE FLOW RETURNING:",
      { targetIndex, newAssistantMessageId: newAssistantMessage.id, insert }
    ); // DEBUG
    console.log(
      "[DEBUG] calculateRetryUpdatePayloadFn: GENERATE FLOW RETURNING:",
      { targetIndex, newAssistantMessage, insert }
    ); // DEBUG

    // Case 2: Handling a retry
  } else if (requestContext?.type === "retry") {
    const { originalMessageId, originalRole } = requestContext;

    // Create the new message content first
    newAssistantMessage = {
      id: response.id || crypto.randomUUID(), // Use response ID if available
      role: "assistant",
      content:
        response.choices?.[0]?.message?.content ?? "Error: Empty response",
      timestamp: Date.now(),
    };

    if (originalRole === "assistant") {
      // Replace the original assistant message itself
      targetIndex = messages.findIndex((msg) => msg.id === originalMessageId);
    } else if (originalRole === "user") {
      // Find the *next* assistant message to replace
      const userIndex = messages.findIndex(
        (msg) => msg.id === originalMessageId
      );
      if (userIndex === -1) {
        console.error(
          "Original user message for retry not found:",
          originalMessageId
        );
        return null;
      }
      const nextAssistantIndex = messages.findIndex(
        (msg, index) => index > userIndex && msg.role === "assistant"
      );
      if (nextAssistantIndex !== -1) {
        targetIndex = nextAssistantIndex;
        insert = false; // Replace next assistant
      } else {
        // No assistant message found after retried user message
        // Insert new assistant message immediately after the user message
        targetIndex = userIndex;
        insert = true;
        console.log(
          "[calculateRetryUpdatePayloadFn] No assistant after retried user message, inserting new assistant message after user:",
          originalMessageId
        );
      }
    } else {
      console.error("Unexpected original role in retry context:", originalRole);
      return null;
    }
    // Case 3: Normal request - no update calculation needed here
  } else {
    // This function should only be called with 'generate' or 'retry' context
    // If called with 'normal' or null, something is wrong in the model logic.
    console.error(
      "calculateRetryUpdatePayloadFn called with unexpected context:",
      requestContext
    );
    return null;
  }

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
  } else if (targetIndex === currentMessages.length) {
    // Special case: replace at end (e.g., placeholder is last message)
    const updatedMessages = [...currentMessages];
    updatedMessages[updatedMessages.length - 1] = newAssistantMessage;
    return updatedMessages;
  }
  console.error("Retry update (replace) received invalid index or state.");
  return currentMessages;
};
