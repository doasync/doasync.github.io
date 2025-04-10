import { createDomain, createStore, sample } from "effector";
import { debug } from "patronum/debug";
import { debounce } from "patronum/debounce";
import { $messageText } from "@/features/chat";
import {
  $messages,
  $currentChatTokens,
  initialChatSaveNeeded,
  editMessage,
  deleteMessage,
  retryUpdate, // For saving after retry/generate updates
  normalResponseProcessed, // For saving after normal API responses <-- Added Import
} from "@/features/chat";
import { $apiKey, $temperature, $systemPrompt } from "@/features/chat-settings";
import { $availableModels, ModelInfo } from "@/features/models-select";
import { $selectedModelId } from "@/features/models-select";
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
import { appStarted } from "@/app";

// --- History Domain ---
const historyDomain = createDomain("history");

// --- Events ---

export const loadChatHistory = historyDomain.event("loadChatHistory");
export const chatSelected = historyDomain.event<string>("chatSelected");
export const deleteChat = historyDomain.event<string>("deleteChat");
export const newChatCreated = historyDomain.event("newChatCreated");
export const chatTitleEdited =
  historyDomain.event<EditTitleParams>("chatTitleEdited");
export const generateTitle = historyDomain.event("generateTitle");
export const duplicateChatClicked = historyDomain.event<string>(
  "duplicateChatClicked"
);
export const regenerateTitleForChat = historyDomain.event<string>(
  "regenerateTitleForChat"
);

// --- Effects ---
export const loadChatHistoryIndexFx = historyDomain.effect<
  void,
  ChatHistoryIndex[],
  Error
>("loadChatHistoryIndexFx", {
  handler: loadChatHistoryIndexHandler,
});
export const duplicateChatFx = historyDomain.effect<string, string, Error>(
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

export const loadSpecificChatFx = historyDomain.effect<
  string,
  ChatSession | null,
  Error
>("loadSpecificChatFx", {
  handler: loadSpecificChatHandler,
});

export const saveChatFx = historyDomain.effect<ChatSession, void, Error>(
  "saveChatFx",
  {
    handler: saveChatHandler,
  }
);

export const deleteChatFx = historyDomain.effect<string, void, Error>(
  "deleteChatFx",
  {
    handler: deleteChatHandler,
  }
);

export const editChatTitleFx = historyDomain.effect<
  EditTitleParams,
  ChatHistoryIndex | null,
  Error
>("editChatTitleFx", {
  handler: editChatTitleHandler,
});

export const generateTitleFx = historyDomain.effect<
  GenerateTitleParams,
  GenerateTitleResult,
  Error
>("generateTitleFx", {
  handler: generateTitleHandler,
});
export const regenerateTitleForChatFx = historyDomain.effect<
  string,
  void,
  Error
>("regenerateTitleForChatFx");

regenerateTitleForChatFx.use(async (chatId) => {
  const apiKey = $apiKey.getState();
  if (!apiKey) throw new Error("API key is missing");

  const chat = await loadSpecificChatHandler(chatId);
  if (!chat) throw new Error("Chat not found");

  if (!chat.messages || chat.messages.length === 0) return;

  const result = await generateTitleHandler({
    chatId,
    messages: chat.messages,
    apiKey,
  });

  if (!result.generatedTitle) return;

  await editChatTitleHandler({
    id: chatId,
    newTitle: result.generatedTitle,
  });
});

sample({
  clock: regenerateTitleForChat,
  target: regenerateTitleForChatFx,
});

sample({
  clock: regenerateTitleForChatFx.done,
  target: loadChatHistoryIndexFx,
});

// --- Stores ---
export const $chatHistoryIndex = historyDomain.store<ChatHistoryIndex[]>([], {
  name: "$chatHistoryIndex",
});

export const $currentChatSession = historyDomain.store<ChatSession | null>(
  null,
  {
    name: "$currentChatSession",
  }
);

export const $currentChatId = $currentChatSession.map(
  (session) => session?.id ?? null
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
    updateIndexOnTitleEditFn(currentIndex, updatedIndexEntry!), // Add non-null assertion
  target: $chatHistoryIndex,
});

// ** Current Chat Session Updates **

sample({
  clock: loadSpecificChatFx.doneData,
  fn: (chat) => chat,
  target: $currentChatSession,
});

sample({
  clock: loadSpecificChatFx.doneData,
  fn: (chat) => chat?.draft ?? "",
  target: $messageText,
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
  fn: (chat) => chat.totalTokens ?? 0, // Ensure default value if undefined
  target: $currentChatTokens,
});

// ** Chat State Reset on New Chat **

// Reset $messages in chat feature when new chat is created
sample({
  clock: newChatCreated,
  fn: () => [],
  target: $messages,
});

// Debounced draft input
const debouncedDraft = debounce({
  source: $messageText,
  timeout: 1000, // 1 second debounce
});

// Update current chat session draft field when debounced draft changes
sample({
  clock: debouncedDraft,
  source: $currentChatSession,
  filter: (session) => session !== null,
  fn: (session: ChatSession, draft) => ({
    ...session,
    draft,
    lastModified: Date.now(),
  }),
  target: $currentChatSession,
});

// Save chat when current session is updated (draft or anything else)
sample({
  clock: $currentChatSession,
  filter: (session): session is ChatSession => session !== null,
  target: saveChatFx,
});

// Reset $currentChatTokens in chat feature when new chat is created
sample({
  clock: newChatCreated,
  fn: () => 0,
  target: $currentChatTokens,
});

// ** Saving Chat Session **

// Prepare and save chat session whenever relevant state changes
sample({
  clock: [
    initialChatSaveNeeded, // First message sent
    normalResponseProcessed, // Normal API response processed
    editMessage, // Message edited
    deleteMessage, // Message deleted
    retryUpdate, // Message list updated after retry/generate
  ],
  source: {
    currentSession: $currentChatSession,
    messages: $messages,
    model: $selectedModelId,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    tokens: $currentChatTokens,
    draft: $messageText, // <-- Add draft input
    selectedModelInfo: $availableModels.map(
      (models) =>
        models.find((m) => m.id === $selectedModelId.getState()) ?? null
    ),
  },
  filter: ({ messages }) => messages.length > 0, // Only save if there are messages
  fn: (source) => {
    // Corrected logging function
    console.log(
      "[saveChatFx Trigger] Fired. Source Messages Length:",
      source.messages.length
    ); // DEBUG LOG
    if (source.messages.length > 0) {
      console.log(
        "[saveChatFx Trigger] Last Message ID:",
        source.messages[source.messages.length - 1].id
      ); // Log ID for easier tracking
    }
    return prepareChatSessionFn(source);
  },
  target: saveChatFx,
});

// ** Auto Title Generation **

// Trigger title generation after the first save of a new chat
sample({
  clock: saveChatFx.done,
  source: $apiKey,
  filter: (apiKey, { params: savedChat }) =>
    !!apiKey && savedChat.messages.length > 0 && !savedChat.title, // Only generate if title doesn't exist
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
  filter: ({ generatedTitle }) => !!generatedTitle, // Ensure title was generated
  fn: ({ chatId, generatedTitle }): EditTitleParams => ({
    id: chatId,
    newTitle: generatedTitle!, // Non-null assertion safe due to filter
  }),
  target: editChatTitleFx,
});

// Trigger title generation manually via event
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
  generateTitle, // Added manual trigger
  duplicateChatClicked, // Added duplicate trigger
  regenerateTitleForChat, // Added regenerate trigger
  // Effects
  loadChatHistoryIndexFx,
  loadSpecificChatFx,
  saveChatFx,
  deleteChatFx,
  editChatTitleFx,
  generateTitleFx,
  duplicateChatFx, // Added duplicate effect
  regenerateTitleForChatFx // Added regenerate effect
);
