import React from "react";
import { closeSettingsDrawer } from "@/features/ui-state"; // Import close event
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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close"; // Keep for mobile? Or remove if not needed
import ChevronRightIcon from "@mui/icons-material/ChevronRight"; // Import icon for desktop close
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
  const [showFreeOnlyValue, setShowFreeOnlyValue] = useUnit([
    $showFreeOnly,
    setShowFreeOnly,
  ]);

  return (
    <Box
      sx={{
        width: { xs: "100%", sm: 360, md: 400 },
        maxWidth: "100%",
        p: 2,
        flexGrow: 1,
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
        {/* Add dedicated close button for persistent drawer */}
        <IconButton
          onClick={() => closeSettingsDrawer()}
          size="small"
          aria-label="close settings drawer"
        >
          <ChevronRightIcon />
        </IconButton>
        {/* Keep original close button for mobile if needed, otherwise remove */}
        {/* {onClose && (
          <IconButton
            onClick={onClose}
            aria-label="close settings"
            size="small"
          >
            <CloseIcon />
          </IconButton>
        )} */}
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
            onChange={(_, val) =>
              typeof val === "number" && handleTemperatureChange(val)
            }
            aria-labelledby="temperature-slider"
            valueLabelDisplay="auto"
            step={0.1}
            marks
            min={0.0}
            max={2.0}
          />
        </Tooltip>
      </Box>

      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showFreeOnlyValue}
              onChange={(e) => setShowFreeOnlyValue(e.target.checked)}
              color="primary"
            />
          }
          label="Show only free models"
        />
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
            rows={6}
            value={systemPrompt}
            onChange={(e) => handleSystemPromptChange(e.target.value)}
            sx={{ flexGrow: 1 }}
            InputProps={{ sx: { height: "100%" } }}
          />
        </Tooltip>
      </Box>

      <Box sx={{ mt: "auto", pt: 2, borderTop: 1, borderColor: "divider" }}>
        <Typography variant="body2" color="text.secondary">
          Total Tokens (Current Chat): {currentChatTokens}
        </Typography>
      </Box>
    </Box>
  );
};

export default ChatSettingsPanel;
