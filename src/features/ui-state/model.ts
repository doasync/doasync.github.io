import { createStore, createEvent, sample } from "effector";
import { createDomain } from "effector";
import { debug } from "patronum/debug";
import theme from "@/theme";

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
export const appStarted = uiDomain.event("appStarted");
export const windowResized = uiDomain.event<number>("windowResized");

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

export const $isMobile = uiDomain
  .store<boolean>(false, { name: "isMobile" })
  .on(windowResized, (_, width) => {
    const mobile = width < theme.breakpoints.values.sm;
    console.log("Window resized:", width, "isMobile:", mobile);
    return mobile;
  });

// Setup window resize listener
sample({
  clock: appStarted,
  fn: () => {
    const handleResize = () => {
      const width = window.innerWidth;
      console.log("Window resized to:", width);
      windowResized(width);
    };
    window.addEventListener("resize", handleResize);
    // Trigger initial measurement
    handleResize();
    return window.innerWidth;
  },
  target: windowResized,
});

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
  toggleHistoryDrawer,
  appStarted,
  windowResized,
  $isMobile
);
