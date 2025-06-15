// Public API for the chat-history feature

// Import types separately

// Export types

export {
  // Stores - Needed by UI (ChatHistoryDrawer) or other features
  $chatHistoryIndex,
  $currentChatId, // Useful for highlighting selected chat
  $currentChatSession, // Potentially useful for debugging or complex UI logic
  $isLoadingChat, // Potentially show loading indicator when switching chats
  $isLoadingHistory, // Show loading state in drawer
  $isSavingChat, // Potentially show saving indicator
  chatSelected, // Triggered by ChatHistoryDrawer list item click
  chatTitleEdited, // Triggered by editing title in ChatHistoryDrawer
  deleteChat, // Triggered by delete button in ChatHistoryDrawer
  duplicateChatClicked, // Triggered by duplicate button in ChatHistoryDrawer
  generateTitle, // Triggered by title generation button in ChatHistoryDrawer
  // deleteChatFx,
  // editChatTitleFx,
  generateTitleFx,
  // Events - Triggered by UI or app initialization
  loadChatHistory, // Potentially for manual refresh
  newChatCreated, // Triggered by New Chat button in Header
  regenerateTitleForChat, // Triggered by regenerate title menu item
  // Effects - Generally kept internal, triggered by events above
  // loadChatHistoryIndexFx,
  // loadSpecificChatFx,
  saveChatFx, // Needed by mini-chat for expanding conversations
} from './model';
export { type ChatHistoryIndex, type ChatSession } from './types';
