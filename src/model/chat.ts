import {
  createStore,
  createEvent,
  createEffect,
  sample,
  createDomain,
} from "effector";
import { $apiKey, $temperature, $systemPrompt } from "./settings";
import { debug } from "patronum/debug";
import { $selectedModelId } from "./models";

// Types
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string | any;
  timestamp: number;
  isEdited?: boolean;
  originalContent?: string | any;
}

interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string | any;
}

interface OpenRouterRequestBody {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
}

interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenRouterResponseChoice {
  finish_reason: string;
  message: OpenRouterMessage;
}

export interface OpenRouterResponseBody {
  id: string;
  model: string;
  choices: OpenRouterResponseChoice[];
  usage: OpenRouterUsage;
}

interface OpenRouterErrorBody {
  error: {
    code: number;
    message: string;
  };
}

interface SendApiRequestParams {
  modelId: string;
  messages: Message[];
  apiKey: string;
  temperature: number;
  systemPrompt: string;
}

// Domain
const chatDomain = createDomain("chat");

// Stores
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
});

// Events
export const messageTextChanged =
  chatDomain.event<string>("messageTextChanged");
export const messageSent = chatDomain.event<void>("messageSent");
export const editMessage = chatDomain.event<{
  messageId: string;
  newContent: string;
}>("editMessage");
export const deleteMessage = chatDomain.event<string>("deleteMessage");
export const messageDeleted = chatDomain.event<string>("messageDeleted");
export const retryMessage = chatDomain.event<string>("retryMessage");
export const messageEditStarted =
  chatDomain.event<string>("messageEditStarted");
export const messageEditCancelled = chatDomain.event<string>(
  "messageEditCancelled"
);
export const messageEditConfirmed = chatDomain.event<{
  messageId: string;
  newContent: string;
}>("messageEditConfirmed");
export const initialChatSaveNeeded = chatDomain.event<void>(
  "initialChatSaveNeeded"
);
export const apiRequestTokensUpdated = chatDomain.event<OpenRouterResponseBody>(
  "apiRequestTokensUpdated"
);

// Internal event to add a message (used by API response)
const messageAdded = chatDomain.event<Message>("messageAdded");

// Effects
export const sendApiRequestFx = chatDomain.effect<
  SendApiRequestParams,
  OpenRouterResponseBody,
  Error
>({
  name: "sendApiRequestFx",
  handler: async ({ modelId, messages, apiKey, temperature, systemPrompt }) => {
    const apiMessages: OpenRouterMessage[] = [];
    if (systemPrompt && systemPrompt.trim()) {
      apiMessages.push({ role: "system", content: systemPrompt });
    }
    messages.forEach((msg) => {
      apiMessages.push({
        role: msg.role,
        content: msg.isEdited ? msg.content : msg.content, // Use edited content if available
      });
    });
    const body: OpenRouterRequestBody = {
      model: modelId,
      messages: apiMessages,
      temperature,
    };
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      }
    );
    if (!response.ok) {
      let errorMsg = `HTTP error! status: ${response.status}`;
      try {
        const errorBody: OpenRouterErrorBody = await response.json();
        errorMsg = `API Error (${response.status}): ${errorBody.error.message}`;
      } catch {}
      throw new Error(errorMsg);
    }
    const data: OpenRouterResponseBody = await response.json();
    return data;
  },
});

// Logic
$messageText.on(messageTextChanged, (_, text) => text);

$messages
  .on(messageEditConfirmed, (list, { messageId, newContent }) =>
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
  .on(deleteMessage, (list, id) => list.filter((msg) => msg.id !== id));

$apiError.reset(messageSent);

const userMessageCreated = sample({
  clock: messageSent,
  source: $messageText,
  filter: (text) => text.trim().length > 0,
  fn: (text): Message => ({
    id: crypto.randomUUID(),
    role: "user",
    content: text.trim(),
    timestamp: Date.now(),
  }),
});

sample({
  clock: userMessageCreated,
  source: $messages,
  fn: (messages, newMsg) => [...messages, newMsg],
  target: $messages, // Use $messages store directly
});

sample({
  clock: userMessageCreated,
  source: $messages,
  filter: (msgs) => msgs.length === 0,
  target: initialChatSaveNeeded,
});

sample({
  clock: userMessageCreated,
  source: {
    messages: $messages,
    apiKey: $apiKey,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
  },
  filter: ({ apiKey }) => apiKey.length > 0,
  fn: (
    { messages, apiKey, temperature, systemPrompt, selectedModelId },
    userMsg
  ) => ({
    modelId: selectedModelId,
    messages: [...messages, userMsg],
    apiKey,
    temperature,
    systemPrompt,
  }),
  target: sendApiRequestFx,
});

sample({
  clock: userMessageCreated,
  fn: () => "",
  target: $messageText,
});

// API loading state
$isGenerating.on(sendApiRequestFx, () => true).reset(sendApiRequestFx.finally);

// API response success event
export const apiRequestSuccess = sample({
  clock: sendApiRequestFx.doneData,
});

// Add assistant message
sample({
  clock: apiRequestSuccess,
  source: $messages,
  fn: (messages, response): Message[] => {
    const content = response.choices?.[0]?.message?.content;
    const newMessage: Message = content
      ? {
          id: response.id || crypto.randomUUID(),
          role: "assistant",
          content,
          timestamp: Date.now(),
        }
      : {
          id: response.id || crypto.randomUUID(),
          role: "assistant",
          content: "Error: Empty response",
          timestamp: Date.now(),
        };
    return [...messages, newMessage];
  },
  target: $messages, // Use $messages store directly
});

// Update token count and emit update event
sample({
  clock: apiRequestSuccess,
  source: $currentChatTokens,
  fn: (currentTokens, response) =>
    currentTokens + (response.usage?.total_tokens ?? 0),
  target: $currentChatTokens,
});

sample({
  clock: apiRequestSuccess,
  fn: (response) => response,
  target: apiRequestTokensUpdated,
});

// Reset error on API success
$apiError.reset(apiRequestSuccess);

// API failure
sample({
  clock: sendApiRequestFx.failData,
  fn: (error) => error.message,
  target: $apiError,
});

import { showApiKeyDialog } from "@/model/ui";

sample({
  clock: messageSent,
  source: $apiKey,
  filter: (key) => key.trim().length === 0,
  target: showApiKeyDialog, // Trigger dialog if API key is missing
});

debug(
  $messageText,
  $messages,
  $isGenerating,
  $apiError,
  $currentChatTokens,
  messageTextChanged,
  messageSent,
  editMessage,
  deleteMessage,
  retryMessage,
  sendApiRequestFx
);
