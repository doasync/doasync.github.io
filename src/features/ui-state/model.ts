import { createStore, createEvent } from "effector";
import { createDomain } from "effector";
import { debug } from "patronum/debug";

const uiDomain = createDomain("ui");

type DrawerTabs = "history" | "settings" | "modelInfo";

// --- Events ---

// API Key dialog
export const showApiKeyDialog = uiDomain.event("showApiKeyDialog");
export const hideApiKeyDialog = uiDomain.event("hideApiKeyDialog");

// Settings drawer
export const openSettingsDrawer = uiDomain.event("openSettingsDrawer");
export const closeSettingsDrawer = uiDomain.event("closeSettingsDrawer");

// History drawer
export const openHistoryDrawer = uiDomain.event("openHistoryDrawer");
export const closeHistoryDrawer = uiDomain.event("closeHistoryDrawer");
export const toggleHistoryDrawer = uiDomain.event("toggleHistoryDrawer");

// Mobile Unified Drawer
export const openMobileDrawer = uiDomain.event<{ tab: DrawerTabs }>(
  "openMobileDrawer"
);
export const closeMobileDrawer = uiDomain.event("closeMobileDrawer");
export const setMobileDrawerTab =
  uiDomain.event<DrawerTabs>("setMobileDrawerTab");

// --- Stores ---

// API Key dialog
export const $isApiKeyDialogOpen = createStore(false)
  .on(showApiKeyDialog, () => true)
  .on(hideApiKeyDialog, () => false);

// Settings drawer
export const $isSettingsDrawerOpen = uiDomain
  .store<boolean>(false, { name: "isSettingsDrawerOpen" })
  .on(openSettingsDrawer, () => true)
  .on(closeSettingsDrawer, () => false);

// History drawer
export const $isHistoryDrawerOpen = uiDomain
  .store<boolean>(false, { name: "isHistoryDrawerOpen" })
  .on(openHistoryDrawer, () => true)
  .on(closeHistoryDrawer, () => false)
  .on(toggleHistoryDrawer, (isOpen) => !isOpen);

// --- Mobile Unified Drawer ---

// Open state of the mobile drawer (bottom drawer with tabs)
export const $isMobileDrawerOpen = uiDomain
  .store<boolean>(false, { name: "isMobileDrawerOpen" })
  .on(openMobileDrawer, () => true)
  .on(closeMobileDrawer, () => false);

// Which tab ('history' or 'settings') is selected inside mobile drawer
export const $mobileDrawerTab = uiDomain
  .store<DrawerTabs>("history", { name: "mobileDrawerTab" })
  .on(openMobileDrawer, (_, payload) => payload.tab)
  .on(setMobileDrawerTab, (_, tab) => tab)
  .reset(closeMobileDrawer);

// --- Debugging ---
debug(
  // Stores
  $isApiKeyDialogOpen,
  $isSettingsDrawerOpen,
  $isHistoryDrawerOpen,

  // Events
  showApiKeyDialog,
  hideApiKeyDialog,
  openSettingsDrawer,
  closeSettingsDrawer,
  openHistoryDrawer,
  closeHistoryDrawer,
  toggleHistoryDrawer
);
