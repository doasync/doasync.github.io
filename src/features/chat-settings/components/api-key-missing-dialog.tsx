import { useMediaQuery, useTheme } from '@mui/material';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Paper, { PaperProps } from '@mui/material/Paper';
import Slide from '@mui/material/Slide';
import { TransitionProps } from '@mui/material/transitions';
import { useUnit } from 'effector-react';
import * as React from 'react';
import Draggable from 'react-draggable';

import {
  $isApiKeyDialogOpen,
  hideApiKeyDialog,
} from '@/features/chat-settings';
import { openMobileDrawer, openSettingsDrawer } from '@/features/ui-state';

const Transition = React.forwardRef(
  (
    props: TransitionProps & { children: React.ReactElement },
    ref: React.Ref<unknown>,
  ) => <Slide direction="up" ref={ref} {...props} />,
);

function PaperComponent(props: PaperProps) {
  const nodeRef = React.useRef<HTMLDivElement>(null);
  return (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLDivElement>}
      handle="#draggable-dialog-title"
      cancel='[class*="MuiDialogContent-root"]'
    >
      <Paper {...props} ref={nodeRef} />
    </Draggable>
  );
}

export function ApiKeyMissingDialog() {
  const [open, closeDialog, openSettings] = useUnit([
    $isApiKeyDialogOpen,
    hideApiKeyDialog,
    openSettingsDrawer,
  ]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleGotoSettings = () => {
    closeDialog();
    if (isMobile) {
      openMobileDrawer({ tab: 'settings' });
    } else {
      openSettings();
    }
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
      <DialogTitle style={{ cursor: 'move' }} id="draggable-dialog-title">
        API Key Required
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-slide-description">
          Your API key is missing. Please enter it in Chat Settings to enable
          sending messages.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeDialog}>Close</Button>
        <Button variant="contained" onClick={handleGotoSettings} autoFocus>
          Go to Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
}
