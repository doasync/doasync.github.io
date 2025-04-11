import React from "react";
import { Fab, Box } from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { useUnit } from "effector-react";
import { $miniChat, restoreMiniChat } from "./model";

export const MiniChatFAB: React.FC = () => {
  const { isMinimized, isOpen } = useUnit($miniChat);

  // Only show the FAB if the chat is conceptually open but visually minimized
  if (!isOpen || !isMinimized) {
    return null;
  }

  return (
    <Fab
      color="primary"
      aria-label="Restore mini chat"
      sx={{
        position: "absolute", // Change to absolute positioning
        bottom: 16,
        right: 16,
        zIndex: 10000, // Ensure it's above other elements, including the potentially hidden dialog
      }}
      onClick={() => restoreMiniChat()}
    >
      <ChatBubbleOutlineIcon />
    </Fab>
  );
};
