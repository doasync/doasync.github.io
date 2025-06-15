import { IDBPDatabase, openDB } from 'idb';

import { Message } from '@/features/chat/types'; // Import Message type
import type { ModelInfo } from '@/features/models-select/types'; // Import ModelInfo type

import {
  ChatDB,
  ChatHistoryIndex,
  ChatSession,
  EditTitleParams,
  GenerateTitleParams,
  GenerateTitleResult,
} from './types';

// --- IndexedDB Setup ---

export const DB_NAME = 'LLMChatDB';
export const DB_VERSION = 1;
export const STORE_NAME = 'chats';

let databasePromise: Promise<IDBPDatabase<ChatDB>> | null = null;

/**
 * Gets the IndexedDB database instance, initializing it if necessary.
 */
export const getDatabase = (): Promise<IDBPDatabase<ChatDB>> => {
  if (!databasePromise) {
    databasePromise = openDB<ChatDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        // Check if the store already exists before creating it
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, {
            keyPath: 'id',
          });
          // Check if the index already exists before creating it
          if (!store.indexNames.contains('lastModified')) {
            store.createIndex('lastModified', 'lastModified');
          }
        }
      },
    });
  }
  return databasePromise;
};

// --- Effect Handlers ---

/**
 * Loads the chat history index (ID, title, lastModified) from IndexedDB.
 */
export const loadChatHistoryIndexHandler = async (): Promise<
  ChatHistoryIndex[]
> => {
  const database = await getDatabase();
  const tx = database.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const allChats = await store.getAll();
  await tx.done;
  // Sort by lastModified descending and map to index format
  return allChats
    .sort((a, b) => b.lastModified - a.lastModified)
    .map(({ id, title, lastModified }) => ({ id, title, lastModified }));
};

/**
 * Loads a specific full chat session from IndexedDB by its ID.
 */
export const loadSpecificChatHandler = async (
  id: string,
): Promise<ChatSession | null> => {
  const database = await getDatabase();
  const chat = await database.get(STORE_NAME, id);
  return chat ?? null; // Return null if not found
};

/**
 * Saves a full chat session to IndexedDB.
 */
export const saveChatHandler = async (
  chatSession: ChatSession,
): Promise<void> => {
  const database = await getDatabase();
  // Ensure isEdited, originalContent, and status are saved
  const chatSessionToSave = {
    ...chatSession,
    messages: chatSession.messages.map((message) => ({
      ...message,
      isEdited: message.isEdited || false, // Ensure isEdited is saved
      originalContent: message.originalContent || undefined, // Ensure originalContent is saved
      status: message.status || 'sent', // Default to sent for backward compatibility
    })),
  };
  await database.put(STORE_NAME, chatSessionToSave);
};

/**
 * Deletes a chat session from IndexedDB by its ID.
 */
export const deleteChatHandler = async (id: string): Promise<void> => {
  const database = await getDatabase();
  await database.delete(STORE_NAME, id);
};

/**
 * Edits the title of a specific chat session in IndexedDB.
 */
export const editChatTitleHandler = async ({
  id,
  newTitle,
}: EditTitleParams): Promise<ChatHistoryIndex | null> => {
  const database = await getDatabase();
  const tx = database.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const chat = await store.get(id);
  if (chat) {
    chat.title = newTitle;
    chat.lastModified = Date.now();
    await store.put(chat);
    await tx.done;
    return {
      id: chat.id,
      title: chat.title,
      lastModified: chat.lastModified,
    };
  }
  await tx.done; // Ensure transaction completes even if chat not found
  return null; // Indicate chat not found or error
};

/**
 * Generates a chat title using the configured API provider.
 */
// Removed imports to avoid circular dependencies
// These values will be passed as parameters instead
const TITLE_PROMPT = `Summarize this chat conversation
  in 1-5 words (maximum conciseness). Use title case. Focus on user's intent.
  It will be used as a title. Do not mention yourself (assistant) or the user.
  Example: Exploring Effector Stores`;

export const generateTitleHandler = async ({
  chatId,
  messages,
  apiKey,
  providerApiUrl,
  modelId,
}: GenerateTitleParams): Promise<GenerateTitleResult> => {
  if (!apiKey) {
    throw new Error('API key is required for title generation.');
  }
  if (messages.length === 0) {
    throw new Error('Cannot generate title for empty chat.');
  }

  // Prepare messages for the title generation model
  const apiMessages = [
    // Include only the first few messages to keep the request small
    ...messages
      .slice(0, 6)
      .map((message) => ({ role: message.role, content: message.content })),
    // Add the title prompt as the last message
    { role: 'user', content: TITLE_PROMPT },
  ];

  const body = {
    model: modelId,
    messages: apiMessages,
    temperature: 0.5, // Lower temperature for more deterministic title
    max_tokens: 10, // Limit response length
  };

  const chatCompletionsUrl = `${providerApiUrl}/chat/completions`;
  const response = await fetch(chatCompletionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMessage = `Title generation failed! status: ${response.status}`;
    try {
      const errorBody = (await response.json()) as Record<string, unknown>;
      errorMessage = `Title Generation API Error (${response.status}): ${String((errorBody.error as Record<string, unknown>).message)}`;
    } catch {
      /* Ignore JSON parsing error */
    }
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const choices = (data.choices as Array<Record<string, unknown>>) || [];
  const message = choices[0]?.message as Record<string, unknown> | undefined;
  const generatedTitle = String(message?.content || '');
  const sanitizedTitle = generatedTitle?.replace(/[^\d\sA-Za-z]/g, '').trim();

  if (!sanitizedTitle) {
    // Title generation API response content is empty or undefined
    throw new Error('Title generation resulted in an empty response.');
  }

  return { chatId, generatedTitle: sanitizedTitle };
};

// --- Pure Functions for Sample Logic ---

/**
 * Updates the chat history index after a chat is saved.
 * Adds the new chat or updates the existing one, then sorts.
 */
export const updateIndexOnSaveFunction = (
  currentIndex: ChatHistoryIndex[],
  savedChat: ChatSession,
): ChatHistoryIndex[] => {
  const newEntry: ChatHistoryIndex = {
    id: savedChat.id,
    title: savedChat.title,
    lastModified: savedChat.lastModified,
  };
  const existingIndex = currentIndex.findIndex(
    (chat) => chat.id === savedChat.id,
  );
  let newState;
  if (existingIndex === -1) {
    newState = [newEntry, ...currentIndex]; // Add new chats to the top
  } else {
    newState = [...currentIndex];
    newState[existingIndex] = newEntry;
  }
  // Ensure sorting remains correct
  return newState.sort((a, b) => b.lastModified - a.lastModified);
};

/**
 * Updates the chat history index after a chat title is edited.
 * Finds the chat and updates its title and lastModified time, then sorts.
 */
export const updateIndexOnTitleEditFunction = (
  currentIndex: ChatHistoryIndex[],
  updatedIndexEntry: ChatHistoryIndex | null, // Comes from editChatTitleFx.doneData
): ChatHistoryIndex[] => {
  if (!updatedIndexEntry) return currentIndex; // No change if effect failed
  return currentIndex
    .map((chat) =>
      chat.id === updatedIndexEntry.id ? updatedIndexEntry : chat,
    )
    .sort((a, b) => b.lastModified - a.lastModified); // Re-sort after update
};

/**
 * Prepares the ChatSession object for saving based on current state.
 * Universal function used for initial save, API response save, edit, and delete triggers.
 */
export const prepareChatSessionFunction = ({
  currentSession,
  messages,
  temperature,
  systemPrompt,
  tokens,
  draft,
  selectedModelInfo,
}: {
  currentSession: ChatSession | null;
  messages: Message[];
  model: string;
  temperature: number;
  systemPrompt: string;
  tokens: number;
  draft?: string; // <-- Add draft param
  selectedModelInfo: ModelInfo | null;
}): ChatSession => {
  const now = Date.now();
  const existingId = currentSession?.id;
  const chatId = existingId ?? crypto.randomUUID();

  const title = existingId
    ? (currentSession?.title ?? new Date(now).toLocaleString())
    : new Date(now).toLocaleString();

  const createdAt = existingId ? (currentSession?.createdAt ?? now) : now;
  const finalTokens = tokens; // Tokens are assumed to be correctly updated in the source store

  return {
    id: chatId,
    title,
    createdAt,
    lastModified: now, // Always update lastModified
    messages,
    settings: {
      model: {
        pricing: {
          prompt: Number(selectedModelInfo?.pricing?.prompt) || 0,
          completion: Number(selectedModelInfo?.pricing?.completion) || 0,
        },
        context_length: selectedModelInfo?.context_length ?? 1_000_000,
      },
      temperature,
      systemPrompt,
    },
    totalTokens: finalTokens,
    draft: draft ?? '', // <-- Save draft input
    modelInfo: selectedModelInfo ?? null, // Save full model metadata
  };
};
