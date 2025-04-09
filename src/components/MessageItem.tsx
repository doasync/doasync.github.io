import React, { useState, useRef, useEffect } from "react";
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
import { Message } from "@/features/chat";
import { useTheme } from "@mui/material/styles"; // Import useTheme
import {
  Typography,
  IconButton,
  InputBase,
  Paper,
  Card,
  CircularProgress,
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

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  // Hooks
  const theme = useTheme(); // Get theme for palette access
  const isGenerating = useUnit($isGenerating);
  const retryingMessageId = useUnit($retryingMessageId);
  const globalEditingMessageId = useUnit($editingMessageId); // Get global state
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.content);
  const [originalContentOnEdit, setOriginalContentOnEdit] = useState("");
  const messageItemRef = useRef<HTMLDivElement>(null);

  // Derived State
  const isRetryingThisMessage =
    isGenerating && retryingMessageId === message.id;
  const isGloballyEditingThis = globalEditingMessageId === message.id;
  const canHover = globalEditingMessageId === null;

  // Event Handlers
  const handleEditClick = () => {
    // Don't allow editing if another edit is active or already editing this one
    if (isEditing || globalEditingMessageId !== null) return;
    setOriginalContentOnEdit(message.content); // Store original content
    startEditingMessage(message.id); // Set this message as globally editing
    setIsEditing(true); // Set local editing state
  };

  const handleEditCancel = () => {
    setIsEditing(false); // Clear local editing state
    setEditedText(originalContentOnEdit); // Restore original text
    stopEditingMessage(); // Clear global editing state
    // Allow scrolling again immediately on cancel
    setTimeout(() => setPreventScroll(false), 0);
  };

  const handleEditConfirm = () => {
    // Only dispatch edit if text actually changed
    if (editedText !== originalContentOnEdit) {
      editMessage({ messageId: message.id, newContent: editedText });
    }
    setIsEditing(false); // Clear local editing state
    stopEditingMessage(); // Clear global editing state
    // Allow scrolling again after confirm (using timeout for safety)
    setTimeout(() => setPreventScroll(false), 0);
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditedText(event.target.value);
  };

  const handleDeleteClick = () => {
    deleteMessage(message.id);
  };

  const handleRetryClick = () => {
    messageRetry(message);
  };

  const handleCopyTextClick = () => {
    if (typeof message.content === "string") {
      navigator.clipboard
        .writeText(message.content)
        .then(() => console.log("Text copied to clipboard"))
        .catch((err) => console.error("Failed to copy text: ", err));
    } else {
      console.error("Cannot copy non-string content");
    }
  };

  const handleCopyCodeClick = () => {
    if (typeof message.content === "string") {
      navigator.clipboard
        .writeText(message.content) // Copy raw markdown/code
        .then(() => console.log("Code/Markdown copied to clipboard"))
        .catch((err) => console.error("Failed to copy code/markdown: ", err));
    } else {
      console.error("Cannot copy non-string content as code/markdown");
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
        onDoubleClick={handleEditClick} // Allow double-click to edit
        sx={{
          p: 2,
          borderRadius: 2,
          alignSelf: message.role === "user" ? "flex-end" : "flex-start",
          backgroundColor:
            message.role === "user"
              ? "primary.dark"
              : theme.palette.background.paper, // Use paper background for assistant
          // Adjust width for alignment
          width: isEditing ? "-webkit-fill-available" : "fit-content", // Let content determine width initially
          maxWidth: "85%", // Limit max width
          minWidth: "20%", // Limit max width
          wordWrap: "break-word",
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
          <Typography
            component="div"
            variant="body1"
            sx={{
              overflowWrap: "break-word",
              width: "100%",
            }}
          >
            {/* Ensure MarkdownRenderer is wrapped correctly */}
            <MarkdownRenderer content={message.content} />
          </Typography>
        )}
        {/* Loading spinner during retry */}
        {isRetryingThisMessage && (
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
              {/* Delete Button */}
              <IconButton
                aria-label="delete"
                size="small"
                color="inherit"
                onClick={handleDeleteClick}
                title="Delete Message"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
              {/* Copy Text Button */}
              <IconButton
                aria-label="copy text"
                size="small"
                color="inherit"
                onClick={handleCopyTextClick}
                title="Copy Text"
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
              {/* Copy Code/Markdown Button */}
              <IconButton
                aria-label="copy code"
                size="small"
                color="inherit"
                onClick={handleCopyCodeClick}
                title="Copy Code/Markdown"
              >
                <CodeIcon fontSize="small" />
              </IconButton>
              {/* Edit Button */}
              <IconButton
                aria-label="edit"
                size="small"
                onClick={handleEditClick}
                color="inherit"
                title="Edit Message (Double-Click)"
              >
                <EditIcon fontSize="small" />
              </IconButton>
              {/* Retry Button */}
              <IconButton
                aria-label="retry"
                size="small"
                color="inherit"
                onClick={handleRetryClick}
                title="Retry Generation"
                disabled={isGenerating} // Disable if already generating
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
