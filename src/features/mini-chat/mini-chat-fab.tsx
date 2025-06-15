import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { Fab } from '@mui/material';
import { useUnit } from 'effector-react';
import React from 'react';

import { $isMobileDrawerOpen } from '@/features/ui-state'; // Import drawer state

import { $miniChat, restoreMiniChat } from './model';

export function MiniChatFAB(): React.JSX.Element | null {
  const { isMinimized, isOpen } = useUnit($miniChat);
  const isMobileDrawerOpen = useUnit($isMobileDrawerOpen); // Get drawer state
  // Debugging log - Removing this now
  // console.log('MiniChatFAB Render Check:', { isOpen, isMinimized, isMobileDrawerOpen });

  // Only show the FAB if the chat is conceptually open but visually minimized
  // Only show the FAB if the chat is conceptually open but visually minimized AND the mobile drawer is closed
  if (!isOpen || !isMinimized || isMobileDrawerOpen) {
    return null;
  }

  return (
    <Fab
      color="primary"
      aria-label="Restore mini chat"
      sx={{
        position: 'sticky', // Use sticky to keep it fixed relative to scroll container
        bottom: 0, // Adjusted to avoid overlap with the bottom bar
        right: 0,
        zIndex: 10_000, // Ensure it's above other elements, including the potentially hidden dialog
        alignSelf: 'flex-end', // Override parent centering
        flexShrink: 0, // Prevent shrinking
      }}
      onClick={() => restoreMiniChat()}
    >
      <ChatBubbleOutlineIcon />
    </Fab>
  );
}
