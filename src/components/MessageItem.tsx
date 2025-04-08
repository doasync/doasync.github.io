import React, { useState, useRef, useEffect } from "react";
import { useUnit } from "effector-react";
import {
  editMessage,
  deleteMessage,
  messageRetry,
  $isGenerating,
  $retryingMessageId,
} from "@/features/chat";
import { Message } from "@/features/chat";
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
  const isGenerating = useUnit($isGenerating);
  const retryingMessageId = useUnit($retryingMessageId);
  const [isHovered, setIsHovered] = useState(false);
  const isRetryingThisMessage =
    isGenerating && retryingMessageId === message.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.content);
  const [originalContentOnEdit, setOriginalContentOnEdit] = useState("");
  const messageItemRef = useRef<HTMLDivElement>(null);

  const handleEditClick = () => {
    if (isEditing) return;
    setOriginalContentOnEdit(message.content);
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditedText(originalContentOnEdit);
  };

  const handleEditConfirm = () => {
    editMessage({ messageId: message.id, newContent: editedText });
    setIsEditing(false);
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
        .writeText(message.content)
        .then(() => console.log("Code/Markdown copied to clipboard"))
        .catch((err) => console.error("Failed to copy code/markdown: ", err));
    } else {
      console.error("Cannot copy non-string content as code/markdown");
    }
  };

  useEffect(() => {
    if (!isEditing) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        messageItemRef.current &&
        !messageItemRef.current.contains(event.target as Node)
      ) {
        handleEditConfirm();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing]);

  return (
    <Paper
      ref={messageItemRef}
      variant="outlined"
      key={message.id}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        borderColor: isHovered ? "primary.main" : "transparent",
        padding: 2.5,
      }}
    >
      <Card
        raised
        elevation={1}
        onDoubleClick={handleEditClick}
        sx={{
          p: 1.5,
          alignSelf: message.role === "user" ? "flex-end" : "flex-start",
          backgroundColor: message.role === "user" ? "primary.dark" : "primary",
          width: "100%",
          maxWidth: "100%",
          wordWrap: "break-word",
        }}
      >
        {isEditing ? (
          <InputBase
            multiline
            fullWidth
            value={editedText}
            onChange={handleTextChange}
            autoFocus
            sx={{
              padding: 0,
              borderBottom: 0,
            }}
          />
        ) : (
          <Typography component="div" variant="body1">
            <MarkdownRenderer content={message.content} />
          </Typography>
        )}
        {isRetryingThisMessage && (
          <CircularProgress
            size={20}
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              marginTop: "-10px",
              marginLeft: "-10px",
            }}
          />
        )}
        <Paper
          elevation={0}
          sx={{
            position: "absolute",
            borderRadius: 20,
            top: -17,
            right: 4,
            gap: 1,
            display: isHovered ? "flex" : "none",
          }}
        >
          {isEditing ? (
            <>
              <IconButton
                aria-label="confirm"
                color="success"
                size="small"
                onClick={handleEditConfirm}
              >
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton
                aria-label="cancel"
                color="inherit"
                size="small"
                onClick={handleEditCancel}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          ) : (
            <>
              <IconButton
                aria-label="delete"
                size="small"
                color="inherit"
                onClick={handleDeleteClick}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
              <IconButton
                aria-label="copy text"
                size="small"
                color="inherit"
                onClick={handleCopyTextClick}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
              <IconButton
                aria-label="copy code"
                size="small"
                color="inherit"
                onClick={handleCopyCodeClick}
              >
                <CodeIcon fontSize="small" />
              </IconButton>
              <IconButton
                aria-label="edit"
                size="small"
                onClick={handleEditClick}
                color="inherit"
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                aria-label="retry"
                size="small"
                color="inherit"
                onClick={handleRetryClick}
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
