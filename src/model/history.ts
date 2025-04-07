import {
  createStore,
  createEvent,
  createEffect,
  sample,
  attach,
} from "effector";
import { openDB, DBSchema, IDBPDatabase } from "idb";
import { debug } from "patronum/debug";
import {
  Message,
  $messages,
  $currentChatTokens,
  apiRequestSuccess,
  initialChatSaveNeeded,
  editMessage,
  deleteMessage,
} from "./chat"; // Import apiRequestSuccess and initialChatSaveNeeded
import { $apiKey } from "./settings";
import { $selectedModelId } from "./models";
import { $temperature, $systemPrompt } from "./settings";

// --- Types ---

interface ChatSettings {
  model: string;
  temperature: number;
  systemPrompt: string;
}

export interface ChatSession {
  id: string; // Using string UUIDs for IDs
  title: string;
  createdAt: number; // Timestamp
  lastModified: number; // Timestamp
  messages: Message[];
  settings: ChatSettings;
  totalTokens: number; // Store the token count with the chat
}

export interface ChatHistoryIndex {
  id: string;
  title: string;
  lastModified: number;
}

// --- IndexedDB Setup ---

const DB_NAME = "LLMChatDB";
const DB_VERSION = 1;
const STORE_NAME = "chats";

interface ChatDB extends DBSchema {
  [STORE_NAME]: {
    key: string; // Use 'id' as the key path
    value: ChatSession;
    indexes: { lastModified: number }; // Index for sorting
  };
}

let dbPromise: Promise<IDBPDatabase<ChatDB>> | null = null;

const getDb = (): Promise<IDBPDatabase<ChatDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<ChatDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("lastModified", "lastModified");
      },
    });
  }
  return dbPromise;
};

// --- Effector Units ---

// Events
export const appStarted = createEvent("appStarted");
export const loadChatHistory = createEvent("loadChatHistory");
export const chatSelected = createEvent<string>("chatSelected");
export const saveCurrentChat = createEvent("saveCurrentChat");
export const deleteChat = createEvent<string>("deleteChat");
export const newChatCreated = createEvent("newChatCreated");
export const chatTitleEdited = createEvent<{ id: string; newTitle: string }>(
  "chatTitleEdited"
);

// Effects (IndexedDB Operations)
export const loadChatHistoryIndexFx = createEffect<
  void,
  ChatHistoryIndex[],
  Error
>("loadChatHistoryIndexFx", {
  handler: async () => {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const allChats = await store.getAll();
    await tx.done;
    // Sort by lastModified descending and map to index format
    return allChats
      .sort((a, b) => b.lastModified - a.lastModified)
      .map(({ id, title, lastModified }) => ({ id, title, lastModified }));
  },
});

export const loadSpecificChatFx = createEffect<
  string,
  ChatSession | null,
  Error
>("loadSpecificChatFx", {
  handler: async (id) => {
    const db = await getDb();
    const chat = await db.get(STORE_NAME, id);
    return chat ?? null; // Return null if not found
  },
});

export const saveChatFx = createEffect<ChatSession, void, Error>("saveChatFx", {
  handler: async (chatSession) => {
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
  },
});

export const deleteChatFx = createEffect<string, void, Error>("deleteChatFx", {
  handler: async (id) => {
    const db = await getDb();
    await db.delete(STORE_NAME, id);
  },
});

// Effect to specifically update a chat's title
export const editChatTitleFx = createEffect<
  { id: string; newTitle: string },
  ChatHistoryIndex | null,
  Error
>("editChatTitleFx", {
  handler: async ({ id, newTitle }) => {
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
  },
});

// Effect to generate title using OpenRouter
const TITLE_GENERATION_MODEL = "google/gemma-3-27b-it";
const TITLE_PROMPT =
  "Summarize the beginning of this chat conversation in 5 words or less. Use title case. Focus on the main topic. Example: Exploring Effector Stores";

interface GenerateTitleParams {
  chatId: string;
  messages: Message[];
  apiKey: string;
}

interface GenerateTitleResult {
  chatId: string;
  generatedTitle: string;
}

export const generateTitleFx = createEffect<
  GenerateTitleParams,
  GenerateTitleResult,
  Error
>("generateTitleFx", {
  handler: async ({ chatId, messages, apiKey }) => {
    if (!apiKey) {
      throw new Error("API key is required for title generation.");
    }
    if (messages.length === 0) {
      throw new Error("Cannot generate title for empty chat.");
    }

    // Prepare messages for the title generation model
    const apiMessages = [
      { role: "system", content: TITLE_PROMPT },
      // Include only the first few messages to keep the request small
      ...messages
        .slice(0, 4)
        .map((msg) => ({ role: msg.role, content: msg.content })),
    ];

    const body = {
      model: TITLE_GENERATION_MODEL,
      messages: apiMessages,
      temperature: 0.5, // Lower temperature for more deterministic title
      max_tokens: 20, // Limit response length
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
    const generatedTitle = data.choices?.[0]?.message?.content?.trim();
    if (!generatedTitle) {
      console.error(
        "Title generation API response content is empty or undefined:",
        data
      );
      throw new Error("Title generation resulted in an empty response.");
    }

    // Clean up potential quotes or extra formatting
    const cleanedTitle = generatedTitle.replace(/^"|"$|^\'|\'$/g, "").trim();

    return { chatId, generatedTitle: cleanedTitle };
  },
});

// Debug: Watch saveCurrentChat event
saveCurrentChat.watch(() => {
  console.log("Event: saveCurrentChat triggered");
});

// Debug: Watch saveChatFx effect done
saveChatFx.done.watch(() => {
  console.log("Effect: saveChatFx done");
});

// Debug: Watch saveChatFx effect fail
saveChatFx.fail.watch((error) => {
  console.error("Effect: saveChatFx failed", error);
});

// Stores
export const $chatHistoryIndex = createStore<ChatHistoryIndex[]>([])
  .on(loadChatHistoryIndexFx.doneData, (_, index) => index)
  .on(deleteChatFx.done, (state, { params: id }) =>
    state.filter((chat) => chat.id !== id)
  )
  .on(saveChatFx.done, (state, { params: savedChat }) => {
    // Update or add the saved chat's index entry
    const existingIndex = state.findIndex((chat) => chat.id === savedChat.id);
    const newEntry = {
      id: savedChat.id,
      title: savedChat.title,
      lastModified: savedChat.lastModified,
    };
    let newState;
    if (existingIndex !== -1) {
      newState = [...state];
      newState[existingIndex] = newEntry;
    } else {
      newState = [newEntry, ...state]; // Add new chats to the top
    }
    // Ensure sorting remains correct
    return newState.sort((a, b) => b.lastModified - a.lastModified);
  })
  // Update index when title is edited via the effect
  .on(editChatTitleFx.doneData, (state, updatedIndexEntry) => {
    if (!updatedIndexEntry) return state; // No change if effect failed or chat not found
    return state
      .map((chat) =>
        chat.id === updatedIndexEntry.id ? updatedIndexEntry : chat
      )
      .sort((a, b) => b.lastModified - a.lastModified); // Re-sort after update
  });

export const $currentChatSession = createStore<ChatSession | null>(null, {
  name: "$currentChatSession",
  skipVoid: false,
})
  .on(loadSpecificChatFx.doneData, (_, chat) => chat)
  .reset(newChatCreated); // Reset when starting a new chat
// Update the $currentChatSession store whenever a chat is saved successfully
// Removed incorrect .on handler. Update is now handled by sample below.

export const $currentChatId = $currentChatSession.map(
  (session) => session?.id ?? null
);

// Update $currentChatSession after a successful save
sample({
  clock: saveChatFx.done, // Use .done which carries { params, result }
  fn: ({ params }) => params, // Extract params from the payload
  target: $currentChatSession,
});

export const $isLoadingHistory = loadChatHistoryIndexFx.pending;
export const $isSavingChat = saveChatFx.pending;
export const $isLoadingChat = loadSpecificChatFx.pending;

// --- Logic ---
// Update current session title if it was the one edited
sample({
  clock: editChatTitleFx.doneData,
  source: $currentChatSession,
  filter: (session, updatedIndexEntry): session is ChatSession =>
    !!session && !!updatedIndexEntry && session.id === updatedIndexEntry.id,
  fn: (session, updatedIndexEntry) => ({
    ...session!, // Add non-null assertion as filter guarantees session is not null
    title: updatedIndexEntry!.title, // Use the updated title
    lastModified: updatedIndexEntry!.lastModified, // Also update lastModified
  }),
  target: $currentChatSession,
});

// Type guard for filtering null chats
const isChatSession = (chat: ChatSession | null): chat is ChatSession =>
  chat !== null;

// Load history index when app starts or explicitly requested
sample({
  clock: [appStarted, loadChatHistory],
  target: loadChatHistoryIndexFx,
});

// Load specific chat when selected
sample({
  clock: chatSelected,
  target: loadSpecificChatFx,
});

// When a chat is successfully loaded, update the main chat/settings models
sample({
  clock: loadSpecificChatFx.doneData,
  filter: isChatSession,
  fn: (chat) => chat.messages,
  target: $messages, // Update message display
});

sample({
  clock: loadSpecificChatFx.doneData,
  filter: isChatSession,
  fn: (chat) => chat.settings.model,
  target: $selectedModelId, // Update model selector
});

sample({
  clock: loadSpecificChatFx.doneData,
  filter: isChatSession,
  fn: (chat) => chat.settings.temperature,
  target: $temperature, // Update temperature setting
});

sample({
  clock: newChatCreated,
  fn: () => 0, // Reset token count to 0
  target: $currentChatTokens,
});
sample({
  clock: loadSpecificChatFx.doneData,
  filter: isChatSession,
  fn: (chat) => chat.settings.systemPrompt,
  target: $systemPrompt, // Update system prompt setting
});

sample({
  clock: loadSpecificChatFx.doneData,
  filter: isChatSession,
  fn: (chat) => chat.totalTokens,
  target: $currentChatTokens, // Update token count display
});

// Delete chat logic
sample({
  clock: deleteChat,
  target: deleteChatFx,
});

// Save chat logic: Triggered on initial save request OR after successful API response
sample({
  // Clock can be the initial save signal OR the API success signal from chat.ts
  clock: [initialChatSaveNeeded, apiRequestSuccess],
  source: {
    currentSession: $currentChatSession, // Get the whole session for existing data
    messages: $messages,
    model: $selectedModelId,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    tokens: $currentChatTokens, // Use the latest token count from chat.ts
  },
  filter: ({ messages }) => messages.length > 0, // Only save if there are messages
  fn: (
    { currentSession, messages, model, temperature, systemPrompt, tokens },
    clockTriggerPayload
  ): ChatSession => {
    // clockTriggerPayload will be undefined for initialChatSaveNeeded, or OpenRouterResponseBody for apiRequestSuccess
    const now = Date.now();
    const existingId = currentSession?.id;
    const chatId = existingId ?? crypto.randomUUID(); // Generate new ID if null

    // Determine title: Use existing if available, otherwise generate default date/time
    const title = existingId
      ? currentSession?.title ?? new Date(now).toLocaleString() // Use loaded title or fallback
      : new Date(now).toLocaleString(); // Default new chat title

    // Determine creation date: Use existing or set new
    const createdAt = existingId ? currentSession?.createdAt ?? now : now;

    // Use the token count from the source ($currentChatTokens), which is updated by apiRequestSuccess handler in chat.ts
    // For initial save (clockTriggerPayload is undefined), tokens will be 0 as expected.
    const finalTokens = tokens;

    return {
      id: chatId,
      title: title,
      createdAt: createdAt,
      lastModified: now,
      messages: messages, // Use the latest messages from $messages
      settings: { model, temperature, systemPrompt },
      totalTokens: finalTokens,
    };
  },
  target: saveChatFx,
});

// Save chat after message edit or delete
// Update $currentChatSession after a successful save
sample({
  clock: saveChatFx.done, // Use .done which carries { params, result }
  fn: ({ params }) => params, // Extract params from the payload
  target: $currentChatSession,
});
sample({
  clock: [editMessage, deleteMessage],
  source: {
    currentSession: $currentChatSession,
    messages: $messages,
    model: $selectedModelId,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    tokens: $currentChatTokens,
  },
  filter: ({ messages }) => messages.length > 0,
  fn: ({
    currentSession,
    messages,
    model,
    temperature,
    systemPrompt,
    tokens,
  }) => ({
    id: currentSession?.id ?? crypto.randomUUID(),
    title: currentSession?.title ?? new Date().toLocaleString(),
    createdAt: currentSession?.createdAt ?? Date.now(),
    lastModified: Date.now(),
    messages,
    settings: { model, temperature, systemPrompt },
    totalTokens: tokens,
  }),
  target: saveChatFx,
});

// Reset chat state when newChatCreated is triggered
sample({
  clock: newChatCreated,
  fn: () => [], // Reset to empty array
  target: $messages,
});

sample({
  clock: newChatCreated,
  fn: () => 0, // Reset to 0
  target: $currentChatTokens,
});

// Edit chat title logic
sample({
  clock: chatTitleEdited,
  target: editChatTitleFx,
});

// --- Auto Title Generation Logic ---

// Trigger title generation ONLY after the *initial* successful save of a *new* chat
sample({
  clock: saveChatFx.done, // Listen for successful saves. Payload: { params: ChatSession, result: void }
  source: $apiKey, // Need the API key
  // Filter: Only proceed if the save was successful AND the saved chat has exactly ONE message (the initial user message)
  // This indicates it was triggered by initialChatSaveNeeded
  filter: (apiKey, { params: savedChat }) => {
    // Destructure params from clock payload
    return (
      !!apiKey && // Ensure API key exists
      savedChat.messages.length === 2
    );
  },
  fn: (apiKey, { params: savedChat }): GenerateTitleParams => {
    // Destructure params from clock payload
    return {
      chatId: savedChat.id,
      messages: savedChat.messages, // Send only the user message for title context
      apiKey: apiKey,
    };
  },
  target: generateTitleFx,
});

// Update the chat title in DB after successful generation
sample({
  clock: generateTitleFx.doneData, // Listen for successful title generation
  fn: ({ chatId, generatedTitle }): { id: string; newTitle: string } => ({
    id: chatId,
    newTitle: generatedTitle,
  }),
  target: editChatTitleFx, // Target the effect that updates the title in DB
});

// Optional: Log errors during title generation
generateTitleFx.fail.watch(({ error, params }) => {
  console.error(`Failed to generate title for chat ${params.chatId}:`, error);
  // No need to show this error to the user, just keep the default title
});

// --- Debugging ---
debug(
  $chatHistoryIndex,
  $currentChatSession,
  $currentChatId,
  $isLoadingHistory,
  $isSavingChat,
  $isLoadingChat,

  appStarted,
  loadChatHistory,
  chatSelected,
  saveCurrentChat,
  deleteChat,
  newChatCreated,
  chatTitleEdited,

  loadChatHistoryIndexFx,
  loadSpecificChatFx,
  saveChatFx,
  deleteChatFx,
  editChatTitleFx,
  generateTitleFx
);
