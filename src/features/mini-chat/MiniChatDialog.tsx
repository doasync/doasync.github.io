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
  const { isOpen, isCompact, messages, loading, input } = useUnit($miniChat);
  const nodeRef = React.useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

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
            {/* Conditionally render Expand button */}
            {!isCompact && (
              <IconButton size="small" onClick={() => expandMiniChat()}>
                <OpenInFullIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton size="small" onClick={() => miniChatClosed()}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        {/* Conditionally render message area */}
        {!isCompact && (
          <Stack spacing={1} sx={{ p: 1, flexGrow: 1, overflowY: "auto" }}>
            {messages.map((msg, idx) => (
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
            {loading && <CircularProgress size={20} />}
          </Stack>
        )}

        <Stack direction="row" spacing={1} sx={{ p: 1 }}>
          <TextField
            size="small"
            placeholder="Type a message..."
            fullWidth
            value={input}
            onChange={(e) => updateMiniChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim()) {
                  sendMiniChatMessage(input.trim());
                }
              }
            }}
          />
          <Button
            variant="contained"
            size="small"
            disabled={!input.trim() || loading}
            onClick={() => {
              if (input.trim()) {
                sendMiniChatMessage(input.trim());
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
