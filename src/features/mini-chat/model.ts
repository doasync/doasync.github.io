import {
  createEffect,
  createEvent,
  createStore,
  sample,
  // Removed split as per FIX_PLAN.md
} from 'effector';

import { appStarted } from '@/app';
import { $isMainInputFocused } from '@/features/chat';
import { chatSelected, saveChatFx } from '@/features/chat-history';
import {
  $apiKey,
  $providerApiUrl,
  $systemPrompt,
  $temperature,
} from '@/features/chat-settings';
// Removed old API import (already commented out)
import {
  abortStream,
  streamChatFx,
  StreamChatParams,
  StreamChunkPayload,
  StreamErrorPayload,
} from '@/features/chat-stream';
import {
  $availableModels,
  $isModelSelectorActive,
} from '@/features/models-select';
import {
  $isMobileDrawerOpen,
  closeMobileDrawer,
  setMobileDrawerTab,
} from '@/features/ui-state';

const MINI_CHAT_MODEL_ID_STORAGE_KEY = 'miniChatModelId_v1';
const DEFAULT_MINI_CHAT_MODEL = 'chatgpt-4o-latest';

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
  role: 'user' | 'assistant';
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
const loadMiniChatModelIdFx = createEffect<void, string | null>(() =>
  localStorage.getItem(MINI_CHAT_MODEL_ID_STORAGE_KEY),
);

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
  selectionText: '',
})
  .on(showMiniChatToolbar, (_, payload) => ({
    visible: true,
    ...payload,
  }))
  .on(hideMiniChatToolbar, (state) => ({
    ...state,
    visible: false,
    selectionText: '',
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
export const triggerMiniChatScroll = createEvent<void>('triggerMiniChatScroll');

export const stopMiniChatGenerationClicked = createEvent<void>(
  'stopMiniChatGenerationClicked',
);

// Event for adding user message to UI state - NEW as per FIX_PLAN.md
export const addMiniChatUserMessage = createEvent<MiniChatMessage>(
  'addMiniChatUserMessage',
);

// Internal event to signal stream request start with its ID - Moved for declaration order
const miniChatStreamRequestInitiated = createEvent<{ streamId: string }>(
  'miniChatStreamRequestInitiated',
);

// Store for the currently active stream ID (for cancellation) - Moved for declaration order
export const $miniChatActiveStreamId = createStore<string | null>(null, {
  name: '$miniChatActiveStreamId',
});

$miniChatActiveStreamId.on(
  miniChatStreamRequestInitiated,
  (_, { streamId }) => streamId,
);

export const $miniChat = createStore<MiniChatState>({
  isOpen: false,
  isCompact: false,
  input: '',
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
    input: '',
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
  .on(addMiniChatUserMessage, (state, userMessage) => ({
    ...state,
    messages: [...state.messages, userMessage],
    isCompact: false, // Expand on send
    input: '', // Clear input
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
  name: '$miniChatScrollTrigger',
})
  .on(triggerMiniChatScroll, () => Date.now())
  .reset(resetMiniChat, miniChatClosed);

// --- Stream Handling Logic ---

// Define internal events FIRST
const miniChatMessageChunkReceived = createEvent<{
  placeholderId: string;
  chunkContent: string;
}>();
const miniChatMessageCompleted = createEvent<{ placeholderId: string }>();
const miniChatMessageErrored = createEvent<{
  placeholderId: string;
  error: Error;
}>();
const miniChatMessageAborted = createEvent<{ placeholderId: string }>();

// Add reset logic to active stream ID store
$miniChatActiveStreamId.reset(
  miniChatMessageCompleted,
  miniChatMessageErrored,
  miniChatMessageAborted,
);

// Add handlers to $miniChat store for internal events
$miniChat
  .on(
    miniChatMessageChunkReceived,
    (state, { placeholderId, chunkContent }) => {
      const targetMessageIndex = state.messages.findIndex(
        (m) => m.id === placeholderId,
      );
      if (targetMessageIndex === -1) return state;

      const updatedMessage = {
        ...state.messages[targetMessageIndex],
        content: state.messages[targetMessageIndex].content + chunkContent,
        isLoading: true, // Keep loading until complete/error/abort
      };
      const newMsgs = [...state.messages];
      newMsgs[targetMessageIndex] = updatedMessage;
      return { ...state, messages: newMsgs };
    },
  )
  .on(miniChatMessageCompleted, (state, { placeholderId }) => {
    const targetMessageIndex = state.messages.findIndex(
      (m) => m.id === placeholderId,
    );
    if (targetMessageIndex === -1) return state;

    const updatedMessage = {
      ...state.messages[targetMessageIndex],
      isLoading: false,
    };
    const newMsgs = [...state.messages];
    newMsgs[targetMessageIndex] = updatedMessage;
    return { ...state, messages: newMsgs, loading: false }; // MODIFIED: Set loading to false
  })
  .on(miniChatMessageErrored, (state, { placeholderId, error }) => {
    const targetMessageIndex = state.messages.findIndex(
      (m) => m.id === placeholderId,
    );
    if (targetMessageIndex === -1) return state;

    const updatedMessage = {
      ...state.messages[targetMessageIndex],
      isLoading: false,
      content: `Error: ${error.message}`,
    };
    const newMsgs = [...state.messages];
    newMsgs[targetMessageIndex] = updatedMessage;
    return { ...state, messages: newMsgs, loading: false }; // MODIFIED: Set loading to false
  })
  .on(miniChatMessageAborted, (state, { placeholderId }) => {
    const targetMessageIndex = state.messages.findIndex(
      (m) => m.id === placeholderId,
    );
    if (targetMessageIndex === -1) return state;

    const updatedMessage = {
      ...state.messages[targetMessageIndex],
      isLoading: false,
    };
    const newMsgs = [...state.messages];
    newMsgs[targetMessageIndex] = updatedMessage;
    return { ...state, messages: newMsgs, loading: false }; // MODIFIED: Set loading to false
  });

// Placeholder event for adding the placeholder message - Adjusted as per FIX_PLAN.md
const addPlaceholderMessage = createEvent<MiniChatMessage>();
$miniChat.on(addPlaceholderMessage, (state, placeholder) => ({
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

const prepareAndTriggerStream = createEvent<PrepareStreamPayload>(
  'prepareAndTriggerMiniChatStream',
);

// Removed the old split block here as per FIX_PLAN.md

// Refactored sample for sending a message - NEW target as per FIX_PLAN.md
sample({
  clock: sendMiniChatMessage,
  source: {
    apiKey: $apiKey,
    providerApiUrl: $providerApiUrl,
    model: $miniChatModelId,
    currentMessages: $miniChat.map((s) => s.messages),
  },
  filter: ({ apiKey }) => !!apiKey,
  fn: (
    { apiKey, providerApiUrl, model, currentMessages },
    messageText,
  ): PrepareStreamPayload => {
    const streamId = crypto.randomUUID();
    const placeholderId = crypto.randomUUID();

    const userMessage: MiniChatMessage = { role: 'user', content: messageText };
    const placeholderMessage: MiniChatMessage = {
      id: placeholderId,
      role: 'assistant',
      content: '',
      isLoading: true,
    };

    const messagesForApi = [...currentMessages, userMessage];

    const onChunk = ({ chunk }: StreamChunkPayload) => {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        miniChatMessageChunkReceived({ placeholderId, chunkContent: content });
      }
    };
    const onComplete = () => {
      miniChatMessageCompleted({ placeholderId });
      triggerMiniChatScroll();
    };
    const onError = ({ error }: StreamErrorPayload) => {
      console.error(`[MiniChat Stream ${streamId}] Error:`, error);
      miniChatMessageErrored({ placeholderId, error });
    };
    const onAbort = () => {
      console.log(`[MiniChat Stream ${streamId}] Aborted.`);
      miniChatMessageAborted({ placeholderId });
    };

    const streamParams: StreamChatParams = {
      streamId,
      model,
      messages: messagesForApi,
      apiKey,
      providerApiUrl,
      onChunk,
      onComplete,
      onError,
      onAbort,
    };

    return { streamParams, streamId, placeholderMessage, userMessage };
  },
  target: prepareAndTriggerStream, // Target the new event
});

// Chain samples to orchestrate sequential updates and API call - as per FIX_PLAN.md
// 1. Add user message to UI state
sample({
  clock: prepareAndTriggerStream,
  target: addMiniChatUserMessage.prepend<PrepareStreamPayload>(
    (p) => p.userMessage,
  ),
});

// 2. Add placeholder message to UI state
sample({
  clock: prepareAndTriggerStream,
  target: addPlaceholderMessage.prepend<PrepareStreamPayload>(
    (p) => p.placeholderMessage,
  ),
});

// 3. Notify about stream initiation (for activeStreamId)
sample({
  clock: prepareAndTriggerStream,
  target: miniChatStreamRequestInitiated.prepend<PrepareStreamPayload>((p) => ({
    streamId: p.streamId,
  })),
});

// 4. Finally, trigger the stream effect
sample({
  clock: prepareAndTriggerStream,
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

interface ExpandMiniChatParams {
  miniChat: MiniChatState;
  miniChatModelId: string;
  availableModels: Array<{
    id: string;
    pricing?: { prompt?: number; completion?: number };
    context_length?: number;
  }>;
  temperature: number;
  systemPrompt: string;
}

export const expandMiniChatFx = createEffect<ExpandMiniChatParams, void>();

expandMiniChatFx.use(
  async ({
    miniChat,
    miniChatModelId,
    availableModels,
    temperature,
    systemPrompt,
  }) => {
    if (miniChat.messages.length === 0) return;

    const id = crypto.randomUUID();
    const now = Date.now();

    const modelInfo = availableModels.find((m) => m.id === miniChatModelId);

    const newChatSession = {
      id,
      createdAt: now,
      lastModified: now,
      title: '',
      messages: miniChat.messages.map((m) => ({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        role: m.role,
        content: m.content,
      })),
      settings: {
        model: {
          pricing: {
            prompt: Number(modelInfo?.pricing?.prompt) || 0,
            completion: Number(modelInfo?.pricing?.completion) || 0,
          },
          context_length: modelInfo?.context_length ?? 1_000_000,
        },
        temperature,
        systemPrompt,
      },
      totalTokens: 0,
      draft: '',
    };

    await saveChatFx(newChatSession);

    chatSelected(id);

    setMobileDrawerTab('history');
    closeMobileDrawer();

    resetMiniChat();
    hideMiniChatToolbar();
  },
);

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
  source: {
    miniChat: $miniChat,
    miniChatModelId: $miniChatModelId,
    availableModels: $availableModels,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
  },
  fn: ({
    miniChat,
    miniChatModelId,
    availableModels,
    temperature,
    systemPrompt,
  }): ExpandMiniChatParams => ({
    miniChat,
    miniChatModelId,
    availableModels: availableModels.map((model) => ({
      id: model.id,
      pricing: model.pricing
        ? {
            prompt: model.pricing.prompt
              ? Number(model.pricing.prompt)
              : undefined,
            completion: model.pricing.completion
              ? Number(model.pricing.completion)
              : undefined,
          }
        : undefined,
      context_length: model.context_length,
    })),
    temperature,
    systemPrompt,
  }),
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
  filter: (shouldMinimize: boolean, isSelectorActive: boolean) =>
    shouldMinimize && isSelectorActive,
  target: minimizeMiniChat,
});

sample({
  clock: $isMainInputFocused,
  source: $shouldMinimize,
  filter: (shouldMinimize: boolean, isInputFocused: boolean) =>
    shouldMinimize && isInputFocused,
  target: minimizeMiniChat,
});
