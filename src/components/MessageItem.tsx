import React, { useState, useRef, useEffect } from "react";
import { showSnackbar } from "@/features/ui-state/snackbar";
import { useLongPress, LongPressCallback } from "use-long-press";
import { useUnit } from "effector-react";
import {
  editMessage,
  deleteMessage,
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
import { Message, MessageContentPart, TextContentPart, ImageContentPart } from "@/features/chat";
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
  if (typeof content === 'string') {
    return content;
  }
  return content
    .filter((part): part is TextContentPart => part.type === 'text')
    .map(part => part.text)
    .join(' ');
};

// Helper function to get image parts from content
const getImageParts = (content: string | MessageContentPart[]): ImageContentPart[] => {
  if (typeof content === 'string') {
    return [];
  }
  return content.filter((part): part is ImageContentPart => 
    part.type === 'image_url'
  );
};

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  // Hooks
  const theme = useTheme(); // Get theme for palette access
  const isGenerating = useUnit($isGenerating);
  const retryingMessageId = useUnit($retryingMessageId);
  const globalEditingMessageId = useUnit($editingMessageId); // Get global state
  const [isHovered, setIsHovered] = useState(false);
  const [isGoingToDelete, setIsGoingToDelete] = useState(false);
  const [isGoingToRetry, setIsGoingToRetry] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(
    typeof message.content === 'string' ? message.content : extractTextContent(message.content)
  ); // Initialize with prop
  const [originalContentOnEdit, setOriginalContentOnEdit] = useState("");
  const messageItemRef = useRef<HTMLDivElement>(null);

  // Derived State
  const isRetryingThisMessage =
    isGenerating && retryingMessageId === message.id;
  const isGloballyEditingThis = globalEditingMessageId === message.id;
  const canHover = globalEditingMessageId === null;
  const isImageOnlyMessage = Array.isArray(message.content) && 
    message.content.every(part => part.type === 'image_url');
  const isPending = message.status === 'pending';

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
        .writeText(textContent) // Copy raw markdown/code
        .then(() => console.log("Code/Markdown copied to clipboard"))
        .catch((err) => console.error("Failed to copy code/markdown: ", err));
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
                : "primary.dark"
              : theme.palette.background.paper, // Use paper background for assistant
          // Adjust width for alignment
          width: isEditing ? "-webkit-fill-available" : "fit-content", // Let content determine width initially
          maxWidth: "100%",
          wordWrap: "break-word",
          opacity: isPending ? 0.8 : 1, // Slightly transparent for pending
          position: "relative", // For pending indicator
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
                    {imageParts.map((imagePart, index) => (
                      <CardMedia
                        key={index}
                        component="img"
                        image={imagePart.image_url.url}
                        alt={`Attached image ${index + 1}`}
                        sx={{
                          maxWidth: "100%",
                          maxHeight: 300,
                          objectFit: "contain",
                          borderRadius: 1,
                          mb: index < imageParts.length - 1 ? 1 : 0,
                          cursor: "pointer",
                          '&:hover': {
                            opacity: 0.8,
                          },
                        }}
                        onClick={() => {
                          // Open image in new tab
                          window.open(imagePart.image_url.url, '_blank');
                        }}
                      />
                    ))}
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
        {/* Pending indicator */}
        {isPending && (
          <Typography
            variant="caption"
            sx={{
              position: "absolute",
              bottom: 4,
              right: 8,
              color: "text.secondary",
              fontSize: "0.7rem",
            }}
          >
            Pending
          </Typography>
        )}
        {/* Action Buttons Popover */}
        <Paper
          elevation={0}
          sx={{
            position: "absolute",
            borderRadius: 20,
            top: -18, // Position above the card
            right: 4,
            bgcolor: "background.default", // Give it a background
            p: 0.25, // Small padding around buttons
            gap: 0.5, // Reduced gap
            // Show if editing this OR (hovered and nothing else is being edited)
            display:
              isGloballyEditingThis || (isHovered && canHover)
                ? "flex"
                : "none",
            opacity: isGloballyEditingThis || (isHovered && canHover) ? 1 : 0, // Fade in/out
            transition: theme.transitions.create("opacity"),
            zIndex: 2, // Ensure buttons are above card content
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
              {/* Copy Text Button
              <IconButton
                aria-label="copy text"
                size="small"
                color="inherit"
                onClick={handleCopyTextClick}
                title="Copy Text"
              >
                <ContentCopyIcon fontSize="small" />
                <CodeIcon fontSize="small" />
              </IconButton>
               */}
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
              {/* Retry Button */}
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
            </>
          )}
        </Paper>
      </Card>
    </Paper>
  );
};

export default MessageItem;
