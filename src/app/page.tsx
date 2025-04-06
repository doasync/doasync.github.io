"use client"; // Mark as client component for future interactivity

import * as React from "react";
import { useUnit, useGate } from "effector-react"; // Import useUnit and useGate
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import HistoryIcon from "@mui/icons-material/History"; // Use History icon
import SettingsIcon from "@mui/icons-material/Settings"; // Placeholder for Settings
import AddCommentIcon from "@mui/icons-material/AddComment"; // Placeholder for New Chat
import SendIcon from "@mui/icons-material/Send"; // Placeholder for Send
import AttachFileIcon from "@mui/icons-material/AttachFile"; // Placeholder for Attach
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress"; // For loading indicator
import Alert from "@mui/material/Alert"; // For error display
import RefreshIcon from "@mui/icons-material/Refresh"; // For regenerate title button

// Import components
import ApiKeyMissingDialog from "@/components/ApiKeyMissingDialog";
import { ChatSettingsDrawer } from "@/components/ChatSettingsDrawer";
import ChatHistoryDrawer from "@/components/ChatHistoryDrawer"; // Import History Drawer
import { ModelSelector } from "@/components/ModelSelector"; // Import ModelSelector

// Import Effector models
import {
  $messages,
  $messageText,
  messageSent,
  messageTextChanged,
  $isGenerating, // Import loading state
  $apiError, // Import error state
} from "@/model/chat";
import { loadSettings } from "@/model/settings"; // Import settings loader
import {
  $isSettingsDrawerOpen,
  openSettingsDrawer, // Keep for settings
  closeSettingsDrawer,
  toggleHistoryDrawer, // Import history toggle
  // $isHistoryDrawerOpen is used internally by the drawer component
} from "@/model/ui";
import { fetchModels } from "@/model/models"; // Import model fetch trigger
import {
  appStarted,
  newChatCreated,
  $currentChatSession,
  generateTitleFx,
} from "@/model/history"; // Import history events and stores
import { $apiKey } from "@/model/settings";

export default function Home() {
  // Connect to Effector units
  const [messages, messageText] = useUnit([$messages, $messageText]);
  const [handleMessageSent, handleMessageTextChanged] = useUnit([
    messageSent,
    messageTextChanged,
  ]);
  const [isSettingsOpen, handleOpenSettings, handleCloseSettings] = useUnit([
    $isSettingsDrawerOpen,
    openSettingsDrawer,
    closeSettingsDrawer,
  ]);
  const handleToggleHistoryDrawer = useUnit(toggleHistoryDrawer);
  const handleNewChat = useUnit(newChatCreated);
  // Trigger appStarted on mount
  const triggerAppStarted = useUnit(appStarted);

  const [currentChatSession, apiKey] = useUnit([$currentChatSession, $apiKey]);

  const handleRegenerateTitle = async () => {
    if (!currentChatSession || !apiKey) return;
    try {
      await generateTitleFx({
        chatId: currentChatSession.id,
        messages: currentChatSession.messages,
        apiKey,
      });
    } catch (error) {
      console.error("Manual title generation failed:", error);
    }
  };

  const [isGenerating, apiError] = useUnit([$isGenerating, $apiError]);
  // Note: The useEffect hook to load settings is placed later (lines 62-64)
  // to ensure it runs only once on mount.

  // Ref for scrolling to bottom
  const chatEndRef = React.useRef<null | HTMLDivElement>(null);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]); // Scroll when messages change

  // Load settings only once on initial mount
  // Load settings and models only once on initial mount
  React.useEffect(() => {
    loadSettings();
    fetchModels(); // Fetch models on load
    triggerAppStarted(); // Load history index on load
  }, []);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header Bar */}
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <HistoryIcon onClick={handleToggleHistoryDrawer} />{" "}
            {/* History Button */}
          </IconButton>
          {/* Model Selector - Takes up the central space */}
          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
            <ModelSelector />
          </Box>
          <IconButton
            size="large"
            color="inherit"
            aria-label="new chat"
            onClick={handleNewChat}
          >
            <AddCommentIcon /> {/* New Chat Button - Trigger newChatCreated */}
          </IconButton>
          <IconButton
            size="large"
            color="inherit"
            aria-label="regenerate title"
            onClick={handleRegenerateTitle}
            title="Regenerate Title"
          >
            <RefreshIcon />
          </IconButton>
          <IconButton
            size="large"
            edge="end"
            color="inherit"
            aria-label="settings"
            onClick={handleOpenSettings}
          >
            <SettingsIcon /> {/* Settings Button - Opens Drawer */}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Chat Window Area */}
      <Container
        maxWidth="md" // Or false to disable maxWidth
        sx={{
          flexGrow: 1,
          overflowY: "auto", // Make chat scrollable
          py: 2, // Padding top and bottom
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Messages Display */}
        <Paper
          elevation={0}
          sx={{
            flexGrow: 1,
            p: 2,
            backgroundColor: "transparent",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Stack spacing={2} sx={{ flexGrow: 1 }}>
            {messages.map((msg) => (
              <Paper
                key={msg.id}
                elevation={1}
                sx={{
                  p: 1.5,
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  backgroundColor:
                    msg.role === "user" ? "primary.light" : "primary",
                  maxWidth: "75%",
                  wordWrap: "break-word", // Ensure long words break
                }}
              >
                <Box sx={{ position: "relative" }}>
                  <Typography variant="body1">{msg.content}</Typography>
                  <Box
                    sx={{
                      position: "absolute",
                      top: 4,
                      right: msg.role === "user" ? 4 : "auto",
                      left: msg.role === "user" ? "auto" : 4,
                      display: "flex",
                      gap: 0.5,
                      opacity: 0,
                      transition: "opacity 0.2s",
                      "&:hover": { opacity: 1 },
                      pointerEvents: "auto",
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => navigator.clipboard.writeText(msg.content)}
                      title="Copy"
                    >
                      <svg width="16" height="16">
                        <path
                          fill="currentColor"
                          d="M3 2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V9h-1v4H4V4h4V3H3zm9-1h-3v1h2.293L8 6.293 8.707 7 13 2.707V5h1V1a1 1 0 0 0-1-1z"
                        />
                      </svg>
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const newContent = prompt("Edit message:", msg.content);
                        if (newContent !== null) {
                          import("@/model/chat").then(({ editMessage }) => {
                            editMessage({ messageId: msg.id, newContent });
                          });
                        }
                      }}
                      title="Edit"
                    >
                      <svg width="16" height="16">
                        <path
                          fill="currentColor"
                          d="M12.146 2.854a.5.5 0 0 1 .708 0l.292.292a.5.5 0 0 1 0 .708l-9 9L3 13l.146-.146 9-9zM2 12.5V14h1.5l.146-.146-1.5-1.5L2 12.5z"
                        />
                      </svg>
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        import("@/model/chat").then(({ deleteMessage }) => {
                          deleteMessage(msg.id);
                        });
                      }}
                      title="Delete"
                    >
                      <svg width="16" height="16">
                        <path
                          fill="currentColor"
                          d="M5.5 5a.5.5 0 0 1 .5.5V12a.5.5 0 0 1-1 0V5.5a.5.5 0 0 1 .5-.5zm2.5.5a.5.5 0 0 0-1 0V12a.5.5 0 0 0 1 0V5.5zm2 .5a.5.5 0 0 1 .5-.5V12a.5.5 0 0 1-1 0V5.5z"
                        />
                        <path
                          fill="currentColor"
                          d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1 0-2h3.086A1.5 1.5 0 0 1 7 1h2a1.5 1.5 0 0 1 1.414 1H13.5a1 1 0 0 1 1 1zm-3 1H4v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4zM5 2a.5.5 0 0 0-.5.5V3h7v-.5a.5.5 0 0 0-.5-.5h-6z"
                        />
                      </svg>
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        import("@/model/chat").then(({ retryMessage }) => {
                          retryMessage(msg.id);
                        });
                      }}
                      title="Retry"
                    >
                      <svg width="16" height="16">
                        <path
                          fill="currentColor"
                          d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 1 1 .908-.418A4 4 0 1 0 8 4v1.5a.5.5 0 0 1-1 0V3.5a.5.5 0 0 1 .5-.5H9a.5.5 0 0 1 0 1H8z"
                        />
                      </svg>
                    </IconButton>
                  </Box>
                </Box>
              </Paper>
            ))}
            <div ref={chatEndRef} /> {/* Invisible element to scroll to */}
          </Stack>
        </Paper>

        {/* API Error Display */}
        {apiError && (
          <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
            {apiError}
          </Alert>
        )}
      </Container>

      {/* Message Input Area */}
      <Paper
        square
        elevation={3}
        sx={{
          p: 2, // Padding
          display: "flex",
          alignItems: "center",
          gap: 1, // Spacing between items
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={5} // Limit vertical expansion
          variant="outlined"
          placeholder="Type your message..."
          sx={{ flexGrow: 1 }}
          value={messageText} // Bind value to store
          onChange={(e) => handleMessageTextChanged(e.target.value)} // Update store on change
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              // Send on Enter (but not Shift+Enter)
              e.preventDefault(); // Prevent newline
              if (!isGenerating) handleMessageSent(); // Prevent send while generating
            }
          }}
        />
        <IconButton color="primary" aria-label="attach file">
          <AttachFileIcon />
        </IconButton>
        <Box sx={{ position: "relative" }}>
          {" "}
          {/* Wrapper for loading indicator */}
          <IconButton
            color="primary"
            aria-label="send message"
            onClick={() => handleMessageSent()}
            disabled={messageText.trim().length === 0 || isGenerating} // Disable if empty or generating
          >
            <SendIcon />
          </IconButton>
          {isGenerating && (
            <CircularProgress
              size={24}
              sx={{
                color: "primary.main",
                position: "absolute",
                top: "50%",
                left: "50%",
                marginTop: "-12px", // Center vertically
                marginLeft: "-12px", // Center horizontally
              }}
            />
          )}
        </Box>
      </Paper>

      {/* Settings Drawer */}
      <ChatSettingsDrawer open={isSettingsOpen} onClose={handleCloseSettings} />

      {/* History Drawer */}
      <ChatHistoryDrawer />
      <ApiKeyMissingDialog />
    </Box>
  );
}
