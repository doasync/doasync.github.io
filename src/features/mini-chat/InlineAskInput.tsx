import React from "react";
import { useUnit } from "effector-react";
import { Paper, TextField, IconButton, Stack, Box } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import {
  $inlineAskInput,
  hideInlineAskInput,
  updateInlineAskInputValue,
  submitInlineAskInput,
} from "./model";

const INPUT_WIDTH = 250; // Adjust as needed

export const InlineAskInput: React.FC = () => {
  const { visible, x, y, value } = useUnit($inlineAskInput);

  if (!visible) {
    return null;
  }

  const style: React.CSSProperties = {
    position: "absolute",
    // Position slightly differently than the toolbar to avoid overlap
    top: y + 4,
    // Center the input box approximately where the toolbar was
    left: x - INPUT_WIDTH / 2,
    zIndex: 10000, // Ensure it's above the toolbar if they briefly overlap
    width: INPUT_WIDTH,
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateInlineAskInputValue(event.target.value);
  };

  const handleSubmit = () => {
    if (value.trim()) {
      submitInlineAskInput(value);
      // hideInlineAskInput(); // Hiding is now handled by the submitInlineAskInput sample in model.ts
    }
  };

  const handleClose = () => {
    hideInlineAskInput();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault(); // Prevent newline in single-line input
      handleSubmit();
    } else if (event.key === "Escape") {
      handleClose();
    }
  };

  return (
    <Paper elevation={5} style={style} sx={{ p: 0.5, borderRadius: 1 }}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <TextField
          variant="outlined"
          size="small"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoFocus
          fullWidth
          sx={{
            // Reduce padding for a more compact look
            "& .MuiOutlinedInput-root": {
              paddingRight: "4px", // Space for buttons
              borderRadius: 1,
            },
            "& .MuiOutlinedInput-input": {
              padding: "6px 8px", // Adjust vertical padding
            },
          }}
        />
        <IconButton
          size="small"
          color="primary"
          onClick={handleSubmit}
          title="Send (Enter)"
        >
          <SendIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={handleClose} title="Close (Escape)">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Paper>
  );
};
