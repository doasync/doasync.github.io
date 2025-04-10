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
  OutlinedInput,
  InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import LinearProgress from "@mui/material/LinearProgress";
import SendIcon from "@mui/icons-material/Send";

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
          sx={{
            cursor: "move",
            p: 0.5,
            pl: 1.3,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle1">Mini chat</Typography>
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
          <Stack
            spacing={1}
            sx={{ p: 1, pb: 0.2, flexGrow: 1, overflowY: "auto" }}
          >
            {messages.map((msg, idx) => (
              <Paper
                key={idx}
                sx={{
                  p: 1,
                  minWidth: "30%",
                  bgcolor:
                    msg.role === "user" ? "primary.dark" : "secondary.dark",
                }}
              >
                <Typography variant="body2">{msg.content}</Typography>
              </Paper>
            ))}
            {loading && <LinearProgress sx={{ borderRadius: 8 }} />}
          </Stack>
        )}

        <Stack direction="row" spacing={1} sx={{ p: 1 }}>
          <TextField
            size="small"
            placeholder="Type a message..."
            fullWidth
            multiline
            value={input}
            onChange={(e) => updateMiniChatInput(e.target.value)}
            /*
            // Uncomment this if you want to handle Enter
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim()) {
                  sendMiniChatMessage(input.trim());
                }
              }
            }}
            */
            sx={{
              "& .MuiOutlinedInput-root": {
                p: 0.6,
                pr: 1,
              },
              // Clickable area for the input
              "& textarea": {
                pl: 1,
              },
            }}
            slotProps={{
              input: {
                style: { marginLeft: 1.5 },
                endAdornment: (
                  <IconButton
                    aria-label="send"
                    size="small"
                    edge="end"
                    disabled={!input.trim() || loading}
                    onClick={() => {
                      if (input.trim()) {
                        sendMiniChatMessage(input.trim());
                      }
                    }}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                ),
              },
            }}
          />
        </Stack>
      </Paper>
    </Draggable>
  );
};
