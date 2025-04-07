// guard is deprecated, use sample instead
import { sample, createDomain } from "effector";
import { $apiKey, $temperature, $systemPrompt } from "./settings";
import { debug } from "patronum/debug";
import { $selectedModelId } from "./models";

// Types
export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string | any;
  timestamp: number;
  isEdited?: boolean;
  originalContent?: string | any;
}

interface OpenRouterMessage {
  role: Role;
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

export interface SendApiRequestParams {
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
  // Note: This might be redundant now
  messageId: string;
  newContent: string;
}>("editMessage");
export const deleteMessage = chatDomain.event<string>("deleteMessage");
export const retryMessage = chatDomain.event<string>("retryMessage"); // Keep original retryMessage for now
export const messageRetry = chatDomain.event<Message>("messageRetry"); // New event for retry logic

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
      // Ensure only user and assistant messages are sent
      if (msg.role === "user" || msg.role === "assistant") {
        apiMessages.push({
          role: msg.role,
          // Use edited content if available (content property is updated by editMessage handler)
          content: msg.content,
        });
      }
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

// --- Retry Logic Events/Stores (Declare AFTER sendApiRequestFx) ---
const messageRetryInitiated = chatDomain.event<{
  messageId: string;
  role: Role;
}>("messageRetryInitiated");

export const $retryingMessageId = chatDomain // Added export
  .store<string | null>(null)
  .on(messageRetryInitiated, (_, { messageId }) => messageId)
  .reset(sendApiRequestFx.finally); // Now sendApiRequestFx is declared
// --- End Retry Logic Events/Stores ---

// Logic
$messageText.on(messageTextChanged, (_, text) => text);

$messages
  .on(editMessage, (list, { messageId, newContent }) =>
    list.map((msg) =>
      msg.id === messageId
        ? {
            ...msg,
            content: newContent, // Update content directly
            isEdited: true,
            originalContent: msg.content, // Store original before update
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

// Trigger API request on new user message
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
  ): SendApiRequestParams => ({
    // Ensure return type matches target
    modelId: selectedModelId,
    messages: [...messages, userMsg], // Send current + new user message
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

// Add assistant message on successful API response (for normal flow, not retry)
sample({
  clock: apiRequestSuccess,
  source: { messages: $messages, retryingId: $retryingMessageId }, // Source retryingId
  filter: ({ retryingId }) => retryingId === null, // Only run if NOT retrying
  fn: ({ messages }, response): Message[] => {
    // Destructure source
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
  target: $messages,
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

// --- Retry Logic ---

// Define a type predicate to check if a message is retryable
const isRetryableMessage = (
  message: Message
): message is Message & { role: "user" | "assistant" } => {
  return message.role === "user" || message.role === "assistant";
};

// Prepare parameters for the API request when retry is triggered
const prepareRetryParams = sample({
  clock: messageRetry,
  source: {
    messages: $messages,
    apiKey: $apiKey,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
  },
  // Filter out system messages and ensure API key exists
  filter: ({ apiKey }, messageToRetry) =>
    apiKey.length > 0 && isRetryableMessage(messageToRetry),
  fn: (
    { messages, apiKey, temperature, systemPrompt, selectedModelId },
    messageToRetry // Type is narrowed by the filter
  ): SendApiRequestParams | null => {
    const retryIndex = messages.findIndex(
      (msg) => msg.id === messageToRetry.id
    );

    if (retryIndex === -1) {
      console.error("Message to retry not found:", messageToRetry.id);
      return null;
    }

    let historyToSend: Message[];
    if (messageToRetry.role === "user") {
      historyToSend = messages.slice(0, retryIndex + 1);
    } else {
      // Retrying an assistant message
      let precedingUserIndex = -1;
      for (let i = retryIndex - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          precedingUserIndex = i;
          break;
        }
      }
      if (precedingUserIndex === -1) {
        console.error(
          "Could not find preceding user message for retry:",
          messageToRetry.id
        );
        historyToSend = [];
      } else {
        historyToSend = messages.slice(0, precedingUserIndex + 1);
      }
    }

    // Removed imperative call to messageRetryInitiated to maintain purity

    return {
      modelId: selectedModelId,
      messages: historyToSend,
      apiKey,
      temperature,
      systemPrompt,
    };
  },
});

// Trigger messageRetryInitiated separately in a declarative way
sample({
  clock: messageRetry,
  filter: (messageToRetry) =>
    messageToRetry.role === "user" || messageToRetry.role === "assistant",
  fn: (messageToRetry): { messageId: string; role: Role } => ({
    messageId: messageToRetry.id,
    role: messageToRetry.role,
  }),
  target: messageRetryInitiated,
});

// Trigger the API request only if parameters were successfully prepared
sample({
  clock: prepareRetryParams,
  filter: (params): params is SendApiRequestParams => params !== null,
  target: sendApiRequestFx,
});

// Handle successful retry response
sample({
  clock: sendApiRequestFx.doneData,
  source: { messages: $messages, retryingMessageId: $retryingMessageId },
  filter: ({ retryingMessageId }) => retryingMessageId !== null, // Only process if a retry was initiated
  fn: ({ messages, retryingMessageId }, response): Message[] => {
    // Return type is Message[]
    const retryIndex = messages.findIndex(
      (msg) => msg.id === retryingMessageId
    );
    if (retryIndex === -1) {
      console.error(
        "Original retried message not found after API response:",
        retryingMessageId
      );
      return messages; // Return original messages if something went wrong
    }

    const newAssistantMessage: Message = {
      id: response.id || crypto.randomUUID(),
      role: "assistant",
      content:
        response.choices?.[0]?.message?.content ?? "Error: Empty response",
      timestamp: Date.now(),
    };

    const originalMessage = messages[retryIndex];
    let updatedMessages = [...messages];

    if (originalMessage.role === "user") {
      // If retrying a user message, replace the *next* assistant message
      if (
        retryIndex + 1 < messages.length &&
        messages[retryIndex + 1].role === "assistant"
      ) {
        updatedMessages[retryIndex + 1] = newAssistantMessage;
      } else {
        // If there's no next assistant message, insert the new one
        updatedMessages.splice(retryIndex + 1, 0, newAssistantMessage);
      }
    } else {
      // Retrying an assistant message
      // Replace the *current* assistant message
      updatedMessages[retryIndex] = newAssistantMessage;
    }

    return updatedMessages;
  },
  target: $messages,
});

// --- End Retry Logic ---

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
  messageRetry,
  sendApiRequestFx
);
