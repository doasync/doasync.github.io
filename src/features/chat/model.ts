import { sample, createDomain } from 'effector'; // Removed split
import { debug } from 'patronum/debug';
import {
  $apiKey,
  $providerApiUrl,
  $temperature,
  $systemPrompt,
  apiKeyMissing,
} from '@/features/chat-settings';
import {
  $selectedModelId,
  $currentModelSupportsVision,
  $currentModelSupportsAudio,
  autoSelectModelForCapabilities,
} from '@/features/models-select';
import { $selectedVoice as $ttsVoice } from '@/features/text-to-speech';
// Import chat-stream feature
import {
  streamChatFx,
  abortStream,
  StreamChatParams,
  StreamChunkPayload,
  StreamErrorPayload,
} from '@/features/chat-stream';

import {
  Message,
  Attachment,
  MessageContentPart,
  TextContentPart,
  GeneratedImageContentPart,
  MessageRetryInitiatedPayload, // Keep for spinner logic potentially
  Role, // Import Role type
} from './types';
import {
  prepareRetryRequestParamsFn, // Keep for retry param prep
  determineRetryingMessageIdFn, // Keep for spinner logic
  formatMessagesForAPI, // New function for message formatting
} from './lib'; // Only keep necessary imports

// Import image generation feature
import {
  generateImageFx,
  $selectedImageGenModel,
  $imageGenerationSettings,
  $generatedImages,
  sendImageToChat,
  isImageGenerationCommand,
  parseImageGenerationCommand,
  type ImageGenerationParams,
} from '@/features/image-generation';

// Import document processing feature
import { processDocumentsFx } from '@/features/document-processing';

// --- Helper Functions ---

/**
 * Helper function to detect if any message contains audio content
 */
function hasAudioContentInMessages(messages: unknown[]): boolean {
  return messages.some((message) => {
    if (
      typeof message !== 'object' ||
      message === null ||
      !('content' in message)
    )
      return false;
    const messageContent = (message as { content: unknown }).content;
    if (typeof messageContent === 'string') return false;
    return (
      Array.isArray(messageContent) &&
      messageContent.some(
        (part: unknown) =>
          typeof part === 'object' &&
          part !== null &&
          'type' in part &&
          (part as { type: unknown }).type === 'input_audio',
      )
    );
  });
}

/**
 * Helper function to get audio parameters for chat completions
 */
function getAudioParams(
  hasAudio: boolean,
  supportsAudio: boolean,
  ttsVoice: string,
): {
  modalities?: ('text' | 'audio')[];
  audio?: { voice: string; format: 'wav' | 'mp3' | 'flac' | 'opus' | 'pcm' };
} {
  if (!hasAudio || !supportsAudio) return {};

  return {
    modalities: ['text', 'audio'],
    audio: {
      voice: ttsVoice || 'alloy',
      format: 'mp3' as const,
    },
  };
}

// --- Domain ---
const chatDomain = createDomain('chat');

// --- Events ---

// Public Events
export const messageTextChanged =
  chatDomain.event<string>('messageTextChanged');
export const messageSent = chatDomain.event<void>('messageSent');
export const editMessage = chatDomain.event<{
  messageId: string;
  newContent: string;
}>('editMessage');
export const deleteMessage = chatDomain.event<string>('deleteMessage');
export const deleteAttachment = chatDomain.event<{
  messageId: string;
  attachmentIndex: number;
}>('deleteAttachment');
export const messageRetry = chatDomain.event<Message>('messageRetry');
export const initialChatSaveNeeded = chatDomain.event<void>(
  'initialChatSaveNeeded',
);
// apiKeyMissing event moved to chat-settings feature
export const userMessageCreated =
  chatDomain.event<Message>('userMessageCreated');
export const scrollToLastMessageNeeded = chatDomain.event<void>(
  'scrollToLastMessageNeeded',
);
export const setPreventScroll = chatDomain.event<boolean>('setPreventScroll');
export const generateResponseClicked = chatDomain.event<void>(
  'generateResponseClicked',
);
export const normalResponseProcessed = chatDomain.event<void>(
  'normalResponseProcessed',
); // Explicit trigger for saving normal responses
export const mainInputFocused = chatDomain.event<boolean>('mainInputFocused');
// Event to trigger stream cancellation from UI
export const stopGenerationClicked = chatDomain.event<void>(
  'stopGenerationClicked',
);
export const assistantResponseCompleted = chatDomain.event<void>(
  'assistantResponseCompleted',
);

// File attachment events
export const filesSelected = chatDomain.event<File[]>('filesSelected');

// Events for single pending message management
const mergeFilesIntoPendingMessage = chatDomain.event<Message>(
  'mergeFilesIntoPendingMessage',
);
const clearActivePendingMessage = chatDomain.event<void>(
  'clearActivePendingMessage',
);

// Image generation events
export const imageGenerationRequested = chatDomain.event<string>(
  'imageGenerationRequested',
);

// Event to add generated image to chat
export const addGeneratedImageToChat = chatDomain.event<{
  imageId: string;
  url?: string;
  b64_json?: string;
  prompt: string;
  model: string;
  parameters?: {
    size?: string;
    quality?: string;
    style?: string;
    n?: number;
  };
}>('addGeneratedImageToChat');

// Internal Events
const messageRetryInitiated = chatDomain.event<MessageRetryInitiatedPayload>(
  'messageRetryInitiated',
);

// New type alias for the payload of streamInitiatedWithTarget
type StreamInitiatedWithTargetPayload = {
  streamId: string;
  targetMessageId: string;
  shouldAddNewMessage: boolean;
  streamParams: StreamChatParams;
};

// New event to orchestrate message preparation and stream initiation
const streamInitiatedWithTarget =
  chatDomain.event<StreamInitiatedWithTargetPayload>();

// Internal event to signal stream request start with its ID (moved down to avoid "cannot find name")
const streamRequestInitiated = chatDomain.event<{ streamId: string }>(
  'streamRequestInitiated',
);

// Internal events for stream callbacks, now using targetMessageId
const _messageChunkReceived = chatDomain.event<{
  targetMessageId: string;
  chunkContent: string;
  isFirstChunk: boolean; // Added isFirstChunk
}>();
const _messageCompleted = chatDomain.event<{ targetMessageId: string }>();
const _messageErrored = chatDomain.event<{
  targetMessageId: string;
  error: Error;
}>();
const _messageAborted = chatDomain.event<{ targetMessageId: string }>();

// Internal event to signal chat stream has finished (success, error, or abort) for local state management
const chatStreamFinished = chatDomain.event<void>('chatStreamFinished');

// --- Stores ---
export const $messageText = chatDomain.store<string>('', {
  name: '$messageText',
});
export const $messages = chatDomain.store<Message[]>([], { name: '$messages' });
export const $isGenerating = chatDomain
  .store<boolean>(false, {
    name: '$isGenerating',
  })
  .on(streamInitiatedWithTarget, () => true) // Set true when *this* chat's stream starts
  .on(chatStreamFinished, () => false); // Set false when *this* chat's stream finishes (complete/error/abort)

// File processing store
export const $isProcessingFile = chatDomain.store<boolean>(false, {
  name: '$isProcessingFile',
});

export const $currentChatTokens = chatDomain.store<number>(0, {
  name: '$currentChatTokens',
});
export const $apiError = chatDomain.store<string | null>(null, {
  name: '$apiError',
});

// Store for the currently active stream ID (for cancellation)
export const $activeChatStreamId = chatDomain
  .store<string | null>(null, {
    name: '$activeChatStreamId',
  })
  .on(streamInitiatedWithTarget, (_, { streamId }) => streamId);

export const $retryingMessageId = chatDomain.store<string | null>(null, {
  name: '$retryingMessageId',
}); // For spinner

export const $preventScroll = chatDomain.store<boolean>(false, {
  name: '$preventScroll',
});

export const $scrollTrigger = chatDomain
  .store<number>(0, { name: '$scrollTrigger' })
  .on(scrollToLastMessageNeeded, () => Date.now());

// Store for main input focus state
export const $isMainInputFocused = chatDomain
  .store<boolean>(false, { name: '$isMainInputFocused' })
  .on(mainInputFocused, (_, isFocused) => isFocused); // Corrected payload destructuring

// Store for the single active pending multimodal message
export const $activePendingMultimodalMessage = chatDomain.store<Message | null>(
  null,
  {
    name: '$activePendingMultimodalMessage',
  },
);

// --- Effects ---

// File processing effect - creates a single message with all selected files
const processFilesFx = chatDomain.effect<File[], Message>({
  name: 'processFilesFx',
  handler: async (files: File[]) => {
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB for audio, 20MB for images
    const SUPPORTED_IMAGE_TYPES = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    const SUPPORTED_AUDIO_TYPES = [
      'audio/wav',
      'audio/mp3',
      'audio/aiff',
      'audio/aac',
      'audio/ogg',
      'audio/flac',
      'audio/mp4',
      'audio/mpeg',
      'audio/mpga',
      'audio/m4a',
      'audio/webm',
    ];
    const SUPPORTED_DOCUMENT_TYPES = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
      'application/x-markdown',
      'text/html',
      'application/xhtml+xml',
    ];

    const contentParts: MessageContentPart[] = [];
    const attachments: Attachment[] = [];

    // Separate files by type for batch processing (documents need special handling)
    const documentFiles = files.filter((f) =>
      SUPPORTED_DOCUMENT_TYPES.includes(f.type),
    );

    // Process document files and create a map for later lookup
    const documentResultsMap = new Map<string, unknown>();
    if (documentFiles.length > 0) {
      try {
        const documentResults = await processDocumentsFx(documentFiles);

        // Create a map of file name to result for later lookup
        for (let i = 0; i < documentFiles.length; i++) {
          const file = documentFiles[i];
          const result = documentResults[i];
          if (result) {
            // Use file name + size as key to handle duplicate names
            documentResultsMap.set(`${file.name}_${file.size}`, result);
          }
        }
      } catch (error) {
        console.error('Document processing failed:', error);
        throw new Error(
          `Document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Process all files in their original order (preserving user selection order)
    for (const file of files) {
      const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
      const isAudio = SUPPORTED_AUDIO_TYPES.includes(file.type);
      const isDocument = SUPPORTED_DOCUMENT_TYPES.includes(file.type);

      // Validate file
      if (!isImage && !isAudio && !isDocument) {
        throw new Error(
          `File "${file.name}" has unsupported type. Supported types: Images (JPEG, PNG, GIF, WebP), Audio (WAV, MP3, AIFF, AAC, OGG, FLAC, MP4, MPEG, MPGA, M4A, WEBM), or Documents (PDF, DOCX, TXT, MD, HTML)`,
        );
      }

      if (isImage && file.size > 20 * 1024 * 1024) {
        throw new Error(
          `Image file "${file.name}" too large. Maximum size is 20MB.`,
        );
      }

      if (isAudio && file.size > MAX_FILE_SIZE) {
        throw new Error(
          `Audio file "${file.name}" too large. Maximum size is 25MB.`,
        );
      }

      // Handle document files (use pre-processed results)
      if (isDocument) {
        const resultKey = `${file.name}_${file.size}`;
        const result = documentResultsMap.get(resultKey) as
          | import('@/features/document-processing/types').DocumentProcessingResult
          | undefined;

        if (!result) {
          console.warn(
            `Document processing result not found for: ${file.name}`,
          );
          continue;
        }

        // Create document content part
        contentParts.push({
          type: 'document',
          document: {
            text: result.extractedText,
            previewHtml: result.previewHtml,
            originalContent: result.originalContent, // Include original HTML content if available
            metadata: {
              fileName: result.metadata.fileName,
              fileSize: result.metadata.fileSize,
              mimeType: result.metadata.mimeType,
              wordCount: result.metadata.wordCount,
              pageCount: result.metadata.pageCount,
              title: result.metadata.title,
              author: result.metadata.author,
            },
          },
        });

        const attachment: Attachment = {
          id: crypto.randomUUID(),
          type: 'document',
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          extractedText: result.extractedText,
          originalContent: result.originalContent, // Store original HTML content if available
          chunks: result.chunks,
          metadata: {
            wordCount: result.metadata.wordCount,
            pageCount: result.metadata.pageCount,
            title: result.metadata.title,
            author: result.metadata.author,
          },
        };

        attachments.push(attachment);
        continue; // Skip to next file
      }

      // Read file for media files (images and audio)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          resolve(reader.result as string);
        };

        reader.onerror = () => {
          reject(new Error(`Failed to read file: ${file.name}`));
        };

        reader.readAsDataURL(file);
      });

      if (isImage) {
        // Get image dimensions
        const dimensions = await new Promise<{ width: number; height: number }>(
          (resolve) => {
            const img = new Image();
            img.onload = () => {
              resolve({ width: img.width, height: img.height });
            };
            img.onerror = () => {
              resolve({ width: 0, height: 0 }); // Fallback if dimensions can't be determined
            };
            img.src = dataUrl;
          },
        );

        // Create image content part
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: dataUrl,
            detail: 'auto',
          },
        });

        const attachment: Attachment = {
          id: crypto.randomUUID(),
          type: 'image',
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          dataUrl,
          metadata: {
            dimensions: dimensions.width > 0 ? dimensions : undefined,
          },
        };

        attachments.push(attachment);
      } else {
        // Audio file
        // Get audio duration with improved handling for different formats and proper isolation
        const duration = await new Promise<number | undefined>((resolve) => {
          const audio = new Audio();
          let resolved = false;
          let timeoutId: NodeJS.Timeout | null = null;

          const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            audio.onloadedmetadata = null;
            audio.oncanplaythrough = null;
            audio.ondurationchange = null;
            audio.onerror = null;
            audio.src = '';
            audio.load(); // Clear the audio element
          };

          const resolveWithValue = (
            value: number | undefined,
            source: string,
          ) => {
            if (!resolved) {
              resolved = true;
              cleanup();
              if (value && isFinite(value) && !isNaN(value) && value > 0) {
                console.log(
                  `[${file.name}] Audio duration extracted from ${source}:`,
                  value,
                );
                resolve(value);
              } else {
                console.log(
                  `[${file.name}] Invalid duration from ${source}:`,
                  value,
                );
                resolve(undefined);
              }
            }
          };

          // Multiple event handlers for different browsers/formats
          audio.onloadedmetadata = () => {
            console.log(
              `[${file.name}] Audio metadata loaded, duration:`,
              audio.duration,
            );
            resolveWithValue(audio.duration, 'loadedmetadata');
          };

          audio.oncanplaythrough = () => {
            console.log(
              `[${file.name}] Audio can play through, duration:`,
              audio.duration,
            );
            resolveWithValue(audio.duration, 'canplaythrough');
          };

          audio.ondurationchange = () => {
            console.log(
              `[${file.name}] Audio duration changed:`,
              audio.duration,
            );
            resolveWithValue(audio.duration, 'durationchange');
          };

          audio.onerror = (e) => {
            console.log(`[${file.name}] Audio loading error:`, e);
            resolveWithValue(undefined, 'error');
          };

          // Shorter timeout for better UX
          timeoutId = setTimeout(() => {
            console.log(
              `[${file.name}] Audio duration extraction timeout for format:`,
              file.type,
            );
            resolveWithValue(undefined, 'timeout');
          }, 3000);

          // Set source and preload - create unique data URL for this specific audio element
          audio.preload = 'metadata';
          audio.src = dataUrl; // Each audio element gets its own dataUrl from the file iteration
          audio.load();
        });

        // Extract format from MIME type
        const formatMap: Record<string, string> = {
          'audio/wav': 'wav',
          'audio/mp3': 'mp3',
          'audio/mpeg': 'mp3',
          'audio/mp4': 'mp4',
          'audio/m4a': 'mp4',
          'audio/flac': 'flac',
          'audio/ogg': 'opus',
          'audio/webm': 'opus',
          'audio/aac': 'aac',
        };
        const format = formatMap[file.type] || 'mp3';

        // Create audio content part
        contentParts.push({
          type: 'input_audio',
          input_audio: {
            data: dataUrl.split(',')[1], // Remove data URL prefix
            format: format as 'wav' | 'mp3' | 'flac' | 'opus',
          },
        });

        const attachment: Attachment = {
          id: crypto.randomUUID(),
          type: 'audio',
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          dataUrl,
          metadata: {
            duration,
          },
        };

        attachments.push(attachment);
      }
    }

    // Create single message with all attachments
    const message: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: contentParts,
      timestamp: Date.now(),
      status: 'pending', // Mark as pending until sent with text
      attachments,
    };

    return message;
  },
});

// --- Helper Functions / Type Guards ---
const isRetryableMessage = (
  message: Message | undefined,
): message is Message & { role: 'user' | 'assistant' } => {
  return !!message && (message.role === 'user' || message.role === 'assistant');
};

// --- Store Updates (.on/.reset) ---

$messageText.on(messageTextChanged, (_, text) => text);

// File attachment state management
$isProcessingFile.on(processFilesFx, () => true).reset(processFilesFx.finally);

// Handle merging files into the active pending message
$activePendingMultimodalMessage.on(
  mergeFilesIntoPendingMessage,
  (currentPending, newFileMessage) => {
    if (!currentPending) {
      // No existing pending message, use the new one
      return newFileMessage;
    }

    // Merge attachments and content from new message into existing pending message
    const existingContent = Array.isArray(currentPending.content)
      ? currentPending.content
      : [];
    const newContent = Array.isArray(newFileMessage.content)
      ? newFileMessage.content
      : [];

    const mergedContent = [...existingContent, ...newContent];
    const mergedAttachments = [
      ...(currentPending.attachments || []),
      ...(newFileMessage.attachments || []),
    ];

    return {
      ...currentPending,
      content: mergedContent,
      attachments: mergedAttachments,
      timestamp: Date.now(), // Update timestamp to latest
    };
  },
);

// Clear the active pending message
$activePendingMultimodalMessage.on(clearActivePendingMessage, () => null);

// Handle message deletion for pending messages
$activePendingMultimodalMessage.on(
  deleteMessage,
  (currentPending, messageId) => {
    // If the deleted message is the active pending message, clear it
    if (currentPending && currentPending.id === messageId) {
      return null;
    }
    return currentPending;
  },
);

// Handle attachment deletion within the active pending message
$activePendingMultimodalMessage.on(
  deleteAttachment,
  (currentPending, { messageId, attachmentIndex }) => {
    // Only process if this deletion affects the current pending message
    if (!currentPending || currentPending.id !== messageId) {
      return currentPending;
    }

    // Only process messages with array content (multimodal messages)
    if (typeof currentPending.content === 'string') {
      return currentPending;
    }

    // Remove the attachment at the specified index
    const newContent = currentPending.content.filter(
      (_, index) => index !== attachmentIndex,
    );

    // If removing the attachment leaves only text content, convert to string
    if (newContent.length === 1 && newContent[0].type === 'text') {
      return {
        ...currentPending,
        content: newContent[0].text,
        attachments: currentPending.attachments?.filter(
          (_, index) => index !== attachmentIndex,
        ),
      };
    }

    // If no content left, clear the entire pending message
    if (newContent.length === 0) {
      return null;
    }

    // Otherwise keep as array
    return {
      ...currentPending,
      content: newContent,
      attachments: currentPending.attachments?.filter(
        (_, index) => index !== attachmentIndex,
      ),
    };
  },
);

// Handle adding generated image to chat
$activePendingMultimodalMessage.on(
  addGeneratedImageToChat,
  (currentPending, imageData) => {
    // Create generated image content part
    const generatedImagePart: GeneratedImageContentPart = {
      type: 'generated_image',
      generated_image: {
        url: imageData.url,
        b64_json: imageData.b64_json,
        prompt: imageData.prompt,
        model: imageData.model,
        parameters: imageData.parameters,
      },
    };

    // Create or update pending message
    if (!currentPending) {
      // Create new pending message with the generated image
      return {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: [generatedImagePart],
        timestamp: Date.now(),
        status: 'pending' as const,
        attachments: [],
      };
    } else {
      // Add to existing pending message
      const existingContent = Array.isArray(currentPending.content)
        ? currentPending.content
        : currentPending.content
          ? [{ type: 'text' as const, text: currentPending.content }]
          : [];

      return {
        ...currentPending,
        content: [...existingContent, generatedImagePart],
        timestamp: Date.now(), // Update timestamp to latest
      };
    }
  },
);

// Sync $messages store with active pending message
$messages.on(mergeFilesIntoPendingMessage, (messages, newFileMessage) => {
  const activePending = $activePendingMultimodalMessage.getState();

  if (!activePending) {
    // This shouldn't happen, but handle gracefully
    return [...messages, newFileMessage];
  }

  // Find and replace existing pending message, or add new one
  const existingPendingIndex = messages.findIndex(
    (msg) =>
      msg.status === 'pending' &&
      msg.role === 'user' &&
      Array.isArray(msg.content) &&
      msg.content.some(
        (part) =>
          part.type === 'image_url' ||
          part.type === 'input_audio' ||
          part.type === 'document',
      ),
  );

  if (existingPendingIndex >= 0) {
    // Replace existing pending message
    const updatedMessages = [...messages];
    updatedMessages[existingPendingIndex] = activePending;
    return updatedMessages;
  } else {
    // Add new pending message
    return [...messages, activePending];
  }
});

// Sync $messages when a generated image is added to pending message
$messages.on(addGeneratedImageToChat, (messages) => {
  const activePending = $activePendingMultimodalMessage.getState();

  if (!activePending) {
    return messages;
  }

  // Find and replace existing pending message, or add new one
  const existingPendingIndex = messages.findIndex(
    (msg) =>
      msg.status === 'pending' &&
      msg.role === 'user' &&
      Array.isArray(msg.content) &&
      msg.content.some(
        (part) =>
          part.type === 'image_url' ||
          part.type === 'input_audio' ||
          part.type === 'document' ||
          part.type === 'generated_image',
      ),
  );

  if (existingPendingIndex >= 0) {
    // Replace existing pending message
    const updatedMessages = [...messages];
    updatedMessages[existingPendingIndex] = activePending;
    return updatedMessages;
  } else {
    // Add new pending message
    return [...messages, activePending];
  }
});

// Clear pending message from $messages when cleared from active store
$messages.on(clearActivePendingMessage, (messages) => {
  return messages.filter((msg) => {
    // Remove pending media-only messages
    if (
      msg.status === 'pending' &&
      msg.role === 'user' &&
      Array.isArray(msg.content)
    ) {
      const isMediaOnly = msg.content.every(
        (part) =>
          part.type === 'image_url' ||
          part.type === 'input_audio' ||
          part.type === 'document',
      );
      return !isMediaOnly;
    }
    return true;
  });
});

// Sync $messages when $activePendingMultimodalMessage changes due to deletion
$messages.on(deleteMessage, (messages, messageId) => {
  // Check if the deleted message was a pending message
  const deletedMessage = messages.find((msg) => msg.id === messageId);
  if (deletedMessage && deletedMessage.status === 'pending') {
    // If the deleted pending message was the active one, we need to keep stores in sync
    // The $activePendingMultimodalMessage handler above already cleared it
    // This ensures $messages reflects the same state
  }
  return messages.filter((msg) => msg.id !== messageId);
});

// Sync $messages when an attachment is deleted from the active pending message
$messages.on(deleteAttachment, (messages, { messageId, attachmentIndex }) => {
  return messages
    .map((msg) => {
      if (msg.id !== messageId) return msg;

      // Get the updated state from $activePendingMultimodalMessage to stay in sync
      const activePending = $activePendingMultimodalMessage.getState();

      // If this is the active pending message and it was cleared due to attachment deletion
      if (
        msg.status === 'pending' &&
        activePending === null &&
        msg.id === messageId
      ) {
        // The message should be removed entirely
        return null;
      }

      // If this is the active pending message and it was updated
      if (
        msg.status === 'pending' &&
        activePending &&
        msg.id === activePending.id
      ) {
        // Use the updated pending message from the active store
        return activePending;
      }

      // For non-pending messages, use the original logic
      if (typeof msg.content === 'string') return msg;

      const newContent = msg.content.filter(
        (_, index) => index !== attachmentIndex,
      );

      if (newContent.length === 1 && newContent[0].type === 'text') {
        return {
          ...msg,
          content: newContent[0].text,
          attachments: msg.attachments?.filter(
            (_, index) => index !== attachmentIndex,
          ),
        };
      }

      return {
        ...msg,
        content: newContent,
        attachments: msg.attachments?.filter(
          (_, index) => index !== attachmentIndex,
        ),
      };
    })
    .filter((msg) => msg !== null); // Remove null entries (cleared pending messages)
});

// Trigger file processing when files are selected
sample({
  clock: filesSelected,
  target: processFilesFx,
});

// Handle processed files by merging into active pending message
sample({
  clock: processFilesFx.doneData,
  target: mergeFilesIntoPendingMessage,
});

// Auto-select appropriate model based on file attachments
sample({
  clock: processFilesFx.doneData,
  source: {
    supportsVision: $currentModelSupportsVision,
    supportsAudio: $currentModelSupportsAudio,
  },
  filter: ({ supportsVision, supportsAudio }, message) => {
    if (!message.attachments || message.attachments.length === 0) return false;

    const hasImages = message.attachments.some((att) => att.type === 'image');
    const hasAudio = message.attachments.some((att) => att.type === 'audio');

    return (hasImages && !supportsVision) || (hasAudio && !supportsAudio);
  },
  fn: (_, message) => {
    const hasImages =
      message.attachments?.some((att) => att.type === 'image') || false;
    const hasAudio =
      message.attachments?.some((att) => att.type === 'audio') || false;

    return {
      vision: hasImages,
      audio: hasAudio,
      preferFree: false,
    };
  },
  target: autoSelectModelForCapabilities,
});

// Handle image generation requests
sample({
  clock: imageGenerationRequested,
  source: {
    apiKey: $apiKey,
    providerApiUrl: $providerApiUrl,
    selectedModel: $selectedImageGenModel,
    settings: $imageGenerationSettings,
  },
  filter: ({ apiKey }) => !!apiKey,
  fn: ({ apiKey, providerApiUrl, selectedModel, settings }, command) => {
    const { prompt, params } = parseImageGenerationCommand(command);

    const imageGenParams: ImageGenerationParams & {
      apiKey: string;
      providerApiUrl: string;
    } = {
      apiKey,
      providerApiUrl,
      prompt,
      model: selectedModel,
      size: params.size || settings.size,
      quality: params.quality || settings.quality,
      style: params.style || settings.style,
      n: params.n || settings.n,
    };

    return imageGenParams;
  },
  target: generateImageFx,
});

// Handle sending generated image to chat
sample({
  clock: sendImageToChat,
  source: $generatedImages,
  fn: (generatedImages, imageId) => {
    const image = generatedImages.find((img) => img.id === imageId);
    if (!image) {
      throw new Error(`Generated image with ID ${imageId} not found`);
    }

    return {
      imageId: image.id,
      url: image.url,
      b64_json: image.b64_json,
      prompt: image.prompt,
      model: image.model,
      parameters: image.parameters,
    };
  },
  target: addGeneratedImageToChat,
});

// Clear message input after image generation request
sample({
  clock: imageGenerationRequested,
  fn: () => '',
  target: $messageText,
});

// Trigger API key missing event if image generation requested without key
sample({
  clock: imageGenerationRequested,
  source: $apiKey,
  filter: (key) => !key,
  target: apiKeyMissing,
});

$messages
  .on(editMessage, (list, { messageId, newContent }) =>
    list.map((msg) =>
      msg.id === messageId
        ? {
            ...msg,
            content:
              msg.content && Array.isArray(msg.content)
                ? // For multimodal messages, preserve all non-text parts and update/add text part
                  (() => {
                    // Filter out existing text parts
                    const nonTextParts = msg.content.filter(
                      (part) => part.type !== 'text',
                    );

                    // Add the new text content if not empty
                    const newTextPart: TextContentPart = {
                      type: 'text',
                      text: newContent.trim(),
                    };

                    // If there's text content, include it; otherwise just return non-text parts
                    return newContent.trim()
                      ? [newTextPart, ...nonTextParts]
                      : nonTextParts;
                  })()
                : // For text-only messages, just replace with new text
                  newContent,
            isEdited: true,
            originalContent: msg.content,
            // Preserve attachments array - critical for UI rendering
            attachments: msg.attachments,
          }
        : msg,
    ),
  )
  // deleteMessage and deleteAttachment handlers moved to separate .on() calls above for better sync
  .on(
    streamInitiatedWithTarget,
    (messages, { targetMessageId, shouldAddNewMessage }) => {
      if (shouldAddNewMessage) {
        // Add a new assistant message
        return [
          ...messages,
          {
            id: targetMessageId,
            role: 'assistant', // Always assistant for generated/retried responses
            content: '',
            timestamp: Date.now(),
            isLoading: true,
          } as Message,
        ];
      } else {
        // Update an existing message (e.g., clear content and set loading)
        return messages.map((msg) =>
          msg.id === targetMessageId
            ? { ...msg, isLoading: true } // Preserve content, only set loading for existing
            : msg,
        );
      }
    },
  );

$apiError.reset(messageSent, generateResponseClicked, messageRetry); // Reset on user action start

$retryingMessageId
  .on(messageRetryInitiated, (_, payload) => {
    // Keep spinner logic for retry initiation
    const messages = $messages.getState();
    if (payload.role === 'assistant') return payload.messageId;
    return determineRetryingMessageIdFn(messages, payload);
  })
  .on(streamInitiatedWithTarget, (_, { targetMessageId }) => targetMessageId); // Show spinner on target message

$preventScroll
  .on(editMessage, () => true) // Prevent scroll during edit
  .on(messageRetryInitiated, () => false) // Allow scroll on retry start
  .on(streamInitiatedWithTarget, () => false); // Allow scroll when a stream target is prepared

// Now, add reset logic to stores using these events
$activeChatStreamId.reset(_messageCompleted, _messageErrored, _messageAborted);
$retryingMessageId.reset(_messageCompleted, _messageErrored, _messageAborted);
$preventScroll.reset(_messageCompleted, _messageErrored, _messageAborted); // Reset scroll lock on finish

// Add handlers to $messages for internal events
$messages
  .on(
    _messageChunkReceived,
    (messages, { targetMessageId, chunkContent, isFirstChunk }) => {
      const targetMsgIndex = messages.findIndex(
        (m) => m.id === targetMessageId,
      );
      if (targetMsgIndex === -1) {
        console.warn(`Target message not found for chunk: ${targetMessageId}`);
        return messages; // Safety check: if message not found, return original array
      }

      const currentContent = messages[targetMsgIndex].content;
      const updatedContent = isFirstChunk
        ? chunkContent
        : currentContent + chunkContent;

      const updatedMsg = {
        ...messages[targetMsgIndex],
        content: updatedContent,
        isLoading: true, // Keep loading during chunks
      };
      const newMsgs = [...messages];
      newMsgs[targetMsgIndex] = updatedMsg;
      return newMsgs;
    },
  )
  .on(_messageCompleted, (messages, { targetMessageId }) => {
    const targetMsgIndex = messages.findIndex((m) => m.id === targetMessageId);
    if (targetMsgIndex === -1) {
      console.warn(
        `Target message not found for completion: ${targetMessageId}`,
      );
      return messages;
    }
    const updatedMsg = {
      ...messages[targetMsgIndex],
      isLoading: false,
    };
    const newMsgs = [...messages];
    newMsgs[targetMsgIndex] = updatedMsg;
    return newMsgs;
  })
  .on(_messageErrored, (messages, { targetMessageId, error }) => {
    const targetMsgIndex = messages.findIndex((m) => m.id === targetMessageId);
    if (targetMsgIndex === -1) {
      console.warn(`Target message not found for error: ${targetMessageId}`);
      return messages;
    }
    const updatedMsg = {
      ...messages[targetMsgIndex],
      isLoading: false,
      content: `Error: ${error.message}`, // Show error in content
    };
    const newMsgs = [...messages];
    newMsgs[targetMsgIndex] = updatedMsg;
    return newMsgs;
  })
  .on(_messageAborted, (messages, { targetMessageId }) => {
    const targetMsgIndex = messages.findIndex((m) => m.id === targetMessageId);
    if (targetMsgIndex === -1) {
      console.warn(`Target message not found for abort: ${targetMessageId}`);
      return messages;
    }
    const updatedMsg = { ...messages[targetMsgIndex], isLoading: false };
    const newMsgs = [...messages];
    newMsgs[targetMsgIndex] = updatedMsg;
    return newMsgs;
  });

// Add handler to $apiError
$apiError.on(_messageErrored, (_, { error }) => error.message);

// --- Samples (Flow Logic) ---

// New internal event to handle bundled message creation
const bundledMessageCreated = chatDomain.event<{
  bundledMessage: Message | null;
  pendingMediaIds: string[];
  markAsSent: boolean;
}>('bundledMessageCreated');

// Update messages when bundled message is created
$messages.on(
  bundledMessageCreated,
  (messages, { bundledMessage, pendingMediaIds, markAsSent }) => {
    if (markAsSent) {
      // Scenario 1: Just mark pending media as sent, don't add new message
      return messages.map((msg) =>
        pendingMediaIds.includes(msg.id)
          ? { ...msg, status: 'sent' as const }
          : msg,
      );
    } else if (bundledMessage) {
      // Scenario 2: Remove pending media and add bundled message
      const filteredMessages = messages.filter(
        (msg) => !pendingMediaIds.includes(msg.id),
      );
      return [...filteredMessages, bundledMessage];
    }
    return messages;
  },
);

// Handle image generation commands separately
sample({
  clock: messageSent,
  source: { text: $messageText },
  filter: ({ text }) => isImageGenerationCommand(text.trim()),
  fn: ({ text }) => text.trim(),
  target: imageGenerationRequested,
});

// Create a new user message object when message is sent (excluding image generation commands)
sample({
  clock: messageSent,
  source: {
    text: $messageText,
    activePending: $activePendingMultimodalMessage,
  },
  filter: ({ text, activePending }) => {
    // Skip if this is an image generation command
    if (isImageGenerationCommand(text.trim())) {
      return false;
    }

    const hasText = text.trim().length > 0;
    const hasPendingMedia = activePending !== null;
    return hasText || hasPendingMedia;
  },
  fn: ({ text, activePending }) => {
    const hasText = text.trim().length > 0;

    if (!hasText && activePending) {
      // Scenario 1: No text, only pending media - send the pending message
      const finalMessage: Message = {
        ...activePending,
        status: 'sent',
        timestamp: Date.now(),
      };

      return {
        bundledMessage: finalMessage as Message | null,
        pendingMediaIds: [activePending.id],
        markAsSent: false,
      };
    } else if (hasText && activePending) {
      // Scenario 2: Text with pending media - combine them
      const existingContent = Array.isArray(activePending.content)
        ? activePending.content
        : [];

      // Add text part to the content
      const contentParts: MessageContentPart[] = [
        ...existingContent,
        {
          type: 'text',
          text: text.trim(),
        },
      ];

      const finalMessage: Message = {
        ...activePending,
        content: contentParts,
        status: 'sent',
        timestamp: Date.now(),
      };

      return {
        bundledMessage: finalMessage as Message | null,
        pendingMediaIds: [activePending.id],
        markAsSent: false,
      };
    } else if (hasText && !activePending) {
      // Scenario 3: Just text, no media
      const textOnlyMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
        status: 'sent',
      };

      return {
        bundledMessage: textOnlyMessage as Message | null,
        pendingMediaIds: [],
        markAsSent: false,
      };
    }

    // This shouldn't happen due to the filter, but handle gracefully
    return {
      bundledMessage: null,
      pendingMediaIds: [],
      markAsSent: false,
    };
  },
  target: bundledMessageCreated,
});

// Forward bundled message to userMessageCreated (only if it exists)
sample({
  clock: bundledMessageCreated,
  filter: ({ bundledMessage }) => bundledMessage !== null,
  fn: ({ bundledMessage }) => bundledMessage!,
  target: userMessageCreated,
});

// Clear the active pending message after it's been sent
sample({
  clock: userMessageCreated,
  target: clearActivePendingMessage,
});

// Create event for individual media messages sent
const individualMediaSent = chatDomain.event<Message[]>('individualMediaSent');

// When pending media are marked as sent individually, trigger response for each
sample({
  clock: bundledMessageCreated,
  source: $messages,
  filter: (_, { markAsSent }) => markAsSent === true,
  fn: (messages, { pendingMediaIds }) => {
    // Find the sent media messages
    return messages.filter((msg) => pendingMediaIds.includes(msg.id));
  },
  target: individualMediaSent,
});

// Trigger userMessageCreated for each individual media message
individualMediaSent.watch((mediaMessages) => {
  mediaMessages.forEach((media) => userMessageCreated(media));
});

// Clear message input after sending
sample({ clock: userMessageCreated, fn: () => '', target: $messageText });

// Trigger initial save if this is the first message
sample({
  clock: userMessageCreated,
  source: $messages,
  filter: (msgs) => msgs.length === 1,
  target: initialChatSaveNeeded,
});

// Trigger stream for a NEW user message
sample({
  clock: userMessageCreated,
  source: {
    messages: $messages, // messages as it is *before* the new user message (since userMessageCreated already updated it)
    apiKey: $apiKey,
    providerApiUrl: $providerApiUrl,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
    supportsAudio: $currentModelSupportsAudio,
    ttsVoice: $ttsVoice,
  },
  filter: ({ apiKey }) => !!apiKey,
  fn: (sourceData: {
    messages: Message[]; // This `messages` already includes the new `userMessage` due to `userMessageCreated` effect.
    apiKey: string;
    providerApiUrl: string;
    temperature: number;
    systemPrompt: string;
    selectedModelId: string;
    supportsAudio: boolean;
    ttsVoice: string;
  }): StreamInitiatedWithTargetPayload => {
    // Corrected type
    const {
      messages,
      apiKey,
      providerApiUrl,
      temperature,
      systemPrompt,
      selectedModelId,
      supportsAudio,
      ttsVoice,
    } = sourceData;

    const streamId = crypto.randomUUID();
    const targetMessageId = crypto.randomUUID(); // For a new assistant response
    const shouldAddNewMessage = true; // Always add a new message for a direct user message response

    // Prepare message history (use current state which includes the new user message)
    const messagesForApi = [...messages]; // This list already includes the new user message.

    // Prepend system prompt if present
    const messagesBeforeFormatting = systemPrompt.trim()
      ? [{ role: 'system' as const, content: systemPrompt }, ...messagesForApi]
      : messagesForApi;

    // Format messages for API consumption with model-specific validation
    const messagesWithSystem = formatMessagesForAPI(
      messagesBeforeFormatting,
      selectedModelId,
    );

    // Detect if we need audio capabilities
    const hasAudio = hasAudioContentInMessages(messagesWithSystem);
    const audioParams = getAudioParams(hasAudio, supportsAudio, ttsVoice);

    let isFirstChunkForThisStream = true; // Flag for this specific stream initiation

    // Define Callbacks (Target internal events)
    const onChunk = ({ chunk }: StreamChunkPayload) => {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        _messageChunkReceived({
          targetMessageId,
          chunkContent: content,
          isFirstChunk: isFirstChunkForThisStream,
        });
        isFirstChunkForThisStream = false; // After the first chunk, all subsequent are appending
      }
    };

    const onComplete = () => {
      _messageCompleted({ targetMessageId });
      normalResponseProcessed(); // Trigger save/downstream logic for normal flow
      assistantResponseCompleted(); // Signal completion for history save etc.
      scrollToLastMessageNeeded(); // Trigger scroll
      chatStreamFinished(); // Signal that this chat's stream has finished
    };

    const onError = ({ error }: StreamErrorPayload) => {
      console.error(`[Stream ${streamId}] Error callback:`, error);
      _messageErrored({ targetMessageId, error });
      chatStreamFinished(); // Signal that this chat's stream has finished due to error
    };

    const onAbort = () => {
      console.log(`[Stream ${streamId}] Abort callback triggered.`);
      _messageAborted({ targetMessageId });
      chatStreamFinished(); // Signal that this chat's stream has finished due to abort
    };

    // Prepare StreamChatParams
    const streamParams: StreamChatParams = {
      streamId,
      model: selectedModelId,
      messages: messagesWithSystem, // Send history with system prompt and user message
      apiKey,
      providerApiUrl,
      temperature,
      ...audioParams, // Include audio parameters if needed
      onChunk,
      onComplete,
      onError,
      onAbort,
    };

    return { streamParams, streamId, targetMessageId, shouldAddNewMessage };
  },
  target: streamInitiatedWithTarget, // Direct target
});

// Trigger API key missing event if message sent without key
sample({
  clock: messageSent,
  source: $apiKey,
  filter: (key) => !key,
  target: apiKeyMissing,
});

// Refactored Generate Response Logic
sample({
  clock: generateResponseClicked,
  source: {
    messages: $messages,
    apiKey: $apiKey,
    providerApiUrl: $providerApiUrl,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
    supportsAudio: $currentModelSupportsAudio,
    ttsVoice: $ttsVoice,
  },
  filter: ({ apiKey, messages }) => !!apiKey && messages.length > 0, // Ensure API key exists and there are messages to generate from
  fn: (sourceData: {
    messages: Message[];
    apiKey: string;
    providerApiUrl: string;
    temperature: number;
    systemPrompt: string;
    selectedModelId: string;
    supportsAudio: boolean;
    ttsVoice: string;
  }): StreamInitiatedWithTargetPayload => {
    // Corrected type
    const {
      messages,
      apiKey,
      providerApiUrl,
      temperature,
      systemPrompt,
      selectedModelId,
      supportsAudio,
      ttsVoice,
    } = sourceData;

    const streamId = crypto.randomUUID();
    let targetMessageId: string;
    let shouldAddNewMessage: boolean;

    // Check if the last message is an assistant placeholder that was loading
    const lastMessage = messages[messages.length - 1];

    if (
      lastMessage &&
      lastMessage.role === 'assistant' &&
      lastMessage.isLoading // Check if it's currently a loading placeholder
    ) {
      // If the last message is an assistant placeholder (e.g., from a previous failed generation),
      // we should reuse its ID and update it.
      targetMessageId = lastMessage.id;
      shouldAddNewMessage = false;
    } else {
      // For a fresh generation or if the last assistant message is complete,
      // generate a new ID and add a new message.
      targetMessageId = crypto.randomUUID();
      shouldAddNewMessage = true;
    }

    // Prepare message history: for generate, we send all messages up to the last user message
    // If shouldAddNewMessage is true, the API history includes all current messages.
    // If shouldAddNewMessage is false (updating existing), the API history excludes the target message.
    let messagesForApi: Message[];
    if (shouldAddNewMessage) {
      messagesForApi = [...messages]; // Send all current messages, new assistant will be appended in UI
    } else {
      // If updating an existing assistant message, slice the history *before* that message.
      const targetIndex = messages.findIndex((m) => m.id === targetMessageId);
      if (targetIndex !== -1) {
        messagesForApi = messages.slice(0, targetIndex);
      } else {
        messagesForApi = [...messages]; // Fallback, should not happen if logic is correct
      }
    }

    // Prepend system prompt if present
    const messagesBeforeFormatting = systemPrompt.trim()
      ? [{ role: 'system' as const, content: systemPrompt }, ...messagesForApi]
      : messagesForApi;

    // Format messages for API consumption with model-specific validation
    const messagesWithSystem = formatMessagesForAPI(
      messagesBeforeFormatting,
      selectedModelId,
    );

    // Detect if we need audio capabilities
    const hasAudio = hasAudioContentInMessages(messagesWithSystem);
    const audioParams = getAudioParams(hasAudio, supportsAudio, ttsVoice);

    let isFirstChunkForThisStream = true; // Flag for this specific stream initiation

    // Define Callbacks
    const onChunk = ({ chunk }: StreamChunkPayload) => {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        _messageChunkReceived({
          targetMessageId,
          chunkContent: content,
          isFirstChunk: isFirstChunkForThisStream,
        });
        isFirstChunkForThisStream = false;
      }
    };
    const onComplete = () => {
      _messageCompleted({ targetMessageId });
      assistantResponseCompleted();
      chatStreamFinished();
    };
    const onError = ({ error }: StreamErrorPayload) => {
      console.error(`[Stream ${streamId}/Generate] Error callback:`, error);
      _messageErrored({ targetMessageId, error });
      chatStreamFinished();
    };
    const onAbort = () => {
      console.log(`[Stream ${streamId}/Generate] Abort callback triggered.`);
      _messageAborted({ targetMessageId });
      chatStreamFinished();
    };

    const streamParams: StreamChatParams = {
      streamId,
      model: selectedModelId,
      messages: messagesWithSystem,
      apiKey,
      providerApiUrl,
      temperature,
      ...audioParams, // Include audio parameters if needed
      onChunk,
      onComplete,
      onError,
      onAbort,
    };
    return { streamParams, streamId, targetMessageId, shouldAddNewMessage };
  },
  target: streamInitiatedWithTarget,
});

// Trigger API key missing event if generate clicked without key
sample({
  clock: generateResponseClicked,
  source: $apiKey,
  filter: (key) => !key,
  target: apiKeyMissing,
});

// --- Retry Logic Flow --- Sample Refactored
sample({
  clock: messageRetry,
  source: {
    messages: $messages,
    apiKey: $apiKey,
    providerApiUrl: $providerApiUrl,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
    supportsAudio: $currentModelSupportsAudio,
    ttsVoice: $ttsVoice,
  },
  filter: (
    sourceData: {
      apiKey: string | null;
      providerApiUrl: string;
      messages: Message[];
      temperature: number;
      systemPrompt: string;
      selectedModelId: string;
      supportsAudio: boolean;
      ttsVoice: string;
    },
    messageToRetry: Message,
  ): sourceData is {
    apiKey: string;
    providerApiUrl: string;
    messages: Message[];
    temperature: number;
    systemPrompt: string;
    selectedModelId: string;
    supportsAudio: boolean;
    ttsVoice: string;
  } => !!sourceData.apiKey && isRetryableMessage(messageToRetry),
  fn: (sourceData, messageToRetry): StreamInitiatedWithTargetPayload => {
    // Corrected type
    const {
      messages,
      apiKey,
      providerApiUrl,
      temperature,
      systemPrompt,
      selectedModelId,
      supportsAudio,
      ttsVoice,
    } = sourceData;

    const streamId = crypto.randomUUID();
    let targetMessageId: string;
    let shouldAddNewMessage: boolean;

    // Use prepareRetryRequestParamsFn to get the correct history slice for the API call
    const { messages: messagesForApi, modelId } = prepareRetryRequestParamsFn(
      { messages, apiKey, temperature, systemPrompt, selectedModelId },
      messageToRetry,
    );

    // Prepend system prompt if present
    const messagesBeforeFormatting = systemPrompt.trim()
      ? [{ role: 'system' as const, content: systemPrompt }, ...messagesForApi]
      : messagesForApi;

    // Format messages for API consumption with model-specific validation
    const messagesWithSystem = formatMessagesForAPI(
      messagesBeforeFormatting,
      selectedModelId,
    );

    // Detect if we need audio capabilities
    const hasAudio = hasAudioContentInMessages(messagesWithSystem);
    const audioParams = getAudioParams(hasAudio, supportsAudio, ttsVoice);

    const originalMessageIndex = messages.findIndex(
      (m) => m.id === messageToRetry.id,
    );

    if (originalMessageIndex === -1) {
      console.warn(
        'messageRetry: Original message not found in $messages. Creating new.',
      );
      targetMessageId = crypto.randomUUID();
      shouldAddNewMessage = true;
    } else if (messageToRetry.role === 'assistant') {
      // If retrying an assistant message, update it in place
      targetMessageId = messageToRetry.id;
      shouldAddNewMessage = false;
    } else {
      // messageToRetry.role === "user"
      // Look for an assistant message immediately following it.
      const nextMessage = messages[originalMessageIndex + 1];
      if (nextMessage && nextMessage.role === 'assistant') {
        // If there's an existing assistant message, update it
        targetMessageId = nextMessage.id;
        shouldAddNewMessage = false;
      } else {
        // No existing assistant message, create a new one
        targetMessageId = crypto.randomUUID();
        shouldAddNewMessage = true;
      }
    }

    let isFirstChunkForThisStream = true; // Flag for this specific stream initiation

    const streamParams: StreamChatParams = {
      streamId,
      model: modelId, // Use modelId from prepareRetryRequestParamsFn
      messages: messagesWithSystem, // Use sliced history with system prompt
      apiKey,
      providerApiUrl,
      temperature,
      ...audioParams, // Include audio parameters if needed
      onChunk: ({ chunk }: StreamChunkPayload) => {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          _messageChunkReceived({
            targetMessageId,
            chunkContent: content,
            isFirstChunk: isFirstChunkForThisStream,
          });
          isFirstChunkForThisStream = false;
        }
      },
      onComplete: () => {
        _messageCompleted({ targetMessageId });
        assistantResponseCompleted();
        chatStreamFinished();
      },
      onError: ({ error }: StreamErrorPayload) => {
        console.error(`[Stream ${streamId}/Retry] Error callback:`, error);
        _messageErrored({ targetMessageId, error });
        chatStreamFinished();
      },
      onAbort: () => {
        console.log(`[Stream ${streamId}/Retry] Abort callback triggered.`);
        _messageAborted({ targetMessageId });
        chatStreamFinished();
      },
    };

    return { streamParams, streamId, targetMessageId, shouldAddNewMessage };
  },
  target: streamInitiatedWithTarget,
});

// Trigger spinner update event for retry (Keep as is)
sample({
  clock: messageRetry,
  filter: isRetryableMessage,
  fn: (messageToRetry): MessageRetryInitiatedPayload => ({
    messageId: messageToRetry.id,
    role: messageToRetry.role as Role & ('user' | 'assistant'),
  }),
  target: messageRetryInitiated,
});

// --- Common Post-API Logic ---

// Trigger streamChatFx and streamRequestInitiated
sample({
  clock: streamInitiatedWithTarget,
  fn: (payload) => payload.streamParams,
  target: streamChatFx,
});

sample({
  clock: streamInitiatedWithTarget,
  fn: ({ streamId }: StreamInitiatedWithTargetPayload) => ({ streamId }), // Explicitly type the destructured payload
  target: streamRequestInitiated,
});

// --- Cancellation Logic ---
sample({
  clock: stopGenerationClicked,
  source: $activeChatStreamId,
  filter: (streamId: string | null): streamId is string => !!streamId,
  fn: (streamId: string) => ({ streamId }),
  target: abortStream,
});

// --- Debugging ---
debug(
  // Stores
  $messageText,
  $messages,
  $isProcessingFile,
  $isGenerating,
  $apiError,
  $currentChatTokens,
  $retryingMessageId,
  $preventScroll,
  $activeChatStreamId,
  $scrollTrigger,
  $isMainInputFocused,

  // User-facing events
  messageTextChanged,
  messageSent,
  editMessage,
  deleteMessage,
  messageRetry,
  generateResponseClicked,
  setPreventScroll,
  stopGenerationClicked,
  apiKeyMissing,
  initialChatSaveNeeded,
  normalResponseProcessed,
  mainInputFocused,
  filesSelected,
  imageGenerationRequested,
  addGeneratedImageToChat,

  // Internal events
  userMessageCreated,
  streamRequestInitiated, // Keep streamRequestInitiated in debug
  streamInitiatedWithTarget, // Add new event to debug
  _messageChunkReceived,
  _messageCompleted,
  _messageErrored,
  _messageAborted,
  chatStreamFinished,
  messageRetryInitiated,
  scrollToLastMessageNeeded,

  // Effects
  streamChatFx,
  processFilesFx,
);
