"use client"; // Mark as client component for future interactivity

import * as React from "react";
import { useTheme, useMediaQuery } from "@mui/material";
import MobileUnifiedDrawer from "@/components/MobileUnifiedDrawer";
import { openMobileDrawer } from "@/features/ui-state/model";
import { useUnit } from "effector-react";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import HistoryIcon from "@mui/icons-material/History";
import SettingsIcon from "@mui/icons-material/Settings";
import AddCommentIcon from "@mui/icons-material/AddComment";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import RefreshIcon from "@mui/icons-material/Refresh";

// Import components
import MessageItem from "@/components/MessageItem";
import ApiKeyMissingDialog from "@/components/ApiKeyMissingDialog";
import Drawer from "@mui/material/Drawer";
import ChatHistoryContent from "@/components/ChatHistoryContent";
import ChatSettingsContent from "@/components/ChatSettingsContent";
import { ModelSelector } from "@/components/ModelSelector";

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
  closeHistoryDrawer,
  $isHistoryDrawerOpen,
} from "@/features/ui-state";
import { fetchModels } from "@/features/models-select"; // Import model fetch trigger
import {
  appStarted,
  newChatCreated,
  $currentChatSession,
  generateTitleFx,
  $chatHistoryIndex,
  $isLoadingHistory,
  chatSelected,
  deleteChat,
  chatTitleEdited,
  ChatHistoryIndex,
} from "@/features/chat-history"; // Import history events and stores
import {
  $apiKey,
  $temperature,
  $systemPrompt,
  apiKeyChanged,
  temperatureChanged,
  systemPromptChanged,
} from "@/features/chat-settings";
import { $currentChatTokens } from "@/features/chat";
import { generateTitle } from "@/features/chat-history/model";

export default function HomePage() {
  // Ref for scrolling to bottom
  const chatEndRef = React.useRef<null | HTMLDivElement>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [messages, messageText] = useUnit([$messages, $messageText]);
  const [isSettingsOpen, isHistoryOpen] = useUnit([
    $isSettingsDrawerOpen,
    $isHistoryDrawerOpen,
  ]);

  const [currentChatSession, apiKey] = useUnit([$currentChatSession, $apiKey]);

  const [isGenerating, apiError] = useUnit([$isGenerating, $apiError]);

  const [
    historyIndex,
    isLoadingHistory,
    selectChat,
    removeChat,
    currentChatId,
  ] = useUnit([
    $chatHistoryIndex,
    $isLoadingHistory,
    chatSelected,
    deleteChat,
    $currentChatSession.map((i) => i?.id ?? null),
  ]);

  const {
    apiKey: settingsApiKey,
    temperature,
    systemPrompt,
    currentChatTokens,
  } = useUnit({
    apiKey: $apiKey,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    currentChatTokens: $currentChatTokens,
  });

  const [historySearchTerm, setHistorySearchTerm] = React.useState("");
  const [editingHistoryId, setEditingHistoryId] = React.useState<string | null>(
    null
  );
  const [editedTitle, setEditedTitle] = React.useState("");

  const [showApiKey, setShowApiKey] = React.useState(false);

  const filteredHistory = React.useMemo(() => {
    if (!historySearchTerm) return historyIndex;
    return historyIndex.filter((i: ChatHistoryIndex) =>
      i.title.toLowerCase().includes(historySearchTerm.toLowerCase())
    );
  }, [historyIndex, historySearchTerm]);

  const clickHistory = () => {
    if (isMobile) {
      openMobileDrawer({ tab: "history" });
    } else {
      toggleHistoryDrawer();
    }
  };

  const clickSettings = () => {
    if (isMobile) {
      openMobileDrawer({ tab: "settings" });
    } else {
      openSettingsDrawer();
    }
  };

  const clickNewChat = () => newChatCreated();

  const clickRegenerateTitle = () => generateTitle();

  const handleStartEdit = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingHistoryId(id);
    setEditedTitle(title);
  };

  const handleSaveEdit = (id: string) => {
    chatTitleEdited({ id, newTitle: editedTitle.trim() });
    setEditingHistoryId(null);
  };

  const handleCancelEdit = () => {
    setEditingHistoryId(null);
  };

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeChat(id);
  };

  const handleSelectChat = (id: string) => {
    selectChat(id);
  };

  const handleClickShowApiKey = () => setShowApiKey((prev) => !prev);

  const handleMouseDownApiKey = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  const closeSettings = () => closeSettingsDrawer();

  const changeMessage = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => messageTextChanged(e.target.value);

  const keyDownMessage = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      messageSent();
    }
  };

  const clickSendMessage = () => messageSent();

  const historyPanelProps = {
    searchTerm: historySearchTerm,
    setSearchTerm: setHistorySearchTerm,
    isLoading: isLoadingHistory,
    filteredHistory,
    editingId: editingHistoryId,
    editedTitle,
    currentChatId,
    setEditedTitle,
    handleStartEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleDeleteChat,
    handleSelectChat,
  };

  const settingsPanelProps = {
    apiKey: settingsApiKey,
    showApiKey,
    temperature,
    systemPrompt,
    currentChatTokens,
    handleApiKeyChange: apiKeyChanged,
    handleTemperatureChange: temperatureChanged,
    handleSystemPromptChange: systemPromptChanged,
    handleClickShowApiKey,
    handleMouseDownApiKey,
  };

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]); // Scroll when messages change

  // Load settings and models only once on initial mount
  React.useEffect(() => {
    loadSettings();
    fetchModels();
    appStarted();
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
            aria-label="History"
            onClick={clickHistory}
            sx={{ mr: 2 }}
          >
            <HistoryIcon />
          </IconButton>
          {/* Model Selector - Takes up the central space */}
          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
            <ModelSelector />
          </Box>
          <IconButton
            size="large"
            color="inherit"
            aria-label="new chat"
            onClick={clickNewChat}
          >
            <AddCommentIcon /> {/* New Chat Button - Trigger newChatCreated */}
          </IconButton>
          <IconButton
            size="large"
            color="inherit"
            aria-label="regenerate title"
            onClick={clickRegenerateTitle}
            title="Regenerate Title"
          >
            <RefreshIcon />
          </IconButton>
          <IconButton
            size="large"
            edge="end"
            color="inherit"
            aria-label="settings"
            onClick={clickSettings}
          >
            <SettingsIcon /> {/* Settings Button */}
          </IconButton>
        </Toolbar>
        {/* Drawers */}
        {!isMobile && (
          <>
            <Drawer
              open={isHistoryOpen}
              onClose={() => closeHistoryDrawer()}
              anchor="left"
            >
              <ChatHistoryContent {...historyPanelProps} />
            </Drawer>
            <Drawer
              open={isSettingsOpen}
              onClose={closeSettings}
              anchor="right"
            >
              <ChatSettingsContent {...settingsPanelProps} />
            </Drawer>
          </>
        )}

        {isMobile && (
          <MobileUnifiedDrawer
            historyPanelProps={historyPanelProps}
            settingsPanelProps={settingsPanelProps}
          />
        )}
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
          onChange={changeMessage} // Update store on change
          onKeyDown={keyDownMessage} // Handle Enter key
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
            onClick={clickSendMessage}
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

      <ApiKeyMissingDialog />
    </Box>
  );
}
