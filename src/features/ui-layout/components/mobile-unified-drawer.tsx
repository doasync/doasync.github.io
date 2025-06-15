import { Box, Divider, Drawer, Tab, Tabs } from '@mui/material';
import { useUnit } from 'effector-react';
import React from 'react';

import { ChatHistoryContent } from '@/features/chat-history/components/chat-history-content';
import { ChatSettingsContent } from '@/features/chat-settings/components/chat-settings-content';
import type { ModelInfo } from '@/features/models-select';
import { ModelInfoDrawer } from '@/features/models-select/components/model-info-drawer';
import {
  $isMobileDrawerOpen,
  $mobileDrawerTab,
  closeMobileDrawer,
  type DrawerTabs,
  setMobileDrawerTab,
} from '@/features/ui-state';
import { UsageInfoContent } from '@/features/usage-info/components/usage-info-content';

interface MobileUnifiedDrawerProps {
  historyPanelProps: React.ComponentProps<typeof ChatHistoryContent>;
  settingsPanelProps: React.ComponentProps<typeof ChatSettingsContent>;
  modelInfo?: ModelInfo;
}

function MobileUnifiedDrawer({
  historyPanelProps,
  settingsPanelProps,
  modelInfo,
}: MobileUnifiedDrawerProps) {
  const [isOpen, activeTab] = useUnit([$isMobileDrawerOpen, $mobileDrawerTab]);

  return (
    <Drawer
      anchor="bottom"
      open={isOpen}
      onClose={() => closeMobileDrawer()}
      ModalProps={{ keepMounted: true }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 64px)',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, value) => setMobileDrawerTab(value as DrawerTabs)}
          variant="fullWidth"
          indicatorColor="secondary"
          textColor="inherit"
          sx={{
            borderTop: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper',
          }}
        >
          <Tab
            sx={{ fontWeight: activeTab === 'history' ? 'bold' : 'normal' }}
            value="history"
            label="History"
          />
          <Tab
            sx={{ fontWeight: activeTab === 'settings' ? 'bold' : 'normal' }}
            value="settings"
            label="Settings"
          />
          <Tab
            sx={{ fontWeight: activeTab === 'modelInfo' ? 'bold' : 'normal' }}
            value="modelInfo"
            label="Model"
          />
          <Tab
            sx={{ fontWeight: activeTab === 'usage' ? 'bold' : 'normal' }}
            value="usage"
            label="Usage"
          />
        </Tabs>
        <Divider />
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {activeTab === 'history' && (
            <ChatHistoryContent {...historyPanelProps} />
          )}
          {activeTab === 'settings' && (
            <ChatSettingsContent
              {...settingsPanelProps}
              // onClose prop removed as it's not expected by ChatSettingsContent
            />
          )}
          {activeTab === 'modelInfo' && modelInfo && (
            <ModelInfoDrawer model={modelInfo} />
          )}
          {activeTab === 'usage' && (
            <Box p={2}>
              <UsageInfoContent />
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}

export { MobileUnifiedDrawer };
