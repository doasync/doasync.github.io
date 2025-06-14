import React from "react";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import UsageInfoContent from "./UsageInfoContent";
import {
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";

interface UsageInfoDialogProps {
  open: boolean;
  onClose: () => void;
}

export const UsageInfoDialog: React.FC<UsageInfoDialogProps> = ({
  open,
  onClose,
}) => {

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        Usage Info
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: "absolute",
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
};

export default UsageInfoDialog;
