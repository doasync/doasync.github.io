// guard is deprecated, use sample instead
import { sample, createDomain, Store } from "effector"; // Added Store import
import { $apiKey, $temperature, $systemPrompt } from "@/features/chat-settings";
import { debug } from "patronum/debug";
import { $selectedModelId } from "@/features/models-select";
import { showApiKeyDialog } from "@/features/ui-state";
import {
  Role,
  Message,
  OpenRouterMessage, // Add missing type
  OpenRouterRequestBody, // Add missing type
  OpenRouterResponseBody,
  OpenRouterErrorBody, // Add missing type
  SendApiRequestParams,
  RetryUpdatePayload,
  CalculatedRetryUpdatePayload,
  MessageRetryInitiatedPayload,
} from "./types"; // Import types

import {
  sendApiRequestFn,
  addAssistantMessageFn,
  prepareRetryRequestParamsFn,
  calculateRetryUpdatePayloadFn,
} from "./lib"; // Import pure functions

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
const retryUpdate = chatDomain.event<RetryUpdatePayload>("retryUpdate");
const messageRetryInitiated = chatDomain.event<MessageRetryInitiatedPayload>(
  "messageRetryInitiated"
);
export const userMessageCreated =
  chatDomain.event<Message>("userMessageCreated");
const prepareRetryParams =
  chatDomain.event<SendApiRequestParams>("prepareRetryParams");
const calculatedRetryUpdate = chatDomain.event<CalculatedRetryUpdatePayload>(
  "calculatedRetryUpdate"
);

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
export const $retryingMessageId = chatDomain
  .store<string | null>(null, { name: "$retryingMessageId" })
  // Reset when messages change (e.g., new chat loaded)
  .reset($messages);

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
  fn: addAssistantMessageFn, // Use extracted function
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

// Type predicate for filtering retryable messages
const isRetryableMessage = (
  message: Message | undefined
): message is Message & { role: "user" | "assistant" } => {
  return !!message && (message.role === "user" || message.role === "assistant");
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
  filter: ({ apiKey }, messageRetried) =>
    apiKey.length > 0 && isRetryableMessage(messageRetried),
  fn: prepareRetryRequestParamsFn, // Use extracted function
  target: prepareRetryParams,
});

// Trigger messageRetryInitiated separately in a declarative way
sample({
  clock: messageRetry,
  filter: (
    messageToRetry
  ): messageToRetry is Message & { role: "user" | "assistant" } => // Type predicate
    messageToRetry.role === "user" || messageToRetry.role === "assistant",
  fn: (messageToRetry): MessageRetryInitiatedPayload => ({
    messageId: messageToRetry.id, // messageToRetry is narrowed here
    role: messageToRetry.role, // messageToRetry is narrowed here
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
  fn: calculateRetryUpdatePayloadFn, // Use extracted function
  target: calculatedRetryUpdate,
});

// Trigger the internal update event only if a valid payload was calculated
sample({
  clock: calculatedRetryUpdate,
  filter: (payload): payload is RetryUpdatePayload => payload !== null,
  target: retryUpdate, // Target the renamed internal event
});

// --- End Retry Logic ---

sample({
  clock: messageSent,
  source: $apiKey,
  filter: (key: string) => key.trim().length === 0,
  target: showApiKeyDialog, // Trigger dialog if API key is missing
});

debug(
  // Stores
  $messageText,
  $messages,
  $isGenerating,
  $apiError,
  $currentChatTokens,
  $retryingMessageId,

  // User-facing events
  messageTextChanged,
  messageSent,
  editMessage,
  deleteMessage,
  retryMessage,
  messageRetry,

  // Internal events
  messageAdded,
  retryUpdate,
  messageRetryInitiated,
  userMessageCreated,
  prepareRetryParams,
  calculatedRetryUpdate,
  apiRequestTokensUpdated,
  apiRequestSuccess,

  // Effects
  sendApiRequestFx
);
