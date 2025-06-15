import { sample, createDomain, createEffect } from 'effector';
import { debug } from 'patronum/debug';
import { appStarted } from '@/app'; // Import app started event

const uiDomain = createDomain('ui');

type DrawerTabs = 'history' | 'settings' | 'modelInfo' | 'usage';

// --- Events ---

// Settings drawer
export const openSettingsDrawer = uiDomain.event('openSettingsDrawer');
export const closeSettingsDrawer = uiDomain.event('closeSettingsDrawer');
export const toggleSettingsDrawer = uiDomain.event('toggleSettingsDrawer'); // Added toggle export

// Model Info Drawer Events (Separate for now, could be merged later)
export const openModelInfoDrawer = uiDomain.event<void>('openModelInfoDrawer');
export const closeModelInfoDrawer = uiDomain.event<void>(
  'closeModelInfoDrawer',
);
// History drawer
export const openHistoryDrawer = uiDomain.event('openHistoryDrawer');
export const closeHistoryDrawer = uiDomain.event('closeHistoryDrawer');
export const toggleHistoryDrawer = uiDomain.event('toggleHistoryDrawer');

// Mobile Unified Drawer
export const openMobileDrawer = uiDomain.event<{ tab: DrawerTabs }>(
  'openMobileDrawer',
);
export const closeMobileDrawer = uiDomain.event('closeMobileDrawer');
export const setMobileDrawerTab =
  uiDomain.event<DrawerTabs>('setMobileDrawerTab');

// Message Editing Focus
export const startEditingMessage = uiDomain.event<string>(
  'startEditingMessage',
);
export const stopEditingMessage = uiDomain.event<void>('stopEditingMessage');
export const resetEditingMessage = uiDomain.event<void>('resetEditingMessage');
// Scroll Prevention (Moved from here to chat model where it's used)
// export const setPreventScroll = uiDomain.event<boolean>("setPreventScroll");

// --- Effects ---
const loadUiSettingsFx = createEffect<
  void,
  { historyOpen: boolean; settingsOpen: boolean },
  Error
>({
  name: 'loadUiSettingsFx',
  handler: async () => {
    try {
      const historyOpen =
        localStorage.getItem('ui_historyDrawerOpen') === 'true';
      const settingsOpen =
        localStorage.getItem('ui_settingsDrawerOpen') === 'true';
      return { historyOpen, settingsOpen };
    } catch (error) {
      console.error('Failed to load UI settings from localStorage:', error);
      return { historyOpen: false, settingsOpen: false }; // Default values on error
    }
  },
});

const saveHistoryDrawerStateFx = createEffect<boolean, void, Error>({
  name: 'saveHistoryDrawerStateFx',
  handler: async (isOpen) => {
    try {
      localStorage.setItem('ui_historyDrawerOpen', String(isOpen));
    } catch (error) {
      console.error(
        'Failed to save history drawer state to localStorage:',
        error,
      );
    }
  },
});

const saveSettingsDrawerStateFx = createEffect<boolean, void, Error>({
  name: 'saveSettingsDrawerStateFx',
  handler: async (isOpen) => {
    try {
      localStorage.setItem('ui_settingsDrawerOpen', String(isOpen));
    } catch (error) {
      console.error(
        'Failed to save settings drawer state to localStorage:',
        error,
      );
    }
  },
});

// --- Stores ---

// Persistent Drawer States (Desktop) - Defaulting to false initially, loaded from localStorage
export const $isHistoryDrawerPersistentOpen = uiDomain.store<boolean>(false, {
  name: '$isHistoryDrawerPersistentOpen',
});
export const $isSettingsDrawerPersistentOpen = uiDomain.store<boolean>(false, {
  name: '$isSettingsDrawerPersistentOpen',
});

// Settings drawer (Temporary/Mobile state - might be removed if mobile uses persistent directly)
export const $isSettingsDrawerOpen = uiDomain
  .store<boolean>(false, { name: 'isSettingsDrawerOpen' })
  .on(openSettingsDrawer, () => true) // Keep for potential mobile use
  .on(closeSettingsDrawer, () => false); // Keep for potential mobile use

// History drawer (Temporary/Mobile state - might be removed if mobile uses persistent directly)
export const $isHistoryDrawerOpen = uiDomain
  .store<boolean>(false, { name: 'isHistoryDrawerOpen' })
  .on(openHistoryDrawer, () => true) // Keep for potential mobile use
  .on(closeHistoryDrawer, () => false) // Keep for potential mobile use
  .on(toggleHistoryDrawer, (isOpen) => !isOpen); // Keep for potential mobile use

// Model Info Drawer State (Not persistent yet)
export const $isModelInfoDrawerOpen = uiDomain
  .store<boolean>(false, { name: '$isModelInfoDrawerOpen' })
  .on(openModelInfoDrawer, () => true)
  .on(closeModelInfoDrawer, () => false);
// Model Info Drawer State (Not persistent yet)

// --- Mobile Unified Drawer ---

// Open state of the mobile drawer (bottom drawer with tabs)
export const $isMobileDrawerOpen = uiDomain
  .store<boolean>(false, { name: 'isMobileDrawerOpen' })
  .on(openMobileDrawer, () => true)
  .on(closeMobileDrawer, () => false);

// Which tab ('history' or 'settings') is selected inside mobile drawer
export const $mobileDrawerTab = uiDomain
  .store<DrawerTabs>('history', { name: 'mobileDrawerTab' })
  .on(openMobileDrawer, (_, payload) => payload.tab)
  .on(setMobileDrawerTab, (_, tab) => tab)
  .reset(closeMobileDrawer);

// ID of the message currently being edited (null if none)
export const $editingMessageId = uiDomain
  .store<string | null>(null, { name: '$editingMessageId' })
  .on(startEditingMessage, (_, messageId) => messageId)
  .reset(stopEditingMessage, resetEditingMessage);
// Removed $preventScroll store, it lives in chat model now

// --- Store Updates for Persistent Drawers ---
$isHistoryDrawerPersistentOpen
  .on(toggleHistoryDrawer, (isOpen) => !isOpen) // Toggle event now controls persistent state
  .on(openHistoryDrawer, () => true)
  .on(closeHistoryDrawer, () => false)
  .on(loadUiSettingsFx.doneData, (_, payload) => payload.historyOpen); // Load from effect

$isSettingsDrawerPersistentOpen
  .on(toggleSettingsDrawer, (isOpen) => !isOpen) // Toggle event now controls persistent state
  .on(openSettingsDrawer, () => true)
  .on(closeSettingsDrawer, () => false)
  .on(loadUiSettingsFx.doneData, (_, payload) => payload.settingsOpen); // Load from effect

// Note: Editing state reset is now handled by the chat-history feature
// to avoid circular dependencies

// --- Samples (Flow Logic) ---

// Load UI settings from localStorage when the app starts
sample({
  clock: appStarted,
  target: loadUiSettingsFx,
});

// Save persistent drawer states to localStorage when they change
sample({
  clock: $isHistoryDrawerPersistentOpen.updates, // Trigger on any update to the store
  filter: loadUiSettingsFx.pending.map((pending) => !pending), // Don't save during initial load
  target: saveHistoryDrawerStateFx,
});

sample({
  clock: $isSettingsDrawerPersistentOpen.updates, // Trigger on any update to the store
  filter: loadUiSettingsFx.pending.map((pending) => !pending), // Don't save during initial load
  target: saveSettingsDrawerStateFx,
});

// --- Debugging ---

debug(
  // Stores
  $isSettingsDrawerOpen, // Temporary/Mobile
  $isHistoryDrawerOpen, // Temporary/Mobile
  $isHistoryDrawerPersistentOpen, // Persistent
  $isSettingsDrawerPersistentOpen, // Persistent
  $isModelInfoDrawerOpen,
  $isMobileDrawerOpen,
  $mobileDrawerTab,
  $editingMessageId, // Added store
  // $preventScroll, // Removed store

  // Events
  openSettingsDrawer,
  closeSettingsDrawer,
  toggleSettingsDrawer,
  openHistoryDrawer,
  closeHistoryDrawer,
  toggleHistoryDrawer,
  openModelInfoDrawer,
  closeModelInfoDrawer,
  openMobileDrawer,
  closeMobileDrawer,
  setMobileDrawerTab,
  startEditingMessage, // Added event
  stopEditingMessage, // Added event
  resetEditingMessage, // Added event
  // setPreventScroll, // Removed event

  // Effects
  loadUiSettingsFx,
  saveHistoryDrawerStateFx,
  saveSettingsDrawerStateFx,
);
