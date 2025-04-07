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
import MessageItem from "@/components/MessageItem"; // Import MessageItem
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
} from "@/features/chat";
// import { editMessage } from "@/model/chat"; // Remove editMessage import
import { loadSettings } from "@/features/chat-settings"; // Import settings loader
import {
  $isSettingsDrawerOpen,
  openSettingsDrawer, // Keep for settings
  closeSettingsDrawer,
  toggleHistoryDrawer, // Import history toggle
  // $isHistoryDrawerOpen is used internally by the drawer component
} from "@/features/ui-state";
import { fetchModels } from "@/features/models-select"; // Import model fetch trigger
import {
  appStarted,
  newChatCreated,
  $currentChatSession,
  generateTitleFx,
} from "@/features/chat-history"; // Import history events and stores
import { $apiKey } from "@/features/chat-settings";

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
            <HistoryIcon onClick={handleToggleHistoryDrawer} />
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
          <Stack spacing={0} sx={{ flexGrow: 1 }}>
            {messages.map((msg) => (
              <MessageItem message={msg} key={msg.id} />
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
