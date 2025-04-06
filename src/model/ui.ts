import { createStore, createEvent } from "effector";
import { createDomain } from "effector";
import { debug } from "patronum/debug";

export const showApiKeyDialog = createEvent("showApiKeyDialog");
export const hideApiKeyDialog = createEvent("hideApiKeyDialog");

export const $isApiKeyDialogOpen = createStore(false)
  .on(showApiKeyDialog, () => true)
  .on(hideApiKeyDialog, () => false);

const uiDomain = createDomain("ui");

// --- Events ---
export const openSettingsDrawer = uiDomain.event("openSettingsDrawer");
export const closeSettingsDrawer = uiDomain.event("closeSettingsDrawer");
export const openHistoryDrawer = uiDomain.event("openHistoryDrawer");
export const closeHistoryDrawer = uiDomain.event("closeHistoryDrawer");
export const toggleHistoryDrawer = uiDomain.event("toggleHistoryDrawer");

// --- Stores ---
export const $isSettingsDrawerOpen = uiDomain
  .store<boolean>(false, { name: "isSettingsDrawerOpen" })
  .on(openSettingsDrawer, () => true)
  .on(closeSettingsDrawer, () => false);

export const $isHistoryDrawerOpen = uiDomain
  .store<boolean>(false, { name: "isHistoryDrawerOpen" })
  .on(openHistoryDrawer, () => true)
  .on(closeHistoryDrawer, () => false)
  .on(toggleHistoryDrawer, (isOpen) => !isOpen);

debug(
  openSettingsDrawer,
  closeSettingsDrawer,
  openHistoryDrawer,
  closeHistoryDrawer,
  toggleHistoryDrawer,
  $isSettingsDrawerOpen,
  $isHistoryDrawerOpen
);
