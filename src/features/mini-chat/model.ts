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

export interface MiniChatMessage {
  role: "user" | "assistant";
  content: string;
  id: string;
}

export interface MiniChatState {
  messages: MiniChatMessage[];
  isOpen: boolean;
  isInputVisible: boolean;
  initialPrompt: string | null;
}

export const miniChatOpened = createEvent<{ initialPrompt?: string }>();
export const miniChatClosed = createEvent();
export const miniChatMessageSent = createEvent<string>();
export const miniChatResponseReceived = createEvent<MiniChatMessage>();
export const miniChatExpanded = createEvent();

export const $miniChat = createStore<MiniChatState>({
  messages: [],
  isOpen: false,
  isInputVisible: false,
  initialPrompt: null,
})
  .on(miniChatOpened, (state, payload) => ({
    ...state,
    isOpen: true,
    isInputVisible: !!payload.initialPrompt ? false : true,
    initialPrompt: payload.initialPrompt ?? null,
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
  .on(miniChatClosed, () => ({
    messages: [],
    isOpen: false,
    isInputVisible: false,
    initialPrompt: null,
  }))
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
  .on(showMiniChatToolbar, (state, payload) => ({
    visible: true,
    selectedText: payload.selectedText,
    position: payload.position,
  }))
  .on(hideMiniChatToolbar, () => ({
    visible: false,
    selectedText: "",
    position: { top: 0, left: 0 },
  }));

/**
 * When user sends a message:
 * 1. Add user message to store
 * 2. Trigger API call with updated message list
 */
sample({
  clock: miniChatMessageSent,
  source: $miniChat,
  fn: (state, text) => {
    const newUserMessage: MiniChatMessage = {
      role: "user",
      content: text,
      id: crypto.randomUUID(),
    };
    return {
      text,
      messages: [...state.messages, newUserMessage],
      model: "mini-assistant-model", // TODO: replace with dynamic model selection
    };
  },
  target: sendMiniChatMessageFx,
});

// On successful API response, add assistant message to chat
sample({
  clock: sendMiniChatMessageFx.doneData,
  target: miniChatResponseReceived,
});

// TODO: handle API errors if needed

// Effect to promote mini chat to full chat
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
        timestamp: now, // Add timestamp to conform to Message type
      })),
      settings: {
        model: "mini-assistant-model", // TODO: replace with actual assistant model
        temperature: 1,
        systemPrompt: "",
      },
      createdAt: now,
      lastModified: now,
      totalTokens: 0,
      draft: "",
    };

    await saveChatFx(newChat);
    newChatCreated(); // no payload
    chatSelected(chatId); // expects string
    miniChatClosed();
  }
);

// Trigger promotion effect on expand event
sample({
  clock: miniChatExpanded,
  source: $miniChat,
  target: promoteMiniChatFx,
});

// Reset mini chat on close (also after expand)
$miniChat.on(miniChatClosed, () => ({
  messages: [],
  isOpen: false,
  isInputVisible: false,
  initialPrompt: null,
}));
