import { createStore, createEvent, createEffect, sample } from "effector";
import { sendAssistantMessage } from "./api";
import {
  $apiKey,
  $temperature,
  $systemPrompt,
} from "@/features/chat-settings/model";
import { $selectedModelId } from "@/features/models-select/model";
import { saveChatFx } from "@/features/chat-history/model";
import { appStarted } from "@/app"; // Import appStarted for triggering load

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
}>(); // Add startCompact flag
export const miniChatClosed = createEvent();
export const updateMiniChatInput = createEvent<string>();

export const sendMiniChatMessage = createEvent<string>(); // message to send
export const receiveMiniChatMessage = createEvent<string>(); // assistant reply
export const expandMiniChat = createEvent();

export const resetMiniChat = createEvent();

export const $miniChat = createStore<MiniChatState>({
  isOpen: false,
  isCompact: false, // Initialize compact state
  input: "",
  messages: [],
  loading: false,
})
  .on(miniChatOpened, (state, { initialInput, startCompact }) => ({
    isOpen: true,
    isCompact: !!startCompact, // Set compact based on flag, default false
    input: initialInput ?? "",
    messages: state.isOpen ? state.messages : [],
    loading: false,
  }))
  .on(miniChatClosed, () => ({
    // Reset all state on close
    isOpen: false,
    isCompact: false,
    input: "",
    messages: [],
    loading: false,
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
  .reset(resetMiniChat);

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
    settings: {
      model: $selectedModelId.getState(),
      temperature: $temperature.getState(),
      systemPrompt: $systemPrompt.getState(),
    },
    totalTokens: 0, // optional, can be updated later
    draft: "",
  };

  await saveChatFx(newChatSession);

  // Close ephemeral mini chat after expand
  resetMiniChat();
  hideMiniChatToolbar();
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
