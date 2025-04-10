import React from "react";
import { Button, Paper, Stack } from "@mui/material";
import { miniChatOpened } from "./model";

interface MiniChatToolbarProps {
  selectedText: string;
  position: { top: number; left: number };
  onClose: () => void;
}

export const MiniChatToolbar: React.FC<MiniChatToolbarProps> = ({
  selectedText,
  position,
  onClose,
}) => {
  const handleAsk = () => {
    miniChatOpened({
      isInputVisible: true,
    });
    onClose();
  };

  const handleExplain = () => {
    miniChatOpened({
      initialPrompt: `Please explain this to me: ${selectedText}`,
      isInputVisible: true,
    });
    onClose();
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: "absolute",
        top: position.top,
        left: position.left,
        padding: 1,
        zIndex: 2000,
      }}
    >
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="contained" onClick={handleAsk}>
          Ask
        </Button>
        <Button size="small" variant="contained" onClick={handleExplain}>
          Explain
        </Button>
      </Stack>
    </Paper>
  );
};
