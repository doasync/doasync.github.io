import React, { useState, useRef, useEffect } from "react";
import { showSnackbar } from "@/features/ui-state/snackbar";
import { useLongPress, LongPressCallback } from "use-long-press";
import { useUnit } from "effector-react";
import {
  editMessage,
  deleteMessage,
  deleteAttachment,
  messageRetry,
  $isGenerating,
  $retryingMessageId,
  setPreventScroll, // Import scroll prevention setter
} from "@/features/chat";
import {
  $editingMessageId,
  startEditingMessage,
  stopEditingMessage,
} from "@/features/ui-state"; // Import global editing state
import {
  Message,
  MessageContentPart,
  TextContentPart,
  ImageContentPart,
  AudioContentPart,
  GeneratedImageContentPart,
  DocumentContentPart,
} from "@/features/chat";
import {
  $ephemeralMessageData,
  toggleMessageAudio,
  toggleMessageTranscript,
} from "@/features/audio-chat";
import { 
  EphemeralAudioPlayer, 
  EphemeralTranscript 
} from "@/features/audio-chat/components";
import FileAttachmentWrapper from "./FileAttachmentWrapper";
import { useTheme } from "@mui/material/styles"; // Import useTheme
import {
  Typography,
  IconButton,
  InputBase,
  Paper,
  Card,
  CircularProgress,
  Box,
  CardMedia,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ReplayIcon from "@mui/icons-material/Replay";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CodeIcon from "@mui/icons-material/Code";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AutoModeIcon from "@mui/icons-material/AutoMode";
import DownloadIcon from "@mui/icons-material/Download";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import DocumentIcon from "@mui/icons-material/Description";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import TranscribeIcon from "@mui/icons-material/TextFields";
import ContentCopy from "@mui/icons-material/ContentCopy";
import MarkdownRenderer from "./MarkdownRenderer";

interface MessageItemProps {
  message: Message;
}
interface SetupLongPress {
  (): () => void;
}

const createFrameHandler =
  ({ visibleDelay }: { visibleDelay: number }, setup: SetupLongPress) =>
  () => {
    // Before the frame
    const finalCallback = setup();
    // Wait for the next full animation frame
    requestAnimationFrame(() =>
      setTimeout(
        // After the frame
        () => requestAnimationFrame(() => finalCallback()),
        visibleDelay
      )
    );
  };

// Helper function to extract text content from multimodal content
const extractTextContent = (content: string | MessageContentPart[]): string => {
  if (typeof content === "string") {
    return content;
  }

  let result = "";

  // Extract text from text parts
  const textParts = content.filter(
    (part): part is TextContentPart => part.type === "text"
  );
  result += textParts.map((part) => part.text).join(" ");

  // Don't include document text here since documents have their own preview boxes

  return result.trim();
};

// Helper function to extract HTML content from multimodal content
const extractHtmlContent = (content: string | MessageContentPart[]): string => {
  if (typeof content === "string") {
    return content;
  }

  let result = "";

  // Extract text from text parts
  const textParts = content.filter(
    (part): part is TextContentPart => part.type === "text"
  );
  result += textParts.map((part) => part.text).join(" ");

  // Extract HTML from document parts
  const documentParts = content.filter(
    (part): part is DocumentContentPart => part.type === "document"
  );
  if (documentParts.length > 0) {
    result += documentParts
      .map((part) => part.document.previewHtml || part.document.text)
      .join("\n\n");
  }

  return result.trim();
};

// Helper function to get image parts from content
const getImageParts = (
  content: string | MessageContentPart[]
): ImageContentPart[] => {
  if (typeof content === "string") {
    return [];
  }
  return content.filter(
    (part): part is ImageContentPart => part.type === "image_url"
  );
};

// Helper function to get audio parts from content
const getAudioParts = (
  content: string | MessageContentPart[]
): AudioContentPart[] => {
  if (typeof content === "string") {
    return [];
  }
  return content.filter(
    (part): part is AudioContentPart => part.type === "input_audio"
  );
};

// Helper function to get generated image parts from content
const getGeneratedImageParts = (
  content: string | MessageContentPart[]
): GeneratedImageContentPart[] => {
  if (typeof content === "string") {
    return [];
  }
  return content.filter(
    (part): part is GeneratedImageContentPart => part.type === "generated_image"
  );
};

// Helper function to get document parts from content
const getDocumentParts = (
  content: string | MessageContentPart[]
): DocumentContentPart[] => {
  if (typeof content === "string") {
    return [];
  }
  return content.filter(
    (part): part is DocumentContentPart => part.type === "document"
  );
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Helper function to get file type description
const getFileTypeDescription = (mimeType: string): string => {
  const typeMap: Record<string, string> = {
    "image/jpeg": "JPEG Image",
    "image/jpg": "JPEG Image",
    "image/png": "PNG Image",
    "image/gif": "GIF Image",
    "image/webp": "WebP Image",
    "image/svg+xml": "SVG Image",
    "audio/wav": "WAV Audio",
    "audio/mp3": "MP3 Audio",
    "audio/aiff": "AIFF Audio",
    "audio/aac": "AAC Audio",
    "audio/ogg": "OGG Audio",
    "audio/flac": "FLAC Audio",
    "audio/mp4": "MP4 Audio",
    "audio/mpeg": "MPEG Audio",
    "audio/mpga": "MPGA Audio",
    "audio/m4a": "M4A Audio",
    "audio/webm": "WebM Audio",
    "application/pdf": "PDF Document",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "Word Document",
    "text/plain": "Text File",
    "text/markdown": "Markdown File",
  };
  return typeMap[mimeType] || mimeType.split("/")[1]?.toUpperCase() || "File";
};

// Helper function to format duration
const formatDuration = (seconds: number | undefined): string => {
  if (!seconds || !isFinite(seconds) || isNaN(seconds)) {
    return "Unknown";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  // Hooks
  const theme = useTheme(); // Get theme for palette access
  const isGenerating = useUnit($isGenerating);
  const retryingMessageId = useUnit($retryingMessageId);
  const globalEditingMessageId = useUnit($editingMessageId); // Get global state
  const ephemeralMessageData = useUnit($ephemeralMessageData); // Get ephemeral audio data
  const [isHovered, setIsHovered] = useState(false);
  const [isGoingToDelete, setIsGoingToDelete] = useState(false);
  const [isGoingToRetry, setIsGoingToRetry] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(
    typeof message.content === "string"
      ? message.content
      : extractTextContent(message.content)
  ); // Initialize with prop
  const [originalContentOnEdit, setOriginalContentOnEdit] = useState("");
  const [documentPreviewLengths, setDocumentPreviewLengths] = useState<
    Record<string, number>
  >({});
  const messageItemRef = useRef<HTMLDivElement>(null);

  // Derived State
  const isRetryingThisMessage =
    isGenerating && retryingMessageId === message.id;
  const isGloballyEditingThis = globalEditingMessageId === message.id;
  const canHover = globalEditingMessageId === null;
  const isImageOnlyMessage =
    Array.isArray(message.content) &&
    message.content.every((part) => part.type === "image_url");
  const isAudioOnlyMessage =
    Array.isArray(message.content) &&
    message.content.every((part) => part.type === "input_audio");
  const isGeneratedImageOnlyMessage =
    Array.isArray(message.content) &&
    message.content.every((part) => part.type === "generated_image");
  const isMediaOnlyMessage =
    isImageOnlyMessage || isAudioOnlyMessage || isGeneratedImageOnlyMessage;
  const isPending = message.status === "pending";
  
  // Ephemeral Audio Data
  const ephemeralData = ephemeralMessageData[message.id];
  const hasTextContent = extractTextContent(message.content).trim().length > 0;
  const hasAudioContent = getAudioParts(message.content).length > 0;

  // Event Handlers
  const handleEditClick = () => {
    // Don't allow editing if another edit is active or already editing this one
    if (isEditing || globalEditingMessageId !== null) return;
    const textContent = extractTextContent(message.content);
    setEditedText(textContent); // Ensure editedText is always the current text content
    setOriginalContentOnEdit(textContent); // Store original content
    startEditingMessage(message.id); // Set this message as globally editing
    setIsEditing(true); // Set local editing state
  };

  const handleEditCancel = () => {
    setIsEditing(false); // Clear local editing state
    setEditedText(originalContentOnEdit); // Restore original text
    stopEditingMessage(); // Clear global editing state
    // Allow scrolling again immediately on cancel
    requestAnimationFrame(() => setPreventScroll(false));
  };

  const handleEditConfirm = () => {
    // Only dispatch edit if text actually changed
    if (editedText !== originalContentOnEdit) {
      editMessage({ messageId: message.id, newContent: editedText });
    }
    setIsEditing(false); // Clear local editing state
    stopEditingMessage(); // Clear global editing state
    // Allow scrolling again after confirm (using timeout for safety)
    requestAnimationFrame(() => setPreventScroll(false));
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditedText(event.target.value);
  };

  const handleDeleteClick = () => {
    showSnackbar({
      message: "Long press to delete a message.",
      severity: "info",
    });
  };

  // Long Press Handler
  const deleteLongPressProps = useLongPress(
    createFrameHandler({ visibleDelay: 20 }, () => {
      setIsGoingToDelete(true);
      return () => {
        setIsGoingToDelete(false);
        deleteMessage(message.id);
      };
    }),
    {
      threshold: 400,
    }
  )("delete");

  // Long Press Handler
  const retryLongPressProps = useLongPress(
    createFrameHandler({ visibleDelay: 20 }, () => {
      setIsGoingToRetry(true);
      return () => {
        setIsGoingToRetry(false);
        messageRetry(message);
      };
    }),
    {
      threshold: 400,
    }
  )("retry");

  const handleRetryClick = () => {
    showSnackbar({
      message: "Long press to regenerate a message.",
      severity: "info",
    });
  };

  // Attachment deletion handler
  const handleDeleteAttachment = (attachmentIndex: number) => {
    deleteAttachment({
      messageId: message.id,
      attachmentIndex,
    });
  };

  // Ephemeral Audio Handlers
  const handleToggleAudio = () => {
    const textContent = extractTextContent(message.content);
    if (textContent.trim()) {
      toggleMessageAudio({
        messageId: message.id,
        messageText: textContent,
      });
    }
  };

  const handleToggleTranscript = () => {
    const audioParts = getAudioParts(message.content);
    if (audioParts.length > 0) {
      const audioSrc = `data:${message.attachments?.[0]?.mimeType || "audio/mp3"};base64,${audioParts[0].input_audio.data}`;
      toggleMessageTranscript({
        messageId: message.id,
        audioUrl: audioSrc,
      });
    }
  };

  const handleCopyTextClick = () => {
    const textContent = extractTextContent(message.content);
    if (textContent) {
      navigator.clipboard
        .writeText(textContent)
        .then(() => console.log("Text copied to clipboard"))
        .catch((err) => console.error("Failed to copy text: ", err));
    } else {
      console.error("No text content to copy");
    }
  };

  const handleCopyCodeClick = () => {
    const textContent = extractTextContent(message.content);

    if (textContent) {
      navigator.clipboard
        .writeText(textContent)
        .then(() => {
          console.log("Text content copied to clipboard");
          showSnackbar({
            message: "Text content copied to clipboard",
            severity: "success",
          });
        })
        .catch((err) => console.error("Failed to copy content: ", err));
    } else {
      console.error("No text content to copy as code/markdown");
    }
  };

  // Effect to handle clicks outside the message item while editing
  useEffect(() => {
    // Skip this for now
    return;

    if (!isEditing) return; // Only run when editing

    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is outside the message item's DOM node
      if (
        messageItemRef.current &&
        !messageItemRef.current.contains(event.target as Node)
      ) {
        // Confirm or Cancel based on whether text changed
        handleEditConfirm(); // handleEditConfirm now checks if text changed internally
      }
    };

    // Use mousedown to catch the click event early
    document.addEventListener("mousedown", handleClickOutside);
    // Cleanup the event listener on unmount or when isEditing/deps change
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
    // Dependencies: Ensure the effect re-runs if these change.
  }, [isEditing, handleEditConfirm]); // Simplified dependencies as confirm handles logic

  return (
    <Paper
      className="chat-message"
      ref={messageItemRef}
      variant="outlined"
      key={message.id}
      id={message.id} // Add ID for scrolling
      // Only allow hover state change if nothing else is being edited
      onMouseEnter={() => canHover && setIsHovered(true)}
      onMouseLeave={() => canHover && setIsHovered(false)}
      sx={{
        borderRadius: 2,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        // Outline if editing this message OR (hovered AND nothing else is being edited)
        borderColor: isGloballyEditingThis
          ? theme.palette.secondary.light
          : isHovered && canHover
          ? theme.palette.primary.light // Use lighter color for hover to differentiate from edit
          : "transparent",
        padding: 2, // Reduced padding slightly
        transition: theme.transitions.create("border-color"), // Smooth transition for border color
      }}
    >
      <Card
        raised
        elevation={1}
        sx={{
          p: 2,
          borderRadius: 2,
          alignSelf: message.role === "user" ? "flex-end" : "flex-start",
          backgroundColor:
            message.role === "user"
              ? isPending
                ? theme.palette.action.hover // Lighter background for pending
                : "primary.dark" // Blue background for user messages including files
              : theme.palette.background.paper, // Use paper background for assistant
          // Adjust width for alignment
          width: isEditing ? "-webkit-fill-available" : "fit-content", // Let content determine width initially
          maxWidth: "100%",
          wordWrap: "break-word",
          opacity: isPending ? 0.8 : 1, // Slightly transparent for pending
          position: "relative", // For pending indicator
          // Add dashed border for pending messages
          border: isPending ? '1px dashed' : 'none',
          borderColor: isPending ? 'primary.light' : 'transparent',
        }}
      >
        {/* Use local isEditing state to render InputBase or Markdown */}
        {isEditing ? (
          <InputBase
            multiline
            fullWidth
            value={editedText}
            onChange={handleTextChange}
            autoFocus
            onKeyDown={(e) => {
              // Add keydown handler for Enter/Escape
              if (e.key === "Escape") {
                handleEditCancel();
              }
            }}
            sx={{
              padding: 0,
              borderBottom: 0, // Looks better without underline in card
              fontFamily: "inherit", // Ensure font matches rendered text
              fontSize: "inherit",
              lineHeight: "inherit",
              color: "inherit", // Ensure text color matches
              "& .MuiInputBase-input": {
                resize: "vertical", // Allow vertical resizing
              },
            }}
          />
        ) : (
          <Box sx={{ width: "100%" }}>
            {/* Render images if present */}
            {(() => {
              const imageParts = getImageParts(message.content);
              if (imageParts.length > 0) {
                return (
                  <Box sx={{ mb: imageParts.length > 0 ? 2 : 0 }}>
                    {imageParts.map((imagePart, index) => {
                      // Try to find corresponding attachment metadata
                      const attachment = message.attachments?.[index];

                      // Build metadata array
                      const metadata = [];
                      if (attachment) {
                        metadata.push(formatFileSize(attachment.size));
                        metadata.push(getFileTypeDescription(attachment.mimeType));
                        if (attachment.metadata?.dimensions) {
                          metadata.push(`${attachment.metadata.dimensions.width}×${attachment.metadata.dimensions.height}`);
                        }
                      }

                      // Define actions for image
                      const actions = [
                        {
                          icon: <FullscreenIcon fontSize="small" />,
                          label: "Open in new tab",
                          onClick: () => window.open(imagePart.image_url.url, "_blank"),
                        },
                        {
                          icon: <DownloadIcon fontSize="small" />,
                          label: "Download image",
                          onClick: () => {
                            const link = document.createElement("a");
                            link.href = imagePart.image_url.url;
                            link.download = attachment?.fileName || `image-${Date.now()}.jpg`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          },
                        },
                      ];

                      return (
                        <FileAttachmentWrapper
                          key={index}
                          type="image"
                          fileName={attachment?.fileName || `Image ${index + 1}`}
                          metadata={metadata}
                          actions={actions}
                          onDelete={() => handleDeleteAttachment(index)}
                          sx={index < imageParts.length - 1 ? { mb: 2 } : {}}
                        >
                          <CardMedia
                            component="img"
                            image={imagePart.image_url.url}
                            alt={`Attached image ${index + 1}`}
                            sx={{
                              maxWidth: "100%",
                              maxHeight: 300,
                              objectFit: "contain",
                              cursor: "pointer",
                              "&:hover": {
                                opacity: 0.8,
                              },
                            }}
                            onClick={() => {
                              // Open image in new tab
                              window.open(imagePart.image_url.url, "_blank");
                            }}
                          />
                        </FileAttachmentWrapper>
                      );
                    })}
                  </Box>
                );
              }
              return null;
            })()}

            {/* Render audio attachments if present */}
            {(() => {
              const audioParts = getAudioParts(message.content);
              if (audioParts.length > 0) {
                return (
                  <Box sx={{ mb: audioParts.length > 0 ? 2 : 0 }}>
                    {audioParts.map((audioPart, index) => {
                      // Try to find corresponding attachment metadata
                      const attachment = message.attachments?.find(
                        (att) => att.type === "audio"
                      );

                      // Reconstruct data URL from base64 data
                      const audioSrc = `data:${
                        attachment?.mimeType || "audio/mp3"
                      };base64,${audioPart.input_audio.data}`;

                      // Build metadata array
                      const metadata = [];
                      if (attachment) {
                        metadata.push(formatFileSize(attachment.size));
                        metadata.push(getFileTypeDescription(attachment.mimeType));
                        if (attachment.metadata?.duration !== undefined) {
                          metadata.push(`Duration: ${formatDuration(attachment.metadata.duration)}`);
                        } else {
                          metadata.push("Duration: Unknown");
                        }
                      }

                      // Define actions for audio
                      const actions = [
                        {
                          icon: <DownloadIcon fontSize="small" />,
                          label: "Download audio",
                          onClick: () => {
                            const link = document.createElement("a");
                            link.href = audioSrc;
                            link.download = attachment?.fileName || `audio-${Date.now()}.mp3`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          },
                        },
                      ];

                      return (
                        <FileAttachmentWrapper
                          key={index}
                          type="audio"
                          fileName={attachment?.fileName || `Audio ${index + 1}`}
                          metadata={metadata}
                          actions={actions}
                          onDelete={() => handleDeleteAttachment(index)}
                          sx={index < audioParts.length - 1 ? { mb: 2 } : {}}
                        >
                          <Box sx={{ p: 1 }}>
                            <audio
                              controls
                              style={{
                                width: "100%",
                                minWidth: "280px",
                              }}
                            >
                              <source
                                src={audioSrc}
                                type={attachment?.mimeType || "audio/mp3"}
                              />
                              Your browser does not support the audio element.
                            </audio>
                          </Box>
                        </FileAttachmentWrapper>
                      );
                    })}
                  </Box>
                );
              }
              return null;
            })()}

            {/* Render generated images if present */}
            {(() => {
              const generatedImageParts = getGeneratedImageParts(
                message.content
              );
              if (generatedImageParts.length > 0) {
                return (
                  <Box sx={{ mb: generatedImageParts.length > 0 ? 2 : 0 }}>
                    {generatedImageParts.map((imagePart, index) => {
                      const imageUrl =
                        imagePart.generated_image.url ||
                        (imagePart.generated_image.b64_json
                          ? `data:image/png;base64,${imagePart.generated_image.b64_json}`
                          : "");

                      if (!imageUrl) return null;

                      // Build metadata array
                      const metadata = [
                        `Model: ${imagePart.generated_image.model}`,
                        `"${imagePart.generated_image.prompt.substring(0, 100)}${imagePart.generated_image.prompt.length > 100 ? '...' : ''}"`,
                      ];
                      
                      if (imagePart.generated_image.parameters?.size) {
                        metadata.push(`Size: ${imagePart.generated_image.parameters.size}`);
                      }
                      if (imagePart.generated_image.parameters?.quality) {
                        metadata.push(`Quality: ${imagePart.generated_image.parameters.quality}`);
                      }

                      // Define actions for generated image
                      const actions = [
                        {
                          icon: <FullscreenIcon fontSize="small" />,
                          label: "Open in new tab",
                          onClick: () => window.open(imageUrl, "_blank"),
                        },
                        {
                          icon: <DownloadIcon fontSize="small" />,
                          label: "Download image",
                          onClick: () => {
                            const link = document.createElement("a");
                            link.href = imageUrl;
                            link.download = `generated-image-${Date.now()}.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          },
                        },
                      ];

                      return (
                        <FileAttachmentWrapper
                          key={index}
                          type="generated_image"
                          fileName={`Generated Image ${index + 1}`}
                          metadata={metadata}
                          actions={actions}
                          onDelete={() => handleDeleteAttachment(index)}
                          sx={index < generatedImageParts.length - 1 ? { mb: 2 } : {}}
                        >
                          <CardMedia
                            component="img"
                            image={imageUrl}
                            alt={`Generated: ${imagePart.generated_image.prompt.substring(
                              0,
                              50
                            )}...`}
                            sx={{
                              width: "100%",
                              maxWidth: 512,
                              height: "auto",
                              cursor: "pointer",
                              "&:hover": {
                                opacity: 0.8,
                              },
                            }}
                            onClick={() => {
                              window.open(imageUrl, "_blank");
                            }}
                          />
                        </FileAttachmentWrapper>
                      );
                    })}
                  </Box>
                );
              }
              return null;
            })()}

            {/* Render documents if present */}
            {(() => {
              const documentParts = getDocumentParts(message.content);
              if (documentParts.length > 0) {
                return (
                  <Box sx={{ mb: documentParts.length > 0 ? 2 : 0 }}>
                    {documentParts.map((documentPart, index) => {
                      const documentId = `${message.id}-doc-${index}`;
                      const DEFAULT_PREVIEW_LENGTH = 1000; // Start with reasonable truncation
                      const EXPAND_INCREMENT = 1000; // Add 1000 chars each time

                      const currentPreviewLength =
                        documentPreviewLengths[documentId] ||
                        DEFAULT_PREVIEW_LENGTH;
                      const contentToShow = documentPart.document.text; // Always use text for consistent behavior
                      const hasMoreContent = contentToShow && contentToShow.length > currentPreviewLength;

                      const handleShowMore = () => {
                        setDocumentPreviewLengths((prev) => ({
                          ...prev,
                          [documentId]: currentPreviewLength + EXPAND_INCREMENT,
                        }));
                      };

                      // Build metadata array
                      const metadata = [
                        formatFileSize(documentPart.document.metadata.fileSize),
                        `${documentPart.document.metadata.wordCount.toLocaleString()} words`,
                      ];
                      
                      if (documentPart.document.metadata.pageCount) {
                        metadata.push(`${documentPart.document.metadata.pageCount} pages`);
                      }
                      if (documentPart.document.metadata.title) {
                        metadata.push(documentPart.document.metadata.title);
                      }

                      // Define actions for document
                      const actions = [
                        {
                          icon: <ContentCopy fontSize="small" />,
                          label: "Copy text content",
                          onClick: () => {
                            navigator.clipboard.writeText(documentPart.document.text);
                            showSnackbar({
                              message: "Document text copied to clipboard",
                              severity: "success",
                            });
                          },
                        },
                      ];

                      // Add HTML copy action for PDFs
                      if (documentPart.document.previewHtml && 
                          documentPart.document.metadata.mimeType === 'application/pdf') {
                        actions.push({
                          icon: <CodeIcon fontSize="small" />,
                          label: "Copy HTML code",
                          onClick: () => {
                            navigator.clipboard.writeText(documentPart.document.previewHtml!);
                            showSnackbar({
                              message: "Document HTML code copied to clipboard",
                              severity: "success",
                            });
                          },
                        });
                      }

                      // Add expand action
                      actions.push({
                        icon: <ExpandMoreIcon fontSize="small" />,
                        label: "Show more content",
                        onClick: handleShowMore,
                        disabled: !hasMoreContent,
                      } as any);

                      return (
                        <FileAttachmentWrapper
                          key={index}
                          type="document"
                          fileName={documentPart.document.metadata.fileName}
                          metadata={metadata}
                          actions={actions}
                          onDelete={() => handleDeleteAttachment(index)}
                          sx={index < documentParts.length - 1 ? { mb: 2 } : {}}
                        >
                          {/* Document Preview */}
                          <Box
                            sx={{
                              maxHeight: 150,
                              overflow: "auto",
                              backgroundColor: theme.palette.background.paper,
                              borderRadius: 1,
                              p: 1,
                              border: `1px solid ${theme.palette.divider}`,
                              fontSize: "0.875rem",
                              lineHeight: 1.4,
                            }}
                          >
                            {documentPart.document.previewHtml ? (
                              <Box
                                component="pre"
                                sx={{
                                  fontFamily: "monospace",
                                  whiteSpace: "pre-wrap",
                                  fontSize: "0.75rem",
                                  overflow: "auto",
                                  margin: 0,
                                }}
                              >
                                {/* Use the original text content instead of previewHtml for better control */}
                                {documentPart.document.text.length > currentPreviewLength
                                  ? `${documentPart.document.text.substring(0, currentPreviewLength)}...`
                                  : documentPart.document.text}
                              </Box>
                            ) : (
                              <Box
                                sx={{
                                  fontFamily: "monospace",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {documentPart.document.text}
                              </Box>
                            )}
                          </Box>
                        </FileAttachmentWrapper>
                      );
                    })}
                  </Box>
                );
              }
              return null;
            })()}

            {/* Render text content */}
            <Typography
              // onDoubleClick={handleEditClick} // Allow double-click to edit
              component="div"
              variant="body1"
              sx={{
                fontSize: "inherit",
                overflowWrap: "break-word",
                width: "100%",
              }}
            >
              {/* Ensure MarkdownRenderer is wrapped correctly */}
              <MarkdownRenderer content={extractTextContent(message.content)} />
            </Typography>

            {/* Ephemeral Audio Player for text messages */}
            {hasTextContent && ephemeralData?.audio && (
              <EphemeralAudioPlayer
                messageId={message.id}
                audioData={ephemeralData.audio}
                onError={(error) => {
                  showSnackbar({
                    message: error,
                    severity: "error",
                  });
                }}
              />
            )}

            {/* Ephemeral Transcript for audio messages */}
            {hasAudioContent && ephemeralData?.transcript && (
              <EphemeralTranscript
                messageId={message.id}
                transcriptData={ephemeralData.transcript}
                onError={(error) => {
                  showSnackbar({
                    message: error,
                    severity: "error",
                  });
                }}
              />
            )}
          </Box>
        )}
        {/* Loading spinner during retry or for placeholder */}
        {(isRetryingThisMessage || message.isLoading) && (
          <CircularProgress
            size={20}
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              marginTop: "-10px",
              marginLeft: "-10px",
              zIndex: 1, // Ensure spinner is above content
            }}
          />
        )}
      </Card>

      {/* Action Buttons Popover - Moved outside Card to prevent clipping */}
      <Paper
        elevation={4}
        sx={{
          position: "absolute",
          borderRadius: 20,
          top: -6, // Position above the card, adjusted for new positioning
          right: message.role === "user" ? 16 : 16, // Align with card positioning
          bgcolor: "background.paper",
          border: `1px solid ${theme.palette.divider}`,
          p: 0.25, // Small padding around buttons
          gap: 0.5, // Reduced gap
          // Show if editing this OR (hovered and nothing else is being edited)
          display:
            isGloballyEditingThis || (isHovered && canHover) ? "flex" : "none",
          opacity: isGloballyEditingThis || (isHovered && canHover) ? 1 : 0, // Fade in/out
          transition: theme.transitions.create(["opacity", "transform"], {
            duration: theme.transitions.duration.short,
          }),
          transform:
            isGloballyEditingThis || (isHovered && canHover)
              ? "translateY(0)"
              : "translateY(-4px)",
          zIndex: 10, // Ensure buttons are above everything
        }}
      >
        {isEditing ? ( // Show Confirm/Cancel when editing
          <>
            <IconButton
              aria-label="confirm"
              color="success"
              size="small"
              onClick={handleEditConfirm}
              title="Confirm Edit (Enter)"
            >
              <CheckIcon fontSize="small" />
            </IconButton>
            <IconButton
              aria-label="cancel"
              color="inherit"
              size="small"
              onClick={handleEditCancel}
              title="Cancel Edit (Escape)"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        ) : (
          // Show standard actions when not editing
          <>
            {/* Copy Code/Markdown Button - only show for non-image-only messages */}
            {!isImageOnlyMessage && (
              <IconButton
                aria-label="copy"
                size="small"
                color="inherit"
                onClick={handleCopyCodeClick}
                title="Copy Markdown"
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            )}
            
            {/* Speaker Button - only show for text messages */}
            {hasTextContent && !isImageOnlyMessage && (
              <IconButton
                aria-label="text-to-speech"
                size="small"
                color={ephemeralData?.audio?.isVisible ? "primary" : "inherit"}
                onClick={handleToggleAudio}
                title={ephemeralData?.audio?.isVisible ? "Hide Audio" : "Generate Audio"}
                disabled={isRetryingThisMessage || ephemeralData?.audio?.isLoading}
              >
                {ephemeralData?.audio?.isLoading ? (
                  <CircularProgress size={16} />
                ) : (
                  <VolumeUpIcon fontSize="small" />
                )}
              </IconButton>
            )}

            {/* Transcribe Button - only show for audio messages */}
            {hasAudioContent && (
              <IconButton
                aria-label="transcribe"
                size="small"
                color={ephemeralData?.transcript?.isVisible ? "primary" : "inherit"}
                onClick={handleToggleTranscript}
                title={ephemeralData?.transcript?.isVisible ? "Hide Transcript" : "Generate Transcript"}
                disabled={isRetryingThisMessage || ephemeralData?.transcript?.isLoading}
              >
                {ephemeralData?.transcript?.isLoading ? (
                  <CircularProgress size={16} />
                ) : (
                  <TranscribeIcon fontSize="small" />
                )}
              </IconButton>
            )}
            
            {/* Edit Button - only show for non-image-only messages */}
            {!isImageOnlyMessage && (
              <IconButton
                aria-label="edit"
                size="small"
                onClick={handleEditClick}
                color="inherit"
                title="Edit Message (Double-Click)"
                disabled={isRetryingThisMessage}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}
            {/* Delete Button */}
            <IconButton
              aria-label="delete"
              size="small"
              onClick={handleDeleteClick}
              title="Long press to delete"
              color={isGoingToDelete ? "error" : "inherit"}
              {...deleteLongPressProps}
              disabled={isRetryingThisMessage}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
            {/* Retry Button - Hide for pending messages */}
            {!isPending && (
              <IconButton
                aria-label="retry"
                size="small"
                onClick={handleRetryClick}
                title="Retry Generation"
                disabled={isGenerating}
                color={isGoingToRetry ? "success" : "inherit"}
                {...retryLongPressProps}
              >
                <AutoModeIcon fontSize="small" />
              </IconButton>
            )}
          </>
        )}
      </Paper>
    </Paper>
  );
};

export default MessageItem;
