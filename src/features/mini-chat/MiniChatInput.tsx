import React, { useState } from "react";
import { Button, Paper, Stack, TextField } from "@mui/material";
import { useUnit } from "effector-react";
import { miniChatMessageSent, miniChatOpened, miniChatClosed } from "./model";

interface MiniChatInputProps {
  position: { top: number; left: number };
}

export const MiniChatInput: React.FC<MiniChatInputProps> = ({ position }) => {
  const [text, setText] = useState("");
  const sendMessage = useUnit(miniChatMessageSent);
  const closeMiniChat = useUnit(miniChatClosed);

  const handleSend = () => {
    if (text.trim()) {
      sendMessage(text.trim());
      setText("");
    }
  };

  const handleClose = () => {
    closeMiniChat();
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: "absolute",
        top: position.top,
        left: position.left,
        padding: 1,
        zIndex: 2100,
        width: 300,
      }}
    >
      <Stack spacing={1}>
        <TextField
          multiline
          minRows={2}
          maxRows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your question..."
          fullWidth
        />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button size="small" onClick={handleClose}>
            Close
          </Button>
          <Button size="small" variant="contained" onClick={handleSend}>
            Send
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};
