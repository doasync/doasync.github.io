import { createDomain, sample } from 'effector';
import { debug } from 'patronum/debug';
import { debounce } from 'patronum/debounce';
import { persist } from 'effector-storage/local';
import { $messageText } from '@/features/chat';
import {
  $messages,
  $currentChatTokens,
  initialChatSaveNeeded,
  editMessage,
  deleteMessage,
  // retryUpdate, // Removed
  normalResponseProcessed, // For saving after normal API responses
  assistantResponseCompleted, // Added: For saving after generate/retry completion
} from '@/features/chat';
import {
  $apiKey,
  $providerApiUrl,
  $temperature,
  $systemPrompt,
} from '@/features/chat-settings';
import { $autoTitleModelId } from '@/features/models-select';
import { $availableModels } from '@/features/models-select';
import { $selectedModelId } from '@/features/models-select';
import { modelSelected } from '@/features/models-select';
import {
  ChatSession,
  ChatHistoryIndex,
  GenerateTitleParams,
  GenerateTitleResult,
  EditTitleParams,
} from './types';
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
} from './lib';
import { appStarted } from '@/app';
import { resetEditingMessage } from '@/features/ui-state';

const historyDomain = createDomain('history');

export const loadChatHistory = historyDomain.event('loadChatHistory');
export const chatSelected = historyDomain.event<string>('chatSelected');

// --- Persisted Active Chat ID Store ---
export const $activeChatId = historyDomain
  .store<string | null>(null, {
    name: '$activeChatId',
  })
  .on(chatSelected, (_, id) => id);

// Persist the active chat ID in localStorage using effector-storage
persist({ store: $activeChatId, key: 'currentChatId' });

// --- Restoration Guard ---
export const $isRestoring = historyDomain.store(false, {
  name: '$isRestoring',
});

// Sets isRestoring to true when chat is selected (restoration phase starts)
$isRestoring.on(chatSelected, () => true);
export const deleteChat = historyDomain.event<string>('deleteChat');
export const newChatCreated = historyDomain.event('newChatCreated');
export const chatTitleEdited =
  historyDomain.event<EditTitleParams>('chatTitleEdited');
export const generateTitle = historyDomain.event('generateTitle');
export const duplicateChatClicked = historyDomain.event<string>(
  'duplicateChatClicked',
);
export const regenerateTitleForChat = historyDomain.event<string>(
  'regenerateTitleForChat',
);

// --- Effects ---
export const loadChatHistoryIndexFx = historyDomain.effect<
  void,
  ChatHistoryIndex[],
  Error
>('loadChatHistoryIndexFx', {
  handler: loadChatHistoryIndexHandler,
});
export const duplicateChatFx = historyDomain.effect<string, string, Error>(
  'duplicateChatFx',
);

duplicateChatFx.use(async (chatId) => {
  const originalChat = await loadSpecificChatHandler(chatId);
  if (!originalChat) throw new Error('Original chat not found');
  const newId = crypto.randomUUID();
  const now = Date.now();
  const duplicatedChat: ChatSession = {
    ...originalChat,
    id: newId,
    createdAt: now,
    lastModified: now,
    title: originalChat.title + ' (Copy)',
    messages: originalChat.messages ?? [],
    settings: originalChat.settings ?? {
      model: '',
      temperature: 1,
      systemPrompt: '',
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
>('loadSpecificChatFx', {
  handler: loadSpecificChatHandler,
});

export const saveChatFx = historyDomain.effect<ChatSession, void, Error>(
  'saveChatFx',
  {
    handler: saveChatHandler,
  },
);

export const deleteChatFx = historyDomain.effect<string, void, Error>(
  'deleteChatFx',
  {
    handler: deleteChatHandler,
  },
);

export const editChatTitleFx = historyDomain.effect<
  EditTitleParams,
  ChatHistoryIndex | null,
  Error
>('editChatTitleFx', {
  handler: editChatTitleHandler,
});

export const generateTitleFx = historyDomain.effect<
  GenerateTitleParams,
  GenerateTitleResult,
  Error
>('generateTitleFx', {
  handler: generateTitleHandler,
});
export const regenerateTitleForChatFx = historyDomain.effect<
  string,
  void,
  Error
>('regenerateTitleForChatFx');

regenerateTitleForChatFx.use(async (chatId) => {
  const apiKey = $apiKey.getState();
  const providerApiUrl = $providerApiUrl.getState();
  if (!apiKey) throw new Error('API key is missing');

  const chat = await loadSpecificChatHandler(chatId);
  if (!chat) throw new Error('Chat not found');

  if (!chat.messages || chat.messages.length === 0) return;

  const result = await generateTitleHandler({
    chatId,
    messages: chat.messages,
    apiKey,
    providerApiUrl,
    modelId: $selectedModelId.getState(),
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

// Removed automatic history reload after title regeneration
// The title is already updated via the normal save flow

// --- Stores ---
export const $chatHistoryIndex = historyDomain.store<ChatHistoryIndex[]>([], {
  name: '$chatHistoryIndex',
});

export const $currentChatSession = historyDomain.store<ChatSession | null>(
  null,

  {
    name: '$currentChatSession',
  },
);

export const $currentChatId = $currentChatSession.map(
  (session) => session?.id ?? null,
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

// Removed automatic title regeneration on session updates
// Title generation is now handled only by the save-based trigger (lines 539-551)

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

// After all restoring is done, set isRestoring to false
sample({
  clock: [
    loadSpecificChatFx.doneData, // restoration flows triggered here
    // If more clocks are needed for other store updates, add them here
  ],
  filter: (chat) => chat !== null, // Only after valid session loaded
  fn: () => false,
  target: $isRestoring,
});

sample({
  clock: loadSpecificChatFx.doneData,
  fn: (chat) => chat?.draft ?? '',
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

// On appStarted (after chat history index is loaded), restore session from persisted $activeChatId if possible
export const restoreChatSession = historyDomain.event<string | null>(
  'restoreChatSession',
);

// Track if we're in initial startup phase
const $isAppStartup = historyDomain.store(false, { name: '$isAppStartup' });
$isAppStartup.on(appStarted, () => true);
$isAppStartup.on(restoreChatSession, () => false);

// Only trigger restoration during app startup
sample({
  clock: loadChatHistoryIndexFx.done,
  source: {
    activeId: $activeChatId,
    chatHistory: $chatHistoryIndex,
    isAppStartup: $isAppStartup,
  },
  filter: ({ isAppStartup }) => isAppStartup, // Only during app startup
  fn: ({ activeId, chatHistory }) => {
    if (activeId && chatHistory.some((c) => c.id === activeId)) {
      return activeId;
    }
    if (chatHistory.length > 0) {
      return chatHistory[0].id;
    }
    return null;
  },
  target: restoreChatSession,
});

// Only allow valid string to reach chatSelected
sample({
  clock: restoreChatSession,
  filter: (id): id is string => typeof id === 'string' && !!id,
  target: chatSelected,
});

// If a chat is deleted and it was the active chat, clear $activeChatId (will be re-set by fallback below if needed)
sample({
  clock: deleteChat,
  source: $activeChatId,
  filter: (activeId, deletedId) => activeId === deletedId,
  fn: () => null,
  target: $activeChatId,
});

// Load specific chat details when selected from the history list
sample({
  clock: chatSelected,
  target: loadSpecificChatFx,
});

// Reset editing state when chat changes
sample({
  clock: [chatSelected, newChatCreated],
  target: resetEditingMessage,
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
  fn: () => $selectedModelId.getState(),
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
/**
 * Remove unconditional save on every update to $currentChatSession.
 * Instead, saving is guarded by isRestoring, and only triggered on explicit user/edit/draft events.
 */
// sample({
//   clock: $currentChatSession,
//   filter: (session): session is ChatSession => session !== null,
//   target: saveChatFx,
// });

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
    // retryUpdate, // Replaced by assistantResponseCompleted
    assistantResponseCompleted, // Save after generate/retry response is complete
    // debouncedDraft, // REMOVED: Draft changes update $currentChatSession, but don't trigger save directly
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
        models.find((m) => m.id === $selectedModelId.getState()) ?? null,
    ),
    isRestoring: $isRestoring,
  },
  filter: ({ messages, isRestoring }) => messages.length > 0 && !isRestoring, // Only save if not restoring
  fn: (source) => {
    // Corrected logging function
    console.log(
      '[saveChatFx Trigger] Fired. Source Messages Length:',
      source.messages.length,
      'Restoring:',
      source.isRestoring,
    ); // DEBUG LOG
    if (source.messages.length > 0) {
      console.log(
        '[saveChatFx Trigger] Last Message ID:',
        source.messages[source.messages.length - 1].id,
      ); // Log ID for easier tracking
    }
    // Remove isRestoring from session passed to prepareChatSessionFn
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isRestoring, ...rest } = source;
    return prepareChatSessionFn(rest);
  },
  target: saveChatFx,
});

// ** Auto Title Generation **

// Trigger title generation after the first save of a new chat
sample({
  clock: saveChatFx.done,
  source: { apiKey: $apiKey, providerApiUrl: $providerApiUrl },
  filter: ({ apiKey }, { params: savedChat }) =>
    !!apiKey &&
    savedChat.messages.length >= 2 &&
    (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(savedChat.title) || !savedChat.title), // Generate if no title or has timestamp title
  fn: (
    { apiKey, providerApiUrl },
    { params: savedChat },
  ): GenerateTitleParams => ({
    chatId: savedChat.id,
    messages: savedChat.messages,
    apiKey: apiKey,
    providerApiUrl: providerApiUrl,
    modelId: $autoTitleModelId.getState(),
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
  source: {
    apiKey: $apiKey,
    providerApiUrl: $providerApiUrl,
    currentChat: $currentChatSession,
  },
  filter: ({ apiKey, currentChat }) =>
    !!apiKey && !!currentChat && currentChat.messages.length > 0,
  fn: ({ apiKey, providerApiUrl, currentChat }) => ({
    chatId: currentChat!.id,
    messages: currentChat!.messages,
    apiKey: apiKey,
    providerApiUrl: providerApiUrl,
    modelId: $autoTitleModelId.getState(),
  }),
  target: generateTitleFx,
});

// --- Debugging ---

// Debug title generation flow
generateTitleFx.done.watch(({ params, result }) => {
  console.log(
    `[DEBUG] Title generated for chat ${params.chatId}:`,
    result.generatedTitle,
  );
});

generateTitleFx.fail.watch(({ error, params }) => {
  console.error(`Failed to generate title for chat ${params.chatId}:`, error);
});

editChatTitleFx.done.watch(({ params, result }) => {
  console.log(
    `[DEBUG] Title edited for chat ${params.id}:`,
    params.newTitle,
    'Result:',
    result,
  );
});

editChatTitleFx.fail.watch(({ error, params }) => {
  console.error(`Failed to edit title for chat ${params.id}:`, error);
});

// Debug watches for development
saveChatFx.done.watch(() => {
  console.log('Effect: saveChatFx done (Debug)');
});
saveChatFx.fail.watch((error) => {
  console.error('Effect: saveChatFx failed (Debug)', error);
});

sample({
  clock: modelSelected,
  source: { chat: $currentChatSession, models: $availableModels },
  filter: ({ chat }) => chat !== null,
  fn: ({ chat, models }, selectedId) => {
    const fullModel = models.find((m) => m.id === selectedId);
    if (!fullModel) return chat;
    return {
      ...chat!,
      lastModified: Date.now(),
      settings: {
        ...chat!.settings,
        model: {
          pricing: {
            prompt: Number(fullModel.pricing?.prompt) || 0,
            completion: Number(fullModel.pricing?.completion) || 0,
          },
          context_length: fullModel.context_length ?? 1000000,
        },
      },
    };
  },
  target: $currentChatSession,
});

/**
 * Remove unconditional regenerate/save trigger on every update of $currentChatSession.
 * Saving is now only triggered by guarded, explicit user-driven events.
 */
// sample({
//   clock: $currentChatSession.updates,
//   filter: (session): session is ChatSession => session !== null,
//   target: saveChatFx,
// }); // Removed to prevent save loops

debug(
  // Stores
  $chatHistoryIndex,
  $currentChatSession,
  $currentChatId,
  $isLoadingHistory,
  $isSavingChat,
  $isLoadingChat,
  $isAppStartup,
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
  regenerateTitleForChatFx,
);
