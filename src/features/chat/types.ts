// Type definitions for the chat feature

export type Role = "user" | "assistant" | "system";

// Multimodal content parts for OpenAI-compatible format
export interface TextContentPart {
  type: "text";
  text: string;
}

export interface ImageContentPart {
  type: "image_url";
  image_url: {
    url: string; // Base64 data URL or public HTTPS URL
    detail?: "low" | "high" | "auto";
  };
}

export interface AudioContentPart {
  type: "input_audio";
  input_audio: {
    data: string; // Base64 encoded audio data
    format?: "wav" | "mp3" | "flac" | "opus"; // Audio format hint
  };
}

export interface GeneratedImageContentPart {
  type: "generated_image";
  generated_image: {
    url?: string; // Image URL from API
    b64_json?: string; // Base64 encoded image data
    prompt: string; // The prompt used to generate the image
    model: string; // Model used for generation
    parameters?: {
      size?: string;
      quality?: string;
      style?: string;
      n?: number;
    };
  };
}

export type MessageContentPart = TextContentPart | ImageContentPart | AudioContentPart | GeneratedImageContentPart;

// Attachment metadata for UI handling
export interface Attachment {
  id: string;
  type: "image" | "audio" | "document";
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl?: string; // Base64 data URL for preview/sending
  previewUrl?: string; // Object URL for efficient preview
  extractedText?: string; // For documents
  metadata?: {
    dimensions?: { width: number; height: number };
    duration?: number; // For audio files
  };
}

export type MessageStatus = "pending" | "sent" | "failed";

export interface Message {
  id: string;
  role: Role;
  content: string | MessageContentPart[]; // Support multimodal content
  timestamp: number;
  isEdited?: boolean;
  originalContent?: string | MessageContentPart[];
  isLoading?: boolean; // Added for placeholder/retry state
  isRetryOf?: string; // Optional: ID of the message this is a retry for
  attachments?: Attachment[]; // For UI rendering and management
  status?: MessageStatus; // Track if message has been sent to API
}

// Define the types of request contexts
export type RequestContextNormal = { type: "normal" };
export type RequestContextGenerate = {
  type: "generate";
  placeholderId: string;
};
export type RequestContextRetry = {
  type: "retry";
  originalMessageId: string;
  originalRole: Role;
  retryPlaceholderId?: string; // ID of placeholder added if retrying user -> user/end
};

export type RequestContext =
  | RequestContextNormal
  | RequestContextGenerate
  | RequestContextRetry;

// Removed SendApiRequestParams as API calls are now handled by chat-stream feature
// The parameters for the new streamChatFx effect are defined in chat-stream/types.ts

// Type for the payload of the internal retryUpdate event
export interface RetryUpdatePayload {
  targetIndex: number;
  newAssistantMessage: Message;
  insert?: boolean; // Flag to indicate insertion instead of replacement
}

// Type for the payload of the internal calculatedRetryUpdate event
// This still represents the *result* of the calculation
export type CalculatedRetryUpdatePayload = RetryUpdatePayload | null;

// Type for the payload of the messageRetryInitiated event
export interface MessageRetryInitiatedPayload {
  messageId: string;
  role: Role;
}
