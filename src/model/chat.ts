// guard is deprecated, use sample instead
import { sample, createDomain } from "effector";
import { $apiKey, $temperature, $systemPrompt } from "./settings";
import { debug } from "patronum/debug";
import { $selectedModelId } from "./models";
import { showApiKeyDialog } from "@/model/ui";

// Types
export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string | any;
  timestamp: number;
  isEdited?: boolean;
  originalContent?: string | any;
}

interface OpenRouterMessage {
  role: Role;
  content: string | any;
}

interface OpenRouterRequestBody {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
}

interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenRouterResponseChoice {
  finish_reason: string;
  message: OpenRouterMessage;
}

export interface OpenRouterResponseBody {
  id: string;
  model: string;
  choices: OpenRouterResponseChoice[];
  usage: OpenRouterUsage;
}

interface OpenRouterErrorBody {
  error: {
    code: number;
    message: string;
  };
}

export interface SendApiRequestParams {
  modelId: string;
  messages: Message[];
  apiKey: string;
  temperature: number;
  systemPrompt: string;
}

// Pure functions
const sendApiRequestFn = async ({
  modelId,
  messages,
  apiKey,
  temperature,
  systemPrompt,
}: SendApiRequestParams) => {
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

// Domain
const chatDomain = createDomain("chat");

// Events
export const messageTextChanged =
  chatDomain.event<string>("messageTextChanged");
export const messageSent = chatDomain.event<void>("messageSent");
export const editMessage = chatDomain.event<{
  // Note: This might be redundant now
  messageId: string;
  newContent: string;
}>("editMessage");
export const deleteMessage = chatDomain.event<string>("deleteMessage");
export const retryMessage = chatDomain.event<string>("retryMessage"); // Keep original retryMessage for now
export const messageRetry = chatDomain.event<Message>("messageRetry"); // New event for retry logic

export const initialChatSaveNeeded = chatDomain.event<void>(
  "initialChatSaveNeeded"
);
export const apiRequestTokensUpdated = chatDomain.event<OpenRouterResponseBody>(
  "apiRequestTokensUpdated"
);
export const apiRequestSuccess =
  chatDomain.event<OpenRouterResponseBody>("apiRequestSuccess");

// Internal events
const messageAdded = chatDomain.event<Message>("messageAdded"); // Used by normal API response
// Renamed for clarity
const retryUpdate = chatDomain.event<{
  targetIndex: number;
  newAssistantMessage: Message;
  insert?: boolean; // Flag to indicate insertion instead of replacement
}>("retryUpdate");
const messageRetryInitiated = chatDomain.event<{
  messageId: string;
  role: Role;
}>("messageRetryInitiated");
const userMessageCreated = chatDomain.event<Message>("userMessageCreated");
const prepareRetryParams =
  chatDomain.event<SendApiRequestParams>("prepareRetryParams");
const calculatedRetryUpdate = chatDomain.event<{
  targetIndex: number;
  newAssistantMessage: Message;
  insert?: boolean;
} | null>("calculatedRetryUpdate");

// Effects
export const sendApiRequestFx = chatDomain.effect<
  SendApiRequestParams,
  OpenRouterResponseBody,
  Error
>({
  name: "sendApiRequestFx",
  handler: sendApiRequestFn,
});

// Stores
export const $messageText = chatDomain.store<string>("", {
  name: "$messageText",
});
export const $messages = chatDomain.store<Message[]>([], { name: "$messages" });
export const $isGenerating = chatDomain.store<boolean>(false, {
  name: "$isGenerating",
});
export const $currentChatTokens = chatDomain.store<number>(0, {
  name: "$currentChatTokens",
});
export const $apiError = chatDomain.store<string | null>(null, {
  name: "$apiError",
});
export const $retryingMessageId = chatDomain // Added export
  .store<string | null>(null, { name: "$retryingMessageId" })
  .on(messageRetryInitiated, (_, { messageId }) => messageId)
  .reset(sendApiRequestFx.finally); // Now sendApiRequestFx is declared

// Logic
$messageText.on(messageTextChanged, (_, text) => text);

$messages
  .on(editMessage, (list, { messageId, newContent }) =>
    list.map((msg) =>
      msg.id === messageId
        ? {
            ...msg,
            content: newContent, // Update content directly
            isEdited: true,
            originalContent: msg.content, // Store original before update
          }
        : msg
    )
  )
  .on(deleteMessage, (list, id) => list.filter((msg) => msg.id !== id))
  // Add new handler for the internal retry update event
  .on(
    retryUpdate,
    (currentMessages, { targetIndex, newAssistantMessage, insert = false }) => {
      if (insert) {
        // Insert the new message after the target index (which is the original user message index)
        const updatedMessages = [...currentMessages];
        // Ensure targetIndex + 1 is valid before splicing
        if (targetIndex >= -1 && targetIndex < currentMessages.length) {
          updatedMessages.splice(targetIndex + 1, 0, newAssistantMessage);
          return updatedMessages;
        } else {
          console.error(
            "Retry update handler received invalid insert index:",
            targetIndex
          );
          return currentMessages; // Return original on invalid index
        }
      } else if (targetIndex !== -1 && targetIndex < currentMessages.length) {
        // Replace the message at the target index
        return currentMessages.map((msg, index) =>
          index === targetIndex ? newAssistantMessage : msg
        );
      }
      // If index is invalid or insertion wasn't requested, return current state
      console.error("Retry update handler received invalid index or state.");
      return currentMessages;
    }
  );

$apiError.reset(messageSent);

$isGenerating.on(sendApiRequestFx, () => true).reset(sendApiRequestFx.finally);

// Reset error on API success
$apiError.reset(apiRequestSuccess);

// Flow

sample({
  clock: messageSent,
  source: $messageText,
  filter: (text) => text.trim().length > 0,
  fn: (text): Message => ({
    id: crypto.randomUUID(),
    role: "user",
    content: text.trim(),
    timestamp: Date.now(),
  }),
  target: userMessageCreated,
});

sample({
  clock: userMessageCreated,
  source: $messages,
  fn: (messages, newMsg) => [...messages, newMsg],
  target: $messages, // Use $messages store directly
});

sample({
  clock: userMessageCreated,
  source: $messages,
  filter: (msgs) => msgs.length === 0,
  target: initialChatSaveNeeded,
});

// Trigger API request on new user message
sample({
  clock: userMessageCreated,
  source: {
    messages: $messages,
    apiKey: $apiKey,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
  },
  filter: ({ apiKey }) => apiKey.length > 0,
  fn: (
    { messages, apiKey, temperature, systemPrompt, selectedModelId },
    userMsg
  ): SendApiRequestParams => ({
    // Ensure return type matches target
    modelId: selectedModelId,
    messages: [...messages, userMsg], // Send current + new user message
    apiKey,
    temperature,
    systemPrompt,
  }),
  target: sendApiRequestFx,
});

sample({
  clock: userMessageCreated,
  fn: () => "",
  target: $messageText,
});

// API response success event
sample({
  clock: sendApiRequestFx.doneData,
  target: apiRequestSuccess,
});

// Add assistant message on successful API response (for normal flow, not retry)
sample({
  clock: apiRequestSuccess, // This is sendApiRequestFx.doneData
  source: { messages: $messages, retryingId: $retryingMessageId },
  // Filter remains crucial: only run this append logic if NOT retrying.
  filter: ({ retryingId }) => retryingId === null,
  fn: ({ messages, retryingId }, response): Message[] => {
    // Double-check inside fn as an extra safeguard, though filter should prevent this.
    if (retryingId !== null) {
      console.warn("Append logic triggered unexpectedly during retry flow.");
      return messages; // Return original state if somehow triggered during retry
    }

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
  },
  target: $messages,
});

// Update token count and emit update event
sample({
  clock: apiRequestSuccess,
  source: $currentChatTokens,
  fn: (currentTokens, response) =>
    currentTokens + (response.usage?.total_tokens ?? 0),
  target: $currentChatTokens,
});

sample({
  clock: apiRequestSuccess,
  fn: (response) => response,
  target: apiRequestTokensUpdated,
});

// API failure
sample({
  clock: sendApiRequestFx.failData,
  fn: (error) => error.message,
  target: $apiError,
});

// --- Retry Logic ---

// Define a type predicate to check if a message is retryable
const isRetryableMessage = (
  message: Message
): message is Message & { role: "user" | "assistant" } => {
  return message.role === "user" || message.role === "assistant";
};

// Prepare parameters for the API request when retry is triggered
sample({
  clock: messageRetry,
  source: {
    messages: $messages,
    apiKey: $apiKey,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
  },
  // Filter out system messages and ensure API key exists
  filter: ({ apiKey }, messageToRetry) =>
    apiKey.length > 0 && isRetryableMessage(messageToRetry),
  fn: (
    { messages, apiKey, temperature, systemPrompt, selectedModelId },
    messageToRetry // Type is narrowed by the filter
  ): SendApiRequestParams => {
    const retryIndex = messages.findIndex(
      (msg) => msg.id === messageToRetry.id
    );

    if (retryIndex === -1) {
      throw "Message to retry not found: " + messageToRetry.id;
    }

    let historyToSend: Message[];
    if (messageToRetry.role === "user") {
      historyToSend = messages.slice(0, retryIndex + 1);
    } else {
      // Retrying an assistant message
      let precedingUserIndex = -1;
      for (let i = retryIndex - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          precedingUserIndex = i;
          break;
        }
      }
      if (precedingUserIndex === -1) {
        console.error(
          "Could not find preceding user message for retry:",
          messageToRetry.id
        );
        historyToSend = [];
      } else {
        historyToSend = messages.slice(0, precedingUserIndex + 1);
      }
    }

    return {
      modelId: selectedModelId,
      messages: historyToSend,
      apiKey,
      temperature,
      systemPrompt,
    };
  },
  target: prepareRetryParams,
});

// Trigger messageRetryInitiated separately in a declarative way
sample({
  clock: messageRetry,
  filter: (messageToRetry) =>
    messageToRetry.role === "user" || messageToRetry.role === "assistant",
  fn: (messageToRetry): { messageId: string; role: Role } => ({
    messageId: messageToRetry.id,
    role: messageToRetry.role,
  }),
  target: messageRetryInitiated,
});

// Trigger the API request only if parameters were successfully prepared
sample({
  clock: prepareRetryParams,
  filter: (params): params is SendApiRequestParams => params !== null,
  target: sendApiRequestFx,
});

// Handle successful retry response
// Calculate retry update payload and trigger internal event
sample({
  clock: apiRequestSuccess,
  source: { messages: $messages, retryingMessageId: $retryingMessageId },
  filter: ({ retryingMessageId }) => retryingMessageId !== null, // Only process if a retry was initiated
  fn: (
    { messages, retryingMessageId },
    response
  ): {
    targetIndex: number;
    newAssistantMessage: Message;
    insert?: boolean;
  } | null => {
    const originalMessageIndex = messages.findIndex(
      (msg) => msg.id === retryingMessageId
    );

    if (originalMessageIndex === -1) {
      console.error(
        "Original retried message not found after API response:",
        retryingMessageId
      );
      return null; // Cannot proceed
    }

    const originalMessage = messages[originalMessageIndex];

    const newAssistantMessage: Message = {
      id: crypto.randomUUID(), // Ensure a unique ID for the new message
      role: "assistant",
      content:
        response.choices?.[0]?.message?.content ?? "Error: Empty response",
      timestamp: Date.now(),
    };

    let targetIndex = -1;
    let insert = false;

    if (originalMessage.role === "user") {
      // If retrying a user message, find the *next* assistant message index
      const nextAssistantIndex = messages.findIndex(
        (msg, index) => index > originalMessageIndex && msg.role === "assistant"
      );
      if (nextAssistantIndex !== -1) {
        // Found next assistant message to replace
        targetIndex = nextAssistantIndex;
      } else {
        // No next assistant message, insert after the original user message
        targetIndex = originalMessageIndex; // Use original index for insertion point
        insert = true;
      }
    } else {
      // If retrying an assistant message, replace the message itself
      targetIndex = originalMessageIndex;
    }

    if (targetIndex === -1 && !insert) {
      console.error(
        "Retry logic error: Could not determine target index for assistant retry."
      );
      return null; // Cannot proceed
    }

    return { targetIndex, newAssistantMessage, insert };
  },
  target: calculatedRetryUpdate,
});

// Trigger the internal update event only if a valid payload was calculated
sample({
  clock: calculatedRetryUpdate,
  filter: (
    payload
  ): payload is {
    targetIndex: number;
    newAssistantMessage: Message;
    insert?: boolean;
  } => payload !== null,
  target: retryUpdate, // Target the renamed internal event
});

// --- End Retry Logic ---

sample({
  clock: messageSent,
  source: $apiKey,
  filter: (key) => key.trim().length === 0,
  target: showApiKeyDialog, // Trigger dialog if API key is missing
});

debug(
  $messageText,
  $messages,
  $isGenerating,
  $apiError,
  $currentChatTokens,
  messageTextChanged,
  messageSent,
  editMessage,
  deleteMessage,
  messageRetry,
  sendApiRequestFx
);
