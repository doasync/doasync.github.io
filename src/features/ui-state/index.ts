// Public API for the ui-state feature

export {
  // Stores - Needed by UI components
  $isApiKeyDialogOpen,
  $isSettingsDrawerOpen,
  $isHistoryDrawerOpen, // Keep for mobile?
  $isHistoryDrawerPersistentOpen, // Add persistent state
  $isSettingsDrawerPersistentOpen, // Add persistent state
  // $activeMessageId, // Remove active message state export
  $isMobileDrawerOpen, // Add mobile drawer state
  $mobileDrawerTab, // Add mobile drawer tab state
  $preventScroll, // Add scroll prevention state

  // Events - Triggered by UI components
  showApiKeyDialog, // Triggered by chat model or settings UI
  hideApiKeyDialog, // Triggered by ApiKeyMissingDialog
  openMobileDrawer, // Triggered by Header button
  openSettingsDrawer, // Triggered by Header button
  closeSettingsDrawer, // Triggered by Drawer itself or overlay click
  openHistoryDrawer, // Triggered by Header button
  closeHistoryDrawer, // Triggered by Drawer itself or overlay click
  toggleHistoryDrawer, // Triggered by Header button (for persistent)
  toggleSettingsDrawer, // Triggered by Header button (for persistent)
  // setActiveMessageId, // Remove active message event export
  closeMobileDrawer,
  setMobileDrawerTab, // Triggered by mobile drawer tab change
  setPreventScroll, // Triggered by chat model during retry/edit
} from "./model";
