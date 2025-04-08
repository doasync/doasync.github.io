import { openDB, IDBPDatabase } from "idb";
import {
  ChatDB,
  ChatSession,
  ChatHistoryIndex,
  GenerateTitleParams,
  GenerateTitleResult,
  EditTitleParams,
} from "./types";
import { Message } from "@/features/chat/types"; // Import Message type

// --- IndexedDB Setup ---

export const DB_NAME = "LLMChatDB";
export const DB_VERSION = 1;
export const STORE_NAME = "chats";

let dbPromise: Promise<IDBPDatabase<ChatDB>> | null = null;

/**
 * Gets the IndexedDB database instance, initializing it if necessary.
 */
export const getDb = (): Promise<IDBPDatabase<ChatDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<ChatDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Check if the store already exists before creating it
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          // Check if the index already exists before creating it
          if (!store.indexNames.contains("lastModified")) {
            store.createIndex("lastModified", "lastModified");
          }
        }
      },
    });
  }
  return dbPromise;
};

// --- Effect Handlers ---

/**
 * Loads the chat history index (ID, title, lastModified) from IndexedDB.
 */
export const loadChatHistoryIndexHandler = async (): Promise<
  ChatHistoryIndex[]
> => {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readonly");
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
  id: string
): Promise<ChatSession | null> => {
  const db = await getDb();
  const chat = await db.get(STORE_NAME, id);
  return chat ?? null; // Return null if not found
};

/**
 * Saves a full chat session to IndexedDB.
 */
export const saveChatHandler = async (
  chatSession: ChatSession
): Promise<void> => {
  const db = await getDb();
  // Ensure isEdited and originalContent are saved
  const chatSessionToSave = {
    ...chatSession,
    messages: chatSession.messages.map((message) => ({
      ...message,
      isEdited: message.isEdited || false, // Ensure isEdited is saved
      originalContent: message.originalContent || null, // Ensure originalContent is saved
    })),
  };
  await db.put(STORE_NAME, chatSessionToSave);
};

/**
 * Deletes a chat session from IndexedDB by its ID.
 */
export const deleteChatHandler = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
};

/**
 * Edits the title of a specific chat session in IndexedDB.
 */
export const editChatTitleHandler = async ({
  id,
  newTitle,
}: EditTitleParams): Promise<ChatHistoryIndex | null> => {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
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
 * Generates a chat title using the OpenRouter API.
 */
const TITLE_GENERATION_MODEL = "google/gemini-2.0-flash-lite-001";
const TITLE_PROMPT = `Summarize this chat conversation
  in 1-5 words (maximum conciseness). Use title case. Focus on user's intent.
  It will be used as a title. Do not mention yourself (assistant) or the user.
  Example: Exploring Effector Stores`;

export const generateTitleHandler = async ({
  chatId,
  messages,
  apiKey,
}: GenerateTitleParams): Promise<GenerateTitleResult> => {
  if (!apiKey) {
    throw new Error("API key is required for title generation.");
  }
  if (messages.length === 0) {
    throw new Error("Cannot generate title for empty chat.");
  }

  // Prepare messages for the title generation model
  const apiMessages = [
    // Include only the first few messages to keep the request small
    ...messages
      .slice(0, 6)
      .map((msg) => ({ role: msg.role, content: msg.content })),
    // Add the title prompt as the last message
    { role: "user", content: TITLE_PROMPT },
  ];

  const body = {
    model: TITLE_GENERATION_MODEL,
    messages: apiMessages,
    temperature: 0.5, // Lower temperature for more deterministic title
    max_tokens: 10, // Limit response length
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
    let errorMsg = `Title generation failed! status: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMsg = `Title Generation API Error (${response.status}): ${errorBody.error.message}`;
    } catch (e) {
      /* Ignore JSON parsing error */
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const generatedTitle = data.choices?.[0]?.message?.content;
  const sanitizedTitle = generatedTitle?.replace(/[^a-zA-Z0-9\s]/g, "").trim();

  if (!sanitizedTitle) {
    console.error(
      "Title generation API response content is empty or undefined:",
      data
    );
    throw new Error("Title generation resulted in an empty response.");
  }

  return { chatId, generatedTitle: sanitizedTitle };
};

// --- Pure Functions for Sample Logic ---

/**
 * Updates the chat history index after a chat is saved.
 * Adds the new chat or updates the existing one, then sorts.
 */
export const updateIndexOnSaveFn = (
  currentIndex: ChatHistoryIndex[],
  savedChat: ChatSession
): ChatHistoryIndex[] => {
  const newEntry: ChatHistoryIndex = {
    id: savedChat.id,
    title: savedChat.title,
    lastModified: savedChat.lastModified,
  };
  const existingIndex = currentIndex.findIndex(
    (chat) => chat.id === savedChat.id
  );
  let newState;
  if (existingIndex !== -1) {
    newState = [...currentIndex];
    newState[existingIndex] = newEntry;
  } else {
    newState = [newEntry, ...currentIndex]; // Add new chats to the top
  }
  // Ensure sorting remains correct
  return newState.sort((a, b) => b.lastModified - a.lastModified);
};

/**
 * Updates the chat history index after a chat title is edited.
 * Finds the chat and updates its title and lastModified time, then sorts.
 */
export const updateIndexOnTitleEditFn = (
  currentIndex: ChatHistoryIndex[],
  updatedIndexEntry: ChatHistoryIndex | null // Comes from editChatTitleFx.doneData
): ChatHistoryIndex[] => {
  if (!updatedIndexEntry) return currentIndex; // No change if effect failed
  return currentIndex
    .map((chat) =>
      chat.id === updatedIndexEntry.id ? updatedIndexEntry : chat
    )
    .sort((a, b) => b.lastModified - a.lastModified); // Re-sort after update
};

/**
 * Prepares the ChatSession object for saving based on current state.
 * Universal function used for initial save, API response save, edit, and delete triggers.
 */
export const prepareChatSessionFn = ({
  currentSession,
  messages,
  model,
  temperature,
  systemPrompt,
  tokens,
}: {
  currentSession: ChatSession | null;
  messages: Message[];
  model: string;
  temperature: number;
  systemPrompt: string;
  tokens: number;
}): ChatSession => {
  const now = Date.now();
  const existingId = currentSession?.id;
  const chatId = existingId ?? crypto.randomUUID();

  const title = existingId
    ? currentSession?.title ?? new Date(now).toLocaleString()
    : new Date(now).toLocaleString();

  const createdAt = existingId ? currentSession?.createdAt ?? now : now;
  const finalTokens = tokens; // Tokens are assumed to be correctly updated in the source store

  return {
    id: chatId,
    title: title,
    createdAt: createdAt,
    lastModified: now, // Always update lastModified
    messages: messages,
    settings: { model, temperature, systemPrompt },
    totalTokens: finalTokens,
  };
};
