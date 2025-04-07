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
} from "@/features/chat"; // Import apiRequestSuccess and initialChatSaveNeeded
import { $apiKey } from "@/features/chat-settings";
import { $selectedModelId } from "@/features/models-select";
import { $temperature, $systemPrompt } from "@/features/chat-settings";

import {
  ChatSettings,
  ChatSession,
  ChatHistoryIndex,
  ChatDB,
  GenerateTitleParams,
  GenerateTitleResult,
  EditTitleParams,
} from "./types";
import {
  getDb, // Import getDb
  STORE_NAME, // Import STORE_NAME
  loadChatHistoryIndexHandler,
  loadSpecificChatHandler,
  saveChatHandler,
  deleteChatHandler,
  editChatTitleHandler,
  generateTitleHandler,
  updateIndexOnSaveFn, // Import sample fn
  updateIndexOnTitleEditFn, // Import sample fn
  prepareChatSessionFn, // Import the unified function
} from "./lib"; // Import handlers and sample fns

// --- IndexedDB Setup ---

const DB_NAME = "LLMChatDB";
const DB_VERSION = 1;
// Removed STORE_NAME const - now imported from lib.ts

// Removed getDb and related variables - now imported from lib.ts

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
  handler: loadChatHistoryIndexHandler,
});

export const loadSpecificChatFx = createEffect<
  string,
  ChatSession | null,
  Error
>("loadSpecificChatFx", {
  handler: loadSpecificChatHandler,
});

export const saveChatFx = createEffect<ChatSession, void, Error>("saveChatFx", {
  handler: saveChatHandler,
});

export const deleteChatFx = createEffect<string, void, Error>("deleteChatFx", {
  handler: deleteChatHandler,
});

// Effect to specifically update a chat's title
export const editChatTitleFx = createEffect<
  EditTitleParams,
  ChatHistoryIndex | null,
  Error
>("editChatTitleFx", {
  handler: editChatTitleHandler,
});

// Removed TITLE_GENERATION_MODEL and TITLE_PROMPT - logic is in lib.ts
export const generateTitleFx = createEffect<
  GenerateTitleParams, // Use imported type
  GenerateTitleResult, // Use imported type
  Error
>("generateTitleFx", {
  handler: generateTitleHandler,
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
export const $chatHistoryIndex = createStore<ChatHistoryIndex[]>([], {
  name: "$chatHistoryIndex",
}); // Add name

export const $currentChatSession = createStore<ChatSession | null>(null, {
  name: "$currentChatSession",
  skipVoid: false,
})
  .on(loadSpecificChatFx.doneData, (_, chat) => chat)
  .reset(newChatCreated); // Reset when starting a new chat
// Update the $currentChatSession store whenever a chat is saved successfully

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

// Update $chatHistoryIndex when the full index is loaded
sample({
  clock: loadChatHistoryIndexFx.doneData,
  fn: (index) => index, // Just pass the loaded index
  target: $chatHistoryIndex,
});

// Update $chatHistoryIndex when a chat is deleted
sample({
  clock: deleteChatFx.done, // Clock on successful deletion
  source: $chatHistoryIndex, // Get the current index
  fn: (currentIndex, { params: idToDelete }) => {
    // Filter out the deleted chat
    return currentIndex.filter((chat) => chat.id !== idToDelete);
  },
  target: $chatHistoryIndex,
});

// Update $chatHistoryIndex when a chat is saved (add or update)
sample({
  clock: saveChatFx.done, // Clock on successful save
  source: $chatHistoryIndex, // Get the current index
  fn: (currentIndex, { params: savedChat }) =>
    updateIndexOnSaveFn(currentIndex, savedChat), // Use extracted function
  target: $chatHistoryIndex,
});

// Update $chatHistoryIndex when a chat title is edited
sample({
  clock: editChatTitleFx.doneData, // Clock on successful title edit
  source: $chatHistoryIndex, // Get the current index
  filter: (_, updatedIndexEntry) => !!updatedIndexEntry, // Proceed only if edit was successful
  fn: updateIndexOnTitleEditFn, // Use extracted function
  target: $chatHistoryIndex,
});

// Update $currentChatSession when a specific chat is loaded
sample({
  clock: loadSpecificChatFx.doneData,
  fn: (chat) => chat, // Pass the loaded chat session (or null)
  target: $currentChatSession,
});

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
  clock: [initialChatSaveNeeded, apiRequestSuccess, editMessage, deleteMessage],
  source: {
    currentSession: $currentChatSession, // Get the whole session for existing data
    messages: $messages,
    model: $selectedModelId,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    tokens: $currentChatTokens, // Use the latest token count from chat.ts
  },
  filter: ({ messages }: { messages: Message[] }) => messages.length > 0, // Ensure type annotation is present
  fn: (source) => prepareChatSessionFn(source), // Use the unified function, ignore clock payload
  target: saveChatFx,
});

// Save chat after message edit or delete
// Update $currentChatSession after a successful save
sample({
  clock: saveChatFx.done, // Use .done which carries { params, result }
  fn: ({ params }) => params, // Extract params from the payload
  target: $currentChatSession,
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
  // Stores
  $chatHistoryIndex,
  $currentChatSession,
  $currentChatId,
  $isLoadingHistory,
  $isSavingChat,
  $isLoadingChat,

  // Events
  appStarted,
  loadChatHistory,
  chatSelected,
  saveCurrentChat,
  deleteChat,
  newChatCreated,
  chatTitleEdited,

  // Effects
  loadChatHistoryIndexFx,
  loadSpecificChatFx,
  saveChatFx,
  deleteChatFx,
  editChatTitleFx,
  generateTitleFx
);
