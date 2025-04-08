// This file defines the public API of the chat feature.
// Only export units (stores, events, effects) that are needed
// by other features or UI components.

// Import types separately
import { type Role, type Message } from "./types";

// Export types
export type { Role, Message };

export {
  // Stores - Likely needed by UI
  $messageText,
  $messages,
  $isGenerating,
  $currentChatTokens, // Needed by settings display
  $apiError, // Needed by UI error display
  $retryingMessageId, // Needed by MessageItem to show spinner
  $preventScroll, // Import scroll prevention state

  // Events - Triggered by UI or other features
  messageTextChanged,
  messageSent,
  editMessage, // Event triggered by MessageItem after confirming edit
  deleteMessage, // Event triggered by MessageItem
  messageRetry, // Event triggered by MessageItem (takes Message object)
  setPreventScroll,

  // Events - Potentially needed by other features (e.g., history)
  initialChatSaveNeeded,
  apiKeyMissing,
  apiRequestTokensUpdated,
  apiRequestSuccess, // May be needed to trigger save in history
  userMessageCreated, // May be needed to trigger save in history

  // Effects - Generally not exported unless specifically needed externally
  // sendApiRequestFx // Keep internal for now
} from "./model";
