import React from "react";
import { Drawer, Tabs, Tab, Box } from "@mui/material";
import { useUnit } from "effector-react";
import {
  $isMobileDrawerOpen,
  $mobileDrawerTab,
  closeMobileDrawer,
  setMobileDrawerTab,
} from "@/features/ui-state/model";

// These panels accept props forwarded from page.tsx
import ChatHistoryContent from "@/components/ChatHistoryContent";
import ChatSettingsContent from "@/components/ChatSettingsContent";

interface MobileUnifiedDrawerProps {
  historyPanelProps: React.ComponentProps<typeof ChatHistoryContent>;
  settingsPanelProps: React.ComponentProps<typeof ChatSettingsContent>;
}

const MobileUnifiedDrawer: React.FC<MobileUnifiedDrawerProps> = ({
  historyPanelProps,
  settingsPanelProps,
}) => {
  const [isOpen, activeTab] = useUnit([$isMobileDrawerOpen, $mobileDrawerTab]);
  const close = useUnit(closeMobileDrawer);
  const setTab = useUnit(setMobileDrawerTab);

  return (
    <Drawer
      anchor="bottom"
      open={isOpen}
      onClose={close}
      ModalProps={{ keepMounted: true }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "80vh",
          maxHeight: "90vh",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => setTab(val)}
          variant="fullWidth"
        >
          <Tab value="history" label="History" />
          <Tab value="settings" label="Settings" />
        </Tabs>

        <Box sx={{ flexGrow: 1, overflow: "auto" }}>
          {activeTab === "history" && (
            <ChatHistoryContent {...historyPanelProps} onClose={close} />
          )}
          {activeTab === "settings" && (
            <ChatSettingsContent {...settingsPanelProps} onClose={close} />
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

export default MobileUnifiedDrawer;
