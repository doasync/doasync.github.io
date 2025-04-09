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
export const scrollToBottomNeeded = chatDomain.event<void>(
  "scrollToBottomNeeded"
); // New event for scrolling
export const setPreventScroll = chatDomain.event<boolean>("setPreventScroll");

// Internal Events (used within this model)
const messageAdded = chatDomain.event<Message>("messageAdded");
export const retryUpdate = chatDomain.event<RetryUpdatePayload>("retryUpdate"); // <-- Add export
const messageRetryInitiated = chatDomain.event<MessageRetryInitiatedPayload>(
  "messageRetryInitiated"
);

// Internal event to capture original retry trigger context
const retryTriggered = chatDomain.event<{
  messageId: string;
  role: "user" | "assistant";
}>("retryTriggered");

const prepareRetryParams =
  chatDomain.event<SendApiRequestParams>("prepareRetryParams");
const calculatedRetryUpdate = chatDomain.event<CalculatedRetryUpdatePayload>(
  "calculatedRetryUpdate"
);

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
});
// Resetting on $messages change removed, rely on sendApiRequestFx.finally

// Flag to temporarily prevent auto-scrolling
export const $preventScroll = chatDomain
  .store<boolean>(false, { name: "$preventScroll" })
  .on(setPreventScroll, (_, value) => value);

// Scroll trigger counter, increments on scrollToBottomNeeded event
export const $scrollTrigger = chatDomain
  .store<number>(0, { name: "$scrollTrigger" })
  .on(scrollToBottomNeeded, (n) => n + 1);

// Store the context of the message that triggered the current retry
export const $retryContext = chatDomain
  .store<{ messageId: string; role: "user" | "assistant" } | null>(null, {
    name: "$retryContext",
  })
  .on(retryTriggered, (_, payload) => payload)
  // Reset *after* the calculation payload has been determined (or determined to be null)
  // This ensures the context is available *during* the calculation sample.
  .reset(calculatedRetryUpdate);

// Store placeholder info when retrying user message followed by another user message
export const $placeholderInfo = chatDomain
  .store<{ id: string; originalUserId: string } | null>(null, {
    name: "$placeholderInfo",
  })
  .reset(sendApiRequestFx.finally); // Also reset when API call finishes

// --- Store Updates (.on/.reset) ---

// Update message text input
$messageText.on(messageTextChanged, (_, text) => text);

// Handle message edits and deletions directly on the store
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
  .on(deleteMessage, (list, id) => list.filter((msg) => msg.id !== id));

// Reset API error when a new message is sent
$apiError.reset(messageSent);

// Update generating state based on API effect
$isGenerating.on(sendApiRequestFx, () => true).reset(sendApiRequestFx.finally);

// Reset API error on successful API request
$apiError.reset(apiRequestSuccess);

// --- Samples (Flow Logic) ---

// Determine which message ID should show the spinner during retry
sample({
  clock: messageRetryInitiated,
  source: { messages: $messages, placeholderInfo: $placeholderInfo }, // Source placeholder info
  fn: ({ messages, placeholderInfo }, payload) => {
    // If a placeholder was just created for this retry, use its ID
    if (
      placeholderInfo &&
      payload.messageId === placeholderInfo.originalUserId
    ) {
      return placeholderInfo.id;
    }
    // Otherwise, use the standard logic
    return determineRetryingMessageIdFn(messages, payload);
  },
  target: $retryingMessageId,
});

// Handle message updates (insert/replace) after a successful retry
sample({
  clock: retryUpdate,
  source: $messages,
  fn: updateMessagesOnRetryFn,
  target: $messages,
});

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

// Add the newly created user message to the messages list
sample({
  clock: userMessageCreated,
  source: $messages,
  fn: (messages, newMsg) => [...messages, newMsg],
  target: $messages, // Add to messages store
});

// Trigger scroll after user message is added
sample({
  clock: $messages, // Trigger when messages list updates
  source: userMessageCreated, // Check if the update was due to user message creation
  filter: (userMsg, allMsgs) => allMsgs[allMsgs.length - 1]?.id === userMsg.id, // Ensure the last message IS the new user message
  target: scrollToBottomNeeded,
});

// Trigger initial save if this is the first message
sample({
  clock: userMessageCreated,
  source: $messages,
  filter: (msgs) => msgs.length === 1, // Check if it's exactly the first message
  target: initialChatSaveNeeded,
});

// Trigger API request when a user message is created (if API key exists)
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
    userMsg // userMsg is the clock payload here
  ): SendApiRequestParams => ({
    modelId: selectedModelId,
    messages: messages, // $messages already includes the new userMsg due to previous sample
    apiKey,
    temperature,
    systemPrompt,
  }),
  target: sendApiRequestFx,
});

// Clear message input after sending
sample({
  clock: userMessageCreated, // Use userMessageCreated to ensure it clears after adding
  fn: () => "",
  target: $messageText,
});

// Trigger API key missing event if message sent without key
sample({
  clock: messageSent,
  source: $apiKey,
  filter: (key: string) => key.trim().length === 0,
  target: apiKeyMissing,
});

// --- API Response Handling ---

// apiRequestSuccess event is removed as direct clocking on sendApiRequestFx.done/doneData is preferred

// Add assistant message to list after successful API response (NON-RETRY flow)
sample({
  clock: sendApiRequestFx.done, // Clock on effect completion { params, result }
  source: { messages: $messages, retryContext: $retryContext }, // Source messages and retry context
  // Filter runs *at the time clock fires*. Only proceed if retryContext was null then.
  filter: ({ retryContext }) => retryContext === null,
  // Extract response from clock data ({ result }) and pass with sourced messages
  fn: ({ messages }, { result: response }) =>
    addAssistantMessageFn({ messages }, response),
  target: $messages,
});

// Update token count after successful API response (can run for both retry/non-retry)
sample({
  clock: sendApiRequestFx.doneData, // Clock directly on effect success data
  source: $currentChatTokens,
  fn: (currentTokens, response) =>
    currentTokens + (response.usage?.total_tokens ?? 0),
  target: $currentChatTokens,
});

// Forward successful API response data to apiRequestTokensUpdated event
sample({
  clock: sendApiRequestFx.doneData, // Clock directly on effect success data
  fn: (response) => response,
  target: apiRequestTokensUpdated,
});

// Update API error store on API request failure
sample({
  clock: sendApiRequestFx.failData,
  fn: (error) => error.message,
  target: $apiError,
});

// --- Scroll Prevention Logic ---

// Prevent scroll when editing a message
sample({
  clock: editMessage,
  fn: () => true,
  target: setPreventScroll,
});

// Prevent scroll when initiating a retry
sample({
  clock: messageRetryInitiated,
  fn: () => true,
  target: setPreventScroll,
});

// Allow scroll again after retry API call finishes
sample({
  clock: sendApiRequestFx.finally,
  source: $retryingMessageId,
  filter: (retryingId) => retryingId !== null, // Only act if we were retrying
  fn: () => false,
  target: setPreventScroll,
});

// Also reset retryingMessageId after the API call finishes in retry flow
sample({
  clock: sendApiRequestFx.finally,
  source: $retryingMessageId,
  filter: (retryingId) => retryingId !== null,
  fn: () => null,
  target: $retryingMessageId,
});

// --- Retry Logic Flow ---

// Type predicate for filtering retryable messages
const isRetryableMessage = (
  message: Message | undefined
): message is Message & { role: "user" | "assistant" } => {
  return !!message && (message.role === "user" || message.role === "assistant");
};

// When messageRetry is called:
// 1. Create placeholder if needed (Scenario 1.2.b)
// 2. Store original retry context
// 3. Prepare API params
// 4. Trigger spinner update

// 1. Create placeholder if retrying user message followed by user/end
// Define a helper event to carry the result of the placeholder calculation
const placeholderCalculated = chatDomain.event<{
  updatedMessages: Message[];
  placeholderInfo: { id: string; originalUserId: string };
}>("placeholderCalculated");

// Sample to calculate placeholder data when needed
sample({
  clock: messageRetry,
  source: $messages,
  filter: (messages: Message[], messageToRetry: Message): boolean => {
    if (!isRetryableMessage(messageToRetry) || messageToRetry.role !== "user") {
      return false; // Only for user messages
    }
    const retryIndex = messages.findIndex(
      (msg) => msg.id === messageToRetry.id
    );
    if (retryIndex === -1) return false; // Should not happen
    const nextMessage = messages[retryIndex + 1];
    // Condition: next message is user or does not exist
    return !nextMessage || nextMessage.role === "user";
  },
  fn: (
    messages: Message[],
    messageToRetry: Message
  ): {
    updatedMessages: Message[];
    placeholderInfo: { id: string; originalUserId: string };
  } => {
    const tempId = crypto.randomUUID();
    const placeholderMessage: Message = {
      id: tempId,
      role: "assistant",
      content: "", // Placeholder content
      timestamp: Date.now(),
      isLoading: true, // Mark as loading
    };
    const retryIndex = messages.findIndex(
      (msg) => msg.id === messageToRetry.id
    );
    // Insert placeholder immediately after the retried user message
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

// Sample to update $messages from the helper event
sample({
  clock: placeholderCalculated,
  fn: (payload) => payload.updatedMessages,
  target: $messages,
});

// Sample to update $placeholderInfo from the helper event
sample({
  clock: placeholderCalculated,
  fn: (payload) => payload.placeholderInfo,
  target: $placeholderInfo,
});

// 2. Store original retry context (runs for all valid retries)
sample({
  clock: messageRetry,
  filter: isRetryableMessage,
  fn: (messageToRetry) => ({
    messageId: messageToRetry.id,
    role: messageToRetry.role,
  }),
  target: retryTriggered,
});

sample({
  clock: messageRetry, // Also trigger param preparation
  source: {
    messages: $messages,
    apiKey: $apiKey,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
  },
  filter: (
    { apiKey },
    messageRetried // Ensure API key exists
  ) => apiKey.length > 0 && isRetryableMessage(messageRetried),
  fn: prepareRetryRequestParamsFn, // Prepare params using original message
  target: prepareRetryParams,
});

// Trigger the event to update the retrying message ID state
sample({
  clock: messageRetry,
  filter: (
    messageToRetry
  ): messageToRetry is Message & { role: "user" | "assistant" } =>
    isRetryableMessage(messageToRetry),
  fn: (messageToRetry): MessageRetryInitiatedPayload => ({
    messageId: messageToRetry.id,
    role: messageToRetry.role,
  }),
  target: messageRetryInitiated,
});

// Trigger the API request effect with the prepared retry parameters
sample({
  clock: prepareRetryParams,
  filter: (params): params is SendApiRequestParams => params !== null,
  target: sendApiRequestFx,
});

// Calculate how to update the message list after a successful retry response
// Use the stored $retryContext *at the time the effect completed*
sample({
  clock: sendApiRequestFx.done, // Clock on effect completion { params, result }
  source: {
    // Source stores needed *at the time clock fires*
    messages: $messages,
    retryContext: $retryContext,
    placeholderInfo: $placeholderInfo,
  },
  // NO filter here - always run the calculation. lib.ts function will return null if not a retry.
  fn: (
    { messages, retryContext, placeholderInfo }, // Source data (values at clock time)
    { result: response } // Clock data (effect result)
  ) =>
    calculateRetryUpdatePayloadFn(
      {
        messages, // Use sourced messages
        retryContext, // Use sourced retryContext (captured before reset)
        placeholderInfo, // Use sourced placeholderInfo
      },
      response // Use response from clock data
    ),
  target: calculatedRetryUpdate,
});

// Trigger the message list update if the calculation was successful
sample({
  clock: calculatedRetryUpdate,
  filter: (payload): payload is RetryUpdatePayload => payload !== null,
  target: retryUpdate,
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
  $scrollTrigger,
  $retryContext, // Original retry context
  $placeholderInfo, // Added placeholder store
  // Targets from other features
  setPreventScroll, // Scroll prevention setter

  // User-facing events
  messageTextChanged,
  messageSent,
  editMessage,
  deleteMessage,
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
  initialChatSaveNeeded,
  retryTriggered, // Added internal event
  placeholderCalculated, // Added helper event for split sample

  // Effects
  sendApiRequestFx
);
