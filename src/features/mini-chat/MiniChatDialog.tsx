import React, { useState } from "react";
import Draggable from "react-draggable";
import { useUnit } from "effector-react";
import {
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  Divider,
} from "@mui/material";
import {
  $miniChat,
  miniChatMessageSent,
  miniChatClosed,
  miniChatExpanded,
} from "./model";

export const MiniChatDialog: React.FC = () => {
  const miniChat = useUnit($miniChat);
  const sendMessage = useUnit(miniChatMessageSent);
  const closeMiniChat = useUnit(miniChatClosed);
  const expandMiniChat = useUnit(miniChatExpanded);

  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input.trim());
      setInput("");
    }
  };

  if (
    !miniChat.isOpen ||
    (miniChat.messages.length === 0 && !miniChat.initialPrompt)
  ) {
    return null;
  }

  return (
    <Draggable handle=".mini-chat-header">
      <Paper
        elevation={4}
        sx={{
          position: "fixed",
          top: 100,
          left: 100,
          width: 320,
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          zIndex: 2200,
        }}
      >
        <Stack
          spacing={1}
          sx={{ padding: 1, flexShrink: 0 }}
          className="mini-chat-header"
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="subtitle2">Mini Chat Assistant</Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={expandMiniChat}>
              Expand
            </Button>
            <Button size="small" onClick={closeMiniChat}>
              Close
            </Button>
          </Stack>
        </Stack>
        <Divider />
        <Stack spacing={1} sx={{ padding: 1, overflowY: "auto", flexGrow: 1 }}>
          {miniChat.messages.map((msg) => (
            <Paper
              key={msg.id}
              sx={{
                padding: 1,
                backgroundColor:
                  msg.role === "user" ? "primary.light" : "background.paper",
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                wordBreak: "break-word",
              }}
            >
              <Typography variant="body2">{msg.content}</Typography>
            </Paper>
          ))}
        </Stack>
        <Divider />
        <Stack spacing={1} sx={{ padding: 1, flexShrink: 0 }}>
          <TextField
            multiline
            minRows={1}
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            fullWidth
          />
          <Button size="small" variant="contained" onClick={handleSend}>
            Send
          </Button>
        </Stack>
      </Paper>
    </Draggable>
  );
};
