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
  $miniChatScrollTrigger, // Import scroll trigger store
} from "./model";

export const MiniChatDialog: React.FC = () => {
  const {
    isOpen,
    isCompact,
    messages,
    loading,
    input,
    isMinimized,
    initialX, // Get initial position X
    initialY, // Get initial position Y
  } = useUnit($miniChat);
  const miniChatScrollTrigger = useUnit($miniChatScrollTrigger); // Subscribe to scroll trigger
  const nodeRef = React.useRef<HTMLDivElement>(null);
  const inputAreaRef = React.useRef<HTMLDivElement>(null); // Re-introduce ref for message area
  const messagesAreaRef = React.useRef<HTMLDivElement>(null); // Re-introduce ref for message area

  // Effect to scroll the *main area* on open/quote trigger
  React.useEffect(() => {
    if (!isOpen) return;
    const element = inputAreaRef.current;
    if (element) {
      requestAnimationFrame(() => {
        element.scrollTop = element.scrollHeight;
      });
    }
  }, [isOpen, miniChatScrollTrigger]); // Depend on trigger

  // Effect to scroll the *message area* when new messages arrive
  React.useEffect(() => {
    if (!isOpen || isCompact) return; // Don't scroll message area if closed or compact
    const element = messagesAreaRef.current;
    if (element) {
      requestAnimationFrame(() => {
        element.scrollTop = element.scrollHeight;
      });
    }
  }, [isOpen, isCompact, messages]); // Depend on messages array

  if (!isOpen) return null;

  // REMOVED Effect from here
  return (
    <Draggable
      handle=".drag-handle"
      nodeRef={nodeRef as React.RefObject<HTMLElement>}
    >
      <Paper
        ref={nodeRef}
        elevation={6}
        sx={{
          position: "fixed",
          // Conditionally set position based on initial coordinates
          ...(initialX != null && initialY != null
            ? { top: initialY, left: initialX } // Position near selection
            : { bottom: "20px", right: "20px" }), // Default bottom-right
          maxWidth: "300px",
          minWidth: "196px",
          maxHeight: "40vh",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          transform: "translate(-50%, 10px)", // Adjust transform to center above/below selection point
          // transform: 'translate(0, 0)', // Helps prevent initial off-screen placement before drag
          pb: 1,
          visibility: isMinimized ? "hidden" : "visible", // Hide when minimized
        }}
      >
        {/* Conditionally render the entire dialog content based on minimized state */}
        {!isMinimized && (
          <>
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
                // ref={messagesAreaRef} // Removed ref assignment
                spacing={1}
                sx={{
                  p: 1,
                  overflowY: "auto",
                  flexShrink: 1000,
                  minHeight: "96px",
                }}
                ref={messagesAreaRef} // Re-assign ref
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
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {msg.content}
                    </Typography>
                  </Paper>
                ))}
                {/* Moved LinearProgress outside this Stack */}
              </Stack>
            )}

            {/* Input Area */}
            <Stack
              ref={inputAreaRef}
              direction="row"
              spacing={1}
              sx={{
                p: 1,
                pb: 0,
                borderTop: 1,
                borderColor: "divider",
                overflow: "auto",
              }}
            >
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
                    overflow: "auto", // Ensure textarea itself is scrollable
                  },
                }}
                slotProps={{
                  input: {
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
                        sx={{ alignSelf: "flex-end" }} // Align to the end of the input
                      >
                        <SendIcon fontSize="small" />
                      </IconButton>
                    ),
                  },
                }}
              />
            </Stack>

            {/* Render progress bar here, outside !isCompact check */}
            {loading && (
              <LinearProgress
                color="secondary"
                sx={{
                  position: "absolute",
                  bottom: 0,
                  width: "100%",
                  height: "1px",
                }}
              />
            )}
            {/* End of outer conditional rendering */}
            {/* This closes the fragment for the {!isMinimized && ...} condition */}
          </>
        )}
      </Paper>
    </Draggable>
  );
};
