// Public API for the ui-state feature

export {
  // Stores - Needed by UI components
  $isApiKeyDialogOpen,
  $isSettingsDrawerOpen,
  $isHistoryDrawerOpen,
  $isMobile,

  // Events - Triggered by UI components
  showApiKeyDialog, // Triggered by chat model or settings UI
  hideApiKeyDialog, // Triggered by ApiKeyMissingDialog
  openSettingsDrawer, // Triggered by Header button
  closeSettingsDrawer, // Triggered by Drawer itself or overlay click
  openHistoryDrawer, // Triggered by Header button
  closeHistoryDrawer, // Triggered by Drawer itself or overlay click
  toggleHistoryDrawer, // Triggered by Header button
} from "./model";
