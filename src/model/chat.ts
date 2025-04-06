import { createStore, createEvent, createEffect, sample, combine, createDomain, attach } from 'effector';
import { $apiKey, $temperature, $systemPrompt } from './settings';
import { debug } from 'patronum/debug';
import { $selectedModelId } from './models'; // Import selected model ID store
// Removed import of saveCurrentChat from './history' to break circular dependency
// Define the structure for a chat message
export interface Message {
  id: string; // Unique identifier for the message
  role: 'user' | 'assistant' | 'system'; // Aligned with OpenRouter roles ('model' maps to 'assistant')
  content: string | any; // Allow for complex content later (e.g., images) - simple string for now
  timestamp: number; // When the message was created/sent
  // Add other fields later as needed (e.g., attachments, model name)
}

const chatDomain = createDomain('chat');

// --- Stores ---

// Store to hold the text currently in the input field
export const $messageText = chatDomain.store<string>('', { name: 'messageText' });

// New message actions events (move them up here to avoid TDZ error)
export const editMessage = chatDomain.event<{ messageId: string; newContent: string }>('editMessage');
export const deleteMessage = chatDomain.event<string>('deleteMessage');
export const retryMessage = chatDomain.event<string>('retryMessage');

// Store to hold the list of messages in the current chat session
export const $messages = chatDomain.store<Message[]>([], { name: 'messages' })
  .on(editMessage, (messages, { messageId, newContent }) =>
    messages.map((msg) =>
      msg.id === messageId ? { ...msg, content: newContent } : msg
    )
  )
  .on(deleteMessage, (messages, messageId) =>
    messages.filter((msg) => msg.id !== messageId)
  );

// Store for API loading state
export const $isGenerating = chatDomain.store<boolean>(false, { name: 'isGenerating' });

// Store for the total token count of the current chat session
export const $currentChatTokens = chatDomain.store<number>(0, { name: 'currentChatTokens' });

// Store for API errors
export const $apiError = chatDomain.store<string | null>(null, { name: 'apiError' });

// --- Events ---

// Event triggered when the text input value changes
export const messageTextChanged = chatDomain.event<string>('messageTextChanged');

// Event triggered when the user clicks the send button or presses Enter
export const messageSent = chatDomain.event<void>('messageSent');

// Internal event to add a message (used by API response)
const messageAdded = chatDomain.event<Message>('messageAdded');

// Event to signal that the initial state of a new chat needs saving
export const initialChatSaveNeeded = chatDomain.event<void>('initialChatSaveNeeded');

// --- Types for API Interaction ---
interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | any; // Adjust later for multimodal
}

interface OpenRouterRequestBody {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  // stream?: boolean; // Add later if needed
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

interface OpenRouterResponseBody {
    id: string;
    model: string;
    choices: OpenRouterResponseChoice[];
    usage: OpenRouterUsage;
}

interface OpenRouterErrorBody {
    error: {
        code: number;
        message: string;
    }
}

interface SendApiRequestParams {
    modelId: string;
    messages: Message[];
    apiKey: string;
    temperature: number;
    systemPrompt: string;
}

// --- Effects ---
const sendApiRequestFx = chatDomain.effect<SendApiRequestParams, OpenRouterResponseBody, Error>({
    name: 'sendApiRequestFx',
    handler: async ({ modelId, messages, apiKey, temperature, systemPrompt }) => {
        const apiMessages: OpenRouterMessage[] = [];

        // Add system prompt if provided
        if (systemPrompt && systemPrompt.trim().length > 0) {
            apiMessages.push({ role: 'system', content: systemPrompt });
        }

        // Add chat history, mapping 'model' role to 'assistant'
        messages.forEach(msg => {
            apiMessages.push({
                role: msg.role, // Roles should now directly match API expectations ('user', 'assistant', 'system')
                content: msg.content,
            });
        });

        const body: OpenRouterRequestBody = {
            model: modelId,
            messages: apiMessages,
            temperature: temperature,
        };

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                // Optional headers for identification (less critical now)
                // 'HTTP-Referer': 'YOUR_SITE_URL',
                // 'X-Title': 'YOUR_APP_NAME',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            let errorMsg = `HTTP error! status: ${response.status}`;
            try {
                const errorBody: OpenRouterErrorBody = await response.json();
                errorMsg = `API Error (${response.status}): ${errorBody.error.message}`;
            } catch (e) {
                // Ignore JSON parsing error if response body is not JSON
            }
            throw new Error(errorMsg);
        }

        const data: OpenRouterResponseBody = await response.json();
        return data;
    },
});


// --- Logic ---

// Update the message text store when the input changes
$messageText.on(messageTextChanged, (_, newText) => newText);

// Update message list (user message + assistant response)
$messages
    .on(messageAdded, (list, newMessage) => [...list, newMessage]);
    // Removed incorrect .reset(messageSent); - messages should reset only on newChatCreated (handled in history.ts)

// Reset error on new message attempt
$apiError.reset(messageSent);

// 1. When messageSent is triggered, create the user message object
const userMessageCreated = sample({
    clock: messageSent,
    source: $messageText,
    filter: (text) => text.trim().length > 0, // Only if text is not empty
    fn: (text): Message => ({
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
    }),
});

// 2. Add the user message to the list immediately
sample({
    clock: userMessageCreated,
    target: messageAdded,
});

// 2b. If this is the *first* message, signal that an initial save is needed
sample({
    clock: userMessageCreated,
    source: $messages,
    filter: (messages) => messages.length === 0, // Filter: only run if the list is empty (first message)
    target: initialChatSaveNeeded,
});

// 3. Trigger the API request after the user message is created
sample({
    clock: userMessageCreated, // Triggered when a valid user message is ready
    source: {
        messages: $messages, // Get the *current* message list (including the new user one)
        apiKey: $apiKey,
        temperature: $temperature,
        systemPrompt: $systemPrompt,
        selectedModelId: $selectedModelId, // Add selected model ID to source
    },
    filter: $apiKey.map(key => key.length > 0), // Only run if API key is set
    fn: ({ messages, apiKey, temperature, systemPrompt, selectedModelId }, userMessage): SendApiRequestParams => ({
        modelId: selectedModelId, // Use the selected model ID from the source
        messages: [...messages, userMessage], // Send history *including* the new user message
        apiKey: apiKey,
        temperature: temperature,
        systemPrompt: systemPrompt,
    }),
    target: sendApiRequestFx,
});


// Clear the input field after sending
// 4. Clear the input field after triggering the send process
sample({
    clock: userMessageCreated, // Clear when the user message is created
    fn: () => '',
    target: $messageText,
});

// --- Handle API Response ---

// Set loading state
$isGenerating
    .on(sendApiRequestFx, () => true)
    .reset(sendApiRequestFx.finally);

// Handle successful API response
export const apiRequestSuccess = sample({ // Export this event
    clock: sendApiRequestFx.doneData, // Event payload is OpenRouterResponseBody
});

// Add assistant message to the list on success
sample({
    clock: apiRequestSuccess,
    fn: (response): Message => {
        const content = response.choices?.[0]?.message?.content;
        if (!content) {
            console.error('API response content is empty or undefined:', response);
            return {
                id: response.id || crypto.randomUUID(), // Use API ID or fallback
                role: 'assistant', // Use 'assistant' role from API
                content: 'Error: Empty response from API',
                timestamp: Date.now(),
            };
        }
        return {
            id: response.id || crypto.randomUUID(), // Use API ID or fallback
            role: 'assistant', // Use 'assistant' role from API
            content: content,
            timestamp: Date.now(),
        };
    },
    target: messageAdded,
});

// Update token count on success
sample({
    clock: apiRequestSuccess,
    source: $currentChatTokens,
    fn: (currentTokenCount, response) => currentTokenCount + (response.usage?.total_tokens ?? 0),
    target: $currentChatTokens,
});

// Clear API error on success
$apiError.reset(apiRequestSuccess);
// Removed sample block targeting saveCurrentChat. This logic is moved to history.ts


import { showApiKeyDialog } from '@/model/ui';

sample({
  clock: messageSent,
  source: $apiKey,
  filter: (key) => key.trim().length === 0,
  target: showApiKeyDialog,
});
// Handle API request failure
/**
 * Retry message logic
 */

// Effect to handle retry API call with truncated history
const retryEffect = createEffect<{ params: SendApiRequestParams; replaceIdx: number }, { response: OpenRouterResponseBody; replaceIdx: number }>(async ({ params, replaceIdx }) => {
  const response = await sendApiRequestFx(params);
  return { response, replaceIdx };
});

const retryRequestPrepared = createEvent<{ params: SendApiRequestParams; replaceIdx: number } | null>();

sample({
  clock: retryMessage,
  source: {
    messages: $messages,
    apiKey: $apiKey,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
  },
  filter: ({ apiKey }) => !!apiKey,
  fn: ({ messages, apiKey, temperature, systemPrompt, selectedModelId }, messageId) => {
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return null;

    const targetMsg = messages[idx];

    let sliceEndIdx = idx + 1; // Default: include this message
    let replaceIdx = -1;

    if (targetMsg.role === 'user') {
      // Retry after user message: include up to this user message
      // Replace the *next* assistant message
      replaceIdx = messages.findIndex(
        (m, i) => i > idx && m.role === 'assistant'
      );
      sliceEndIdx = idx + 1; // include user message
    } else if (targetMsg.role === 'assistant') {
      // Retry this assistant message: include up to preceding user message
      replaceIdx = idx;
      for (let i = idx - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          sliceEndIdx = i + 1; // include user message
          break;
        }
      }
    } else {
      return null; // Don't retry system or unknown roles
    }

    if (replaceIdx === -1) return null;

    const truncatedMessages = messages.slice(0, sliceEndIdx);

    return {
      params: {
        modelId: selectedModelId,
        messages: truncatedMessages,
        apiKey,
        temperature,
        systemPrompt,
      },
      replaceIdx,
    };
  },
  target: retryRequestPrepared,
});

// Filter out nulls and call retryEffect
sample({
  source: retryRequestPrepared,
  filter: (v): v is { params: SendApiRequestParams; replaceIdx: number } => v !== null,
  target: retryEffect,
});

// Replace relevant assistant message on retryEffect success
sample({
  clock: retryEffect.doneData,
  source: $messages,
  fn: (messages, { response, replaceIdx }) => {
    const content = response.choices?.[0]?.message?.content;
    if (!content) return messages;

    const updated = [...messages];
    updated[replaceIdx] = {
      ...updated[replaceIdx],
      content,
    };
    return updated;
  },
  target: $messages,
});

sample({
    clock: sendApiRequestFx.failData, // Event payload is Error
    fn: (error): string => error.message, // Extract error message
    target: $apiError,
});

// --- Debugging ---
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
  sendApiRequestFx,
  retryEffect
);