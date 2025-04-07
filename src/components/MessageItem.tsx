import React, { useState } from "react";
import { messageEditConfirmed } from "@/model/chat";
import { Message } from "@/model/chat";
import { Typography, IconButton, InputBase, Paper, Card } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.content);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditedText(message.content); // Revert to original content
  };

  const handleEditConfirm = () => {
    messageEditConfirmed({ messageId: message.id, newContent: editedText });
    setIsEditing(false);
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditedText(event.target.value);
  };

  return (
    <Paper
      variant="outlined"
      key={message.id}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        borderColor: isHovered ? "primary" : "transparent",
        padding: 2,
      }}
    >
      <Card
        raised
        elevation={1}
        sx={{
          p: 1.5,
          alignSelf: message.role === "user" ? "flex-end" : "flex-start",
          backgroundColor: message.role === "user" ? "primary.dark" : "primary",
          maxWidth: "80%",
          wordWrap: "break-word", // Ensure long words break
        }}
      >
        {isEditing ? (
          <InputBase
            multiline
            fullWidth
            value={editedText}
            onChange={handleTextChange}
            onBlur={handleEditConfirm}
            autoFocus
            sx={{
              padding: 0,
              borderBottom: 0,
            }}
          />
        ) : (
          <Typography variant="body1" whiteSpace={"pre-wrap"}>
            {message.content}
          </Typography>
        )}

        <Paper
          elevation={5}
          sx={{
            position: "absolute",
            borderRadius: 20,
            top: -16,
            right: 4,
            display: isHovered ? "block" : "none", // Show on hover
            backgroundColor: "secondary,main",
          }}
        >
          {isEditing ? (
            <React.Fragment>
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
            </React.Fragment>
          ) : (
            <IconButton
              aria-label="edit"
              size="small"
              onClick={handleEditClick}
              color="inherit"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          )}
        </Paper>
      </Card>
    </Paper>
  );
};

export default MessageItem;
