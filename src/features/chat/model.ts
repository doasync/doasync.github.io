import { sample, createDomain, createEvent, split } from "effector";
import { debug } from "patronum/debug";
import { $apiKey, $temperature, $systemPrompt } from "@/features/chat-settings";
import { $selectedModelId } from "@/features/models-select";
// Import chat-stream feature
import {
  streamChatFx,
  abortStream,
  StreamChatParams,
  StreamChunkPayload,
  StreamCompletePayload,
  StreamErrorPayload,
  StreamAbortPayload,
} from "@/features/chat-stream";

import {
  Message,
  // OpenRouterResponseBody, // Removed
  // SendApiRequestParams, // Removed
  RetryUpdatePayload, // Keep for now, might become obsolete
  // CalculatedRetryUpdatePayload, // Removed
  MessageRetryInitiatedPayload, // Keep for spinner logic potentially
  RequestContext, // Import the new context type
  RequestContextNormal,
  RequestContextGenerate,
  RequestContextRetry,
  Role, // Import Role type
} from "./types";
import {
  // sendApiRequestFn, // Removed
  // addAssistantMessageFn, // Removed
  prepareRetryRequestParamsFn, // Keep for retry param prep
  // calculateRetryUpdatePayloadFn, // Removed
  determineRetryingMessageIdFn, // Keep for spinner logic
  // updateMessagesOnRetryFn, // Removed
} from "./lib"; // Only keep necessary imports

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
// Removed apiRequestTokensUpdated event as token updates are handled differently with streaming (if at all)
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
// export const retryUpdate = chatDomain.event<RetryUpdatePayload>("retryUpdate"); // Replaced by callback logic
export const normalResponseProcessed = chatDomain.event<void>(
  "normalResponseProcessed"
); // Explicit trigger for saving normal responses
export const mainInputFocused = chatDomain.event<boolean>("mainInputFocused");
// Event to trigger stream cancellation from UI
export const stopGenerationClicked = chatDomain.event<void>(
  "stopGenerationClicked"
);
// Event to signal assistant response cycle completion (success, error, or abort)
export const assistantResponseCompleted = chatDomain.event<void>(
  "assistantResponseCompleted"
);

// Internal Events
const messageRetryInitiated = chatDomain.event<MessageRetryInitiatedPayload>(
  "messageRetryInitiated"
);
// const prepareRetryParams = chatDomain.event<SendApiRequestParams>("prepareRetryParams"); // Removed
// const calculatedRetryUpdate = chatDomain.event<CalculatedRetryUpdatePayload>("calculatedRetryUpdate"); // Removed

// Internal event to signal stream request start with its ID
const streamRequestInitiated = chatDomain.event<{ streamId: string }>(
  "streamRequestInitiated"
);
const addPlaceholderForGeneration = chatDomain.event<void>(
  "addPlaceholderForGeneration"
);
const placeholderGenerated = chatDomain.event<Message>("placeholderGenerated"); // Carries the placeholder message

// REMOVED: retryTriggered, placeholderCalculated, cleanupAfterUpdate

// --- Effects ---
// Removed sendApiRequestFx, using streamChatFx from chat-stream feature directly

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
}); // Definition corrected

// Store for the currently active stream ID (for cancellation)
export const $activeChatStreamId = chatDomain
  .store<string | null>(null, {
    name: "$activeChatStreamId",
  })
  .on(streamRequestInitiated, (_, { streamId }) => streamId);
// Reset logic added further down

export const $retryingMessageId = chatDomain.store<string | null>(null, {
  name: "$retryingMessageId",
}); // For spinner

export const $preventScroll = chatDomain.store<boolean>(false, {
  name: "$preventScroll",
});

export const $scrollTrigger = chatDomain
  .store<number>(0, { name: "$scrollTrigger" })
  .on(scrollToLastMessageNeeded, () => Date.now());

// Store for main input focus state
export const $isMainInputFocused = chatDomain
  .store<boolean>(false, { name: "$isMainInputFocused" })
  .on(mainInputFocused, (_, isFocused) => isFocused); // Corrected payload destructuring

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
  ]); // Placeholder added
// .on handlers for internal events are added AFTER the events are defined below

$apiError.reset(messageSent, generateResponseClicked, messageRetry); // Reset on user action start

$isGenerating.on(streamChatFx, () => true).reset(streamChatFx.finally); // Driven by chat-stream effect

// $currentChatTokens removed

$retryingMessageId
  .on(messageRetryInitiated, (_, payload) => {
    // Keep spinner logic for retry initiation
    const messages = $messages.getState();
    if (payload.role === "assistant") return payload.messageId;
    return determineRetryingMessageIdFn(messages, payload);
  })
  .on(placeholderGenerated, (_, placeholder) => placeholder.id); // Show spinner on placeholder

$preventScroll
  .on(editMessage, () => true) // Prevent scroll during edit
  .on(messageRetryInitiated, () => false) // Allow scroll on retry start
  .on(placeholderGenerated, () => false); // Allow scroll when placeholder added

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

// --- Stream Trigger & Handling Logic ---

// Define internal events FIRST
const _messageChunkReceived = chatDomain.event<{
  placeholderId: string;
  chunkContent: string;
}>();
const _messageCompleted = chatDomain.event<{ placeholderId: string }>();
const _messageErrored = chatDomain.event<{
  placeholderId: string;
  error: Error;
}>();
const _messageAborted = chatDomain.event<{ placeholderId: string }>();

// Now, add reset logic to stores using these events
$activeChatStreamId.reset(_messageCompleted, _messageErrored, _messageAborted);
$retryingMessageId.reset(_messageCompleted, _messageErrored, _messageAborted);
$preventScroll.reset(_messageCompleted, _messageErrored, _messageAborted); // Reset scroll lock on finish

// Add handlers to $messages for internal events
$messages
  .on(_messageChunkReceived, (messages, { placeholderId, chunkContent }) => {
    const targetMsgIndex = messages.findIndex((m) => m.id === placeholderId);
    if (targetMsgIndex === -1) return messages; // Safety check
    const updatedMsg = {
      ...messages[targetMsgIndex],
      content: messages[targetMsgIndex].content + chunkContent,
      isLoading: true, // Keep loading during chunks
    };
    const newMsgs = [...messages];
    newMsgs[targetMsgIndex] = updatedMsg;
    return newMsgs;
  })
  .on(_messageCompleted, (messages, { placeholderId }) => {
    const targetMsgIndex = messages.findIndex((m) => m.id === placeholderId);
    if (targetMsgIndex === -1) return messages; // Safety check
    const updatedMsg = {
      ...messages[targetMsgIndex],
      isLoading: false,
      // id: finalId || messages[targetMsgIndex].id, // Update ID?
    };
    const newMsgs = [...messages];
    newMsgs[targetMsgIndex] = updatedMsg;
    return newMsgs;
  })
  .on(_messageErrored, (messages, { placeholderId, error }) => {
    const targetMsgIndex = messages.findIndex((m) => m.id === placeholderId);
    if (targetMsgIndex === -1) return messages; // Safety check
    const updatedMsg = {
      ...messages[targetMsgIndex],
      isLoading: false,
      content: `Error: ${error.message}`, // Example: Show error in content
    };
    const newMsgs = [...messages];
    newMsgs[targetMsgIndex] = updatedMsg;
    return newMsgs;
  })
  .on(_messageAborted, (messages, { placeholderId }) => {
    const targetMsgIndex = messages.findIndex((m) => m.id === placeholderId);
    if (targetMsgIndex === -1) return messages; // Safety check
    const updatedMsg = { ...messages[targetMsgIndex], isLoading: false };
    const newMsgs = [...messages];
    newMsgs[targetMsgIndex] = updatedMsg;
    return newMsgs;
  });

// Add handler to $apiError
$apiError.on(_messageErrored, (_, { error }) => error.message);

// Helper type for the combined payload sent to the split event
type StreamTriggerPayload = {
  streamParams: StreamChatParams;
  streamId: string;
  placeholderMessage: Message; // Re-add placeholder message to the payload
};

// Combined event/effect trigger using split
const triggerStream = chatDomain.event<StreamTriggerPayload>();

split({
  source: triggerStream,
  match: {
    placeholder: (p): p is StreamTriggerPayload => !!p.placeholderMessage, // Match if placeholder exists
    start: (p): p is StreamTriggerPayload => !!p.streamId,
    effect: (p): p is StreamTriggerPayload => !!p.streamParams,
  },
  cases: {
    // Add placeholder case targeting placeholderGenerated
    placeholder: placeholderGenerated.prepend<StreamTriggerPayload>(
      (p) => p.placeholderMessage
    ),
    start: streamRequestInitiated.prepend<StreamTriggerPayload>((p) => ({
      streamId: p.streamId,
    })),
    effect: streamChatFx.prepend<StreamTriggerPayload>((p) => p.streamParams),
  },
});

// Trigger stream for a NEW user message
sample({
  clock: userMessageCreated,
  source: {
    // Define source types explicitly
    messages: $messages,
    apiKey: $apiKey,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
  },
  filter: ({ apiKey }) => !!apiKey,
  fn: (
    sourceData: {
      messages: Message[];
      apiKey: string;
      temperature: number;
      systemPrompt: string;
      selectedModelId: string;
    },
    userMessage: Message
  ): StreamTriggerPayload => {
    // Add types
    const { messages, apiKey, temperature, systemPrompt, selectedModelId } =
      sourceData;

    // 1. Generate IDs
    const streamId = crypto.randomUUID();
    const placeholderId = crypto.randomUUID();

    // 2. Create Placeholder Message
    const placeholderMessage: Message = {
      id: placeholderId,
      role: "assistant",
      content: "",
      isLoading: true,
      timestamp: Date.now(),
    };

    // Prepare message history (use current state which includes the new user message)
    const currentMessages = $messages.getState(); // Get messages *after* userMessageCreated updated it
    const messagesForApi = [...currentMessages]; // Use the already updated list

    // 3. Define Callbacks (Target internal events)
    const onChunk = ({ chunk }: StreamChunkPayload) => {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        _messageChunkReceived({ placeholderId, chunkContent: content });
      }
    };

    const onComplete = () => {
      _messageCompleted({ placeholderId });
      normalResponseProcessed(); // Trigger save/downstream logic for normal flow
      assistantResponseCompleted(); // Signal completion for history save etc.
      scrollToLastMessageNeeded(); // Trigger scroll
    };

    const onError = ({ error }: StreamErrorPayload) => {
      console.error(`[Stream ${streamId}] Error callback:`, error);
      _messageErrored({ placeholderId, error });
    };

    const onAbort = () => {
      console.log(`[Stream ${streamId}] Abort callback triggered.`);
      _messageAborted({ placeholderId });
    };

    // 4. Prepare StreamChatParams
    const streamParams: StreamChatParams = {
      streamId,
      model: selectedModelId,
      messages: messagesForApi, // Send history including the user message that triggered this
      apiKey,
      temperature,
      onChunk,
      onComplete,
      onError,
      onAbort,
    };

    // 5. Return payload for the split target, including the placeholder
    return { streamParams, streamId, placeholderMessage };
  },
  target: triggerStream,
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

// Trigger stream initiation (streamId) for GENERATE action
sample({
  clock: placeholderGenerated, // Trigger *after* placeholder is created
  source: $apiKey, // Only need API key to filter
  filter: (apiKey): apiKey is string => !!apiKey, // Ensure API key exists
  fn: () => ({ streamId: crypto.randomUUID() }), // Generate streamId
  target: streamRequestInitiated, // Target specific event
});

// Trigger stream effect (streamChatFx) for GENERATE action
sample({
  clock: placeholderGenerated, // Trigger *after* placeholder is created
  source: {
    messages: $messages,
    apiKey: $apiKey,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
    activeStreamId: $activeChatStreamId, // Get the streamId generated above
  },
  // Filter needs to ensure apiKey and the activeStreamId (just set by the previous sample) exist
  filter: (
    source
  ): source is {
    messages: Message[];
    apiKey: string;
    temperature: number;
    systemPrompt: string;
    selectedModelId: string;
    activeStreamId: string; // Ensure streamId is a string
  } => !!source.apiKey && source.messages.length > 0 && !!source.activeStreamId,
  fn: (source, placeholder): StreamChatParams => {
    // Destructure and assert activeStreamId is string due to filter
    const { messages, apiKey, temperature, selectedModelId, activeStreamId } =
      source;
    const placeholderId = placeholder.id; // ID from the clock data
    const currentStreamId = activeStreamId!; // Chacked by filtrer, so it's safe to assert

    // Prepare message history (use current state which includes the placeholder)
    const currentMessages = messages; // Source already has the updated message list
    // Send history *excluding* the placeholder that was just added
    const messagesForApi = currentMessages.slice(0, -1);

    // Define Callbacks
    const onChunk = ({ chunk }: StreamChunkPayload) => {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        _messageChunkReceived({ placeholderId, chunkContent: content });
      }
    };
    const onComplete = () => {
      _messageCompleted({ placeholderId });
      assistantResponseCompleted();
      // scrollToLastMessageNeeded(); // Don't scroll here, already scrolled by placeholder
    };
    const onError = ({ error }: StreamErrorPayload) => {
      // Use currentStreamId (guaranteed string) for logging
      console.error(
        `[Stream ${currentStreamId}/Generate] Error callback:`,
        error
      );
      _messageErrored({ placeholderId, error });
    };
    const onAbort = () => {
      // Use currentStreamId (guaranteed string) for logging
      console.log(
        `[Stream ${currentStreamId}/Generate] Abort callback triggered.`
      );
      _messageAborted({ placeholderId });
    };

    // Prepare StreamChatParams
    const streamParams: StreamChatParams = {
      streamId: currentStreamId, // Use the local const (guaranteed string)
      model: selectedModelId,
      messages: messagesForApi,
      apiKey,
      temperature,
      onChunk,
      onComplete,
      onError,
      onAbort,
    };
    return streamParams;
  },
  target: streamChatFx, // Target the effect directly
});

// Trigger API key missing event if generate clicked without key
sample({
  clock: generateResponseClicked,
  source: $apiKey,
  filter: (key) => !key,
  target: apiKeyMissing,
});

// Removed duplicate Generate Response Logic block

// Trigger API key missing event (Keep as is)
sample({
  clock: generateResponseClicked,
  source: $apiKey,
  filter: (key) => !key,
  target: apiKeyMissing,
});

// --- Retry Logic Flow --- Sample Refactored
sample({
  clock: messageRetry,
  source: {
    // Define source types explicitly
    messages: $messages,
    apiKey: $apiKey,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
  },
  // Ensure sourceData type includes all used properties
  filter: (
    sourceData: {
      apiKey: string | null;
      messages: Message[];
      temperature: number;
      systemPrompt: string;
      selectedModelId: string;
    },
    messageToRetry: Message
  ): sourceData is {
    apiKey: string;
    messages: Message[];
    temperature: number;
    systemPrompt: string;
    selectedModelId: string;
  } => !!sourceData.apiKey && isRetryableMessage(messageToRetry), // Filter and type guard
  fn: (sourceData, messageToRetry): StreamTriggerPayload => {
    // Add types
    const { messages, apiKey, temperature, systemPrompt, selectedModelId } =
      sourceData;

    // Prepare base parameters (history slice)
    const baseParams = prepareRetryRequestParamsFn(
      { messages, apiKey, temperature, systemPrompt, selectedModelId },
      messageToRetry
    );
    // Note: baseParams.messages contains the correctly sliced history for the API call.

    // 1. Generate IDs
    const streamId = crypto.randomUUID();
    const placeholderId = crypto.randomUUID(); // Always generate a new placeholder for retry response

    // 2. Create Placeholder Message
    const placeholderMessage: Message = {
      id: placeholderId,
      role: "assistant",
      content: "",
      isLoading: true, // Start loading
      timestamp: Date.now(),
      isRetryOf: messageToRetry.id, // Optional: Mark which message this retry is for
    };

    // 3. Define Callbacks (Target internal events, closing over placeholderId)
    const onChunk = ({ chunk }: StreamChunkPayload) => {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        _messageChunkReceived({ placeholderId, chunkContent: content });
      }
    };
    const onComplete = () => {
      _messageCompleted({ placeholderId });
      // Maybe trigger a specific 'retryResponseProcessed' event here?
      assistantResponseCompleted(); // Signal completion
      // scrollToLastMessageNeeded(); // Don't scroll here, already scrolled by placeholder
    };
    const onError = ({ error }: StreamErrorPayload) => {
      console.error(`[Stream ${streamId}/Retry] Error callback:`, error);
      _messageErrored({ placeholderId, error });
    };
    const onAbort = () => {
      console.log(`[Stream ${streamId}/Retry] Abort callback triggered.`);
      _messageAborted({ placeholderId });
    };

    // 4. Prepare StreamChatParams using baseParams
    const streamParams: StreamChatParams = {
      streamId,
      model: baseParams.modelId,
      messages: baseParams.messages, // Use sliced history from prepareRetryRequestParamsFn
      apiKey: baseParams.apiKey,
      temperature: baseParams.temperature,
      onChunk,
      onComplete,
      onError,
      onAbort,
    };

    // 5. Return payload for split, including the placeholder
    return { streamParams, streamId, placeholderMessage };
  },
  target: triggerStream, // Target the split event
});

// Trigger spinner update event for retry (Keep as is)
sample({
  clock: messageRetry,
  filter: isRetryableMessage,
  fn: (messageToRetry): MessageRetryInitiatedPayload => ({
    messageId: messageToRetry.id,
    role: messageToRetry.role as Role & ("user" | "assistant"),
  }),
  target: messageRetryInitiated,
});

// Removed sample triggering old effect from prepareRetryParams

// --- Common Post-API Logic ---

// Removed samples for calculatedRetryUpdate and retryUpdate
// Message updates are now handled within the streamChatFx callbacks

// Removed sample triggering normalResponseProcessed from effect.done
// This trigger will be moved into the onComplete callback.

// Forward successful API response data to apiRequestTokensUpdated event
// Removed sample forwarding to apiRequestTokensUpdated

// Removed sample triggering scroll on $messages.updates.
// Scrolling is now triggered within the onComplete callbacks.

// --- Cancellation Logic ---
sample({
  clock: stopGenerationClicked,
  source: $activeChatStreamId,
  filter: (streamId: string | null): streamId is string => !!streamId,
  fn: (streamId: string) => ({ streamId }),
  target: abortStream,
});

// --- Debugging ---
debug(
  // Stores
  $messageText,
  $messages,
  $isGenerating,
  $apiError,
  $currentChatTokens,
  $retryingMessageId,
  $preventScroll,
  $activeChatStreamId,
  $scrollTrigger,
  $isMainInputFocused,

  // User-facing events
  messageTextChanged,
  messageSent,
  editMessage,
  deleteMessage,
  messageRetry,
  generateResponseClicked,
  setPreventScroll,
  stopGenerationClicked,
  apiKeyMissing,
  initialChatSaveNeeded,
  normalResponseProcessed,
  mainInputFocused,

  // Internal events
  userMessageCreated,
  placeholderGenerated,
  addPlaceholderForGeneration,
  streamRequestInitiated,
  triggerStream,
  _messageChunkReceived,
  _messageCompleted,
  _messageErrored,
  _messageAborted,
  // Removed: retryUpdate, prepareRetryParams, calculatedRetryUpdate, apiRequestTokensUpdated
  messageRetryInitiated,
  scrollToLastMessageNeeded,

  // Effects
  streamChatFx // Effect
  // Removed: sendApiRequestFx
);

// --- Cancellation Logic ---
sample({
  clock: stopGenerationClicked,
  source: $activeChatStreamId,
  filter: (streamId): streamId is string => !!streamId, // Only run if there's an active stream
  fn: (streamId: string) => ({ streamId }), // Explicitly type streamId as string
  target: abortStream,
});
