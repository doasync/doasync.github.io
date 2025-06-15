// This file defines the public API of the chat feature.
// Only export units (stores, events, effects) that are needed
// by other features or UI components.

// Import types separately - imports are removed since they're only used for re-export

// Export types
export type { MessageContentPart } from './types';
export type { MessageStatus } from './types';
export type { Role } from './types';
export type { TextContentPart } from './types';

// Export audio types and utilities

export {
  type AudioContentPartExtended,
  type AudioMessage,
  type AudioOutputPart,
  createAudioContentPart,
  createAudioOutputPart,
  type ExtendedMessageContentPart,
  hasAudioContent,
  isAudioInputPart,
  isAudioOutputPart,
} from './audio-types';
export {
  $apiError, // Needed by UI error display
  $currentChatTokens, // Needed by settings display
  $isGenerating,
  $isMainInputFocused, // Needed by mini-chat for focus tracking
  $isProcessingFile,
  $messages,
  // Stores - Likely needed by UI
  $messageText,
  $preventScroll, // Import scroll prevention state
  $retryingMessageId, // Needed by MessageItem to show spinner
  $scrollTrigger, // Explicit scroll trigger counter
  assistantResponseCompleted, // Added export
  deleteAttachment, // Event to delete specific attachments from messages
  deleteMessage, // Event triggered by MessageItem
  editMessage, // Event triggered by MessageItem after confirming edit
  // File attachment events
  filesSelected,
  generateResponseClicked, // <-- Export the new event for the UI
  // Image generation events
  imageGenerationRequested,
  // Events - Potentially needed by other features (e.g., history)
  initialChatSaveNeeded,
  mainInputFocused,
  messageRetry, // Event triggered by MessageItem (takes Message object)
  messageSent,
  // Events - Triggered by UI or other features
  messageTextChanged,
  normalResponseProcessed, // <-- Export event for saving normal responses
  scrollToLastMessageNeeded, // <-- Export assistant scroll event
  setPreventScroll,
  stopGenerationClicked,
  // apiKeyMissing moved to chat-settings feature
  userMessageCreated, // May be needed to trigger save in history
} from './model';
export {
  type Attachment,
  type AudioContentPart,
  type DocumentContentPart,
  type GeneratedImageContentPart,
  type ImageContentPart,
  type Message,
} from './types';
