import {
  createStore,
  createEvent,
  createEffect,
  sample,
  // Removed split as per FIX_PLAN.md
} from "effector";
// Removed old API import (already commented out)
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
  $apiKey,
  $temperature,
  $systemPrompt,
} from "@/features/chat-settings/model";
import {
  $selectedModelId,
  $availableModels,
  $isModelSelectorActive,
} from "@/features/models-select/model";
import { saveChatFx } from "@/features/chat-history/model";
import { appStarted } from "@/app";
import {
  $isMobileDrawerOpen,
  setMobileDrawerTab,
  closeMobileDrawer,
} from "@/features/ui-state/model";
import { $isMainInputFocused } from "@/features/chat/model";
import { chatSelected } from "@/features/chat-history/model";

const MINI_CHAT_MODEL_ID_STORAGE_KEY = "miniChatModelId_v1";
const DEFAULT_MINI_CHAT_MODEL = "openai/gpt-3.5-turbo";

//
// Types
//

export interface MiniChatToolbarState {
  visible: boolean;
  x: number;
  y: number;
  selectionText: string;
}

export interface MiniChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
}

export interface MiniChatState {
  isOpen: boolean;
  isCompact: boolean;
  input: string;
  messages: MiniChatMessage[];
  loading: boolean;
  isMinimized: boolean;
  initialX?: number | null;
  initialY?: number | null;
}

//
// Mini Chat Settings State
//
export const miniChatModelSelected = createEvent<string>();
export const miniChatSettingsLoaded = createEvent();

export const $miniChatModelId = createStore<string>(DEFAULT_MINI_CHAT_MODEL);

// Persistence Effects
const loadMiniChatModelIdFx = createEffect<void, string | null>(() => {
  return localStorage.getItem(MINI_CHAT_MODEL_ID_STORAGE_KEY);
});

const saveMiniChatModelIdFx = createEffect<string, void>((modelId) => {
  localStorage.setItem(MINI_CHAT_MODEL_ID_STORAGE_KEY, modelId);
});

// --- Wiring Persistence ---
sample({
  clock: appStarted,
  target: loadMiniChatModelIdFx,
});

sample({
  clock: loadMiniChatModelIdFx.doneData,
  filter: (loadedId): loadedId is string => loadedId !== null,
  target: $miniChatModelId,
});

$miniChatModelId.on(miniChatModelSelected, (_, newModelId) => newModelId);

sample({
  clock: $miniChatModelId.updates,
  target: saveMiniChatModelIdFx,
});
// --- End Wiring Persistence ---

//
// Toolbar State
//

export const showMiniChatToolbar = createEvent<{
  x: number;
  y: number;
  selectionText: string;
}>();
export const hideMiniChatToolbar = createEvent();

export const $miniChatToolbar = createStore<MiniChatToolbarState>({
  visible: false,
  x: 0,
  y: 0,
  selectionText: "",
})
  .on(showMiniChatToolbar, (_, payload) => ({
    visible: true,
    ...payload,
  }))
  .on(hideMiniChatToolbar, (state) => ({
    ...state,
    visible: false,
    selectionText: "",
  }));

//
// Mini Chat State (Main Dialog)
//

export const miniChatOpened = createEvent<{
  initialInput?: string;
  startCompact?: boolean;
  x?: number;
  y?: number;
}>();
export const miniChatClosed = createEvent();
export const updateMiniChatInput = createEvent<string>();

export const sendMiniChatMessage = createEvent<string>();
export const receiveMiniChatMessage = createEvent<string>(); // Keep for potential future use or old code cleanup
export const expandMiniChat = createEvent();
export const minimizeMiniChat = createEvent();
export const restoreMiniChat = createEvent();

export const resetMiniChat = createEvent();
export const triggerMiniChatScroll = createEvent<void>("triggerMiniChatScroll");

export const stopMiniChatGenerationClicked = createEvent<void>(
  "stopMiniChatGenerationClicked"
);

// Event for adding user message to UI state - NEW as per FIX_PLAN.md
export const _addMiniChatUserMessage = createEvent<MiniChatMessage>(
  "addMiniChatUserMessage"
);

// Internal event to signal stream request start with its ID - Moved for declaration order
const miniChatStreamRequestInitiated = createEvent<{ streamId: string }>(
  "miniChatStreamRequestInitiated"
);

// Store for the currently active stream ID (for cancellation) - Moved for declaration order
export const $miniChatActiveStreamId = createStore<string | null>(null, {
  name: "$miniChatActiveStreamId",
});

$miniChatActiveStreamId.on(
  miniChatStreamRequestInitiated,
  (_, { streamId }) => streamId
);

export const $miniChat = createStore<MiniChatState>({
  isOpen: false,
  isCompact: false,
  input: "",
  messages: [],
  loading: false,
  isMinimized: false,
  initialX: null,
  initialY: null,
})
  .on(miniChatOpened, (state, { initialInput, startCompact, x, y }) => ({
    ...state,
    isOpen: true,
    isCompact: !!startCompact,
    input: initialInput ?? state.input,
    messages: state.isOpen ? state.messages : [],
    loading: false,
    isMinimized: false,
    initialX: x ?? null,
    initialY: y ?? null,
  }))
  .on(miniChatClosed, () => ({
    isOpen: false,
    isCompact: false,
    input: "",
    messages: [],
    loading: false,
    isMinimized: false,
    initialX: null,
    initialY: null,
  }))
  .on(updateMiniChatInput, (state, input) => ({
    ...state,
    input,
  }))
  // Add handler for user message, clearing input and setting compact state - NEW as per FIX_PLAN.md
  .on(_addMiniChatUserMessage, (state, userMessage) => ({
    ...state,
    messages: [...state.messages, userMessage],
    isCompact: false, // Expand on send
    input: "", // Clear input
  }))
  .on(minimizeMiniChat, (state) => ({
    ...state,
    isMinimized: true,
  }))
  .on(restoreMiniChat, (state) => ({
    ...state,
    isMinimized: false,
  }))
  .reset(resetMiniChat)
  .on(miniChatStreamRequestInitiated, (state) => ({
    // Set loading to true when stream starts
    ...state,
    loading: true,
  }));

// Scroll trigger store
export const $miniChatScrollTrigger = createStore<number>(0, {
  name: "$miniChatScrollTrigger",
})
  .on(triggerMiniChatScroll, () => Date.now())
  .reset(resetMiniChat, miniChatClosed);

// --- Stream Handling Logic ---

// Define internal events FIRST
const _miniChatMessageChunkReceived = createEvent<{
  placeholderId: string;
  chunkContent: string;
}>();
const _miniChatMessageCompleted = createEvent<{ placeholderId: string }>();
const _miniChatMessageErrored = createEvent<{
  placeholderId: string;
  error: Error;
}>();
const _miniChatMessageAborted = createEvent<{ placeholderId: string }>();

// Add reset logic to active stream ID store
$miniChatActiveStreamId.reset(
  _miniChatMessageCompleted,
  _miniChatMessageErrored,
  _miniChatMessageAborted
);

// Add handlers to $miniChat store for internal events
$miniChat
  .on(
    _miniChatMessageChunkReceived,
    (state, { placeholderId, chunkContent }) => {
      const targetMsgIndex = state.messages.findIndex(
        (m) => m.id === placeholderId
      );
      if (targetMsgIndex === -1) return state;

      const updatedMsg = {
        ...state.messages[targetMsgIndex],
        content: state.messages[targetMsgIndex].content + chunkContent,
        isLoading: true, // Keep loading until complete/error/abort
      };
      const newMsgs = [...state.messages];
      newMsgs[targetMsgIndex] = updatedMsg;
      return { ...state, messages: newMsgs };
    }
  )
  .on(_miniChatMessageCompleted, (state, { placeholderId }) => {
    const targetMsgIndex = state.messages.findIndex(
      (m) => m.id === placeholderId
    );
    if (targetMsgIndex === -1) return state;

    const updatedMsg = { ...state.messages[targetMsgIndex], isLoading: false };
    const newMsgs = [...state.messages];
    newMsgs[targetMsgIndex] = updatedMsg;
    return { ...state, messages: newMsgs, loading: false }; // MODIFIED: Set loading to false
  })
  .on(_miniChatMessageErrored, (state, { placeholderId, error }) => {
    const targetMsgIndex = state.messages.findIndex(
      (m) => m.id === placeholderId
    );
    if (targetMsgIndex === -1) return state;

    const updatedMsg = {
      ...state.messages[targetMsgIndex],
      isLoading: false,
      content: `Error: ${error.message}`,
    };
    const newMsgs = [...state.messages];
    newMsgs[targetMsgIndex] = updatedMsg;
    return { ...state, messages: newMsgs, loading: false }; // MODIFIED: Set loading to false
  })
  .on(_miniChatMessageAborted, (state, { placeholderId }) => {
    const targetMsgIndex = state.messages.findIndex(
      (m) => m.id === placeholderId
    );
    if (targetMsgIndex === -1) return state;

    const updatedMsg = { ...state.messages[targetMsgIndex], isLoading: false };
    const newMsgs = [...state.messages];
    newMsgs[targetMsgIndex] = updatedMsg;
    return { ...state, messages: newMsgs, loading: false }; // MODIFIED: Set loading to false
  });

// Placeholder event for adding the placeholder message - Adjusted as per FIX_PLAN.md
const _addPlaceholderMessage = createEvent<MiniChatMessage>();
$miniChat.on(_addPlaceholderMessage, (state, placeholder) => ({
  ...state,
  messages: [...state.messages, placeholder],
}));

//
// Wiring send → API → receive
//

// Internal event to prepare and trigger the stream payload - as per FIX_PLAN.md
type PrepareStreamPayload = {
  streamParams: StreamChatParams;
  streamId: string;
  placeholderMessage: MiniChatMessage;
  userMessage: MiniChatMessage; // Include user message in payload
};

const _prepareAndTriggerStream = createEvent<PrepareStreamPayload>(
  "prepareAndTriggerMiniChatStream"
);

// Removed the old split block here as per FIX_PLAN.md

// Refactored sample for sending a message - NEW target as per FIX_PLAN.md
sample({
  clock: sendMiniChatMessage,
  source: {
    apiKey: $apiKey,
    model: $miniChatModelId,
    currentMessages: $miniChat.map((s) => s.messages),
  },
  filter: ({ apiKey }) => !!apiKey,
  fn: (
    { apiKey, model, currentMessages },
    messageText
  ): PrepareStreamPayload => {
    const streamId = crypto.randomUUID();
    const placeholderId = crypto.randomUUID();

    const userMessage: MiniChatMessage = { role: "user", content: messageText };
    const placeholderMessage: MiniChatMessage = {
      id: placeholderId,
      role: "assistant",
      content: "",
      isLoading: true,
    };

    const messagesForApi = [...currentMessages, userMessage];

    const onChunk = ({ chunk }: StreamChunkPayload) => {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        _miniChatMessageChunkReceived({ placeholderId, chunkContent: content });
      }
    };
    const onComplete = () => {
      _miniChatMessageCompleted({ placeholderId });
      triggerMiniChatScroll();
    };
    const onError = ({ error }: StreamErrorPayload) => {
      console.error(`[MiniChat Stream ${streamId}] Error:`, error);
      _miniChatMessageErrored({ placeholderId, error });
    };
    const onAbort = () => {
      console.log(`[MiniChat Stream ${streamId}] Aborted.`);
      _miniChatMessageAborted({ placeholderId });
    };

    const streamParams: StreamChatParams = {
      streamId,
      model,
      messages: messagesForApi,
      apiKey,
      onChunk,
      onComplete,
      onError,
      onAbort,
    };

    return { streamParams, streamId, placeholderMessage, userMessage };
  },
  target: _prepareAndTriggerStream, // Target the new event
});

// Chain samples to orchestrate sequential updates and API call - as per FIX_PLAN.md
// 1. Add user message to UI state
sample({
  clock: _prepareAndTriggerStream,
  target: _addMiniChatUserMessage.prepend<PrepareStreamPayload>(
    (p) => p.userMessage
  ),
});

// 2. Add placeholder message to UI state
sample({
  clock: _prepareAndTriggerStream,
  target: _addPlaceholderMessage.prepend<PrepareStreamPayload>(
    (p) => p.placeholderMessage
  ),
});

// 3. Notify about stream initiation (for activeStreamId)
sample({
  clock: _prepareAndTriggerStream,
  target: miniChatStreamRequestInitiated.prepend<PrepareStreamPayload>((p) => ({
    streamId: p.streamId,
  })),
});

// 4. Finally, trigger the stream effect
sample({
  clock: _prepareAndTriggerStream,
  target: streamChatFx.prepend<PrepareStreamPayload>((p) => p.streamParams),
});

// --- Cancellation Logic ---
sample({
  clock: stopMiniChatGenerationClicked,
  source: $miniChatActiveStreamId,
  filter: (streamId: string | null): streamId is string => !!streamId,
  fn: (streamId) => ({ streamId }),
  target: abortStream,
});

// Removed: Wire $miniChat.loading to streamChatFx.pending

//
// Expand Logic (stub)
//

export const expandMiniChatFx = createEffect<void, void>();

expandMiniChatFx.use(async () => {
  const miniChat = $miniChat.getState();
  if (!miniChat.messages.length) return;

  const id = crypto.randomUUID();
  const now = Date.now();

  const newChatSession = {
    id,
    createdAt: now,
    lastModified: now,
    title: "",
    messages: miniChat.messages.map((m) => ({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      role: m.role,
      content: m.content,
    })),
    settings: (() => {
      const miniChatModelId = $miniChatModelId.getState();
      const availableModels = $availableModels.getState();
      const modelInfo = availableModels.find((m) => m.id === miniChatModelId);

      return {
        model: {
          pricing: {
            prompt: Number(modelInfo?.pricing?.prompt) || 0,
            completion: Number(modelInfo?.pricing?.completion) || 0,
          },
          context_length: modelInfo?.context_length ?? 1000000,
        },
        temperature: $temperature.getState(),
        systemPrompt: $systemPrompt.getState(),
      };
    })(),
    totalTokens: 0,
    draft: "",
  };

  await saveChatFx(newChatSession);

  chatSelected(id);

  setMobileDrawerTab("history");
  closeMobileDrawer();

  resetMiniChat();
  hideMiniChatToolbar();
});

// --- Scroll Trigger Logic ---

sample({
  clock: [
    // Removed receiveMiniChatMessage as per new streaming logic
    sendMiniChatMessage,
    miniChatOpened,
    restoreMiniChat,
  ],
  target: triggerMiniChatScroll,
});

sample({
  clock: updateMiniChatInput,
  source: $miniChat,
  filter: (miniChatState) => miniChatState.isOpen,
  target: triggerMiniChatScroll,
});

sample({
  clock: expandMiniChat,
  target: expandMiniChatFx,
});

//
// Auto-Minimize Logic
//

const $shouldMinimize = sample({
  source: $miniChat,
  fn: (miniChatState) => miniChatState.isOpen && !miniChatState.isMinimized,
});

sample({
  clock: $isMobileDrawerOpen,
  source: $shouldMinimize,
  filter: (shouldMinimize, isDrawerOpen) => shouldMinimize && isDrawerOpen,
  target: minimizeMiniChat,
});

sample({
  clock: $isModelSelectorActive,
  source: $shouldMinimize,
  filter: (shouldMinimize, isSelectorActive) =>
    shouldMinimize && isSelectorActive,
  target: minimizeMiniChat,
});

sample({
  clock: $isMainInputFocused,
  source: $shouldMinimize,
  filter: (shouldMinimize, isInputFocused) => shouldMinimize && isInputFocused,
  target: minimizeMiniChat,
});
