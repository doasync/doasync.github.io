// Public API for the mini-chat feature

export {
  $miniChat,
  $miniChatActiveStreamId,
  $miniChatModelId,
  $miniChatScrollTrigger,
  // Stores
  $miniChatToolbar,
  expandMiniChat,
  hideMiniChatToolbar,
  miniChatClosed,
  type MiniChatMessage,
  // Events - Settings
  miniChatModelSelected,
  // Events - Dialog
  miniChatOpened,
  miniChatSettingsLoaded,
  type MiniChatState,
  // Types
  type MiniChatToolbarState,
  minimizeMiniChat,
  resetMiniChat,
  restoreMiniChat,
  sendMiniChatMessage,
  // Events - Toolbar
  showMiniChatToolbar,
  stopMiniChatGenerationClicked,
  triggerMiniChatScroll,
  updateMiniChatInput,
} from './model';

// Export components
export { MiniChatDialog } from './mini-chat-dialog';
export { MiniChatFAB } from './mini-chat-fab';
export { MiniChatToolbar } from './mini-chat-toolbar';

// Export hooks
export { useMiniChatTextSelection } from './use-text-selection';
