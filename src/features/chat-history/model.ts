import { createStore, createEvent, createEffect, sample } from "effector";
import { debug } from "patronum/debug";
import {
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
  ChatSession,
  ChatHistoryIndex,
  GenerateTitleParams,
  GenerateTitleResult,
  EditTitleParams,
} from "./types";
import {
  loadChatHistoryIndexHandler,
  loadSpecificChatHandler,
  saveChatHandler,
  deleteChatHandler,
  editChatTitleHandler,
  generateTitleHandler,
  updateIndexOnSaveFn,
  updateIndexOnTitleEditFn,
  prepareChatSessionFn,
} from "./lib";

// --- Events ---
export const appStarted = createEvent("appStarted");
export const loadChatHistory = createEvent("loadChatHistory");
export const chatSelected = createEvent<string>("chatSelected");
export const deleteChat = createEvent<string>("deleteChat");
export const newChatCreated = createEvent("newChatCreated");
export const chatTitleEdited = createEvent<EditTitleParams>("chatTitleEdited");
export const generateTitle = createEvent("generateTitle");

export const duplicateChatClicked = createEvent<string>("duplicateChatClicked");

// --- Effects ---
export const loadChatHistoryIndexFx = createEffect<
  void,
  ChatHistoryIndex[],
  Error
>("loadChatHistoryIndexFx", {
  handler: loadChatHistoryIndexHandler,
});
export const duplicateChatFx = createEffect<string, string, Error>(
  "duplicateChatFx"
);

duplicateChatFx.use(async (chatId) => {
  const originalChat = await loadSpecificChatHandler(chatId);
  if (!originalChat) throw new Error("Original chat not found");
  const newId = crypto.randomUUID();
  const now = Date.now();
  const duplicatedChat: ChatSession = {
    ...originalChat,
    id: newId,
    createdAt: now,
    lastModified: now,
    title: originalChat.title + " (Copy)",
    messages: originalChat.messages ?? [],
    settings: originalChat.settings ?? {
      model: "",
      temperature: 1,
      systemPrompt: "",
    },
    totalTokens: originalChat.totalTokens ?? 0,
  };
  await saveChatHandler(duplicatedChat);
  return newId;
});

sample({
  clock: duplicateChatClicked,
  target: duplicateChatFx,
});

sample({
  clock: duplicateChatFx.doneData,
  target: chatSelected,
});

sample({
  clock: duplicateChatFx.doneData,
  target: loadChatHistoryIndexFx,
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

export const editChatTitleFx = createEffect<
  EditTitleParams,
  ChatHistoryIndex | null,
  Error
>("editChatTitleFx", {
  handler: editChatTitleHandler,
});

export const generateTitleFx = createEffect<
  GenerateTitleParams,
  GenerateTitleResult,
  Error
>("generateTitleFx", {
  handler: generateTitleHandler,
});

// --- Stores ---
export const $chatHistoryIndex = createStore<ChatHistoryIndex[]>([], {
  name: "$chatHistoryIndex",
});

export const $currentChatSession = createStore<ChatSession | null>(null, {
  name: "$currentChatSession",
  skipVoid: false, // Allow null values
});

export const $currentChatId = $currentChatSession.map(
  (session) => session?.id ?? null,
  { skipVoid: false } // Ensure null is mapped if session is null
);

export const $isLoadingHistory = loadChatHistoryIndexFx.pending;
export const $isSavingChat = saveChatFx.pending;
export const $isLoadingChat = loadSpecificChatFx.pending;

// --- Store Updates (.on/.reset) ---

// Reset current chat session when a new chat is created
$currentChatSession.reset(newChatCreated);

// --- Samples (Logic Flow) ---

// Type guard for filtering null chats
const isChatSession = (chat: ChatSession | null): chat is ChatSession =>
  chat !== null;

// ** History Index Updates **

// Update $chatHistoryIndex when the full index is loaded from DB
sample({
  clock: loadChatHistoryIndexFx.doneData,
  fn: (index) => index,
  target: $chatHistoryIndex,
});

// Update $chatHistoryIndex when a chat is deleted
sample({
  clock: deleteChatFx.done,
  source: $chatHistoryIndex,
  fn: (currentIndex, { params: idToDelete }) =>
    currentIndex.filter((chat) => chat.id !== idToDelete),
  target: $chatHistoryIndex,
});

// Update $chatHistoryIndex when a chat is saved (add or update)
sample({
  clock: saveChatFx.done,
  source: $chatHistoryIndex,
  fn: (currentIndex, { params: savedChat }) =>
    updateIndexOnSaveFn(currentIndex, savedChat),
  target: $chatHistoryIndex,
});

// Update $chatHistoryIndex when a chat title is edited
sample({
  clock: editChatTitleFx.doneData,
  source: $chatHistoryIndex,
  filter: (_, updatedIndexEntry) => !!updatedIndexEntry,
  fn: (currentIndex, updatedIndexEntry) =>
    updateIndexOnTitleEditFn(currentIndex, updatedIndexEntry),
  target: $chatHistoryIndex,
});

// ** Current Chat Session Updates **

// Update $currentChatSession when a specific chat is loaded from DB
sample({
  clock: loadSpecificChatFx.doneData,
  fn: (chat) => chat,
  target: $currentChatSession,
});

// Update $currentChatSession after a successful save (ensures consistency)
sample({
  clock: saveChatFx.done,
  fn: ({ params }) => params,
  target: $currentChatSession,
});

// Update $currentChatSession title/lastModified after a successful title edit
sample({
  clock: editChatTitleFx.doneData,
  source: $currentChatSession,
  filter: (session, updatedIndexEntry): session is ChatSession =>
    !!session && !!updatedIndexEntry && session.id === updatedIndexEntry.id,
  fn: (session, updatedIndexEntry) => ({
    ...session!,
    title: updatedIndexEntry!.title,
    lastModified: updatedIndexEntry!.lastModified,
  }),
  target: $currentChatSession,
});

// ** DB Operations Triggering **

// Load history index when app starts or explicitly requested
sample({
  clock: [appStarted, loadChatHistory],
  target: loadChatHistoryIndexFx,
});

// Load specific chat details when selected from the history list
sample({
  clock: chatSelected,
  target: loadSpecificChatFx,
});

// Trigger chat deletion effect
sample({
  clock: deleteChat,
  target: deleteChatFx,
});

// Trigger title edit effect
sample({
  clock: chatTitleEdited,
  target: editChatTitleFx,
});

// ** Cross-Feature Updates (Triggered by History Load) **

// Update $messages in chat feature when a chat is loaded
sample({
  clock: loadSpecificChatFx.doneData,
  filter: isChatSession,
  fn: (chat) => chat.messages,
  target: $messages,
});

// Update $selectedModelId in models-select feature when a chat is loaded
sample({
  clock: loadSpecificChatFx.doneData,
  filter: isChatSession,
  fn: (chat) => chat.settings.model,
  target: $selectedModelId,
});

// Update $temperature in chat-settings feature when a chat is loaded
sample({
  clock: loadSpecificChatFx.doneData,
  filter: isChatSession,
  fn: (chat) => chat.settings.temperature,
  target: $temperature,
});

// Update $systemPrompt in chat-settings feature when a chat is loaded
sample({
  clock: loadSpecificChatFx.doneData,
  filter: isChatSession,
  fn: (chat) => chat.settings.systemPrompt,
  target: $systemPrompt,
});

// Update $currentChatTokens in chat feature when a chat is loaded
sample({
  clock: loadSpecificChatFx.doneData,
  filter: isChatSession,
  fn: (chat) => chat.totalTokens,
  target: $currentChatTokens,
});

// ** Chat State Reset on New Chat **

// Reset $messages in chat feature when new chat is created
sample({
  clock: newChatCreated,
  fn: () => [],
  target: $messages,
});

// Reset $currentChatTokens in chat feature when new chat is created
sample({
  clock: newChatCreated,
  fn: () => 0,
  target: $currentChatTokens,
});

// ** Saving Chat Session **

// Prepare and save chat session on initial message, API success, edit, or delete
sample({
  clock: [initialChatSaveNeeded, apiRequestSuccess, editMessage, deleteMessage],
  source: {
    currentSession: $currentChatSession,
    messages: $messages,
    model: $selectedModelId,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    tokens: $currentChatTokens,
  },
  filter: ({ messages }) => messages.length > 0, // Only save if there are messages
  fn: (source) => prepareChatSessionFn(source), // Use unified function
  target: saveChatFx,
});

// ** Auto Title Generation **

// Trigger title generation after the first save of a new chat
sample({
  clock: saveChatFx.done,
  source: $apiKey,
  filter: (apiKey, { params: savedChat }) =>
    !!apiKey && savedChat.messages.length > 0, // Assuming 2 messages = user + first assistant
  fn: (apiKey, { params: savedChat }): GenerateTitleParams => ({
    chatId: savedChat.id,
    messages: savedChat.messages,
    apiKey: apiKey,
  }),
  target: generateTitleFx,
});

// Trigger title update in DB after successful generation
sample({
  clock: generateTitleFx.doneData,
  fn: ({ chatId, generatedTitle }): EditTitleParams => ({
    id: chatId,
    newTitle: generatedTitle,
  }),
  target: editChatTitleFx,
});

sample({
  clock: generateTitle,
  source: { apiKey: $apiKey, currentChat: $currentChatSession },
  filter: ({ apiKey, currentChat }) =>
    !!apiKey && !!currentChat && currentChat.messages.length > 0,
  fn: ({ apiKey, currentChat }) => ({
    chatId: currentChat!.id,
    messages: currentChat!.messages,
    apiKey: apiKey,
  }),
  target: generateTitleFx,
});

// --- Debugging ---

// Optional: Log errors during title generation
generateTitleFx.fail.watch(({ error, params }) => {
  console.error(`Failed to generate title for chat ${params.chatId}:`, error);
});

// Debug watches for development
saveChatFx.done.watch(() => {
  console.log("Effect: saveChatFx done (Debug)");
});
saveChatFx.fail.watch((error) => {
  console.error("Effect: saveChatFx failed (Debug)", error);
});

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
