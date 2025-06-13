// This file defines the public API of the chat feature.
// Only export units (stores, events, effects) that are needed
// by other features or UI components.

// Import types separately
import { type Role, type Message, type Attachment, type MessageContentPart, type TextContentPart, type ImageContentPart, type AudioContentPart, type GeneratedImageContentPart, type DocumentContentPart, type MessageStatus } from "./types";
import { type AudioMessage, type AudioOutputPart, type ExtendedMessageContentPart, type AudioContentPartExtended, isAudioInputPart, isAudioOutputPart, hasAudioContent, createAudioContentPart, createAudioOutputPart } from "./audio-types";

// Export types
export type { Role, Message, Attachment, MessageContentPart, TextContentPart, ImageContentPart, AudioContentPart, GeneratedImageContentPart, DocumentContentPart, MessageStatus };

// Export audio types and utilities
export type { AudioMessage, AudioOutputPart, ExtendedMessageContentPart, AudioContentPartExtended };
export { isAudioInputPart, isAudioOutputPart, hasAudioContent, createAudioContentPart, createAudioOutputPart };

export {
  // Stores - Likely needed by UI
  $messageText,
  $messages,
  $isProcessingFile,
  $isGenerating,
  $currentChatTokens, // Needed by settings display
  $apiError, // Needed by UI error display
  $retryingMessageId, // Needed by MessageItem to show spinner
  $preventScroll, // Import scroll prevention state
  $scrollTrigger, // Explicit scroll trigger counter

  // Events - Triggered by UI or other features
  messageTextChanged,
  messageSent,
  editMessage, // Event triggered by MessageItem after confirming edit
  deleteMessage, // Event triggered by MessageItem
  deleteAttachment, // Event to delete specific attachments from messages
  messageRetry, // Event triggered by MessageItem (takes Message object)
  setPreventScroll,
  generateResponseClicked, // <-- Export the new event for the UI
  
  // File attachment events
  filesSelected,
  
  // Image generation events
  imageGenerationRequested,

  // Events - Potentially needed by other features (e.g., history)
  initialChatSaveNeeded,
  apiKeyMissing,
  userMessageCreated, // May be needed to trigger save in history
  mainInputFocused,
  scrollToLastMessageNeeded, // <-- Export assistant scroll event
  normalResponseProcessed, // <-- Export event for saving normal responses
  stopGenerationClicked,
  assistantResponseCompleted, // Added export
} from "./model";
