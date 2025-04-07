"use client"; // Mark as client component for future interactivity

import * as React from "react";
import { useTheme, useMediaQuery } from "@mui/material";
import UnifiedBottomDrawer from "@/components/UnifiedBottomDrawer";
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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

  const chatEndRef = React.useRef<null | HTMLDivElement>(null);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  React.useEffect(() => {
    loadSettings();
    fetchModels();
    triggerAppStarted();
  }, []);

  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const [mobileTab, setMobileTab] = React.useState(0); // 0-history, 1-settings

  const openMobileDrawerFor = (tabIndex: number) => {
    setMobileTab(tabIndex);
    setMobileDrawerOpen(true);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={() => {
              if (isMobile) openMobileDrawerFor(0);
              else handleToggleHistoryDrawer();
            }}
          >
            <HistoryIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
            <ModelSelector />
          </Box>
          <IconButton
            size="large"
            color="inherit"
            aria-label="new chat"
            onClick={handleNewChat}
          >
            <AddCommentIcon />
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
            onClick={() => {
              if (isMobile) openMobileDrawerFor(1);
              else handleOpenSettings();
            }}
          >
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container
        maxWidth="md"
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          py: 2,
          display: "flex",
          flexDirection: "column",
        }}
      >
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
            <div ref={chatEndRef} />
          </Stack>
        </Paper>

        {apiError && (
          <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
            {apiError}
          </Alert>
        )}
      </Container>

      <Paper
        square
        elevation={3}
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={5}
          variant="outlined"
          placeholder="Type your message..."
          sx={{ flexGrow: 1 }}
          value={messageText}
          onChange={(e) => handleMessageTextChanged(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!isGenerating) handleMessageSent();
            }
          }}
        />
        <IconButton color="primary" aria-label="attach file">
          <AttachFileIcon />
        </IconButton>
        <Box sx={{ position: "relative" }}>
          <IconButton
            color="primary"
            aria-label="send message"
            onClick={() => handleMessageSent()}
            disabled={messageText.trim().length === 0 || isGenerating}
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
                marginTop: "-12px",
                marginLeft: "-12px",
              }}
            />
          )}
        </Box>
      </Paper>

      {isMobile ? (
        <UnifiedBottomDrawer
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
        >
          {/* tabs handled inside component, pass initial tab via prop if desired */}
        </UnifiedBottomDrawer>
      ) : (
        <>
          <ChatSettingsDrawer
            open={isSettingsOpen}
            onClose={handleCloseSettings}
          />
          <ChatHistoryDrawer />
        </>
      )}

      <ApiKeyMissingDialog />
    </Box>
  );
}
