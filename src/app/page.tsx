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
  scrollToBottomNeeded, // Import the new scroll trigger event
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
  // appStarted, // Moved to app/model
} from "@/features/chat-history"; // Import history events and stores
import { appStarted } from "@/app"; // Correct import path
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

  const closeSettings = () => closeSettingsDrawer(); // Still needed for mobile?

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

  // Effect to reset preventScroll flag after edit/retry potentially caused it to be true
  React.useEffect(() => {
    if (preventScroll) {
      // Use a small timeout to ensure this runs after other updates potentially triggered by the same action
      const timer = setTimeout(() => {
        setPreventScroll(false);
      }, 0);
      return () => clearTimeout(timer); // Cleanup timeout on unmount or if preventScroll changes again
    }
  }, [preventScroll]); // Only run when preventScroll changes

  // Effect to scroll to bottom ONLY when the specific event is triggered
  useUnit(scrollToBottomNeeded).watch(() => {
    // We don't need to check preventScroll here, as scrollToBottomNeeded should only fire
    // when scrolling is actually desired (i.e., after a new user message).
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  React.useEffect(() => {
    loadSettings();
    fetchModels();
    appStarted(); // Trigger app started event
  }, []);

  return (
    <Box sx={{ display: "flex" }}>
      {/* AppBar */}
      <AppBar
        position="fixed" // Make AppBar fixed
        sx={{
          zIndex: theme.zIndex.drawer + 1, // Ensure AppBar is above drawers
          transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(isHistoryPersistentOpen &&
            !isMobile && {
              width: `calc(100% - ${HISTORY_DRAWER_WIDTH}px)`,
              marginLeft: `${HISTORY_DRAWER_WIDTH}px`,
              transition: theme.transitions.create(["width", "margin"], {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }),
          ...(isSettingsPersistentOpen &&
            !isMobile && {
              // Adjust width only if history is closed, otherwise handled below
              ...(!isHistoryPersistentOpen && {
                width: `calc(100% - ${SETTINGS_DRAWER_WIDTH}px)`,
              }),
              marginRight: `${SETTINGS_DRAWER_WIDTH}px`, // Add margin for right drawer
              transition: theme.transitions.create(["width", "margin"], {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }),
          ...(isHistoryPersistentOpen &&
            isSettingsPersistentOpen &&
            !isMobile && {
              width: `calc(100% - ${HISTORY_DRAWER_WIDTH}px - ${SETTINGS_DRAWER_WIDTH}px)`, // Adjust width for both drawers
              marginLeft: `${HISTORY_DRAWER_WIDTH}px`,
              marginRight: `${SETTINGS_DRAWER_WIDTH}px`,
            }),
        }}
      >
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
          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
            <ModelSelector />
          </Box>
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
      </AppBar>
      {/* Desktop Drawers (Persistent) */}
      {!isMobile && (
        <>
          <Drawer
            variant="persistent"
            open={isHistoryPersistentOpen}
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
            {/* Add Toolbar spacer to push content below AppBar */}
            <Toolbar />
            <Box sx={{ overflow: "auto" }}>
              {" "}
              {/* Make drawer content scrollable if needed */}
              <ChatHistoryContent {...historyPanelProps} />
            </Box>
          </Drawer>
          <Drawer
            variant="persistent"
            open={isSettingsPersistentOpen}
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
            {/* Add Toolbar spacer */}
            <Toolbar />
            <Box sx={{ overflow: "auto" }}>
              {" "}
              {/* Make drawer content scrollable if needed */}
              <ChatSettingsContent {...settingsPanelProps} />
            </Box>
          </Drawer>
        </>
      )}
      {/* Main Content Area Wrapper */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          // Adjust transitions and margins for main content
          transition: theme.transitions.create("margin", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginLeft: 0, // Start at 0
          marginRight: 0, // Start at 0
          ...(isHistoryPersistentOpen &&
            !isMobile && {
              marginLeft: `${HISTORY_DRAWER_WIDTH}px`, // Add left margin when history open
              transition: theme.transitions.create("margin", {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }),
          ...(isSettingsPersistentOpen &&
            !isMobile && {
              marginRight: `${SETTINGS_DRAWER_WIDTH}px`, // Add right margin when settings open
              transition: theme.transitions.create("margin", {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }),
          // Ensure content below AppBar starts correctly
          mt: "64px", // Adjust based on AppBar height (default is 64px)
          height: "calc(100vh - 64px)", // Adjust height calculation
          overflow: "hidden", // Prevent main box itself from scrolling
        }}
      >
        {/* Container for Chat Messages */}
        <Container
          maxWidth="md" // Keep container constraints
          sx={{
            flexGrow: 1, // Takes remaining space
            overflowY: "auto", // Make the container scrollable
            py: 2,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Paper for message list background/padding */}
          <Paper
            elevation={0}
            sx={{
              flexGrow: 1,
              p: 2,
              backgroundColor: "transparent", // Or theme background
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

        {/* Input Area */}
        <Paper
          square
          elevation={3}
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            // Ensure input stays at bottom
            mt: "auto",
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
      </Box>{" "}
      {/* End Main Content Box */}
      {/* Mobile Drawer (Temporary/Modal) */}
      {isMobile && (
        <MobileUnifiedDrawer
          historyPanelProps={historyPanelProps}
          settingsPanelProps={settingsPanelProps}
          modelInfo={selectedModel}
        />
      )}
    </Box> // End Outermost Box
  );
}
