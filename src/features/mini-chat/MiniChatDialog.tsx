import React from "react";
import Draggable from "react-draggable";
import {
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  CircularProgress,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import { useUnit } from "effector-react";
import {
  $miniChat,
  updateMiniChatInput,
  sendMiniChatMessage,
  miniChatClosed,
  expandMiniChat,
} from "./model";

export const MiniChatDialog: React.FC = () => {
  const chat = useUnit($miniChat);
  const nodeRef = React.useRef<HTMLDivElement>(null);

  if (!chat.isOpen) return null;

  return (
    <Draggable
      handle=".drag-handle"
      nodeRef={nodeRef as React.RefObject<HTMLElement>}
    >
      <Paper
        ref={nodeRef}
        elevation={6}
        style={{
          position: "fixed",
          top: "30%",
          left: "40%",
          width: 300,
          maxHeight: 400,
          overflow: "auto",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          className="drag-handle"
          sx={{ cursor: "move", p: 1, borderBottom: "1px solid #ccc" }}
        >
          <Typography variant="subtitle1">Mini Chat</Typography>
          <Stack direction="row" spacing={1}>
            <IconButton size="small" onClick={() => expandMiniChat()}>
              <OpenInFullIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => miniChatClosed()}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        <Stack spacing={1} sx={{ p: 1, flexGrow: 1, overflowY: "auto" }}>
          {chat.messages.map((msg, idx) => (
            <Paper
              key={idx}
              sx={{
                p: 1,
                bgcolor: msg.role === "user" ? "#e0f7fa" : "#f1f8e9",
              }}
            >
              <Typography variant="body2">{msg.content}</Typography>
            </Paper>
          ))}
          {chat.loading && <CircularProgress size={20} />}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ p: 1 }}>
          <TextField
            size="small"
            placeholder="Type a message..."
            fullWidth
            value={chat.input}
            onChange={(e) => updateMiniChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (chat.input.trim()) {
                  sendMiniChatMessage(chat.input.trim());
                }
              }
            }}
          />
          <Button
            variant="contained"
            size="small"
            disabled={!chat.input.trim() || chat.loading}
            onClick={() => {
              if (chat.input.trim()) {
                sendMiniChatMessage(chat.input.trim());
              }
            }}
          >
            Send
          </Button>
        </Stack>
      </Paper>
    </Draggable>
  );
};
