import { sample, createDomain } from "effector";
import { debug } from "patronum/debug";
import { $apiKey, $temperature, $systemPrompt } from "@/features/chat-settings";
import { $selectedModelId } from "@/features/models-select";

import {
  Message,
  OpenRouterResponseBody,
  SendApiRequestParams,
  RetryUpdatePayload,
  CalculatedRetryUpdatePayload,
  MessageRetryInitiatedPayload,
  RequestContext, // Import the new context type
  RequestContextNormal,
  RequestContextGenerate,
  RequestContextRetry,
  Role, // Import Role type
} from "./types";
import {
  sendApiRequestFn,
  addAssistantMessageFn,
  prepareRetryRequestParamsFn,
  calculateRetryUpdatePayloadFn,
  determineRetryingMessageIdFn,
  updateMessagesOnRetryFn,
} from "./lib";

// --- Domain ---
const chatDomain = createDomain("chat");

// --- Events ---

// Public Events
export const messageTextChanged =
  chatDomain.event<string>("messageTextChanged");
export const messageSent = chatDomain.event<void>("messageSent");
export const editMessage = chatDomain.event<{
  messageId: string;
  newContent: string;
}>("editMessage");
export const deleteMessage = chatDomain.event<string>("deleteMessage");
export const messageRetry = chatDomain.event<Message>("messageRetry");
export const initialChatSaveNeeded = chatDomain.event<void>(
  "initialChatSaveNeeded"
);
export const apiKeyMissing = chatDomain.event("apiKeyMissing");
export const apiRequestTokensUpdated = chatDomain.event<OpenRouterResponseBody>(
  "apiRequestTokensUpdated"
);
// export const apiRequestSuccess = chatDomain.event<OpenRouterResponseBody>("apiRequestSuccess"); // REMOVED
export const userMessageCreated =
  chatDomain.event<Message>("userMessageCreated");
export const scrollToLastMessageNeeded = chatDomain.event<void>(
  "scrollToLastMessageNeeded"
);
export const setPreventScroll = chatDomain.event<boolean>("setPreventScroll");
export const generateResponseClicked = chatDomain.event<void>(
  "generateResponseClicked"
);
export const retryUpdate = chatDomain.event<RetryUpdatePayload>("retryUpdate"); // Used for message updates AND save trigger
export const normalResponseProcessed = chatDomain.event<void>(
  "normalResponseProcessed"
); // Explicit trigger for saving normal responses

// Internal Events
const messageRetryInitiated = chatDomain.event<MessageRetryInitiatedPayload>(
  "messageRetryInitiated"
);
const prepareRetryParams =
  chatDomain.event<SendApiRequestParams>("prepareRetryParams"); // Includes context now
const calculatedRetryUpdate = chatDomain.event<CalculatedRetryUpdatePayload>(
  "calculatedRetryUpdate"
); // Result of calculation
const addPlaceholderForGeneration = chatDomain.event<void>(
  "addPlaceholderForGeneration"
);
const placeholderGenerated = chatDomain.event<Message>("placeholderGenerated"); // Carries the placeholder message

// REMOVED: retryTriggered, placeholderCalculated, cleanupAfterUpdate

// --- Effects ---
export const sendApiRequestFx = chatDomain.effect<
  SendApiRequestParams,
  OpenRouterResponseBody,
  Error
>({
  name: "sendApiRequestFx",
  handler: sendApiRequestFn,
});

// --- Stores ---
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
export const $retryingMessageId = chatDomain.store<string | null>(null, {
  name: "$retryingMessageId",
}); // For spinner
export const $preventScroll = chatDomain.store<boolean>(false, {
  name: "$preventScroll",
});

export const $scrollTrigger = chatDomain
  .store<number>(0, { name: "$scrollTrigger" })
  .on(scrollToLastMessageNeeded, () => Date.now());

// --- Helper Functions / Type Guards ---
const isRetryableMessage = (
  message: Message | undefined
): message is Message & { role: "user" | "assistant" } => {
  return !!message && (message.role === "user" || message.role === "assistant");
};

// --- Store Updates (.on/.reset) ---

$messageText.on(messageTextChanged, (_, text) => text);

$messages
  .on(editMessage, (list, { messageId, newContent }) =>
    list.map((msg) =>
      msg.id === messageId
        ? {
            ...msg,
            content: newContent,
            isEdited: true,
            originalContent: msg.content,
          }
        : msg
    )
  )
  .on(deleteMessage, (list, id) => list.filter((msg) => msg.id !== id))
  .on(userMessageCreated, (messages, newMsg) => [...messages, newMsg])
  .on(placeholderGenerated, (messages, placeholder) => [
    ...messages,
    placeholder,
  ])
  // .on(placeholderCalculated, (_, payload) => payload.updatedMessages) // REMOVED
  .on(retryUpdate, (currentMessages, payload) =>
    updateMessagesOnRetryFn(currentMessages, payload)
  )
  .on(sendApiRequestFx.done, (messages, { params, result: response }) => {
    // Add assistant message ONLY if it was a normal request
    if (params.requestContext?.type === "normal") {
      return addAssistantMessageFn({ messages }, response);
    }
    return messages;
  });

$apiError.reset(messageSent, generateResponseClicked, messageRetry); // Removed apiRequestSuccess

$isGenerating.on(sendApiRequestFx, () => true).reset(sendApiRequestFx.finally);

$currentChatTokens.on(
  sendApiRequestFx.doneData,
  (currentTokens, response) =>
    currentTokens + (response.usage?.total_tokens ?? 0)
);

$retryingMessageId
  .on(messageRetryInitiated, (_, payload) => {
    const messages = $messages.getState();
    if (payload.role === "assistant") return payload.messageId;
    return determineRetryingMessageIdFn(messages, payload);
  })
  .on(placeholderGenerated, (_, placeholder) => placeholder.id)
  .reset(sendApiRequestFx.finally);

$preventScroll
  .on([editMessage], () => true)
  .on([messageRetryInitiated, generateResponseClicked], () => false)
  .on(sendApiRequestFx.finally, (current, _) => {
    // Use underscore for unused 'payload'
    const spinnerId = $retryingMessageId.getState();
    return spinnerId !== null ? false : current;
  });

// --- Samples (Flow Logic) ---

// Create a new user message object when message is sent
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

// Clear message input after sending
sample({ clock: userMessageCreated, fn: () => "", target: $messageText });

// Trigger initial save if this is the first message
sample({
  clock: userMessageCreated,
  source: $messages,
  filter: (msgs) => msgs.length === 1,
  target: initialChatSaveNeeded,
});

// Trigger API request for a NEW user message (Normal Context)
sample({
  clock: userMessageCreated,
  source: {
    messages: $messages,
    apiKey: $apiKey,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
  },
  filter: ({ apiKey }) => !!apiKey,
  fn: ({
    messages,
    apiKey,
    temperature,
    systemPrompt,
    selectedModelId,
  }): SendApiRequestParams => ({
    modelId: selectedModelId,
    messages,
    apiKey,
    temperature,
    systemPrompt,
    requestContext: { type: "normal" }, // Add normal context
  }),
  target: sendApiRequestFx,
});

// Trigger API key missing event if message sent without key
sample({
  clock: messageSent,
  source: $apiKey,
  filter: (key) => !key,
  target: apiKeyMissing,
});

// --- Generate Response Logic ---

// Trigger placeholder creation for generation
sample({
  clock: generateResponseClicked,
  source: $isGenerating,
  filter: (isGen) => !isGen,
  target: addPlaceholderForGeneration,
});

// Create the placeholder message
sample({
  clock: addPlaceholderForGeneration,
  fn: (): Message => ({
    id: crypto.randomUUID(),
    role: "assistant",
    content: "",
    timestamp: Date.now(),
    isLoading: true,
  }),
  target: placeholderGenerated,
});

// Trigger API request for GENERATE action
sample({
  clock: placeholderGenerated, // Trigger *after* placeholder is created
  source: {
    messages: $messages,
    apiKey: $apiKey,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
  },
  filter: ({ apiKey, messages }) => !!apiKey && messages.length > 0,
  fn: (
    { messages, apiKey, temperature, systemPrompt, selectedModelId },
    placeholder
  ): SendApiRequestParams => ({
    modelId: selectedModelId,
    messages: messages.slice(0, -1), // Exclude the placeholder from history
    apiKey,
    temperature,
    systemPrompt,
    requestContext: { type: "generate", placeholderId: placeholder.id }, // Pass context
  }),
  target: sendApiRequestFx,
});

// Trigger API key missing event if generate clicked without key
sample({
  clock: generateResponseClicked,
  source: $apiKey,
  filter: (key) => !key,
  target: apiKeyMissing,
});

// --- Retry Logic Flow ---

// Prepare API params and context for RETRY action
sample({
  clock: messageRetry,
  source: {
    messages: $messages,
    apiKey: $apiKey,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
  },
  filter: ({ apiKey }, messageRetried): messageRetried is Message =>
    !!apiKey && isRetryableMessage(messageRetried), // Use type predicate in filter
  fn: (
    { messages, apiKey, temperature, systemPrompt, selectedModelId },
    messageRetried
  ): SendApiRequestParams => {
    // Return type is non-nullable now
    // Prepare base params (history slice)
    const baseParams = prepareRetryRequestParamsFn(
      { messages, apiKey, temperature, systemPrompt, selectedModelId },
      messageRetried
    );

    // Determine context
    const context: RequestContextRetry = {
      type: "retry",
      originalMessageId: messageRetried.id,
      originalRole: messageRetried.role as Role & ("user" | "assistant"), // Type assertion still needed after filter
    };

    return { ...baseParams, requestContext: context };
  },
  target: prepareRetryParams,
});

// Trigger spinner update event for retry
sample({
  clock: messageRetry,
  filter: isRetryableMessage,
  fn: (messageToRetry): MessageRetryInitiatedPayload => ({
    messageId: messageToRetry.id,
    role: messageToRetry.role as Role & ("user" | "assistant"),
  }),
  target: messageRetryInitiated,
});

// Trigger the API request effect for retry
sample({ clock: prepareRetryParams, target: sendApiRequestFx }); // No need to filter null here if fn always returns SendApiRequestParams

// --- Common Post-API Logic ---

// Calculate how to update message list after API success (handles retry & generation)
sample({
  clock: sendApiRequestFx.done,
  source: $messages, // Only need current messages state here
  fn: (
    messages,
    { params, result: response } // Get context from effect params
  ) =>
    calculateRetryUpdatePayloadFn(
      // Ensure the first argument is an object matching the expected type in lib.ts
      { messages: messages, requestContext: params.requestContext },
      response
    ),
  target: calculatedRetryUpdate,
});

// Trigger the actual message list update if calculation was successful
sample({
  clock: calculatedRetryUpdate,
  filter: (payload): payload is RetryUpdatePayload => {
    const shouldTrigger = payload !== null;
    console.log("[DEBUG] sample targeting retryUpdate:", {
      calculatedPayload: payload,
      shouldTrigger,
    }); // DEBUG
    return shouldTrigger;
  },
  target: retryUpdate,
});

// Trigger explicit save event for NORMAL responses *after* message list is updated
sample({
  clock: sendApiRequestFx.done,
  filter: ({ params }) => params.requestContext?.type === "normal",
  target: normalResponseProcessed, // Trigger save for normal flow
});

// Forward successful API response data to apiRequestTokensUpdated event
sample({ clock: sendApiRequestFx.doneData, target: apiRequestTokensUpdated });

// Trigger scroll after assistant reply is added/replaced (retry or generate) OR normal response added
sample({
  clock: [retryUpdate, normalResponseProcessed],
  fn: () => undefined,
  target: scrollToLastMessageNeeded,
});

// --- Debug ---
debug(
  // Stores
  $messageText,
  $messages,
  $isGenerating,
  $apiError,
  $currentChatTokens,
  $retryingMessageId,
  $preventScroll,
  // REMOVED: $retryContext, $placeholderInfo, $generatingPlaceholderId

  // User-facing events
  messageTextChanged,
  messageSent,
  editMessage,
  deleteMessage,
  messageRetry,
  generateResponseClicked,
  setPreventScroll,

  // Internal events
  // messageAdded, // Likely redundant
  retryUpdate, // Keep for history trigger
  messageRetryInitiated,
  userMessageCreated,
  scrollToLastMessageNeeded,
  prepareRetryParams,
  calculatedRetryUpdate,
  apiRequestTokensUpdated,
  // apiRequestSuccess, // REMOVED
  initialChatSaveNeeded,
  // retryTriggered, // REMOVED
  // placeholderCalculated, // REMOVED
  addPlaceholderForGeneration,
  placeholderGenerated,
  // cleanupAfterUpdate, // REMOVED
  normalResponseProcessed, // Added explicit save trigger

  // Effects
  sendApiRequestFx
);
