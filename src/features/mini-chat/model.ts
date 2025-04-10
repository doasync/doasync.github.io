import {
  createEvent,
  createStore,
  createEffect,
  sample,
  forward,
} from "effector";
import { fetchMiniChatResponse } from "./api";
import {
  saveChatFx,
  chatSelected,
  newChatCreated,
} from "@/features/chat-history/model";
import { $assistantModel } from "@/features/chat-settings/model";

export interface MiniChatMessage {
  role: "user" | "assistant";
  content: string;
  id: string;
}

export interface MiniChatState {
  messages: MiniChatMessage[];
  isOpen: boolean;
  isInputVisible: boolean;
  showOnlyInput: boolean;
  initialPrompt: string | null;
  position: { x: number; y: number };
}

export const miniChatOpened = createEvent<{
  initialPrompt?: string;
  isInputVisible?: boolean;
  showOnlyInput?: boolean;
  position?: { x: number; y: number };
}>();

export const miniChatClosed = createEvent();
export const miniChatMessageSent = createEvent<string>();
export const miniChatResponseReceived = createEvent<MiniChatMessage>();
export const miniChatExpanded = createEvent();

const initialState: MiniChatState = {
  messages: [],
  isOpen: false,
  isInputVisible: false,
  showOnlyInput: false,
  initialPrompt: null,
  position: { x: 100, y: 100 },
};

export const $miniChat = createStore<MiniChatState>(initialState)
  .on(miniChatOpened, (state, payload) => ({
    ...state,
    isOpen: true,
    isInputVisible: payload.showOnlyInput ? true : !!payload.initialPrompt,
    showOnlyInput: payload.showOnlyInput ?? false,
    initialPrompt: payload.initialPrompt ?? null,
    position: payload.position ?? state.position,
    messages: payload.initialPrompt
      ? [
          {
            role: "user",
            content: payload.initialPrompt,
            id: crypto.randomUUID(),
          },
        ]
      : [],
  }))
  .on(miniChatClosed, () => initialState)
  .on(miniChatMessageSent, (state, text) => ({
    ...state,
    messages: [
      ...state.messages,
      {
        role: "user",
        content: text,
        id: crypto.randomUUID(),
      },
    ],
  }))
  .on(miniChatResponseReceived, (state, message) => ({
    ...state,
    messages: [...state.messages, message],
  }));

export const sendMiniChatMessageFx = createEffect<
  { text: string; messages: MiniChatMessage[]; model: string },
  MiniChatMessage
>();

sendMiniChatMessageFx.use(async ({ text, messages, model }) => {
  return fetchMiniChatResponse(messages, model);
});

/* Mini Chat Toolbar UI State */
export interface MiniChatToolbarState {
  visible: boolean;
  selectedText: string;
  position: { top: number; left: number };
}

export const showMiniChatToolbar = createEvent<{
  selectedText: string;
  position: { top: number; left: number };
}>();
export const hideMiniChatToolbar = createEvent();

export const $miniChatToolbar = createStore<MiniChatToolbarState>({
  visible: false,
  selectedText: "",
  position: { top: 0, left: 0 },
})
  .on(showMiniChatToolbar, (_, payload) => ({
    visible: true,
    selectedText: payload.selectedText,
    position: payload.position,
  }))
  .on(hideMiniChatToolbar, () => ({
    visible: false,
    selectedText: "",
    position: { top: 0, left: 0 },
  }));

sample({
  clock: miniChatMessageSent,
  source: { chat: $miniChat, model: $assistantModel },
  fn: ({ chat, model }, text) => {
    const newMessage: MiniChatMessage = {
      role: "user",
      content: text,
      id: crypto.randomUUID(),
    };
    return {
      text,
      messages: [...chat.messages, newMessage],
      model,
    };
  },
  target: sendMiniChatMessageFx,
});

sample({
  clock: sendMiniChatMessageFx.doneData,
  target: miniChatResponseReceived,
});

export const promoteMiniChatFx = createEffect<MiniChatState, void>(
  async (miniChatState) => {
    const chatId = crypto.randomUUID();
    const now = Date.now();

    const newChat = {
      id: chatId,
      title: `Mini Chat Promoted - ${new Date(now).toLocaleString()}`,
      messages: miniChatState.messages.map((m) => ({
        role: m.role,
        content: m.content,
        id: m.id,
        timestamp: now,
      })),
      settings: {
        model: $assistantModel.getState(),
        temperature: 1,
        systemPrompt: "",
      },
      createdAt: now,
      lastModified: now,
      totalTokens: 0,
      draft: "",
    };

    await saveChatFx(newChat);
    newChatCreated();
    chatSelected(chatId);
    miniChatClosed();
  }
);

sample({
  clock: miniChatExpanded,
  source: $miniChat,
  target: promoteMiniChatFx,
});
