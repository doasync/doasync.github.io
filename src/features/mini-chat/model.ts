import {
  createStore,
  createEvent,
  createEffect,
  sample,
  split,
} from "effector"; // Added split
// import { sendAssistantMessage } from "./api"; // Removed old API import
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
  $apiKey,
  $temperature,
  $systemPrompt,
} from "@/features/chat-settings/model";
import {
  $selectedModelId,
  $availableModels,
  $isModelSelectorActive, // Import model selector focus state
} from "@/features/models-select/model";
import { saveChatFx } from "@/features/chat-history/model";
import { appStarted } from "@/app"; // Import appStarted for triggering load
import {
  $isMobileDrawerOpen,
  setMobileDrawerTab,
  closeMobileDrawer,
} from "@/features/ui-state/model"; // Import mobile drawer state and tab switching
import { $isMainInputFocused } from "@/features/chat/model"; // Import main input focus state
import { chatSelected } from "@/features/chat-history/model"; // Import chat selection for main chat switch

const MINI_CHAT_MODEL_ID_STORAGE_KEY = "miniChatModelId_v1";
const DEFAULT_MINI_CHAT_MODEL = "openai/gpt-3.5-turbo"; // Or choose another default

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
  id?: string; // Add optional ID for placeholder tracking
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean; // Add loading state for streaming
}

export interface MiniChatState {
  isOpen: boolean;
  isCompact: boolean; // Add compact state flag
  input: string;
  messages: MiniChatMessage[];
  loading: boolean;
  isMinimized: boolean; // Flag for minimized state
  initialX?: number | null; // Optional initial position X
  initialY?: number | null; // Optional initial position Y
}

//
// Mini Chat Settings State
//
export const miniChatModelSelected = createEvent<string>();
export const miniChatSettingsLoaded = createEvent(); // Triggered on app start

export const $miniChatModelId = createStore<string>(DEFAULT_MINI_CHAT_MODEL);

// Persistence Effects
const loadMiniChatModelIdFx = createEffect<void, string | null>(() => {
  return localStorage.getItem(MINI_CHAT_MODEL_ID_STORAGE_KEY);
});

const saveMiniChatModelIdFx = createEffect<string, void>((modelId) => {
  localStorage.setItem(MINI_CHAT_MODEL_ID_STORAGE_KEY, modelId);
});

// --- Wiring Persistence ---
// Load on app start
sample({
  clock: appStarted, // Use appStarted from "@/app"
  target: loadMiniChatModelIdFx,
});

// Update store on successful load
sample({
  clock: loadMiniChatModelIdFx.doneData,
  filter: (loadedId): loadedId is string => loadedId !== null, // Only update if not null
  target: $miniChatModelId,
});

// Update store on manual selection
$miniChatModelId.on(miniChatModelSelected, (_, newModelId) => newModelId);

// Save to localStorage whenever the store changes
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
  x?: number; // Add optional position
  y?: number; // Add optional position
}>();
export const miniChatClosed = createEvent();
export const updateMiniChatInput = createEvent<string>();

export const sendMiniChatMessage = createEvent<string>(); // message to send
export const receiveMiniChatMessage = createEvent<string>(); // assistant reply
export const expandMiniChat = createEvent();
export const minimizeMiniChat = createEvent(); // Event to minimize
export const restoreMiniChat = createEvent(); // Event to restore from FAB

export const resetMiniChat = createEvent();
export const triggerMiniChatScroll = createEvent<void>("triggerMiniChatScroll");
// Event to trigger stream cancellation from UI
export const stopMiniChatGenerationClicked = createEvent<void>(
  "stopMiniChatGenerationClicked"
);

export const $miniChat = createStore<MiniChatState>({
  isOpen: false,
  isCompact: false, // Initialize compact state
  input: "",
  messages: [],
  loading: false,
  isMinimized: false, // Initialize minimized state
  initialX: null, // Initialize position
  initialY: null, // Initialize position
})
  .on(miniChatOpened, (state, { initialInput, startCompact, x, y }) => ({
    ...state, // Keep existing messages etc. if already open
    isOpen: true,
    isCompact: !!startCompact, // Set compact based on flag, default false
    input: initialInput ?? state.input, // Use initial input or keep current
    messages: state.isOpen ? state.messages : [], // Reset messages only if it was previously closed
    loading: false,
    isMinimized: false, // Ensure it's not minimized when opened/re-opened
    initialX: x ?? null, // Store initial position if provided
    initialY: y ?? null, // Store initial position if provided
  }))
  .on(miniChatClosed, () => ({
    // Reset all state on close
    isOpen: false,
    isCompact: false,
    input: "",
    messages: [],
    loading: false,
    isMinimized: false, // Also reset minimized state on close
    initialX: null, // Reset initial position
    initialY: null, // Reset initial position
  }))
  .on(updateMiniChatInput, (state, input) => ({
    ...state,
    input,
  }))
  // Refactor sendMiniChatMessage logic below using samples and split
  // .on(sendMiniChatMessage, ...) // Removed direct state update
  // .on(receiveMiniChatMessage, ...) // Removed direct state update
  .on(minimizeMiniChat, (state) => ({
    ...state,
    isMinimized: true,
  }))
  .on(restoreMiniChat, (state) => ({
    ...state,
    isMinimized: false,
  }))
  .reset(resetMiniChat);

// Scroll trigger store
export const $miniChatScrollTrigger = createStore<number>(0, {
  name: "$miniChatScrollTrigger",
})
  .on(triggerMiniChatScroll, () => Date.now())
  .reset(resetMiniChat, miniChatClosed);

// Store for the currently active stream ID (for cancellation)
export const $miniChatActiveStreamId = createStore<string | null>(null, {
  name: "$miniChatActiveStreamId",
});
// Internal event to signal stream request start with its ID
const miniChatStreamRequestInitiated = createEvent<{ streamId: string }>(
  "miniChatStreamRequestInitiated"
);

$miniChatActiveStreamId.on(
  miniChatStreamRequestInitiated,
  (_, { streamId }) => streamId
);
// Reset logic will be added later, triggered by internal callback events

// Removed old API Effect (sendMiniChatMessageFx)

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
        isLoading: true, // Keep loading
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
    // loading state is now driven by streamChatFx.pending
    return { ...state, messages: newMsgs };
  })
  .on(_miniChatMessageErrored, (state, { placeholderId, error }) => {
    const targetMsgIndex = state.messages.findIndex(
      (m) => m.id === placeholderId
    );
    if (targetMsgIndex === -1) return state;

    const updatedMsg = {
      ...state.messages[targetMsgIndex],
      isLoading: false,
      content: `Error: ${error.message}`, // Example error display
    };
    const newMsgs = [...state.messages];
    newMsgs[targetMsgIndex] = updatedMsg;
    // Potentially add a separate error state to $miniChat if needed
    // loading state is now driven by streamChatFx.pending
    return { ...state, messages: newMsgs };
  })
  .on(_miniChatMessageAborted, (state, { placeholderId }) => {
    const targetMsgIndex = state.messages.findIndex(
      (m) => m.id === placeholderId
    );
    if (targetMsgIndex === -1) return state;

    const updatedMsg = { ...state.messages[targetMsgIndex], isLoading: false };
    const newMsgs = [...state.messages];
    newMsgs[targetMsgIndex] = updatedMsg;
    // loading state is now driven by streamChatFx.pending
    return { ...state, messages: newMsgs };
  });

// Placeholder event for adding the placeholder message
const _addPlaceholderMessage = createEvent<MiniChatMessage>();
$miniChat.on(_addPlaceholderMessage, (state, placeholder) => ({
  ...state,
  isCompact: false, // Expand on send
  input: "", // Clear input
  messages: [...state.messages, placeholder],
  // loading: true, // Removed - loading state driven by streamChatFx.pending
}));

//
// Wiring send → API → receive
//

// Helper type for split payload
type MiniChatStreamTriggerPayload = {
  streamParams: StreamChatParams;
  streamId: string;
  placeholderMessage: MiniChatMessage;
};

// Combined event/effect trigger using split
const triggerMiniChatStream = createEvent<MiniChatStreamTriggerPayload>();

split({
  source: triggerMiniChatStream,
  match: {
    placeholder: (p): p is MiniChatStreamTriggerPayload =>
      !!p.placeholderMessage,
    start: (p): p is MiniChatStreamTriggerPayload => !!p.streamId,
    effect: (p): p is MiniChatStreamTriggerPayload => !!p.streamParams,
  },
  cases: {
    placeholder: _addPlaceholderMessage.prepend<MiniChatStreamTriggerPayload>(
      (p) => p.placeholderMessage
    ),
    start: miniChatStreamRequestInitiated.prepend<MiniChatStreamTriggerPayload>(
      (p) => ({ streamId: p.streamId })
    ),
    effect: streamChatFx.prepend<MiniChatStreamTriggerPayload>(
      (p) => p.streamParams
    ),
  },
});

// Refactored sample for sending a message
sample({
  clock: sendMiniChatMessage, // User triggers this event with the text content
  source: {
    apiKey: $apiKey,
    model: $miniChatModelId,
    currentMessages: $miniChat.map((s) => s.messages), // Get current messages for history
  },
  filter: ({ apiKey }) => !!apiKey,
  fn: (
    { apiKey, model, currentMessages },
    messageText
  ): MiniChatStreamTriggerPayload => {
    // 1. Generate IDs
    const streamId = crypto.randomUUID();
    const placeholderId = crypto.randomUUID();

    // 2. Create User and Placeholder Messages
    const userMessage: MiniChatMessage = { role: "user", content: messageText };
    const placeholderMessage: MiniChatMessage = {
      id: placeholderId, // Assign ID to placeholder
      role: "assistant",
      content: "",
      isLoading: true,
    };

    // Prepare history for API
    const messagesForApi = [...currentMessages, userMessage];

    // 3. Define Callbacks
    const onChunk = ({ chunk }: StreamChunkPayload) => {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        _miniChatMessageChunkReceived({ placeholderId, chunkContent: content });
      }
    };
    const onComplete = () => {
      _miniChatMessageCompleted({ placeholderId });
      triggerMiniChatScroll(); // Scroll on completion
    };
    const onError = ({ error }: StreamErrorPayload) => {
      console.error(`[MiniChat Stream ${streamId}] Error:`, error);
      _miniChatMessageErrored({ placeholderId, error });
    };
    const onAbort = () => {
      console.log(`[MiniChat Stream ${streamId}] Aborted.`);
      _miniChatMessageAborted({ placeholderId });
    };

    // 4. Prepare StreamChatParams
    const streamParams: StreamChatParams = {
      streamId,
      model,
      messages: messagesForApi, // Pass history including the new user message
      apiKey,
      // temperature, systemPrompt could be added from settings if needed
      onChunk,
      onComplete,
      onError,
      onAbort,
    };

    // 5. Return payload for split
    // Note: We pass the *placeholder* message, not the user message, to the split target
    // because _addPlaceholderMessage needs it. The user message is implicitly added
    // when preparing messagesForApi.
    return { streamParams, streamId, placeholderMessage };
  },
  target: triggerMiniChatStream, // Target the split event
});

// Removed old sample wiring sendMiniChatMessageFx.doneData to receiveMiniChatMessage

// --- Cancellation Logic ---
sample({
  clock: stopMiniChatGenerationClicked,
  source: $miniChatActiveStreamId,
  filter: (streamId: string | null): streamId is string => !!streamId,
  fn: (streamId) => ({ streamId }),
  target: abortStream, // Target the abortStream event from chat-stream
});

//
// Expand Logic (stub)
//

export const expandMiniChatFx = createEffect<void, void>();

expandMiniChatFx.use(async () => {
  const miniChat = $miniChat.getState();
  if (!miniChat.messages.length) return; // nothing to save

  const id = crypto.randomUUID();
  const now = Date.now();

  const newChatSession = {
    id,
    createdAt: now,
    lastModified: now,
    title: "", // empty, triggers auto-title generation later
    messages: miniChat.messages.map((m) => ({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      role: m.role,
      content: m.content,
    })),
    settings: (() => {
      // Get the full model info for the mini-chat's current model
      const miniChatModelId = $miniChatModelId.getState();
      const availableModels = $availableModels.getState();
      const modelInfo = availableModels.find((m) => m.id === miniChatModelId);

      return {
        // Assign the minimal model info object
        model: {
          pricing: {
            prompt: Number(modelInfo?.pricing?.prompt) || 0,
            completion: Number(modelInfo?.pricing?.completion) || 0,
          },
          context_length: modelInfo?.context_length ?? 1000000, // Default if not found
        },
        temperature: $temperature.getState(),
        systemPrompt: $systemPrompt.getState(),
      };
    })(),
    totalTokens: 0, // optional, can be updated later
    draft: "",
  };

  await saveChatFx(newChatSession);

  // After saving, trigger main chat selection and UI tab/nav
  chatSelected(id);

  // On mobile: switch to the "history" tab (main chat), or close drawer if main chat is outside drawer
  // This covers both tabbed mobile drawer ("history") and drawer-closed UX
  setMobileDrawerTab("history");
  closeMobileDrawer();

  // Close ephemeral mini chat after expand
  resetMiniChat();
  hideMiniChatToolbar();
});

// --- Scroll Trigger Logic ---

// Trigger scroll
sample({
  clock: [
    sendMiniChatMessage,
    receiveMiniChatMessage,
    miniChatOpened,
    restoreMiniChat,
  ],
  target: triggerMiniChatScroll,
});

// Trigger scroll after quoting text into an already open chat
sample({
  clock: updateMiniChatInput,
  source: $miniChat,
  filter: (miniChatState) => miniChatState.isOpen, // Only trigger if already open
  target: triggerMiniChatScroll,
});

sample({
  clock: expandMiniChat,
  target: expandMiniChatFx,
});

//
// Close/Reset Logic
//

// No need for the extra sample block here anymore

// miniChatClosed already triggers resetMiniChat (which triggers hideInlineAskInput via sample above)
// It also implicitly hides the toolbar via the resetMiniChat sample trigger

//
// Auto-Minimize Logic
//

const $shouldMinimize = sample({
  source: $miniChat,
  fn: (miniChatState) => miniChatState.isOpen && !miniChatState.isMinimized,
});

// Trigger 1: Mobile Drawer Opens
sample({
  clock: $isMobileDrawerOpen,
  source: $shouldMinimize,
  filter: (shouldMinimize, isDrawerOpen) => shouldMinimize && isDrawerOpen,
  target: minimizeMiniChat,
});

// Trigger 2: Main Model Selector Becomes Active
sample({
  clock: $isModelSelectorActive,
  source: $shouldMinimize,
  filter: (shouldMinimize, isSelectorActive) =>
    shouldMinimize && isSelectorActive,
  target: minimizeMiniChat,
});

// Trigger 3: Main Chat Input Gets Focus
sample({
  clock: $isMainInputFocused,
  source: $shouldMinimize,
  filter: (shouldMinimize, isInputFocused) => shouldMinimize && isInputFocused,
  target: minimizeMiniChat,
});
