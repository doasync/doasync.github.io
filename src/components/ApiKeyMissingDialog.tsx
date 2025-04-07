import * as React from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import Slide from "@mui/material/Slide";
import Paper, { PaperProps } from "@mui/material/Paper";
import Draggable from "react-draggable";
import { TransitionProps } from "@mui/material/transitions";
import { useUnit } from "effector-react";
import {
  $isApiKeyDialogOpen,
  hideApiKeyDialog,
  openSettingsDrawer,
} from "@/features/ui-state";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function PaperComponent(props: PaperProps) {
  const nodeRef = React.useRef<HTMLDivElement>(null);
  return (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLDivElement>}
      handle="#draggable-dialog-title"
      cancel={'[class*="MuiDialogContent-root"]'}
    >
      <Paper {...props} ref={nodeRef} />
    </Draggable>
  );
}

export default function ApiKeyMissingDialog() {
  const [open, closeDialog, openSettings] = useUnit([
    $isApiKeyDialogOpen,
    hideApiKeyDialog,
    openSettingsDrawer,
  ]);

  const handleGotoSettings = () => {
    closeDialog();
    openSettings();
  };

  return (
    <Dialog
      open={open}
      onClose={closeDialog}
      PaperComponent={PaperComponent}
      TransitionComponent={Transition}
      keepMounted
      aria-labelledby="draggable-dialog-title"
      aria-describedby="alert-dialog-slide-description"
    >
      <DialogTitle style={{ cursor: "move" }} id="draggable-dialog-title">
        API Key Required
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-slide-description">
          Your OpenRouter API key is missing. Please enter it in Chat Settings
          to enable sending messages.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeDialog}>Close</Button>
        <Button onClick={handleGotoSettings} autoFocus>
          Go to Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
}
