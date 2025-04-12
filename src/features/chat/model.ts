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
  placeholderMessage: Message;
};

// Combined event/effect trigger using split
const triggerStream = chatDomain.event<StreamTriggerPayload>();

split({
  source: triggerStream,
  match: {
    placeholder: (p): p is StreamTriggerPayload => !!p.placeholderMessage,
    start: (p): p is StreamTriggerPayload => !!p.streamId,
    effect: (p): p is StreamTriggerPayload => !!p.streamParams,
  },
  cases: {
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

    // Prepare message history
    const messagesForApi = [...messages, userMessage];

    // 3. Define Callbacks (Target internal events)
    const onChunk = ({ chunk }: StreamChunkPayload) => {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        // Only trigger if there's content
        _messageChunkReceived({ placeholderId, chunkContent: content });
      }
    };

    const onComplete = () => {
      _messageCompleted({ placeholderId });
      normalResponseProcessed(); // Trigger save/downstream logic
      scrollToLastMessageNeeded(); // Trigger scroll
    };

    const onError = ({ error }: StreamErrorPayload) => {
      console.error(`[Stream ${streamId}] Error callback:`, error);
      _messageErrored({ placeholderId, error });
      // $apiError is updated via .on(_messageErrored) handler
    };

    const onAbort = () => {
      console.log(`[Stream ${streamId}] Abort callback triggered.`);
      _messageAborted({ placeholderId });
    };

    // 4. Prepare StreamChatParams
    const streamParams: StreamChatParams = {
      streamId,
      model: selectedModelId,
      messages: messagesForApi,
      apiKey,
      temperature,
      // systemPrompt: systemPrompt, // Pass systemPrompt if needed by API; ensure type allows it
      onChunk,
      onComplete,
      onError,
      onAbort,
    };

    // 5. Return payload for the split target
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
  filter: ({ apiKey, messages }: { apiKey: string; messages: Message[] }) =>
    !!apiKey && messages.length > 0,
  fn: (
    {
      messages,
      apiKey,
      temperature,
      systemPrompt,
      selectedModelId,
    }: {
      apiKey: string;
      messages: Message[];
      temperature: number;
      systemPrompt: string;
      selectedModelId: string;
    },
    placeholder: Message
  ) => ({
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

// --- Generate Response Logic --- (Refactored)
sample({
  clock: placeholderGenerated, // Trigger *after* placeholder is created
  source: {
    // Define source types explicitly
    messages: $messages,
    apiKey: $apiKey,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
  },
  filter: ({ apiKey, messages }): boolean => !!apiKey && messages.length > 0, // Ensure API key and some history (at least placeholder)
  fn: (
    sourceData: {
      messages: Message[];
      apiKey: string;
      temperature: number;
      systemPrompt: string;
      selectedModelId: string;
    },
    placeholder: Message // Use placeholder as clock data
  ): StreamTriggerPayload => {
    const {
      messages,
      apiKey,
      temperature,
      /* systemPrompt, */ selectedModelId,
    } = sourceData;
    const placeholderId = placeholder.id;

    // 1. Generate IDs
    const streamId = crypto.randomUUID();

    // 2. Placeholder already created
    const placeholderMessage = placeholder;

    // Prepare message history (excludes the placeholder itself)
    const messagesForApi = messages.slice(0, -1);

    // 3. Define Callbacks
    const onChunk = ({ chunk }: StreamChunkPayload) => {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        _messageChunkReceived({ placeholderId, chunkContent: content });
      }
    };
    const onComplete = () => {
      _messageCompleted({ placeholderId });
      scrollToLastMessageNeeded();
    };
    const onError = ({ error }: StreamErrorPayload) => {
      console.error(`[Stream ${streamId}/Generate] Error callback:`, error);
      _messageErrored({ placeholderId, error });
    };
    const onAbort = () => {
      console.log(`[Stream ${streamId}/Generate] Abort callback triggered.`);
      _messageAborted({ placeholderId });
    };

    // 4. Prepare StreamChatParams
    const streamParams: StreamChatParams = {
      streamId,
      model: selectedModelId,
      messages: messagesForApi,
      apiKey,
      temperature,
      onChunk,
      onComplete,
      onError,
      onAbort,
    };

    // 5. Return payload for split
    return { streamParams, streamId, placeholderMessage };
  },
  target: triggerStream, // Target the split event
});

// Trigger API key missing event (Keep as is)
sample({
  clock: generateResponseClicked,
  source: $apiKey,
  filter: (key) => !key,
  target: apiKeyMissing,
});

// --- Retry Logic Flow --- (Refactored)
sample({
  clock: messageRetry,
  source: {
    // Define source types
    messages: $messages,
    apiKey: $apiKey,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
  },
  filter: (
    payload: { apiKey: string | null },
    messageToRetry: Message
  ): payload is { apiKey: string } =>
    !!payload.apiKey && isRetryableMessage(messageToRetry),
  fn: (
    sourceData: {
      messages: Message[];
      apiKey: string;
      temperature: number;
      systemPrompt: string;
      selectedModelId: string;
    },
    messageToRetry: Message
  ): StreamTriggerPayload => {
    // Can return null if prep fails
    const { messages, apiKey, temperature, systemPrompt, selectedModelId } =
      sourceData;

    // Prepare base parameters (history slice needs careful check)
    const baseParams = prepareRetryRequestParamsFn(
      { messages, apiKey, temperature, systemPrompt, selectedModelId },
      messageToRetry
    );

    if (!baseParams) {
      // TODO: Handle error case
      console.error(
        "Failed to prepare base parameters for retry. Will throw error."
      );
      throw new Error("Base parameters preparation failed.");
    }

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

    // TODO: Refine Placeholder Insertion logic for Retry
    // This placeholder needs to be inserted/replace correctly based on messageToRetry.role
    // For now, placeholderGenerated will add it at the end via the split target.

    // 3. Define Callbacks
    const onChunk = ({ chunk }: StreamChunkPayload) => {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        _messageChunkReceived({ placeholderId, chunkContent: content });
      }
    };
    const onComplete = () => {
      _messageCompleted({ placeholderId });
      // TODO: Trigger save/downstream for retry?
      scrollToLastMessageNeeded();
    };
    const onError = ({ error }: StreamErrorPayload) => {
      console.error(`[Stream ${streamId}/Retry] Error callback:`, error);
      _messageErrored({ placeholderId, error });
    };
    const onAbort = () => {
      console.log(`[Stream ${streamId}/Retry] Abort callback triggered.`);
      _messageAborted({ placeholderId });
    };

    // 4. Prepare StreamChatParams
    const streamParams: StreamChatParams = {
      ...baseParams, // Includes modelId, messages, apiKey, temperature
      model: baseParams.modelId,
      streamId, // Override/add streamId
      // systemPrompt, // systemPrompt is part of baseParams if needed
      onChunk,
      onComplete,
      onError,
      onAbort,
    };

    // 5. Return payload
    return { streamParams, streamId, placeholderMessage };
  },
  target: triggerStream, // Target split event
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

// Trigger scroll after assistant reply is added/replaced (retry or generate) OR normal response added
sample({
  // clock: [retryUpdate, normalResponseProcessed], // Needs updating based on callback completion
  // Placeholder: Trigger scroll after every message update for now
  // Refine later if needed
  clock: $messages.updates, // Trigger whenever messages array potentially changes
  fn: () => undefined,
  target: scrollToLastMessageNeeded,
});

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
  $activeChatStreamId, // Added
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
  stopGenerationClicked, // Added
  apiKeyMissing,
  initialChatSaveNeeded,
  normalResponseProcessed,
  mainInputFocused,

  // Internal events
  userMessageCreated,
  placeholderGenerated,
  addPlaceholderForGeneration,
  streamRequestInitiated, // Added
  triggerStream, // Added
  _messageChunkReceived, // Added
  _messageCompleted, // Added
  _messageErrored, // Added
  _messageAborted, // Added
  messageRetryInitiated,
  scrollToLastMessageNeeded,

  // Effects
  streamChatFx
);
