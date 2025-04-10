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

export interface InlineAskInputState {
  visible: boolean;
  x: number;
  y: number;
  value: string;
}

export interface MiniChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MiniChatState {
  isOpen: boolean;
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
// Inline Ask Input State (for FRD A2)
//
export const showInlineAskInput = createEvent<{
  x: number;
  y: number;
  initialValue: string;
}>();
export const hideInlineAskInput = createEvent();
export const updateInlineAskInputValue = createEvent<string>();
export const submitInlineAskInput = createEvent<string>(); // Submits the value

export const $inlineAskInput = createStore<InlineAskInputState>({
  visible: false,
  x: 0,
  y: 0,
  value: "",
})
  .on(showInlineAskInput, (_, { x, y, initialValue }) => ({
    visible: true,
    x,
    y,
    value: initialValue,
  }))
  .on(hideInlineAskInput, (state) => ({
    ...state,
    visible: false,
    value: "", // Clear value on hide
  }))
  .on(updateInlineAskInputValue, (state, value) => ({
    ...state,
    value,
  }));

// Moved the sample block that hides inline input further down
// to ensure dependencies (miniChatClosed, resetMiniChat) are defined first.

//
// Mini Chat State (Main Dialog)
//

export const miniChatOpened = createEvent<{ initialInput?: string }>();
export const miniChatClosed = createEvent();
export const updateMiniChatInput = createEvent<string>();

export const sendMiniChatMessage = createEvent<string>(); // message to send
export const receiveMiniChatMessage = createEvent<string>(); // assistant reply
export const expandMiniChat = createEvent();

export const resetMiniChat = createEvent();

export const $miniChat = createStore<MiniChatState>({
  isOpen: false,
  input: "",
  messages: [],
  loading: false,
})
  // Note: miniChatOpened is now primarily triggered by submitInlineAskInput or Explain flow
  .on(miniChatOpened, (state, { initialInput }) => ({
    isOpen: true,
    // Input for the main dialog should be cleared when opened this way
    input: "", // Main dialog input starts empty
    // Preserve messages if already open (e.g., Explain clicked while Ask dialog open), otherwise start fresh
    messages: state.isOpen ? state.messages : [],
    loading: false, // Reset loading state
  }))
  .on(miniChatClosed, () => ({
    isOpen: false,
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
    input: "",
    messages: [...state.messages, { role: "user", content: message }],
    loading: true,
  }))
  .on(receiveMiniChatMessage, (state, reply) => ({
    ...state,
    messages: [...state.messages, { role: "assistant", content: reply }],
    loading: false,
  }))
  .reset(resetMiniChat);

// When inline input is submitted, open the main chat and send the message
sample({
  clock: submitInlineAskInput,
  filter: (inputValue) => !!inputValue.trim(), // Only proceed if input is not empty
  fn: (inputValue) => ({ initialInput: inputValue }), // Pass submitted value (though dialog input starts empty)
  target: miniChatOpened,
});

sample({
  clock: submitInlineAskInput,
  filter: (inputValue) => !!inputValue.trim(), // Only proceed if input is not empty
  target: [sendMiniChatMessage, hideInlineAskInput], // Send message and hide inline input
});

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

// Hide inline input when main toolbar hides or chat closes/resets
sample({
  clock: [hideMiniChatToolbar, miniChatClosed, resetMiniChat],
  target: hideInlineAskInput,
});

// miniChatClosed already triggers resetMiniChat (which triggers hideInlineAskInput via sample above)
// It also implicitly hides the toolbar via the resetMiniChat sample trigger
