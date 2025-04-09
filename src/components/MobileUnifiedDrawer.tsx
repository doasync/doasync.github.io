import React from "react";
import { Drawer, Tabs, Tab, Box, Divider } from "@mui/material";
import { useUnit } from "effector-react";
import {
  $isMobileDrawerOpen,
  $mobileDrawerTab,
  closeMobileDrawer,
  setMobileDrawerTab,
} from "@/features/ui-state";

import ChatHistoryContent from "@/components/ChatHistoryContent";
import UsageInfoContent from "@/components/UsageInfoContent";
import ChatSettingsContent from "@/components/ChatSettingsContent";
import ModelInfoDrawer from "@/components/ModelInfoDrawer";
import type { ModelInfo } from "@/features/models-select";

interface MobileUnifiedDrawerProps {
  historyPanelProps: React.ComponentProps<typeof ChatHistoryContent>;
  settingsPanelProps: React.ComponentProps<typeof ChatSettingsContent>;
  modelInfo?: ModelInfo;
}

const MobileUnifiedDrawer: React.FC<MobileUnifiedDrawerProps> = ({
  historyPanelProps,
  settingsPanelProps,
  modelInfo,
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
          indicatorColor="secondary"
          textColor="inherit"
          sx={{
            backgroundColor: "background.paper",
          }}
        >
          <Tab
            sx={{ fontWeight: activeTab === "history" ? "bold" : "normal" }}
            value="history"
            label="History"
          />
          <Tab
            sx={{ fontWeight: activeTab === "modelInfo" ? "bold" : "normal" }}
            value="modelInfo"
            label="Model"
          />
          <Tab
            sx={{ fontWeight: activeTab === "settings" ? "bold" : "normal" }}
            value="settings"
            label="Settings"
          />
          <Tab
            sx={{ fontWeight: activeTab === "usage" ? "bold" : "normal" }}
            value="usage"
            label="Usage"
          />
        </Tabs>
        <Divider />
        <Box sx={{ flexGrow: 1, overflow: "auto" }}>
          {activeTab === "history" && (
            <ChatHistoryContent {...historyPanelProps} />
          )}
          {activeTab === "settings" && (
            <ChatSettingsContent
              {...settingsPanelProps}
              // onClose prop removed as it's not expected by ChatSettingsContent
            />
          )}
          {activeTab === "modelInfo" && modelInfo && (
            <ModelInfoDrawer model={modelInfo} />
          )}
          {activeTab === "usage" && (
            <Box p={2}>
              <UsageInfoContent />
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

export default MobileUnifiedDrawer;
