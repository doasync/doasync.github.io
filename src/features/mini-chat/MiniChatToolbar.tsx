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
} from "./model";

export const MiniChatToolbar: React.FC = () => {
  const toolbar = useUnit($miniChatToolbar);
  const miniChat = useUnit($miniChat);

  if (!toolbar.visible) return null;

  const handleAsk = () => {
    if (miniChat.isOpen) {
      updateMiniChatInput(`> ${toolbar.selectionText}\n\n` + miniChat.input);
    } else {
      // Open the dialog directly, starting in compact mode
      miniChatOpened({
        initialInput: `> ${toolbar.selectionText}\n\n`,
        startCompact: true, // Signal to start compact
      });
    }
    hideMiniChatToolbar();
  };

  const handleExplain = () => {
    const explainPrompt = `Please explain this to me: ${toolbar.selectionText}`;
    if (miniChat.isOpen) {
      // Clicking Explain pastes explanation prompt + selection and immediately sends it.
      // No need to clear input first.
      sendMiniChatMessage(explainPrompt);
    } else {
      miniChatOpened({ initialInput: "" });
      sendMiniChatMessage(explainPrompt);
    }
    hideMiniChatToolbar();
  };

  return (
    <Paper
      elevation={4}
      sx={{
        position: "absolute",
        top: toolbar.y + 8,
        left: toolbar.x - 40,
        zIndex: 9999,
      }}
    >
      <Stack direction="column" spacing={1} padding={1}>
        <Button size="small" variant="contained" onClick={handleAsk}>
          Ask
        </Button>
        <Button
          size="small"
          variant="contained"
          color="secondary"
          onClick={handleExplain}
        >
          Explain
        </Button>
      </Stack>
    </Paper>
  );
};
