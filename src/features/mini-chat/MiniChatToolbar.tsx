import React from "react";
import { Paper, Button, Stack } from "@mui/material";
import { useUnit } from "effector-react";
import {
  $miniChatToolbar,
  hideMiniChatToolbar,
  $miniChat,
  miniChatOpened, // Keep for Explain flow when chat not open
  updateMiniChatInput,
  sendMiniChatMessage,
  showInlineAskInput, // Import the new event
} from "./model";

const TOOLBAR_WIDTH = 160;

export const MiniChatToolbar: React.FC = () => {
  const toolbar = useUnit($miniChatToolbar);
  const miniChat = useUnit($miniChat);

  if (!toolbar.visible) return null;

  const style: React.CSSProperties = {
    position: "absolute",
    top: toolbar.y + 8,
    left: toolbar.x - TOOLBAR_WIDTH / 2,
    zIndex: 9999,
  };

  const handleAsk = () => {
    if (miniChat.isOpen) {
      updateMiniChatInput(toolbar.selectionText);
    } else {
      // FRD A2: Show inline input first
      showInlineAskInput({
        x: toolbar.x,
        y: toolbar.y,
        initialValue: toolbar.selectionText,
      });
    }
    hideMiniChatToolbar();
  };

  const handleExplain = () => {
    const explainPrompt = `Please explain this to me: ${toolbar.selectionText}`;
    if (miniChat.isOpen) {
      // FRD A4.2: Clicking Explain pastes explanation prompt + selection and immediately sends it.
      // No need to clear input first.
      sendMiniChatMessage(explainPrompt);
    } else {
      miniChatOpened({ initialInput: "" });
      sendMiniChatMessage(explainPrompt);
    }
    hideMiniChatToolbar();
  };

  return (
    <Paper elevation={4} style={style}>
      <Stack direction="row" spacing={1} padding={1}>
        <Button size="small" variant="contained" onClick={handleAsk}>
          Ask
        </Button>
        <Button size="small" variant="outlined" onClick={handleExplain}>
          Explain
        </Button>
      </Stack>
    </Paper>
  );
};
