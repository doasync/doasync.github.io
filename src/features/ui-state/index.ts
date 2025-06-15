// Public API for the ui-state feature

export type { DrawerTabs } from './model';
export {
  // $preventScroll, // Removed - belongs to chat model now
  $editingMessageId, // Add editing state
  $isHistoryDrawerOpen, // Keep for mobile?
  $isHistoryDrawerPersistentOpen, // Add persistent state
  // $activeMessageId, // Remove active message state export
  $isMobileDrawerOpen, // Add mobile drawer state
  // Stores - Needed by UI components
  $isSettingsDrawerOpen,
  $isSettingsDrawerPersistentOpen, // Add persistent state
  $mobileDrawerTab, // Add mobile drawer tab state
  closeHistoryDrawer, // Triggered by Drawer itself or overlay click
  // setActiveMessageId, // Remove active message event export
  closeMobileDrawer,
  closeSettingsDrawer, // Triggered by Drawer itself or overlay click
  openHistoryDrawer, // Triggered by Header button
  // Events - Triggered by UI components
  openMobileDrawer, // Triggered by Header button
  openSettingsDrawer, // Triggered by Header button
  resetEditingMessage,
  setMobileDrawerTab, // Triggered by mobile drawer tab change
  // setPreventScroll, // Removed - belongs to chat model now
  startEditingMessage, // Add editing state events
  stopEditingMessage,
  toggleHistoryDrawer, // Triggered by Header button (for persistent)
  toggleSettingsDrawer, // Triggered by Header button (for persistent)
} from './model';
