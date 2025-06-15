'use client';

// Mark as client component for future interactivity

import AddCircleIcon from '@mui/icons-material/AddCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import SettingsIcon from '@mui/icons-material/Settings';
import StopIcon from '@mui/icons-material/Stop'; // Use standard Stop icon
import SubjectIcon from '@mui/icons-material/Subject';
import {
  LinearProgress,
  Snackbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import { useUnit } from 'effector-react';
import * as React from 'react';

import { appStarted } from '@/app'; // Correct import path
// Import Effector models
import {
  $apiError, // Import error state
  $currentChatTokens,
  $isGenerating, // Import loading state
  $messages,
  $messageText,
  $preventScroll, // Import scroll prevention state
  $scrollTrigger, // Import explicit scroll trigger
  generateResponseClicked,
  mainInputFocused,
  messageSent,
  messageTextChanged,
  setPreventScroll, // Import scroll prevention setter
  stopGenerationClicked, // Import the cancellation event
} from '@/features/chat';
import { AttachmentMenu } from '@/features/chat/components/attachment-menu';
// Import components
import { MessageItem } from '@/features/chat/components/message-item';
import {
  $chatHistoryIndex,
  $currentChatSession,
  $isLoadingHistory,
  ChatHistoryIndex,
  chatSelected,
  chatTitleEdited,
  deleteChat,
  generateTitle,
  newChatCreated,
  // appStarted, // Moved to app/model
} from '@/features/chat-history'; // Import history events and stores
import { ChatHistoryContent } from '@/features/chat-history/components/chat-history-content';
// import { editMessage } from "@/model/chat"; // Remove editMessage import
import {
  $apiKey,
  $providerApiUrl,
  $systemPrompt,
  $temperature,
  apiKeyChanged,
  loadSettings,
  providerApiUrlChanged,
  systemPromptChanged,
  temperatureChanged,
} from '@/features/chat-settings'; // Import settings loader
import { ApiKeyMissingDialog } from '@/features/chat-settings/components/api-key-missing-dialog';
import { ChatSettingsContent } from '@/features/chat-settings/components/chat-settings-content';
import { dialogOpened as openImageGenerationDialog } from '@/features/image-generation';
import { ImageGenerationDialog } from '@/features/image-generation/components/image-generation-dialog';
import {
  MiniChatDialog,
  MiniChatFAB,
  MiniChatToolbar,
  useMiniChatTextSelection,
} from '@/features/mini-chat';
import {
  $availableModels,
  $selectedModelId,
  fetchModels,
} from '@/features/models-select'; // Import model fetch trigger
import { ModelInfoAlert } from '@/features/models-select/components/model-info-alert';
import { ModelSelector } from '@/features/models-select/components/model-selector';
import { TranscriptionDialog } from '@/features/speech-to-text/components/transcription-dialog';
import { TTSDialog } from '@/features/text-to-speech/components/tts-dialog';
import { MobileUnifiedDrawer } from '@/features/ui-layout/components/mobile-unified-drawer';
import {
  $editingMessageId,
  // $isHistoryDrawerOpen, // Use persistent store instead for desktop
  $isHistoryDrawerPersistentOpen, // Import persistent state
  $isMobileDrawerOpen,
  $isSettingsDrawerPersistentOpen, // Import persistent state
  closeMobileDrawer,
  // $isSettingsDrawerOpen, // Use persistent store instead for desktop
  closeSettingsDrawer,
  openMobileDrawer,
  toggleHistoryDrawer, // Use for persistent toggle
  toggleSettingsDrawer, // Import settings toggle// Import scroll prevention event
} from '@/features/ui-state';
import {
  $snackbar,
  hideSnackbar,
  showSnackbar,
} from '@/features/ui-state/snackbar';
import { refreshUsageInfo } from '@/features/usage-info';
import { UsageInfoDialog } from '@/features/usage-info/components/usage-info-dialog';

// Define drawer widths (adjust as needed)
const DRAWER_WIDTH = 300;

export default function HomePage() {
  useMiniChatTextSelection();
  // Ref for scrolling to bottom
  const chatEndRef = React.useRef<null | HTMLDivElement>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [messages, messageText] = useUnit([$messages, $messageText]);
  const lastMessage = messages.length > 0 ? messages.at(-1) : null;

  // Use persistent state for desktop drawers
  const [isHistoryPersistentOpen, isSettingsPersistentOpen] = useUnit([
    $isHistoryDrawerPersistentOpen,
    $isSettingsDrawerPersistentOpen,
  ]);

  useUnit([$currentChatSession, $apiKey]);

  const editingMessageId = useUnit($editingMessageId);
  const [isGenerating, apiError] = useUnit([$isGenerating, $apiError]);
  const preventScroll = useUnit($preventScroll); // Get scroll prevention state
  useUnit($isMobileDrawerOpen);

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
    $currentChatSession.map((index) => index?.id ?? null),
  ]);

  const {
    apiKey: settingsApiKey,
    providerApiUrl,
    temperature,
    systemPrompt,
    currentChatTokens,
  } = useUnit({
    apiKey: $apiKey,
    providerApiUrl: $providerApiUrl,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    currentChatTokens: $currentChatTokens,
  });

  // Bind Effector events using useUnit for React component usage
  const [
    openMobileDrawerBound,
    toggleHistoryDrawerBound,
    toggleSettingsDrawerBound,
    newChatCreatedBound,
    chatTitleEditedBound,
    closeMobileDrawerBound,
    messageTextChangedBound,
    showSnackbarBound,
    messageSentBound,
    generateResponseClickedBound,
    apiKeyChangedBound,
    providerApiUrlChangedBound,
    temperatureChangedBound,
    systemPromptChangedBound,
    setPreventScrollBound,
    loadSettingsBound,
    fetchModelsBound,
    appStartedBound,
    refreshUsageInfoBound,
    hideSnackbarBound,
    openImageGenerationDialogBound,
    mainInputFocusedBound,
    stopGenerationClickedBound,
  ] = useUnit([
    openMobileDrawer,
    toggleHistoryDrawer,
    toggleSettingsDrawer,
    newChatCreated,
    chatTitleEdited,
    closeMobileDrawer,
    messageTextChanged,
    showSnackbar,
    messageSent,
    generateResponseClicked,
    apiKeyChanged,
    providerApiUrlChanged,
    temperatureChanged,
    systemPromptChanged,
    setPreventScroll,
    loadSettings,
    fetchModels,
    appStarted,
    refreshUsageInfo,
    hideSnackbar,
    openImageGenerationDialog,
    mainInputFocused,
    stopGenerationClicked,
  ]);

  const [historySearchTerm, setHistorySearchTerm] = React.useState('');
  const [usageDialogOpen, setUsageDialogOpen] = React.useState(false);
  // Image generation dialog is now managed by its own state
  const [ttsDialogOpen, setTtsDialogOpen] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [editingHistoryId, setEditingHistoryId] = React.useState<string | null>(
    null,
  );
  const [editedTitle, setEditedTitle] = React.useState('');

  const [showApiKey, setShowApiKey] = React.useState(false);
  const snackbar = useUnit($snackbar);

  const filteredHistory = React.useMemo(() => {
    if (!historySearchTerm) return historyIndex;
    return historyIndex.filter((index: ChatHistoryIndex) =>
      index.title.toLowerCase().includes(historySearchTerm.toLowerCase()),
    );
  }, [historyIndex, historySearchTerm]);

  const clickHistory = () => {
    if (isMobile) {
      openMobileDrawerBound({ tab: 'history' });
    } else {
      toggleHistoryDrawerBound();
    }
  };

  const clickSettings = () => {
    if (isMobile) {
      openMobileDrawerBound({ tab: 'settings' });
    } else {
      toggleSettingsDrawerBound(); // Use toggle for persistent drawer
    }
  };

  const clickNewChat = () => newChatCreatedBound();

  useUnit([generateTitle]);

  const handleStartEdit = (
    id: string,
    title: string,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();
    setEditingHistoryId(id);
    setEditedTitle(title);
  };

  const handleSaveEdit = (id: string) => {
    chatTitleEditedBound({ id, newTitle: editedTitle.trim() });
    setEditingHistoryId(null);
  };

  const handleCancelEdit = () => {
    setEditingHistoryId(null);
  };

  const handleDeleteChat = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    removeChat(id);
  };

  const handleSelectChat = (id: string) => {
    selectChat(id);
    if (isMobile) {
      closeMobileDrawerBound();
    }
  };

  const handleClickShowApiKey = () => setShowApiKey((previous) => !previous);

  const handleMouseDownApiKey = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
  };

  useUnit([closeSettingsDrawer]);

  const changeMessage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => messageTextChangedBound(event.target.value);

  const handleSendButtonClick = () => {
    if (editingMessageId !== null) {
      // Scroll to the editing message
      const element = document.querySelector(`#${editingMessageId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // User is currently editing a message, prevent sending new message
      showSnackbarBound({
        message: 'Finish editing before sending a new message.',
        severity: 'warning',
      });
      return; // Stop further processing
    }

    const isInputEmpty = messageText.trim().length === 0;
    // Check for pending images
    const pendingImages = messages.filter(
      (m) => m.status === 'pending' && m.role === 'user',
    );
    const hasPendingImages = pendingImages.length > 0;
    const isLastMessageUser = lastMessage?.role === 'user';

    if (!isInputEmpty || hasPendingImages) {
      // Case 3 & 4: Input has text or pending images, send it as a new message
      if (!isGenerating) {
        messageSentBound();
      }
    } else if (isLastMessageUser && !isGenerating) {
      // Input is empty and no pending images
      // Case 2: Input empty, last message was user -> Generate new response
      generateResponseClickedBound(); // Trigger the new event
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
    providerApiUrl,
    showApiKey,
    temperature,
    systemPrompt,
    currentChatTokens,
    handleApiKeyChange: apiKeyChangedBound,
    handleProviderApiUrlChange: providerApiUrlChangedBound,
    handleTemperatureChange: temperatureChangedBound,
    handleSystemPromptChange: systemPromptChangedBound,
    handleClickShowApiKey,
    handleMouseDownApiKey,
  };

  const [selectedModelId, models] = useUnit([
    $selectedModelId,
    $availableModels,
  ]);

  const selectedModel = React.useMemo(
    () => models.find((m) => m.id === selectedModelId),
    [models, selectedModelId],
  );

  // Effect to reset preventScroll flag after edit/retry potentially caused it to be true
  React.useEffect(() => {
    if (preventScroll) {
      setPreventScrollBound(false);
    }
  }, [preventScroll, setPreventScrollBound]); // Only run when preventScroll changes

  const preventScrollFlag = useUnit($preventScroll);
  const scrollTrigger = useUnit($scrollTrigger);

  React.useEffect(() => {
    if (!preventScrollFlag) {
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'instant' });
      });
    }
  }, [messages.length, scrollTrigger, preventScrollFlag]); // Depend on explicit scroll trigger and flag

  // Remove the old effect that depended on scrollToLastMessageNeeded

  React.useEffect(() => {
    loadSettingsBound();
    fetchModelsBound();
    appStartedBound(); // Trigger app started event
  }, [loadSettingsBound, fetchModelsBound, appStartedBound]);

  return (
    <Box sx={{ height: '100vh', overflow: 'hidden', fontSize: 20 }}>
      {' '}
      {/* Ensure outermost Box has height */}
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={(appBarTheme) => {
          // Add theme access for transitions and spacing
          const isLeftOpen = !isMobile && isHistoryPersistentOpen;
          const isRightOpen = !isMobile && isSettingsPersistentOpen;
          let targetWidth = '100%';
          let targetMarginLeft = '0px'; // Use string '0px' for consistency
          let targetMarginRight = '0px'; // Use string '0px' for consistency
          // Default transition (when drawers are closing)
          let transitionProps = {
            easing: appBarTheme.transitions.easing.sharp,
            duration: appBarTheme.transitions.duration.leavingScreen,
          };

          // Calculate width and margins based on open drawers
          if (isLeftOpen && isRightOpen) {
            targetWidth = `calc(100% - ${DRAWER_WIDTH * 2}px)`;
            targetMarginLeft = `${DRAWER_WIDTH}px`;
            targetMarginRight = `${DRAWER_WIDTH}px`;
            // Use 'entering' transition when any drawer is open/opening
            transitionProps = {
              easing: appBarTheme.transitions.easing.easeOut,
              duration: appBarTheme.transitions.duration.enteringScreen,
            };
          } else if (isLeftOpen) {
            targetWidth = `calc(100% - ${DRAWER_WIDTH}px)`;
            targetMarginLeft = `${DRAWER_WIDTH}px`;
            targetMarginRight = '0px';
            transitionProps = {
              easing: appBarTheme.transitions.easing.easeOut,
              duration: appBarTheme.transitions.duration.enteringScreen,
            };
          } else if (isRightOpen) {
            targetWidth = `calc(100% - ${DRAWER_WIDTH}px)`;
            targetMarginLeft = '0px';
            targetMarginRight = `${DRAWER_WIDTH}px`;
            transitionProps = {
              easing: appBarTheme.transitions.easing.easeOut,
              duration: appBarTheme.transitions.duration.enteringScreen,
            };
          }
          // Apply calculated styles and transition
          return {
            width: targetWidth,
            marginLeft: targetMarginLeft,
            marginRight: targetMarginRight,
            transition: appBarTheme.transitions.create(
              ['margin', 'width'],
              transitionProps,
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
            borderColor: 'divider',
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
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <ModelSelector />
          </Box>
          {!isMobile && (
            <IconButton
              color="inherit"
              aria-label="usage info"
              onClick={() => {
                refreshUsageInfoBound();
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
        sx={(mainTheme) => ({
          // Use theme callback for consistency
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh', // Occupy full viewport height
          // Adjust transitions and margins for main content
          transition: mainTheme.transitions.create('margin', {
            easing: mainTheme.transitions.easing.sharp,
            duration: mainTheme.transitions.duration.leavingScreen,
          }),
          marginLeft: 0, // Start at 0
          marginRight: 0, // Start at 0
          ...(isHistoryPersistentOpen &&
            !isMobile && {
              marginLeft: `${DRAWER_WIDTH}px`, // Add left margin when history open
              transition: mainTheme.transitions.create('margin', {
                easing: mainTheme.transitions.easing.easeOut,
                duration: mainTheme.transitions.duration.enteringScreen,
              }),
            }),
          ...(isSettingsPersistentOpen &&
            !isMobile && {
              marginRight: `${DRAWER_WIDTH}px`, // Add right margin when settings open
              transition: mainTheme.transitions.create('margin', {
                easing: mainTheme.transitions.easing.easeOut,
                duration: mainTheme.transitions.duration.enteringScreen,
              }),
            }),
          // Ensure content below AppBar starts correctly
          pt: `${Number(mainTheme.mixins.toolbar.minHeight) - 16}px`, // Use theme value for AppBar height
          pb: 0, // Remove potential bottom padding if any
          boxSizing: 'border-box', // Include padding in height calculation
        })}
      >
        {/* Scrollable Area for Chat Messages */}
        {/* Scrollable Area for Chat Messages */}
        {/* Ensure overflowY is 'auto' or 'scroll', NOT 'hidden' */}
        <Box
          sx={{
            flexGrow: 1, // Takes remaining vertical space
            overflowY: 'auto', // Allows vertical scrolling, crucial for FAB visibility if content is long
            // overflowX: 'hidden', // Optional: hide horizontal scrollbar if needed
            display: 'flex', // Use flexbox to easily center the container
            flexDirection: 'column', // Stack items vertically
            alignItems: 'center', // Center items horizontally
            width: '100%',
            p: isMobile ? 1 : 2, // Add horizontal padding
            pt: isMobile ? 2 : 3,
            position: 'relative', // Necessary for absolute positioning of children (FAB)
          }}
        >
          {/* Inner container for centering message content */}
          <Container
            maxWidth="md" // Apply centering constraint here
            disableGutters // Remove default container padding, handled by outer Box
            sx={{
              display: 'flex', // Use flex to make paper grow
              flexDirection: 'column',
              flexGrow: 1, // Allow vertical growth within scrollable area
              width: '100%', // Ensure it uses the full width provided by parent Box
            }}
          >
            {/* Paper for message list background/padding - optional */}
            <Paper
              elevation={0}
              sx={{
                backgroundColor: 'transparent', // Or theme background
                display: 'flex',
                flexDirection: 'column',
                width: '100%', // Take full width of the Container
                alignItems: 'center', // Center items horizontally
              }}
            >
              <Stack
                alignItems="center"
                // spacing={0.5}
                sx={{
                  alignItems: 'stretch', // Align items to stretch full width
                  width: '100%',
                }}
              >
                {messages.map((message) => (
                  <MessageItem message={message} key={message.id} />
                ))}
                <div ref={chatEndRef} />
              </Stack>
            </Paper>{' '}
            {/* End Message List Paper */}
          </Container>{' '}
          <Snackbar
            open={snackbar.open}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            sx={(snackbarTheme) => {
              const top = Number(snackbarTheme.mixins.toolbar.minHeight) + 8;
              return { top: `${top}px !important` };
            }}
          >
            <Alert
              variant="filled"
              onClose={() => hideSnackbarBound()}
              severity={snackbar.severity}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
          {/* End Centering Container */}
          {/* Render the FAB inside the scrollable area */}
          <MiniChatFAB />
        </Box>{' '}
        {/* End Scrollable Area Box */}
        {/* apiError Alert - Placed outside scrollable area but inside main content */}
        {apiError && (
          <Container maxWidth="md" sx={{ px: isMobile ? 1 : 2, width: '100%' }}>
            <Alert severity="error" sx={{ mt: 1, mb: 1, width: '100%' }}>
              {apiError}
            </Alert>
          </Container>
        )}
        {/* Progress bars above input */}
        <Box sx={{ width: '100%' }}>
          {/* Progress bar for generation (green/blue) */}
          <LinearProgress
            color="secondary"
            sx={{
              width: '100%',
              height: '1px',
              top: '2px', // Overlap with the border
              visibility: isGenerating && !isRecording ? 'visible' : 'hidden',
            }}
          />
          {/* Progress bar for recording (red) */}
          <LinearProgress
            color="error"
            sx={{
              width: '100%',
              height: '1px',
              top: '1px', // Overlap with the border
              visibility: isRecording ? 'visible' : 'hidden',
            }}
          />
        </Box>
        {/* Input Area Wrapper - Sticks to the bottom */}
        <Paper
          square
          sx={{
            mt: 'auto',
            width: '100%',
            backgroundColor: 'background.paper',
            flexShrink: 0,
            borderTop: 1,
            borderColor: 'divider',
            p: 1,
            justifyItems: 'center',
          }}
        >
          {/* Added flexShrink */}
          {/* Centering Container for Input */}
          <Box
            maxWidth="md"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%', // Ensure paper takes full width of container
              position: 'relative', // Enable absolute positioning for child elements
            }}
          >
            {/* Input Row - Single horizontal row with attach, text field, and send button */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                width: '100%',
              }}
            >
              {/* Consolidated Attachment Menu - positioned on the far left */}
              <AttachmentMenu
                disabled={isGenerating}
                onImageGenerationClick={() => openImageGenerationDialogBound()}
                onRecordingStateChange={setIsRecording}
                onTTSClick={() => setTtsDialogOpen(true)}
              />

              {/* Text Input Field - flexible width between buttons */}
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
                onFocus={() => mainInputFocusedBound(true)} // Trigger event on focus
                onBlur={() => mainInputFocusedBound(false)} // Trigger event on blur
              />

              {/* Send/Stop Button - positioned on the far right */}
              <Box sx={{ position: 'relative' }}>
                {isGenerating ? (
                  <IconButton
                    aria-label="Stop Generation"
                    onClick={() => stopGenerationClickedBound()} // Ensure event is called correctly
                    sx={{
                      mx: -0.5,
                      color: 'warning.main', // Keep warning color for stop
                    }}
                  >
                    <StopIcon /> {/* Use correct icon */}
                  </IconButton>
                ) : (
                  // Calculate disabled state based on new logic only when not generating
                  (() => {
                    const isInputEmpty = messageText.trim().length === 0;
                    const pendingImages = messages.filter(
                      (m) => m.status === 'pending' && m.role === 'user',
                    );
                    const hasPendingImages = pendingImages.length > 0;
                    const currentLastMessage =
                      messages.length > 0 ? messages.at(-1) : null;
                    const isLastMessageUser =
                      currentLastMessage?.role === 'user';
                    // Disable if (input is empty AND no pending images AND last message was NOT user) OR if recording
                    const isDisabled =
                      (isInputEmpty &&
                        !hasPendingImages &&
                        !isLastMessageUser) ||
                      isRecording;

                    return (
                      <IconButton
                        aria-label="Send / Generate"
                        onClick={handleSendButtonClick}
                        disabled={isDisabled}
                        sx={{
                          mx: -0.5,
                          color: 'primary.light',
                        }}
                      >
                        <AutoAwesomeIcon />
                      </IconButton>
                    );
                  })()
                )}
              </Box>
            </Box>{' '}
            {/* End Input Row */}
          </Box>{' '}
          {/* End Input Centering Container */}
        </Paper>{' '}
        {/* End Input Area Wrapper Box */}
        <ApiKeyMissingDialog />
      </Box>{' '}
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
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          <Box sx={{ overflow: 'auto' }}>
            {/* Make drawer content scrollable if needed */}
            <ChatHistoryContent
              searchTerm={historyPanelProps.searchTerm}
              setSearchTerm={historyPanelProps.setSearchTerm}
              isLoading={historyPanelProps.isLoading}
              filteredHistory={historyPanelProps.filteredHistory}
              editingId={historyPanelProps.editingId}
              editedTitle={historyPanelProps.editedTitle}
              currentChatId={historyPanelProps.currentChatId}
              setEditedTitle={historyPanelProps.setEditedTitle}
              handleStartEdit={historyPanelProps.handleStartEdit}
              handleSaveEdit={historyPanelProps.handleSaveEdit}
              handleCancelEdit={historyPanelProps.handleCancelEdit}
              handleDeleteChat={historyPanelProps.handleDeleteChat}
              handleSelectChat={historyPanelProps.handleSelectChat}
            />
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
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
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
      <ImageGenerationDialog />
      <TTSDialog open={ttsDialogOpen} onClose={() => setTtsDialogOpen(false)} />
      <TranscriptionDialog />
      <MiniChatToolbar />
      <MiniChatDialog />
      {/* <MiniChatFAB /> FAB is now rendered inside the scrollable area */}
    </Box> // End Outermost Box
  );
}
