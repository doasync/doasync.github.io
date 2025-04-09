"use client"; // Mark as client component for future interactivity

import * as React from "react";
import { useTheme, useMediaQuery, Snackbar } from "@mui/material";
import MobileUnifiedDrawer from "@/components/MobileUnifiedDrawer";
import {
  $isMobileDrawerOpen,
  openMobileDrawer,
  $editingMessageId,
} from "@/features/ui-state";
import { useUnit } from "effector-react";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import SubjectIcon from "@mui/icons-material/Subject";
import SettingsIcon from "@mui/icons-material/Settings";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import SendIcon from "@mui/icons-material/Send"; // Keep for reference if needed, but we'll use AutoAwesome
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"; // Import the new icon
import AttachFileIcon from "@mui/icons-material/AttachFile";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import RefreshIcon from "@mui/icons-material/Refresh";
import type { SnackbarCloseReason } from "@mui/material/Snackbar";
import { generateResponseClicked } from "@/features/chat";

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
  setPreventScroll, // Import scroll prevention setter
  // scrollToBottomNeeded, // No longer needed
  // scrollToLastMessageNeeded, // No longer needed
  // $scrollTrigger, // No longer needed
  // Removed duplicate setPreventScroll import
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
import ModelInfoAlert from "@/components/ModelInfoAlert";

// Define drawer widths (adjust as needed)
const HISTORY_DRAWER_WIDTH = 300;
const SETTINGS_DRAWER_WIDTH = 300;

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

  const editingMessageId = useUnit($editingMessageId);
  const [isGenerating, apiError] = useUnit([$isGenerating, $apiError]);
  const preventScroll = useUnit($preventScroll); // Get scroll prevention state
  const isMobileDrawerOpen = useUnit($isMobileDrawerOpen); // Get scroll prevention state

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
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState("");
  const handleSnackbarClose = (
    event?: React.SyntheticEvent | Event,
    reason?: SnackbarCloseReason
  ) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

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

  const handleSendButtonClick = () => {
    if (editingMessageId !== null) {
      // Existing logic to prevent sending while editing
      const element = document.getElementById(editingMessageId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setSnackbarMessage("Finish editing before sending a new message.");
      setSnackbarOpen(true);
      return; // Stop further processing
    }

    const isInputEmpty = messageText.trim().length === 0;
    const lastMessage =
      messages.length > 0 ? messages[messages.length - 1] : null;
    const isLastMessageUser = lastMessage?.role === "user";

    if (!isInputEmpty) {
      // Case 3 & 4: Input has text, send it as a new message
      if (!isGenerating) {
        messageSent();
      }
    } else {
      // Input is empty
      // Case 2: Input empty, last message was user -> Generate new response
      if (isLastMessageUser && !isGenerating) {
        generateResponseClicked(); // Trigger the new event
      }
      // Case 1: Input empty, last message was assistant -> Button is disabled, do nothing onClick
    }
  };

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

  // Effect to scroll to bottom whenever messages change, unless prevented
  const preventScrollFlag = useUnit($preventScroll);
  // Directly use 'messages' from the useUnit call earlier (line 110)

  React.useEffect(() => {
    // Only scroll if the flag is not set
    if (!preventScrollFlag) {
      // Optional: Add a small delay to ensure rendering is complete, especially after complex updates
      const timer = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50); // 50ms delay, adjust if needed
      return () => clearTimeout(timer); // Cleanup timeout
    }
  }, [messages, preventScrollFlag]); // Depend on messages and the flag

  // Remove the old effect that depended on scrollToLastMessageNeeded

  React.useEffect(() => {
    loadSettings();
    fetchModels();
    appStarted(); // Trigger app started event
  }, []);

  return (
    <Box sx={{ height: "100vh" }}>
      {" "}
      {/* Ensure outermost Box has height */}
      {/* AppBar */}
      <AppBar position="fixed">
        <Toolbar variant="dense" disableGutters sx={{ px: 1 }}>
          {/* Conditionally render History Button */}
          {!isHistoryPersistentOpen && !isMobile && (
            <IconButton
              color="inherit"
              aria-label="History"
              onClick={clickHistory}
            >
              <SubjectIcon />
            </IconButton>
          )}
          {/* Render History Button always on mobile */}
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="History"
              onClick={clickHistory}
            >
              <SubjectIcon />
            </IconButton>
          )}
          {!isHistoryPersistentOpen && (
            <IconButton
              color="inherit"
              aria-label="New chat"
              onClick={clickNewChat}
            >
              <AddCircleIcon />
            </IconButton>
          )}
          {/* End Moved New Chat Button */}
          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
            <ModelSelector />
          </Box>
          {/* Conditionally render Settings Button */}
          {!isSettingsPersistentOpen && !isMobile && (
            <IconButton
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
      {/* Desktop Drawers */}
      {!isMobile && (
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
          <Box sx={{ overflow: "auto" }}>
            {/* Make drawer content scrollable if needed */}
            <ChatHistoryContent {...historyPanelProps} />
          </Box>
        </Drawer>
      )}
      {!isMobile && (
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
          <ChatSettingsContent {...settingsPanelProps} />
        </Drawer>
      )}
      {/* Main Content Area Wrapper */}
      <Box
        component="main"
        sx={(theme) => ({
          // Use theme callback for consistency
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          height: "100vh", // Occupy full viewport height
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
          pt: `${Number(theme.mixins.toolbar.minHeight) - 16}px`, // Use theme value for AppBar height
          pb: 0, // Remove potential bottom padding if any
          boxSizing: "border-box", // Include padding in height calculation
        })}
      >
        {/* Scrollable Area for Chat Messages */}
        <Box
          sx={{
            flexGrow: 1, // Takes remaining vertical space
            overflowY: "auto", // Make THIS BOX scrollable
            display: "flex", // Use flexbox to easily center the container
            flexDirection: "column", // Stack items vertically
            alignItems: "center", // Center items horizontally
            width: "100%",
            p: isMobile ? 1 : 2, // Add horizontal padding
            pt: isMobile ? 2 : 3,
            position: "relative",
          }}
        >
          {/* Inner container for centering message content */}
          <Container
            maxWidth="md" // Apply centering constraint here
            disableGutters // Remove default container padding, handled by outer Box
            sx={{
              display: "flex", // Use flex to make paper grow
              flexDirection: "column",
              flexGrow: 1, // Allow vertical growth within scrollable area
              width: "100%", // Ensure it uses the full width provided by parent Box
            }}
          >
            {/* Paper for message list background/padding - optional */}
            <Paper
              elevation={0}
              sx={{
                backgroundColor: "transparent", // Or theme background
                display: "flex",
                flexDirection: "column",
                width: "100%", // Take full width of the Container
                alignItems: "center", // Center items horizontally
              }}
            >
              <Stack
                alignItems="center"
                // spacing={0.5}
                sx={{
                  alignItems: "stretch", // Align items to stretch full width
                  width: "100%",
                }}
              >
                {messages.map((msg) => (
                  <MessageItem message={msg} key={msg.id} />
                ))}
                <div ref={chatEndRef} />
              </Stack>
            </Paper>{" "}
            {/* End Message List Paper */}
          </Container>{" "}
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={2000}
            onClose={handleSnackbarClose}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
            sx={(theme) => {
              // Adjust based on AppBar height
              const top = Number(theme.mixins.toolbar.minHeight) + 8;
              return {
                top: `${top}px !important`, // Use important
              };
            }}
          >
            <Alert onClose={handleSnackbarClose} severity="warning">
              {snackbarMessage}
            </Alert>
          </Snackbar>
          {/* End Centering Container */}
        </Box>{" "}
        {/* End Scrollable Area Box */}
        {/* apiError Alert - Placed outside scrollable area but inside main content */}
        {apiError && (
          <Container maxWidth="md" sx={{ px: isMobile ? 1 : 2, width: "100%" }}>
            <Alert severity="error" sx={{ mt: 1, mb: 1, width: "100%" }}>
              {apiError}
            </Alert>
          </Container>
        )}
        {/* Input Area Wrapper - Sticks to the bottom */}
        <Paper
          square
          sx={{
            mt: "auto",
            width: "100%",
            backgroundColor: "background.paper",
            flexShrink: 0,
            borderTop: 1,
            borderColor: "divider",
            p: 1,
          }}
        >
          {" "}
          {/* Added flexShrink */}
          {/* Centering Container for Input */}
          <Box
            maxWidth="md"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              width: "100%", // Ensure paper takes full width of container
            }}
          >
            <IconButton color="primary" aria-label="attach file" disabled>
              {" "}
              {/* Disabled Attach for now */}
              <AttachFileIcon />
            </IconButton>
            <TextField
              fullWidth
              multiline
              maxRows={5}
              variant="outlined"
              placeholder="Type your message..."
              sx={{ flexGrow: 1 }}
              value={messageText}
              onChange={changeMessage}
            />
            <Box sx={{ position: "relative" }}>
              {/* Calculate disabled state based on new logic */}
              {(() => {
                const isInputEmpty = messageText.trim().length === 0;
                const lastMessage =
                  messages.length > 0 ? messages[messages.length - 1] : null;
                const isLastMessageUser = lastMessage?.role === "user";
                // Disable if generating OR (input is empty AND last message was NOT user)
                const isDisabled =
                  isGenerating || (isInputEmpty && !isLastMessageUser);

                return (
                  <IconButton
                    size="small"
                    aria-label="Generate" // Updated tooltip
                    onClick={handleSendButtonClick} // Use updated handler
                    disabled={isDisabled} // Use new disabled logic
                    sx={{
                      color: "primary.light",
                    }}
                  >
                    <AutoAwesomeIcon fontSize="large" /> {/* Use new icon */}
                  </IconButton>
                );
              })()}
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
          </Box>{" "}
          {/* End Input Paper */}
          {/* End Input Centering Container */}
        </Paper>{" "}
        {/* End Input Area Wrapper Box */}
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
      {!!selectedModel && <ModelInfoAlert model={selectedModel} />}
    </Box> // End Outermost Box
  );
}
