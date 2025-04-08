"use client"; // Mark as client component for future interactivity

import * as React from "react";
import { useTheme, useMediaQuery } from "@mui/material";
import MobileUnifiedDrawer from "@/components/MobileUnifiedDrawer";
import { openMobileDrawer } from "@/features/ui-state";
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
import {
  $selectedModelId,
  $availableModels,
  ModelInfo,
} from "@/features/models-select";

// Import Effector models
import {
  $messages,
  $messageText,
  messageSent,
  messageTextChanged,
  $isGenerating, // Import loading state
  $apiError, // Import error state
  $preventScroll, // Import scroll prevention state
  setPreventScroll,
} from "@/features/chat";
// import { editMessage } from "@/model/chat"; // Remove editMessage import
import { loadSettings } from "@/features/chat-settings"; // Import settings loader
import {
  // $isSettingsDrawerOpen, // Use persistent store instead for desktop
  openSettingsDrawer, // Keep for mobile?
  closeSettingsDrawer,
  toggleHistoryDrawer, // Use for persistent toggle
  closeHistoryDrawer,
  // $isHistoryDrawerOpen, // Use persistent store instead for desktop
  $isHistoryDrawerPersistentOpen, // Import persistent state
  $isSettingsDrawerPersistentOpen, // Import persistent state
  toggleSettingsDrawer, // Import settings toggle// Import scroll prevention event
} from "@/features/ui-state";
import { fetchModels } from "@/features/models-select"; // Import model fetch trigger
import {
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
import { appStarted } from "@/app"; // Import app started event
import {
  $apiKey,
  $temperature,
  $systemPrompt,
  apiKeyChanged,
  temperatureChanged,
  systemPromptChanged,
} from "@/features/chat-settings";
import { $currentChatTokens } from "@/features/chat";
import { generateTitle } from "@/features/chat-history";

// Define drawer widths (adjust as needed)
const HISTORY_DRAWER_WIDTH = 280;
const SETTINGS_DRAWER_WIDTH = 320;

export default function HomePage() {
  // Ref for scrolling to bottom
  const chatEndRef = React.useRef<null | HTMLDivElement>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [messages, messageText] = useUnit([$messages, $messageText]);
  // Use persistent state for desktop drawers
  const [isHistoryPersistentOpen, isSettingsPersistentOpen] = useUnit([
    $isHistoryDrawerPersistentOpen,
    $isSettingsDrawerPersistentOpen,
  ]);
  // Removed useUnit for $isSettingsDrawerOpen and $isHistoryDrawerOpen as they are not used here
  // If mobile logic needs separate state, it should be handled within MobileUnifiedDrawer or via different stores.

  const [currentChatSession, apiKey] = useUnit([$currentChatSession, $apiKey]);

  const [isGenerating, apiError] = useUnit([$isGenerating, $apiError]);
  const preventScroll = useUnit($preventScroll); // Get scroll prevention state

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
      toggleSettingsDrawer(); // Use toggle for persistent drawer
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

  const [selectedModelId, models] = useUnit([
    $selectedModelId,
    $availableModels,
  ]) as [string, ModelInfo[]];

  const selectedModel = React.useMemo(() => {
    return models.find((m) => m.id === selectedModelId);
  }, [models, selectedModelId]);

  React.useEffect(() => {
    const shouldScroll = !preventScroll; // Check the flag
    if (shouldScroll) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    // Reset the flag if it was true (primarily for the edit case)
    if (preventScroll) {
      setPreventScroll(false);
    }
  }, [messages, preventScroll]); // Add preventScroll to dependencies

  React.useEffect(() => {
    loadSettings();
    fetchModels();
    appStarted();
  }, []);

  return (
    <Box sx={{ display: "flex" }}>
      {" "}
      {/* Outer box for potential drawer spacing */}
      {/* Main Content Area Wrapper */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          transition: theme.transitions.create(["margin", "width"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginLeft: `-${HISTORY_DRAWER_WIDTH}px`, // Start shifted left
          marginRight: 0, // Start with no right margin shift
          ...(isHistoryPersistentOpen &&
            !isMobile && {
              transition: theme.transitions.create(["margin", "width"], {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
              }),
              marginLeft: 0, // Shift back to 0 when open
            }),
          ...(isSettingsPersistentOpen &&
            !isMobile && {
              transition: theme.transitions.create(["margin", "width"], {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
              }),
              marginRight: `${SETTINGS_DRAWER_WIDTH}px`, // Add right margin when open
            }),
        }}
      >
        <AppBar position="static">
          <Toolbar>
            {/* Conditionally render History Button */}
            {!isHistoryPersistentOpen && !isMobile && (
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
            )}
            {/* Render History Button always on mobile */}
            {isMobile && (
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
            )}
            {/* Moved New Chat Button Here */}
            <IconButton
              size="large"
              color="inherit"
              aria-label="new chat"
              onClick={clickNewChat}
              sx={{ ml: 1 }} // Added margin-left for spacing
            >
              <AddCommentIcon />
            </IconButton>
            {/* End Moved New Chat Button */}
            <Box
              sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}
            >
              <ModelSelector />
            </Box>
            {/* Removed New Chat Button from original position */}
            {/* <IconButton
              size="large"
              color="inherit"
              aria-label="new chat"
              onClick={clickNewChat}
            >
              <AddCommentIcon />
            </IconButton> */}
            <IconButton
              size="large"
              color="inherit"
              aria-label="regenerate title"
              onClick={clickRegenerateTitle}
              title="Regenerate Title"
            >
              <RefreshIcon />
            </IconButton>
            {/* Conditionally render Settings Button */}
            {!isSettingsPersistentOpen && !isMobile && (
              <IconButton
                size="large"
                edge="end"
                color="inherit"
                aria-label="settings"
                onClick={clickSettings}
              >
                <SettingsIcon />
              </IconButton>
            )}
            {/* Render Settings Button always on mobile */}
            {isMobile && (
              <IconButton
                size="large"
                edge="end"
                color="inherit"
                aria-label="settings"
                onClick={clickSettings}
              >
                <SettingsIcon />
              </IconButton>
            )}
          </Toolbar>
          {!isMobile && (
            <>
              <Drawer
                variant="persistent" // Change variant
                open={isHistoryPersistentOpen} // Use persistent state
                // onClose={() => closeHistoryDrawer()} // onClose might not be needed for persistent
                anchor="left"
                sx={{
                  width: HISTORY_DRAWER_WIDTH,
                  flexShrink: 0,
                  "& .MuiDrawer-paper": {
                    width: HISTORY_DRAWER_WIDTH,
                    boxSizing: "border-box",
                  },
                }}
              >
                <ChatHistoryContent {...historyPanelProps} />
              </Drawer>
              <Drawer
                variant="persistent" // Change variant
                open={isSettingsPersistentOpen} // Use persistent state
                // onClose={closeSettings} // onClose might not be needed for persistent
                anchor="right"
                sx={{
                  width: SETTINGS_DRAWER_WIDTH,
                  flexShrink: 0,
                  "& .MuiDrawer-paper": {
                    width: SETTINGS_DRAWER_WIDTH,
                    boxSizing: "border-box",
                  },
                }}
              >
                <ChatSettingsContent {...settingsPanelProps} />
              </Drawer>
            </>
          )}

          {isMobile && (
            <MobileUnifiedDrawer
              historyPanelProps={historyPanelProps}
              settingsPanelProps={settingsPanelProps}
              modelInfo={selectedModel}
            />
          )}
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
            onChange={changeMessage}
            onKeyDown={keyDownMessage}
          />
          <IconButton color="primary" aria-label="attach file">
            <AttachFileIcon />
          </IconButton>
          <Box sx={{ position: "relative" }}>
            <IconButton
              color="primary"
              aria-label="send message"
              onClick={clickSendMessage}
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

        <ApiKeyMissingDialog />
        {/* This closing Box tag corresponds to the component="main" Box */}
      </Box>
      {/* This closing Box tag corresponds to the outermost flex Box */}
    </Box>
  );
}
