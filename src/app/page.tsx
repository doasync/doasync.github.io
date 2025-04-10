"use client"; // Mark as client component for future interactivity

import * as React from "react";
import { showSnackbar } from "@/features/ui-state/snackbar";
import { $snackbar, hideSnackbar } from "@/features/ui-state/snackbar";
import { useMiniChatTextSelection } from "@/features/mini-chat/useTextSelection";
import { MiniChatToolbar } from "@/features/mini-chat/MiniChatToolbar";
import { MiniChatDialog } from "@/features/mini-chat/MiniChatDialog";
import { MiniChatFAB } from "@/features/mini-chat/MiniChatFAB"; // Import the FAB
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import UsageInfoDialog from "@/components/UsageInfoDialog";
import { refreshUsageInfo } from "@/features/usage-info/model";
import {
  useTheme,
  useMediaQuery,
  Snackbar,
  LinearProgress,
} from "@mui/material";
import MobileUnifiedDrawer from "@/components/MobileUnifiedDrawer";
import {
  $isMobileDrawerOpen,
  openMobileDrawer,
  $editingMessageId,
  openModelInfoAlert,
  closeMobileDrawer,
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
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"; // Import InfoOutlinedIcon
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
  $scrollTrigger, // Import explicit scroll trigger
  mainInputFocused, // Import the new event
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
const DRAWER_WIDTH = 300;

export default function HomePage() {
  useMiniChatTextSelection();
  // Ref for scrolling to bottom
  const chatEndRef = React.useRef<null | HTMLDivElement>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [messages, messageText] = useUnit([$messages, $messageText]);
  const lastMessage =
    messages.length > 0 ? messages[messages.length - 1] : null;

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
  const [usageDialogOpen, setUsageDialogOpen] = React.useState(false);
  const [editingHistoryId, setEditingHistoryId] = React.useState<string | null>(
    null
  );
  const [editedTitle, setEditedTitle] = React.useState("");

  const [showApiKey, setShowApiKey] = React.useState(false);
  const snackbar = useUnit($snackbar);

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
    if (isMobile) {
      closeMobileDrawer();
    }
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
      // Scroll to the editing message
      const element = document.getElementById(editingMessageId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      console.log("Editing message, not sending new one");
      showSnackbar({
        message: "Finish editing before sending a new message.",
        severity: "warning",
      });
      return; // Stop further processing
    }

    const isInputEmpty = messageText.trim().length === 0;
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
      setPreventScroll(false);
    }
  }, [preventScroll]); // Only run when preventScroll changes

  const preventScrollFlag = useUnit($preventScroll);
  const scrollTrigger = useUnit($scrollTrigger);

  React.useEffect(() => {
    if (!preventScrollFlag) {
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [lastMessage, scrollTrigger, preventScrollFlag]); // Depend on explicit scroll trigger and flag

  // Remove the old effect that depended on scrollToLastMessageNeeded

  React.useEffect(() => {
    loadSettings();
    fetchModels();
    appStarted(); // Trigger app started event
  }, []);

  return (
    <Box sx={{ height: "100vh", overflow: "hidden", fontSize: 20 }}>
      {" "}
      {/* Ensure outermost Box has height */}
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={(theme) => {
          // Add theme access for transitions and spacing
          const isLeftOpen = !isMobile && isHistoryPersistentOpen;
          const isRightOpen = !isMobile && isSettingsPersistentOpen;
          let targetWidth = "100%";
          let targetMarginLeft = "0px"; // Use string '0px' for consistency
          let targetMarginRight = "0px"; // Use string '0px' for consistency
          // Default transition (when drawers are closing)
          let transitionProps = {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          };

          // Calculate width and margins based on open drawers
          if (isLeftOpen && isRightOpen) {
            targetWidth = `calc(100% - ${DRAWER_WIDTH * 2}px)`;
            targetMarginLeft = `${DRAWER_WIDTH}px`;
            targetMarginRight = `${DRAWER_WIDTH}px`;
            // Use 'entering' transition when any drawer is open/opening
            transitionProps = {
              easing: theme.transitions.easing.easeOut,
              duration: theme.transitions.duration.enteringScreen,
            };
          } else if (isLeftOpen) {
            targetWidth = `calc(100% - ${DRAWER_WIDTH}px)`;
            targetMarginLeft = `${DRAWER_WIDTH}px`;
            targetMarginRight = "0px";
            transitionProps = {
              easing: theme.transitions.easing.easeOut,
              duration: theme.transitions.duration.enteringScreen,
            };
          } else if (isRightOpen) {
            targetWidth = `calc(100% - ${DRAWER_WIDTH}px)`;
            targetMarginLeft = "0px";
            targetMarginRight = `${DRAWER_WIDTH}px`;
            transitionProps = {
              easing: theme.transitions.easing.easeOut,
              duration: theme.transitions.duration.enteringScreen,
            };
          }
          // Apply calculated styles and transition
          return {
            width: targetWidth,
            marginLeft: targetMarginLeft,
            marginRight: targetMarginRight,
            transition: theme.transitions.create(
              ["margin", "width"],
              transitionProps
            ),
          };
        }}
      >
        <Toolbar
          variant="dense"
          disableGutters
          sx={{
            px: 1,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          {/* Conditionally render History Button */}
          {(!isHistoryPersistentOpen || isMobile) && (
            <IconButton
              color="inherit"
              aria-label="History"
              onClick={clickHistory}
            >
              <SubjectIcon />
            </IconButton>
          )}
          {(!isHistoryPersistentOpen || isMobile) && (
            <IconButton
              size="small"
              color="inherit"
              aria-label="New chat"
              onClick={clickNewChat}
            >
              <AddCircleIcon />
            </IconButton>
          )}
          {/* End Moved New Chat Button */}
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <ModelSelector />
          </Box>
          {!isMobile && (
            <IconButton
              color="inherit"
              aria-label="usage info"
              onClick={() => {
                refreshUsageInfo();
                setUsageDialogOpen(true);
              }}
            >
              <QueryStatsIcon />
            </IconButton>
          )}
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
              size="small"
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
              marginLeft: `${DRAWER_WIDTH}px`, // Add left margin when history open
              transition: theme.transitions.create("margin", {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }),
          ...(isSettingsPersistentOpen &&
            !isMobile && {
              marginRight: `${DRAWER_WIDTH}px`, // Add right margin when settings open
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
        {/* Scrollable Area for Chat Messages */}
        {/* Ensure overflowY is 'auto' or 'scroll', NOT 'hidden' */}
        <Box
          sx={{
            flexGrow: 1, // Takes remaining vertical space
            overflowY: "auto", // Allows vertical scrolling, crucial for FAB visibility if content is long
            // overflowX: 'hidden', // Optional: hide horizontal scrollbar if needed
            display: "flex", // Use flexbox to easily center the container
            flexDirection: "column", // Stack items vertically
            alignItems: "center", // Center items horizontally
            width: "100%",
            p: isMobile ? 1 : 2, // Add horizontal padding
            pt: isMobile ? 2 : 3,
            position: "relative", // Necessary for absolute positioning of children (FAB)
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
            open={snackbar.open}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
            sx={(theme) => {
              const top = Number(theme.mixins.toolbar.minHeight) + 8;
              return { top: `${top}px !important` };
            }}
          >
            <Alert
              variant="filled"
              onClose={() => hideSnackbar()}
              severity={snackbar.severity}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
          {/* End Centering Container */}
          {/* Render the FAB inside the scrollable area */}
          <MiniChatFAB />
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
        <LinearProgress
          color="secondary"
          sx={{
            top: 1,
            poosition: "absolute",
            width: "100%",
            height: "1px",
            visibility: isGenerating ? "visible" : "hidden",
          }}
        />
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
            <IconButton
              sx={{ mx: -0.5 }}
              color="primary"
              aria-label="attach file"
              disabled
            >
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
              slotProps={{ input: { sx: { fontSize: 22, py: 1 } } }}
              value={messageText}
              onChange={changeMessage}
              onFocus={() => mainInputFocused(true)} // Trigger event on focus
              onBlur={() => mainInputFocused(false)} // Trigger event on blur
            />
            <Box>
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
                    aria-label="Generate" // Updated tooltip
                    onClick={handleSendButtonClick} // Use updated handler
                    disabled={isDisabled} // Use new disabled logic
                    sx={{
                      mx: -0.5,
                      color: "primary.light",
                    }}
                  >
                    <AutoAwesomeIcon /> {/* Use new icon */}
                  </IconButton>
                );
              })()}
            </Box>
          </Box>{" "}
          {/* End Input Paper */}
          {/* End Input Centering Container */}
        </Paper>{" "}
        {/* End Input Area Wrapper Box */}
        <ApiKeyMissingDialog />
      </Box>{" "}
      {/* End Main Content Box */}
      <UsageInfoDialog
        open={usageDialogOpen}
        onClose={() => setUsageDialogOpen(false)}
      />
      {/* Desktop Drawers */}
      {!isMobile && (
        <Drawer
          variant="persistent"
          open={isHistoryPersistentOpen}
          anchor="left"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
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
            width: DRAWER_WIDTH,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
            },
          }}
        >
          <ChatSettingsContent {...settingsPanelProps} />
        </Drawer>
      )}
      {/* Mobile Drawer (Temporary/Modal) */}
      {isMobile && (
        <MobileUnifiedDrawer
          historyPanelProps={historyPanelProps}
          settingsPanelProps={settingsPanelProps}
          modelInfo={selectedModel}
        />
      )}
      {!!selectedModel && <ModelInfoAlert model={selectedModel} />}
      <MiniChatToolbar />
      <MiniChatDialog />
      {/* <MiniChatFAB /> FAB is now rendered inside the scrollable area */}
    </Box> // End Outermost Box
  );
}
