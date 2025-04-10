import React from "react";
import { MiniChatModelSelector } from "@/features/mini-chat/MiniChatModelSelector"; // Import the new component
import { $isMobileDrawerOpen, closeSettingsDrawer } from "@/features/ui-state"; // Import close event
import {
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Tooltip,
  Slider,
  FormControlLabel,
  Switch,
  Toolbar,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close"; // Keep for mobile? Or remove if not needed
import SettingsIcon from "@mui/icons-material/Settings";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useUnit } from "effector-react";
import { $showFreeOnly, setShowFreeOnly } from "@/features/models-select";

interface ChatSettingsPanelProps {
  apiKey: string;
  showApiKey: boolean;
  temperature: number;
  systemPrompt: string;
  currentChatTokens: number;
  handleApiKeyChange: (v: string) => void;
  handleSystemPromptChange: (v: string) => void;
  handleTemperatureChange: (v: number) => void;
  handleClickShowApiKey: () => void;
  handleMouseDownApiKey: (e: React.MouseEvent<HTMLButtonElement>) => void;
  // onClose?: () => void; // Remove optional onClose prop
}

const ChatSettingsPanel: React.FC<ChatSettingsPanelProps> = ({
  apiKey,
  showApiKey,
  temperature,
  systemPrompt,
  currentChatTokens,
  handleApiKeyChange,
  handleSystemPromptChange,
  handleTemperatureChange,
  handleClickShowApiKey,
  handleMouseDownApiKey,
  // onClose, // Remove from destructuring
}) => {
  const showFreeOnlyValue = useUnit($showFreeOnly);
  const isMobileDrawerOpen = useUnit($isMobileDrawerOpen);

  return (
    <Box
      sx={{
        width: { xs: "100%", sm: 360, md: 400 },
        maxWidth: "100%",
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {!isMobileDrawerOpen && (
        <Toolbar
          disableGutters
          variant="dense"
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 2,
          }}
        >
          <Typography variant="h6">Chat Settings</Typography>
          {/* Add dedicated close button for persistent drawer */}
          <IconButton
            onClick={() => closeSettingsDrawer()}
            aria-label="close settings drawer"
            edge="end"
          >
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      )}

      <Divider />

      <Box sx={{ p: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
        <Typography variant="body2" color="text.secondary">
          Total Tokens (Current Chat): {currentChatTokens}
        </Typography>
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Tooltip
          title="Your OpenRouter API Key. Stored locally in your browser."
          placement="left" // Change tooltip placement to avoid overlap
        >
          <TextField
            size="small"
            fullWidth
            label="OpenRouter API Key"
            variant="outlined"
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle api key visibility"
                    onClick={handleClickShowApiKey}
                    onMouseDown={handleMouseDownApiKey}
                    edge="end"
                    size="small"
                  >
                    {showApiKey ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Tooltip>
      </Box>

      <Box sx={{ px: 2 }}>
        <Typography gutterBottom>
          Temperature: {temperature.toFixed(1)}
        </Typography>
        <Tooltip
          title="Controls randomness. Lower values are more deterministic."
          placement="left"
        >
          <Slider
            value={temperature}
            onChange={(_, val) =>
              typeof val === "number" && handleTemperatureChange(val)
            }
            aria-labelledby="temperature-slider"
            step={0.1}
            marks
            min={0.0}
            max={2.0}
          />
        </Tooltip>
      </Box>

      <Box sx={{ px: 2, py: 1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showFreeOnlyValue}
              onChange={(e) => setShowFreeOnly(e.target.checked)}
              color="primary"
            />
          }
          label="Show only free models"
        />
      </Box>

      {/* Add Mini Chat Model Selector Here */}
      <Box sx={{ px: 2, py: 1 }}>
        <MiniChatModelSelector />
      </Box>

      <Divider />

      <Box
        sx={{
          px: 2,
          py: 1,
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography variant="overline" gutterBottom>
          System Prompt
        </Typography>

        <TextField
          fullWidth
          variant="outlined"
          multiline
          value={systemPrompt}
          onChange={(e) => handleSystemPromptChange(e.target.value)}
          sx={{
            "& .MuiInputBase-input": {
              resize: "vertical", // Allow vertical resizing
            },
          }}
          InputProps={{ sx: { height: "100%" } }}
        />
      </Box>
    </Box>
  );
};

export default ChatSettingsPanel;
