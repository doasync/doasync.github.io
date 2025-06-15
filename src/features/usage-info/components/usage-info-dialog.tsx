import CloseIcon from '@mui/icons-material/Close';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import React from 'react';

import { UsageInfoContent } from './usage-info-content';

interface UsageInfoDialogProps {
  open: boolean;
  onClose: () => void;
}

export function UsageInfoDialog({ open, onClose }: UsageInfoDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Usage Info
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <UsageInfoContent />
      </DialogContent>
    </Dialog>
  );
}

// Named export already available above
