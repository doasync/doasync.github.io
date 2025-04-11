import React from "react";
import Draggable from "react-draggable";
import {
  Box, // Add Box import
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
import RemoveIcon from "@mui/icons-material/Remove"; // Import Minimize icon
import LinearProgress from "@mui/material/LinearProgress";
import SendIcon from "@mui/icons-material/Send";

import { useUnit } from "effector-react";
import {
  $miniChat,
  updateMiniChatInput,
  sendMiniChatMessage,
  miniChatClosed,
  expandMiniChat,
  minimizeMiniChat, // Import minimize event
} from "./model";

export const MiniChatDialog: React.FC = () => {
  const { isOpen, isCompact, messages, loading, input, isMinimized } =
    useUnit($miniChat); // Add isMinimized
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
          bottom: "20px", // Use bottom/right for initial placement
          right: "20px", // Use bottom/right for initial placement
          maxWidth: "min(350px, 80vw)", // Responsive max width
          maxHeight: "60vh", // Responsive max height
          overflow: "auto",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          transform: "translate(0, 0)", // Helps prevent initial off-screen placement before drag
        }}
      >
        {/* Conditionally render the entire dialog content based on minimized state */}
        {!isMinimized && (
          <>
            {/* Header Stack - Main container */}
            {/* Header Stack - Main container */}
            <Stack
              direction="row"
              justifyContent="space-between" // Pushes title and buttons apart
              alignItems="center"
              // Removed className="drag-handle" and cursor: "move" from here
              sx={{
                // Removed cursor: "move"
                p: 0.5,
                pl: 1.3,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              {/* Title Wrapper - This is now the drag handle */}
              <Box
                className="drag-handle"
                sx={{
                  cursor: "move",
                  flexGrow: 1,
                  mr: 1 /* Add some margin */,
                }}
              >
                <Typography variant="subtitle1">Mini chat</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                {/* Conditionally render Expand button */}
                {!isCompact && (
                  <IconButton
                    aria-label="Expand"
                    size="small"
                    onClick={() => expandMiniChat()} // Re-wrap in arrow function
                  >
                    <OpenInFullIcon fontSize="small" />
                  </IconButton>
                )}
                {/* Minimize Button */}
                <IconButton
                  aria-label="Minimize"
                  size="small"
                  onClick={() => minimizeMiniChat()}
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
                {/* Close Button */}
                <IconButton
                  aria-label="Close"
                  size="small"
                  onClick={() => miniChatClosed()} // Re-wrap in arrow function
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>

            {/* Message Area */}
            {!isCompact && (
              <Stack
                spacing={1}
                sx={{ p: 1, pb: 0.2, flexGrow: 1, overflowY: "auto" }}
              >
                {messages.map((msg, idx) => (
                  <Paper
                    key={idx}
                    className="chat-message" // Added className here
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

            {/* Input Area */}
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
            {/* End of outer conditional rendering */}
            {/* This closes the fragment for the {!isMinimized && ...} condition */}
          </>
        )}
      </Paper>
    </Draggable>
  );
};
