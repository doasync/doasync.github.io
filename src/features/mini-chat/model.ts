import { createStore, createEvent, createEffect, sample } from "effector";
import { sendAssistantMessage } from "./api";
import { $apiKey } from "@/features/chat-settings/model";
import { $selectedModelId } from "@/features/models-select/model";

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
  input: string;
  messages: MiniChatMessage[];
  loading: boolean;
}

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
// Mini Chat State
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
  .on(miniChatOpened, (state, { initialInput }) => ({
    isOpen: true,
    input: initialInput ?? "",
    messages: state.isOpen ? state.messages : [],
    loading: false,
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
    model: $selectedModelId,
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
  // This should migrate ephemeral chat to persistent chat history
  // Placeholder: implement save logic here
});

sample({
  clock: expandMiniChat,
  target: expandMiniChatFx,
});

//
// Close resets everything
//

miniChatClosed.watch(() => {
  resetMiniChat();
  hideMiniChatToolbar();
});
