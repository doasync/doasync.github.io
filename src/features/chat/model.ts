import { sample, createDomain, createEvent } from "effector"; // Removed split
import { debug } from "patronum/debug";
import { $apiKey, $temperature, $systemPrompt } from "@/features/chat-settings";
import { 
  $selectedModelId, 
  $currentModelSupportsVision,
  autoSelectModelForCapabilities 
} from "@/features/models-select";
// Import chat-stream feature
import {
  streamChatFx,
  abortStream,
  StreamChatParams,
  StreamChunkPayload,
  StreamCompletePayload,
  StreamErrorPayload,
  StreamAbortPayload,
} from "@/features/chat-stream";

import {
  Message,
  Attachment,
  MessageContentPart,
  TextContentPart,
  ImageContentPart,
  RetryUpdatePayload, // Keep for now, might become obsolete
  MessageRetryInitiatedPayload, // Keep for spinner logic potentially
  RequestContext, // Import the new context type
  RequestContextNormal,
  RequestContextGenerate,
  RequestContextRetry,
  Role, // Import Role type
} from "./types";
import {
  prepareRetryRequestParamsFn, // Keep for retry param prep
  determineRetryingMessageIdFn, // Keep for spinner logic
} from "./lib"; // Only keep necessary imports

// --- Domain ---
const chatDomain = createDomain("chat");

// --- Events ---

// Public Events
export const messageTextChanged =
  chatDomain.event<string>("messageTextChanged");
export const messageSent = chatDomain.event<void>("messageSent");
export const editMessage = chatDomain.event<{
  messageId: string;
  newContent: string;
}>("editMessage");
export const deleteMessage = chatDomain.event<string>("deleteMessage");
export const messageRetry = chatDomain.event<Message>("messageRetry");
export const initialChatSaveNeeded = chatDomain.event<void>(
  "initialChatSaveNeeded"
);
export const apiKeyMissing = chatDomain.event("apiKeyMissing");
export const userMessageCreated =
  chatDomain.event<Message>("userMessageCreated");
export const scrollToLastMessageNeeded = chatDomain.event<void>(
  "scrollToLastMessageNeeded"
);
export const setPreventScroll = chatDomain.event<boolean>("setPreventScroll");
export const generateResponseClicked = chatDomain.event<void>(
  "generateResponseClicked"
);
export const normalResponseProcessed = chatDomain.event<void>(
  "normalResponseProcessed"
); // Explicit trigger for saving normal responses
export const mainInputFocused = chatDomain.event<boolean>("mainInputFocused");
// Event to trigger stream cancellation from UI
export const stopGenerationClicked = chatDomain.event<void>(
  "stopGenerationClicked"
);
export const assistantResponseCompleted = chatDomain.event<void>(
  "assistantResponseCompleted"
);

// File attachment events
export const fileSelected = chatDomain.event<File>("fileSelected");
export const attachmentRemoved = chatDomain.event<string>("attachmentRemoved"); // Attachment ID
export const attachmentCleared = chatDomain.event<void>("attachmentCleared");

// Internal Events
const messageRetryInitiated = chatDomain.event<MessageRetryInitiatedPayload>(
  "messageRetryInitiated"
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
  "streamRequestInitiated"
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
const chatStreamFinished = chatDomain.event<void>("chatStreamFinished");

// --- Stores ---
export const $messageText = chatDomain.store<string>("", {
  name: "$messageText",
});
export const $messages = chatDomain.store<Message[]>([], { name: "$messages" });
export const $isGenerating = chatDomain
  .store<boolean>(false, {
    name: "$isGenerating",
  })
  .on(streamInitiatedWithTarget, () => true) // Set true when *this* chat's stream starts
  .on(chatStreamFinished, () => false); // Set false when *this* chat's stream finishes (complete/error/abort)

// File attachment stores
export const $pendingAttachments = chatDomain.store<Attachment[]>([], {
  name: "$pendingAttachments",
});

export const $isProcessingFile = chatDomain.store<boolean>(false, {
  name: "$isProcessingFile",
});

export const $currentChatTokens = chatDomain.store<number>(0, {
  name: "$currentChatTokens",
});
export const $apiError = chatDomain.store<string | null>(null, {
  name: "$apiError",
});

// Store for the currently active stream ID (for cancellation)
export const $activeChatStreamId = chatDomain
  .store<string | null>(null, {
    name: "$activeChatStreamId",
  })
  .on(streamInitiatedWithTarget, (_, { streamId }) => streamId);

export const $retryingMessageId = chatDomain.store<string | null>(null, {
  name: "$retryingMessageId",
}); // For spinner

export const $preventScroll = chatDomain.store<boolean>(false, {
  name: "$preventScroll",
});

export const $scrollTrigger = chatDomain
  .store<number>(0, { name: "$scrollTrigger" })
  .on(scrollToLastMessageNeeded, () => Date.now());

// Store for main input focus state
export const $isMainInputFocused = chatDomain
  .store<boolean>(false, { name: "$isMainInputFocused" })
  .on(mainInputFocused, (_, isFocused) => isFocused); // Corrected payload destructuring

// --- Effects ---

// File processing effect
const processFileFx = chatDomain.effect<File, Attachment>({
  name: "processFileFx",
  handler: async (file: File): Promise<Attachment> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const dataUrl = reader.result as string;
        
        // Create attachment object
        const attachment: Attachment = {
          id: crypto.randomUUID(),
          type: file.type.startsWith('image/') ? 'image' : 
                file.type.startsWith('audio/') ? 'audio' : 'document',
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          dataUrl,
          metadata: file.type.startsWith('image/') ? {
            // For images, we'll get dimensions later if needed
          } : undefined,
        };
        
        resolve(attachment);
      };
      
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };
      
      // Read as data URL for images, as text for documents
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsDataURL(file); // For now, read everything as data URL
      }
    });
  },
});

// --- Helper Functions / Type Guards ---
const isRetryableMessage = (
  message: Message | undefined
): message is Message & { role: "user" | "assistant" } => {
  return !!message && (message.role === "user" || message.role === "assistant");
};

// --- Store Updates (.on/.reset) ---

$messageText.on(messageTextChanged, (_, text) => text);

// File attachment state management
$isProcessingFile
  .on(processFileFx, () => true)
  .reset(processFileFx.finally);

$pendingAttachments
  .on(processFileFx.doneData, (attachments, newAttachment) => [...attachments, newAttachment])
  .on(attachmentRemoved, (attachments, attachmentId) => 
    attachments.filter(a => a.id !== attachmentId)
  )
  .reset(attachmentCleared, messageSent); // Clear on manual clear or message sent

// Trigger file processing when file is selected
sample({
  clock: fileSelected,
  target: processFileFx,
});

// Auto-select vision model when image is attached
sample({
  clock: processFileFx.doneData,
  source: $currentModelSupportsVision,
  filter: (modelSupportsVision, attachment) => 
    attachment.type === 'image' && !modelSupportsVision,
  fn: () => ({ vision: true, preferFree: false }),
  target: autoSelectModelForCapabilities,
});

$messages
  .on(editMessage, (list, { messageId, newContent }) =>
    list.map((msg) =>
      msg.id === messageId
        ? {
            ...msg,
            content: newContent,
            isEdited: true,
            originalContent: msg.content,
          }
        : msg
    )
  )
  .on(deleteMessage, (list, id) => list.filter((msg) => msg.id !== id))
  .on(userMessageCreated, (messages, newMsg) => [...messages, newMsg])
  .on(
    streamInitiatedWithTarget,
    (messages, { targetMessageId, shouldAddNewMessage }) => {
      if (shouldAddNewMessage) {
        // Add a new assistant message
        return [
          ...messages,
          {
            id: targetMessageId,
            role: "assistant", // Always assistant for generated/retried responses
            content: "",
            timestamp: Date.now(),
            isLoading: true,
          } as Message,
        ];
      } else {
        // Update an existing message (e.g., clear content and set loading)
        return messages.map((msg) =>
          msg.id === targetMessageId
            ? { ...msg, isLoading: true } // Preserve content, only set loading for existing
            : msg
        );
      }
    }
  );

$apiError.reset(messageSent, generateResponseClicked, messageRetry); // Reset on user action start

$retryingMessageId
  .on(messageRetryInitiated, (_, payload) => {
    // Keep spinner logic for retry initiation
    const messages = $messages.getState();
    if (payload.role === "assistant") return payload.messageId;
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
        (m) => m.id === targetMessageId
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
    }
  )
  .on(_messageCompleted, (messages, { targetMessageId }) => {
    const targetMsgIndex = messages.findIndex((m) => m.id === targetMessageId);
    if (targetMsgIndex === -1) {
      console.warn(
        `Target message not found for completion: ${targetMessageId}`
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

// Helper function to create multimodal content
const createMultimodalContent = (text: string, attachments: Attachment[]): string | MessageContentPart[] => {
  // If no attachments, return simple text
  if (attachments.length === 0) {
    return text.trim();
  }
  
  // Create multimodal content array
  const contentParts: MessageContentPart[] = [];
  
  // Add text part if present
  if (text.trim()) {
    contentParts.push({
      type: "text",
      text: text.trim(),
    });
  }
  
  // Add image parts
  attachments.forEach(attachment => {
    if (attachment.type === 'image' && attachment.dataUrl) {
      contentParts.push({
        type: "image_url",
        image_url: {
          url: attachment.dataUrl,
          detail: "auto",
        },
      });
    }
    // TODO: Handle other attachment types (audio, document) in future phases
  });
  
  return contentParts;
};

// Create a new user message object when message is sent
sample({
  clock: messageSent,
  source: { text: $messageText, attachments: $pendingAttachments },
  filter: ({ text, attachments }) => text.trim().length > 0 || attachments.length > 0,
  fn: ({ text, attachments }): Message => {
    const content = createMultimodalContent(text, attachments);
    
    return {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };
  },
  target: userMessageCreated,
});

// Clear message input after sending
sample({ clock: userMessageCreated, fn: () => "", target: $messageText });

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
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
  },
  filter: ({ apiKey }) => !!apiKey,
  fn: (
    sourceData: {
      messages: Message[]; // This `messages` already includes the new `userMessage` due to `userMessageCreated` effect.
      apiKey: string;
      temperature: number;
      systemPrompt: string;
      selectedModelId: string;
    },
    userMessage: Message // The user message that was just created and added
  ): StreamInitiatedWithTargetPayload => {
    // Corrected type
    const { messages, apiKey, temperature, systemPrompt, selectedModelId } =
      sourceData;

    const streamId = crypto.randomUUID();
    const targetMessageId = crypto.randomUUID(); // For a new assistant response
    const shouldAddNewMessage = true; // Always add a new message for a direct user message response

    // Prepare message history (use current state which includes the new user message)
    const messagesForApi = [...messages]; // This list already includes the new user message.

    let isFirstChunkForThisStream = true; // Flag for this specific stream initiation

    // Define Callbacks (Target internal events)
    const onChunk = ({ chunk }: StreamChunkPayload) => {
      const content = chunk.choices[0]?.delta?.content;
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
      messages: messagesForApi, // Send history including the user message that triggered this
      apiKey,
      temperature,
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
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
  },
  filter: ({ apiKey, messages }) => !!apiKey && messages.length > 0, // Ensure API key exists and there are messages to generate from
  fn: (sourceData: {
    messages: Message[];
    apiKey: string;
    temperature: number;
    systemPrompt: string;
    selectedModelId: string;
  }): StreamInitiatedWithTargetPayload => {
    // Corrected type
    const { messages, apiKey, temperature, systemPrompt, selectedModelId } =
      sourceData;

    const streamId = crypto.randomUUID();
    let targetMessageId: string;
    let shouldAddNewMessage: boolean;

    // Check if the last message is an assistant placeholder that was loading
    const lastMessage = messages[messages.length - 1];

    if (
      lastMessage &&
      lastMessage.role === "assistant" &&
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

    let isFirstChunkForThisStream = true; // Flag for this specific stream initiation

    // Define Callbacks
    const onChunk = ({ chunk }: StreamChunkPayload) => {
      const content = chunk.choices[0]?.delta?.content;
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
      messages: messagesForApi,
      apiKey,
      temperature,
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
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    selectedModelId: $selectedModelId,
  },
  filter: (
    sourceData: {
      apiKey: string | null;
      messages: Message[];
      temperature: number;
      systemPrompt: string;
      selectedModelId: string;
    },
    messageToRetry: Message
  ): sourceData is {
    apiKey: string;
    messages: Message[];
    temperature: number;
    systemPrompt: string;
    selectedModelId: string;
  } => !!sourceData.apiKey && isRetryableMessage(messageToRetry),
  fn: (sourceData, messageToRetry): StreamInitiatedWithTargetPayload => {
    // Corrected type
    const { messages, apiKey, temperature, systemPrompt, selectedModelId } =
      sourceData;

    const streamId = crypto.randomUUID();
    let targetMessageId: string;
    let shouldAddNewMessage: boolean;

    // Use prepareRetryRequestParamsFn to get the correct history slice for the API call
    const { messages: messagesForApi, modelId } = prepareRetryRequestParamsFn(
      { messages, apiKey, temperature, systemPrompt, selectedModelId },
      messageToRetry
    );

    const originalMessageIndex = messages.findIndex(
      (m) => m.id === messageToRetry.id
    );

    if (originalMessageIndex === -1) {
      console.warn(
        "messageRetry: Original message not found in $messages. Creating new."
      );
      targetMessageId = crypto.randomUUID();
      shouldAddNewMessage = true;
    } else if (messageToRetry.role === "assistant") {
      // If retrying an assistant message, update it in place
      targetMessageId = messageToRetry.id;
      shouldAddNewMessage = false;
    } else {
      // messageToRetry.role === "user"
      // Look for an assistant message immediately following it.
      const nextMessage = messages[originalMessageIndex + 1];
      if (nextMessage && nextMessage.role === "assistant") {
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
      messages: messagesForApi, // Use sliced history from prepareRetryRequestParamsFn
      apiKey,
      temperature,
      onChunk: ({ chunk }: StreamChunkPayload) => {
        const content = chunk.choices[0]?.delta?.content;
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
    role: messageToRetry.role as Role & ("user" | "assistant"),
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
  $pendingAttachments,
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
  fileSelected,
  attachmentRemoved,
  attachmentCleared,

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
  processFileFx
);
