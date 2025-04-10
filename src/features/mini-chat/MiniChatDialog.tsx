import React, { useState } from "react";
import { useUnit } from "effector-react";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";

import {
  $availableModels,
  $selectedModelId,
  $isLoadingModels,
  fetchModels,
  modelSelected,
} from "../models-select/model";
import {
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  Divider,
  IconButton,
} from "@mui/material";
import {
  $miniChat,
  miniChatMessageSent,
  miniChatClosed,
  miniChatExpanded,
} from "./model";
import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";

// Custom draggable implementation to avoid react-draggable type issues
const useDraggable = (initialPosition = { x: 100, y: 100 }) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);

  const handleStart = () => setIsDragging(true);
  const handleStop = () => setIsDragging(false);
  const handleDrag = (e: React.MouseEvent, data: { x: number; y: number }) => {
    setPosition({ x: data.x, y: data.y });
  };

  return {
    position,
    isDragging,
    dragHandlers: {
      onMouseDown: handleStart,
      onMouseUp: handleStop,
      onMouseLeave: handleStop,
      onMouseMove: (e: React.MouseEvent) => {
        if (isDragging) {
          handleDrag(e, {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
          });
        }
      },
    },
  };
};

export const MiniChatDialog: React.FC = () => {
  const miniChat = useUnit($miniChat);
  const sendMessage = useUnit(miniChatMessageSent);
  const closeMiniChat = useUnit(miniChatClosed);
  const expandMiniChat = useUnit(miniChatExpanded);

  const [input, setInput] = useState("");
  const { position, dragHandlers } = useDraggable();

  const [open, setOpen] = useState(false);

  const [models, selectedModelId, isLoading] = useUnit([
    $availableModels,
    $selectedModelId,
    $isLoadingModels,
  ]);

  const fetch = useUnit(fetchModels);
  const selectModel = useUnit(modelSelected);

  const handleSend = () => {
    console.debug("MiniChatDialog: Send clicked", input);
    if (input.trim()) {
      sendMessage(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    console.debug("MiniChatDialog: KeyDown", e.key);
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (models.length === 0) {
      fetch();
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const currentModel = models.find((m) => m.id === selectedModelId) ?? null;

  if (!miniChat.isOpen) return null;

  // Input-only mode (Ask flow)
  if (miniChat.showOnlyInput) {
    return (
      <Paper
        elevation={4}
        sx={{
          position: "fixed",
          width: 320,
          padding: 1,
          zIndex: 9999,
          top: "100px",
          left: "100px",
          cursor: "move",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          className="mini-chat-input-handle"
          sx={{ padding: 1 }}
        >
          <Typography variant="subtitle2">Ask Assistant</Typography>
          <IconButton
            size="small"
            onClick={() => {
              console.debug("MiniChatDialog: Close clicked");
              closeMiniChat();
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={1}
          maxRows={4}
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setInput(e.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder="Type your question..."
          sx={{ mt: 1 }}
        />
        <Stack
          direction="row"
          justifyContent="flex-end"
          spacing={1}
          sx={{ mt: 1 }}
        >
          <Button size="small" onClick={closeMiniChat}>
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleSend}
            disabled={!input.trim()}
          >
            Send
          </Button>
        </Stack>
      </Paper>
    );
  }

  // Full dialog mode
  return (
    <Paper
      elevation={4}
      sx={{
        position: "fixed",
        width: 320,
        maxHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        zIndex: 9999,
        top: "100px",
        left: "100px",
        cursor: "move",
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
        <Typography variant="subtitle2">Mini Chat</Typography>
        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            onClick={() => {
              console.debug("MiniChatDialog: Expand clicked");
              expandMiniChat();
            }}
          >
            <OpenInFullIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              console.debug("MiniChatDialog: Close clicked");
              closeMiniChat();
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
      <Stack sx={{ px: 1, py: 0.5 }}>
        <Autocomplete
          sx={{ width: "100%" }}
          open={open}
          onOpen={handleOpen}
          onClose={handleClose}
          value={currentModel}
          onChange={(_, newValue) => {
            if (newValue) {
              selectModel(newValue.id);
            }
          }}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          getOptionLabel={(option) => option.name}
          options={models}
          loading={isLoading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Model"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {isLoading ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      </Stack>
      <Divider />
      <Stack spacing={1} sx={{ padding: 1, overflowY: "auto", flexGrow: 1 }}>
        {miniChat.initialPrompt && (
          <Paper
            sx={{
              padding: 1,
              backgroundColor: "primary.light",
              alignSelf: "flex-end",
              maxWidth: "85%",
              wordBreak: "break-word",
            }}
          >
            <Typography variant="body2">{miniChat.initialPrompt}</Typography>
          </Paper>
        )}
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
          autoFocus
          multiline
          minRows={1}
          maxRows={4}
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setInput(e.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          fullWidth
        />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button size="small" onClick={closeMiniChat}>
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
