import React from "react";
import { Paper, Button, Stack } from "@mui/material";
import { useUnit } from "effector-react";
import {
  $miniChatToolbar,
  hideMiniChatToolbar,
  $miniChat,
  miniChatOpened,
  updateMiniChatInput,
  sendMiniChatMessage,
  restoreMiniChat, // Import restore event
} from "./model";

export const MiniChatToolbar: React.FC = () => {
  const toolbar = useUnit($miniChatToolbar);
  const miniChat = useUnit($miniChat);

  if (!toolbar.visible) return null;

  const handleAsk = () => {
    // Restore if minimized before proceeding
    if (miniChat.isMinimized) {
      restoreMiniChat();
    }

    if (miniChat.isOpen) {
      // If already open, just update the input (quoting)
      updateMiniChatInput(
        miniChat.input === ""
          ? `> ${toolbar.selectionText}\n`
          : `${miniChat.input}\n> ${toolbar.selectionText}\n`
      );
    } else {
      // If closed, open it with the quoted text and position
      miniChatOpened({
        initialInput:
          miniChat.input === ""
            ? `> ${toolbar.selectionText}\n`
            : `${miniChat.input}\n> ${toolbar.selectionText}\n`,
        startCompact: true, // Signal to start compact
        x: toolbar.x, // Pass initial position X
        y: toolbar.y, // Pass initial position Y
      });
    }
    // Clear the window selection before hiding the toolbar
    window.getSelection()?.removeAllRanges();
    // Hide the toolbar regardless of whether the chat was opened or just updated
    hideMiniChatToolbar();
  };

  const handleExplain = () => {
    // Restore if minimized before proceeding
    if (miniChat.isMinimized) {
      restoreMiniChat();
    }

    const explainPrompt = `Please explain this to me: ${toolbar.selectionText}`;
    if (miniChat.isOpen) {
      // Clicking Explain pastes explanation prompt + selection and immediately sends it.
      // No need to clear input first.
      sendMiniChatMessage(explainPrompt);
    } else {
      miniChatOpened({ initialInput: "" });
      sendMiniChatMessage(explainPrompt);
    }
    // Clear the window selection before hiding the toolbar
    window.getSelection()?.removeAllRanges();
    hideMiniChatToolbar();
  };

  return (
    <Paper
      elevation={4}
      sx={{
        position: "absolute",
        top: toolbar.y, // Use coordinates directly from hook (offset is calculated there)
        left: toolbar.x, // Use coordinates directly from hook (offset is calculated there)
        zIndex: 9999,
      }}
    >
      <Stack direction="column" spacing={1} padding={1}>
        <Button size="small" variant="contained" onClick={handleAsk}>
          {miniChat.isOpen ? "Quote" : "Ask"} {/* Dynamic label */}
        </Button>
        {/* Conditionally render Explain button only if mini-chat input is empty */}
        {!miniChat.input.trim() && (
          <Button
            size="small"
            variant="contained"
            color="secondary"
            onClick={handleExplain}
          >
            Explain
          </Button>
        )}
      </Stack>
    </Paper>
  );
};
