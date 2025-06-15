// Public API for the mini-chat feature

export {
  // Types
  type MiniChatToolbarState,
  type MiniChatMessage,
  type MiniChatState,

  // Stores
  $miniChatToolbar,
  $miniChat,
  $miniChatScrollTrigger,
  $miniChatModelId,
  $miniChatActiveStreamId,

  // Events - Toolbar
  showMiniChatToolbar,
  hideMiniChatToolbar,

  // Events - Dialog
  miniChatOpened,
  miniChatClosed,
  updateMiniChatInput,
  sendMiniChatMessage,
  expandMiniChat,
  minimizeMiniChat,
  restoreMiniChat,
  resetMiniChat,
  triggerMiniChatScroll,
  stopMiniChatGenerationClicked,

  // Events - Settings
  miniChatModelSelected,
  miniChatSettingsLoaded,
} from './model';

// Export components
export { MiniChatDialog } from './MiniChatDialog';
export { MiniChatToolbar } from './MiniChatToolbar';
export { MiniChatFAB } from './MiniChatFAB';

// Export hooks
export { useMiniChatTextSelection } from './useTextSelection';
