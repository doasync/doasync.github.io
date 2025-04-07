import React, { useState } from "react";
import { Drawer, Tabs, Tab, Box, IconButton, Divider } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ChatHistoryPanel from "./ChatHistoryPanel";
import ChatSettingsPanel from "./ChatSettingsPanel";

interface UnifiedBottomDrawerProps {
  open: boolean;
  onClose: () => void;
}

const UnifiedBottomDrawer: React.FC<UnifiedBottomDrawerProps> = ({
  open,
  onClose,
}) => {
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  return (
    <Drawer anchor="bottom" open={open} onClose={onClose}>
      <Box
        sx={{
          width: "100%",
          maxHeight: "75vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Tabs value={tabIndex} onChange={handleTabChange} variant="fullWidth">
            <Tab label="History" />
            <Tab label="Settings" />
          </Tabs>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
          {tabIndex === 0 && <ChatHistoryPanel onClose={onClose} />}
          {tabIndex === 1 && <ChatSettingsPanel onClose={onClose} />}
        </Box>
      </Box>
    </Drawer>
  );
};

export default UnifiedBottomDrawer;
