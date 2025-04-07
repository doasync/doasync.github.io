import React from "react";
import { useUnit } from "effector-react";
import { Drawer, Box, Tabs, Tab } from "@mui/material";
import ChatHistoryView from "./ChatHistoryDrawer";
import { ChatSettingsView } from "./ChatSettingsDrawer";
import {
  $isMobile,
  $isMobileDrawerOpen,
  $mobileDrawerTab,
  closeMobileDrawer,
  openMobileDrawer,
} from "@/features/ui-state";

const MobileDrawer: React.FC = () => {
  const isMobile = useUnit($isMobile);
  const isOpen = useUnit($isMobileDrawerOpen);
  const currentTab = useUnit($mobileDrawerTab);

  if (!isMobile || !isOpen) return null;

  return (
    <Drawer
      anchor="bottom"
      open={isOpen}
      onClose={() => closeMobileDrawer()}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          height: "60vh",
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          variant="fullWidth"
          value={currentTab === "history" ? 0 : 1}
          onChange={(_, newValue) => {
            if (newValue === 0) {
              openMobileDrawer("history");
            } else {
              openMobileDrawer("settings");
            }
          }}
        >
          <Tab label="History" />
          <Tab label="Settings" />
        </Tabs>
      </Box>
      <Box sx={{ flexGrow: 1, overflow: "auto" }}>
        {currentTab === "history" && <ChatHistoryView />}
        {currentTab === "settings" && <ChatSettingsView />}
      </Box>
    </Drawer>
  );
};

export default MobileDrawer;
