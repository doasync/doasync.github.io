// Public API for the chat-history feature

// Import types separately
import { type ChatSession, type ChatHistoryIndex } from "./types";

// Export types
export type { ChatSession, ChatHistoryIndex };

export {
  // Stores - Needed by UI (ChatHistoryDrawer) or other features
  $chatHistoryIndex,
  $currentChatSession, // Potentially useful for debugging or complex UI logic
  $currentChatId, // Useful for highlighting selected chat
  $isLoadingHistory, // Show loading state in drawer
  $isSavingChat, // Potentially show saving indicator
  $isLoadingChat, // Potentially show loading indicator when switching chats

  // Events - Triggered by UI or app initialization
  appStarted, // Triggered on app load
  loadChatHistory, // Potentially for manual refresh
  chatSelected, // Triggered by ChatHistoryDrawer list item click
  deleteChat, // Triggered by delete button in ChatHistoryDrawer
  newChatCreated, // Triggered by New Chat button in Header
  chatTitleEdited, // Triggered by editing title in ChatHistoryDrawer

  // Effects - Generally kept internal, triggered by events above
  // loadChatHistoryIndexFx,
  // loadSpecificChatFx,
  // saveChatFx,
  // deleteChatFx,
  // editChatTitleFx,
  generateTitleFx,
} from "./model";
