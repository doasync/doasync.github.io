import React, { useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Slider,
  IconButton,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useUnit } from "effector-react";
import {
  $apiKey,
  $temperature,
  $systemPrompt,
  apiKeyChanged,
  temperatureChanged,
  systemPromptChanged,
  // We'll need UI state management later for open/close
} from "@/features/chat-settings";
import { $currentChatTokens } from "@/features/chat";

interface ChatSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  // TODO: Add currentChatTokens prop later
}

export const ChatSettingsDrawer: React.FC<ChatSettingsDrawerProps> = ({
  open,
  onClose,
}) => {
  const [showApiKey, setShowApiKey] = useState(false);

  // Connect to Effector stores and events
  const {
    apiKey,
    temperature,
    systemPrompt,
    currentChatTokens,
    handleApiKeyChange,
    handleTemperatureChange,
    handleSystemPromptChange,
  } = useUnit({
    apiKey: $apiKey,
    temperature: $temperature,
    systemPrompt: $systemPrompt,
    currentChatTokens: $currentChatTokens,
    handleApiKeyChange: apiKeyChanged,
    handleTemperatureChange: temperatureChanged,
    handleSystemPromptChange: systemPromptChanged,
  });

  const handleClickShowApiKey = () => setShowApiKey((show) => !show);
  const handleMouseDownApiKey = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault(); // Prevent focus shift on button click
  };

  // Handler for Slider which expects number | number[]
  const onSliderChange = (event: Event, newValue: number | number[]) => {
    if (typeof newValue === "number") {
      handleTemperatureChange(newValue);
    }
  };

  // Handler for TextField which gives string
  const onTextFieldChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    handler: (value: string) => void
  ) => {
    handler(event.target.value);
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box
        sx={{
          width: 300,
          p: 2,
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h6">Chat Settings</Typography>
          <IconButton onClick={onClose} aria-label="close settings">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Tooltip
            title="Your OpenRouter API Key. Stored locally in your browser."
            placement="top"
          >
            <TextField
              fullWidth
              label="OpenRouter API Key"
              variant="outlined"
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => onTextFieldChange(e, handleApiKeyChange)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle api key visibility"
                      onClick={handleClickShowApiKey}
                      onMouseDown={handleMouseDownApiKey}
                      edge="end"
                    >
                      {showApiKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Tooltip>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom>
            Temperature: {temperature.toFixed(1)}
          </Typography>
          <Tooltip
            title="Controls randomness. Lower values are more deterministic."
            placement="top"
          >
            <Slider
              value={temperature}
              onChange={onSliderChange}
              aria-labelledby="temperature-slider"
              valueLabelDisplay="auto"
              step={0.1}
              marks
              min={0.0}
              max={2.0}
            />
          </Tooltip>
        </Box>

        <Box
          sx={{ mb: 3, flexGrow: 1, display: "flex", flexDirection: "column" }}
        >
          <Typography gutterBottom>System Prompt</Typography>
          <Tooltip
            title="Instructions for the AI model's behavior."
            placement="top"
          >
            <TextField
              fullWidth
              label="System Prompt"
              variant="outlined"
              multiline
              rows={6} // Adjust as needed
              value={systemPrompt}
              onChange={(e) => onTextFieldChange(e, handleSystemPromptChange)}
              sx={{ flexGrow: 1 }}
              InputProps={{ sx: { height: "100%" } }} // Make input fill height
            />
          </Tooltip>
        </Box>

        {/* Placeholder for Token Count - Logic will be added later */}
        <Box sx={{ mt: "auto", pt: 2, borderTop: 1, borderColor: "divider" }}>
          <Typography variant="body2" color="text.secondary">
            Total Tokens (Current Chat): {currentChatTokens}
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};
