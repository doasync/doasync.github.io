import { createEvent, createStore, sample } from "effector";
import { delay, debug } from "patronum";

interface SnackbarState {
  open?: boolean;
  message: string;
  severity?: "success" | "info" | "warning" | "error";
}

export const showSnackbar = createEvent<SnackbarState>();
export const hideSnackbar = createEvent<SnackbarState | void>();

export const $snackbar = createStore<SnackbarState>({
  open: false,
  message: "",
  severity: "info",
});

// Auto-hide after 2 seconds
const startAutoHide = createEvent<SnackbarState | void>();
const autoHide = createEvent<SnackbarState | void>();

delay({
  source: startAutoHide,
  timeout: 2500,
  target: autoHide,
});

sample({
  source: $snackbar,
  clock: showSnackbar,
  filter: ({ open }, { message }) => !open && Boolean(message),
  fn: (skip, { message, severity = "info" }) => ({
    open: true,
    message,
    severity,
  }),
  target: $snackbar,
});

sample({
  source: $snackbar,
  filter: ({ open }) => !!open,
  target: startAutoHide,
});

sample({
  clock: [hideSnackbar, autoHide],
  source: $snackbar,
  filter: ({ open }) => !!open,
  fn: (skip, snackbar) => {
    const { message = "", severity = "info" } = snackbar || {};
    return {
      open: false,
      message,
      severity,
    };
  },
  target: $snackbar,
});

// --- Debugging ---
/*
debug({
  showSnackbar,
  hideSnackbar,
  $snackbar,
  startAutoHide,
  autoHide,
});
*/
