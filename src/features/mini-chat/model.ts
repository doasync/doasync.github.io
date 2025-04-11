import {
  createStore,
  createEvent,
  createEffect,
  sample,
  guard,
} from "effector"; // Import guard
import { sendAssistantMessage } from "./api";
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
import { $isMobileDrawerOpen } from "@/features/ui-state/model"; // Import mobile drawer state
import { $isMainInputFocused } from "@/features/chat/model"; // Import main input focus state

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
  role: "user" | "assistant";
  content: string;
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
export const triggerMiniChatScroll = createEvent<void>("triggerMiniChatScroll"); // Event to trigger scroll

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
  .on(sendMiniChatMessage, (state, message) => ({
    ...state,
    isCompact: false, // Sending a message expands the view
    input: "",
    messages: [...state.messages, { role: "user", content: message }],
    loading: true,
  }))
  .on(receiveMiniChatMessage, (state, reply) => ({
    ...state,
    isCompact: false, // Receiving a message expands the view
    messages: [...state.messages, { role: "assistant", content: reply }],
    loading: false,
  }))
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
  .reset(resetMiniChat, miniChatClosed); // Reset on close/reset

//
// API Effect
//

export const sendMiniChatMessageFx = createEffect<
  { message: string; model?: string; apiKey: string },
  string,
  Error
>();

sendMiniChatMessageFx.use(async ({ message, model, apiKey }) => {
  return sendAssistantMessage({ message, model, apiKey });
});

//
// Wiring send → API → receive
//

sample({
  clock: sendMiniChatMessage,
  source: {
    apiKey: $apiKey,
    model: $miniChatModelId, // Use the dedicated mini-chat model ID
  },
  fn: ({ apiKey, model }, message) => ({ message, model, apiKey }),
  target: sendMiniChatMessageFx,
});

sample({
  clock: sendMiniChatMessageFx.doneData,
  target: receiveMiniChatMessage,
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
guard({
  clock: $isMobileDrawerOpen,
  source: $shouldMinimize,
  filter: (shouldMinimize, isDrawerOpen) => shouldMinimize && isDrawerOpen,
  target: minimizeMiniChat,
});

// Trigger 2: Main Model Selector Becomes Active
guard({
  clock: $isModelSelectorActive,
  source: $shouldMinimize,
  filter: (shouldMinimize, isSelectorActive) =>
    shouldMinimize && isSelectorActive,
  target: minimizeMiniChat,
});

// Trigger 3: Main Chat Input Gets Focus
guard({
  clock: $isMainInputFocused,
  source: $shouldMinimize,
  filter: (shouldMinimize, isInputFocused) => shouldMinimize && isInputFocused,
  target: minimizeMiniChat,
});
