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

// Public Events (triggered by UI or other features)
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
export const apiRequestSuccess =
  chatDomain.event<OpenRouterResponseBody>("apiRequestSuccess");
export const userMessageCreated =
  chatDomain.event<Message>("userMessageCreated");
// export const scrollToBottomNeeded = chatDomain.event<void>("scrollToBottomNeeded"); // REMOVED
export const scrollToLastMessageNeeded = chatDomain.event<void>(
  "scrollToLastMessageNeeded"
); // Scroll after assistant reply added/updated
export const setPreventScroll = chatDomain.event<boolean>("setPreventScroll");
export const generateResponseClicked = chatDomain.event<void>(
  "generateResponseClicked"
); // New event

// Internal Events (used within this model)
const messageAdded = chatDomain.event<Message>("messageAdded");
export const retryUpdate = chatDomain.event<RetryUpdatePayload>("retryUpdate");
const messageRetryInitiated = chatDomain.event<MessageRetryInitiatedPayload>(
  "messageRetryInitiated"
);
const retryTriggered = chatDomain.event<{
  messageId: string;
  role: "user" | "assistant";
}>("retryTriggered");
const prepareRetryParams =
  chatDomain.event<SendApiRequestParams>("prepareRetryParams");
const calculatedRetryUpdate = chatDomain.event<CalculatedRetryUpdatePayload>(
  "calculatedRetryUpdate"
);
const addPlaceholderForGeneration = chatDomain.event<void>(
  "addPlaceholderForGeneration"
);
const placeholderGenerated = chatDomain.event<Message>("placeholderGenerated");
const placeholderCalculated = chatDomain.event<{
  updatedMessages: Message[];
  placeholderInfo: { id: string; originalUserId: string };
}>("placeholderCalculated");

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
  name: "$retryingMessageId", // Used for showing spinner during retry OR generate
});
export const $preventScroll = chatDomain
  .store<boolean>(false, { name: "$preventScroll" })
  .on(setPreventScroll, (_, value) => value);

// Store the context of the message that triggered the current retry
export const $retryContext = chatDomain
  .store<{ messageId: string; role: "user" | "assistant" } | null>(null, {
    name: "$retryContext",
  })
  .on(retryTriggered, (_, payload) => payload)
  .reset(calculatedRetryUpdate); // Reset after calculation is done

// Store placeholder info when retrying user message followed by another user message
export const $placeholderInfo = chatDomain
  .store<{ id: string; originalUserId: string } | null>(null, {
    name: "$placeholderInfo",
  })
  .on(placeholderCalculated, (_, payload) => payload.placeholderInfo) // Set when calculated
  .reset(sendApiRequestFx.finally); // Reset after API call

// Store the ID of the placeholder created specifically for generation
const $generatingPlaceholderId = chatDomain
  .store<string | null>(null)
  .on(placeholderGenerated, (_, placeholder) => placeholder.id)
  .reset(sendApiRequestFx.finally); // Reset after API call

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
  // Add new user message
  .on(userMessageCreated, (messages, newMsg) => [...messages, newMsg])
  // Add placeholder for generation
  .on(placeholderGenerated, (messages, placeholder) => [
    ...messages,
    placeholder,
  ])
  // Add placeholder for retry
  .on(placeholderCalculated, (_, payload) => payload.updatedMessages)
  // Update messages after retry/generation calculation
  .on(retryUpdate, (currentMessages, payload) =>
    updateMessagesOnRetryFn(currentMessages, payload)
  )
  // Add assistant message in non-retry/non-generate flow
  .on(sendApiRequestFx.done, (messages, { result: response }) => {
    // Check conditions *before* potentially adding
    const retryCtx = $retryContext.getState();
    const genPlaceholderId = $generatingPlaceholderId.getState();
    if (retryCtx === null && genPlaceholderId === null) {
      return addAssistantMessageFn({ messages }, response);
    }
    return messages; // Return unchanged messages if it was a retry or generation
  });

$apiError.reset(
  messageSent,
  generateResponseClicked,
  messageRetry,
  apiRequestSuccess
);

$isGenerating.on(sendApiRequestFx, () => true).reset(sendApiRequestFx.finally);

$currentChatTokens.on(
  sendApiRequestFx.doneData,
  (currentTokens, response) =>
    currentTokens + (response.usage?.total_tokens ?? 0)
);

$retryingMessageId
  .on(messageRetryInitiated, (_, payload) => {
    // Determine spinner target for retry
    const messages = $messages.getState();
    const placeholderInfo = $placeholderInfo.getState();
    if (
      placeholderInfo &&
      payload.messageId === placeholderInfo.originalUserId
    ) {
      return placeholderInfo.id;
    }
    return determineRetryingMessageIdFn(messages, payload);
  })
  .on(placeholderGenerated, (_, placeholder) => placeholder.id) // Set spinner target for generation
  .reset(sendApiRequestFx.finally); // Reset spinner after API call finishes

$preventScroll
  .on([editMessage, messageRetryInitiated, generateResponseClicked], () => true) // Prevent scroll on these actions
  .on(sendApiRequestFx.finally, (current, _) => {
    // Allow scroll again *if* we were previously showing a spinner
    const spinnerId = $retryingMessageId.getState();
    return spinnerId !== null ? false : current; // Only change to false if spinner was active
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
sample({
  clock: userMessageCreated,
  fn: () => "",
  target: $messageText,
});

// Trigger initial save if this is the first message
sample({
  clock: userMessageCreated,
  source: $messages,
  filter: (msgs) => msgs.length === 1,
  target: initialChatSaveNeeded,
});

// Trigger API request when a user message is created
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
    messages: messages, // $messages already includes the new userMsg
    apiKey,
    temperature,
    systemPrompt,
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

// Trigger API request when generateResponseClicked is called
sample({
  clock: generateResponseClicked,
  source: {
    messages: $messages,
    apiKey: $apiKey,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
    isGenerating: $isGenerating,
  },
  filter: ({ apiKey, messages, isGenerating }) =>
    !!apiKey && messages.length > 0 && !isGenerating,
  fn: ({
    messages,
    apiKey,
    temperature,
    systemPrompt,
    selectedModelId,
  }): SendApiRequestParams => ({
    modelId: selectedModelId,
    messages: messages, // Send the current messages
    apiKey,
    temperature,
    systemPrompt,
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
  source: $messages, // Source messages to ensure it runs after potential updates
  fn: (): Message => ({
    id: crypto.randomUUID(),
    role: "assistant",
    content: "",
    timestamp: Date.now(),
    isLoading: true,
  }),
  target: placeholderGenerated,
});

// --- Retry Logic Flow ---

// Type predicate for filtering retryable messages
const isRetryableMessage = (
  message: Message | undefined
): message is Message & { role: "user" | "assistant" } => {
  return !!message && (message.role === "user" || message.role === "assistant");
};

// Calculate placeholder data for user retry -> user/end scenario
sample({
  clock: messageRetry,
  source: $messages,
  filter: (messages, messageToRetry): boolean => {
    if (!isRetryableMessage(messageToRetry) || messageToRetry.role !== "user") {
      return false;
    }
    const retryIndex = messages.findIndex(
      (msg) => msg.id === messageToRetry.id
    );
    if (retryIndex === -1) return false;
    const nextMessage = messages[retryIndex + 1];
    return !nextMessage || nextMessage.role === "user";
  },
  fn: (
    messages,
    messageToRetry
  ): {
    updatedMessages: Message[];
    placeholderInfo: { id: string; originalUserId: string };
  } => {
    const tempId = crypto.randomUUID();
    const placeholderMessage: Message = {
      id: tempId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isLoading: true,
    };
    const retryIndex = messages.findIndex(
      (msg) => msg.id === messageToRetry.id
    );
    const updatedMessages = [
      ...messages.slice(0, retryIndex + 1),
      placeholderMessage,
      ...messages.slice(retryIndex + 1),
    ];
    return {
      updatedMessages,
      placeholderInfo: { id: tempId, originalUserId: messageToRetry.id },
    };
  },
  target: placeholderCalculated, // Target the helper event
});

// Store original retry context
sample({
  clock: messageRetry,
  filter: isRetryableMessage,
  fn: (messageToRetry) => ({
    messageId: messageToRetry.id,
    role: messageToRetry.role,
  }),
  target: retryTriggered,
});

// Prepare API params for retry
sample({
  clock: messageRetry,
  source: {
    messages: $messages,
    apiKey: $apiKey,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
  },
  filter: ({ apiKey }, messageRetried) =>
    !!apiKey && isRetryableMessage(messageRetried),
  fn: prepareRetryRequestParamsFn,
  target: prepareRetryParams,
});

// Trigger spinner update event for retry
sample({
  clock: messageRetry,
  filter: isRetryableMessage,
  fn: (messageToRetry): MessageRetryInitiatedPayload => ({
    messageId: messageToRetry.id,
    role: messageToRetry.role,
  }),
  target: messageRetryInitiated,
});

// Trigger the API request effect for retry
sample({
  clock: prepareRetryParams,
  filter: (params): params is SendApiRequestParams => params !== null,
  target: sendApiRequestFx,
});

// --- Common Post-API Logic ---

// Calculate how to update message list after API success (handles retry & generation)
sample({
  clock: sendApiRequestFx.done,
  source: {
    messages: $messages,
    retryContext: $retryContext,
    placeholderInfo: $placeholderInfo,
    generatingPlaceholderId: $generatingPlaceholderId,
  },
  fn: (
    { messages, retryContext, placeholderInfo, generatingPlaceholderId },
    { result: response }
  ) =>
    calculateRetryUpdatePayloadFn(
      { messages, retryContext, placeholderInfo, generatingPlaceholderId },
      response
    ),
  target: calculatedRetryUpdate,
});

// Trigger the message list update if calculation was successful
sample({
  clock: calculatedRetryUpdate,
  filter: (payload): payload is RetryUpdatePayload => payload !== null,
  target: retryUpdate, // Use retryUpdate for both retry and generation updates
});

// Forward successful API response data to apiRequestTokensUpdated event
sample({
  clock: sendApiRequestFx.doneData,
  target: apiRequestTokensUpdated,
});

// Trigger scroll after assistant reply is added/replaced
sample({
  clock: [retryUpdate, placeholderGenerated], // Trigger after update OR placeholder generation
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
  $retryingMessageId, // Spinner state
  $retryContext, // Original retry context
  $placeholderInfo, // Added placeholder store
  $generatingPlaceholderId, // Added generation placeholder ID store
  $preventScroll, // Added preventScroll store to debug

  // User-facing events
  messageTextChanged,
  messageSent,
  editMessage,
  deleteMessage,
  messageRetry,
  generateResponseClicked, // Added generate event
  setPreventScroll, // Moved event here

  // Internal events
  messageAdded,
  retryUpdate,
  messageRetryInitiated,
  userMessageCreated,
  scrollToLastMessageNeeded, // Keep this debug target
  prepareRetryParams,
  calculatedRetryUpdate,
  apiRequestTokensUpdated,
  apiRequestSuccess,
  initialChatSaveNeeded,
  retryTriggered, // Added internal event
  placeholderCalculated, // Added helper event for split sample
  addPlaceholderForGeneration, // Added internal event
  placeholderGenerated, // Added internal event

  // Effects
  sendApiRequestFx
);
