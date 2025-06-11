import React from "react";
import { MiniChatModelSelector } from "@/features/mini-chat/MiniChatModelSelector"; // Import the new component
import { $isMobileDrawerOpen, closeSettingsDrawer } from "@/features/ui-state"; // Import close event
import { ProviderUrlTest } from "./ProviderUrlTest";
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
import {
  $showFreeOnly,
  setShowFreeOnly,
  $availableModels,
  $autoTitleModelId,
  autoTitleModelSelected,
} from "@/features/models-select/model";
import Autocomplete from "@mui/material/Autocomplete";

interface ChatSettingsPanelProps {
  apiKey: string;
  providerApiUrl: string;
  showApiKey: boolean;
  temperature: number;
  systemPrompt: string;
  currentChatTokens: number;
  handleApiKeyChange: (v: string) => void;
  handleProviderApiUrlChange: (v: string) => void;
  handleSystemPromptChange: (v: string) => void;
  handleTemperatureChange: (v: number) => void;
  handleClickShowApiKey: () => void;
  handleMouseDownApiKey: (e: React.MouseEvent<HTMLButtonElement>) => void;
  // onClose?: () => void; // Remove optional onClose prop
}

const ChatSettingsPanel: React.FC<ChatSettingsPanelProps> = ({
  apiKey,
  providerApiUrl,
  showApiKey,
  temperature,
  systemPrompt,
  currentChatTokens,
  handleApiKeyChange,
  handleProviderApiUrlChange,
  handleSystemPromptChange,
  handleTemperatureChange,
  handleClickShowApiKey,
  handleMouseDownApiKey,
  // onClose, // Remove from destructuring
}) => {
  // We need setShowFreeOnly, but will manage checked state locally to avoid hydration issues
  const setShowFreeOnlyEvent = useUnit(setShowFreeOnly);
  // Local state for the switch, default to false for consistent server/initial client render
  const [isSwitchChecked, setIsSwitchChecked] = React.useState(false);
  const isMobileDrawerOpen = useUnit($isMobileDrawerOpen);

  const [autoTitleModelId, availableModels] = useUnit([
    $autoTitleModelId,
    $availableModels,
  ]);

  const selectedAutoTitleModel = React.useMemo(
    () => availableModels.find((m) => m.id === autoTitleModelId) ?? null,
    [availableModels, autoTitleModelId]
  );

  // Effect to sync local switch state with persisted Effector state *after* hydration
  React.useEffect(() => {
    // Read the actual value from the store *after* the component has mounted
    const persistedValue = $showFreeOnly.getState();
    setIsSwitchChecked(persistedValue);
  }, []); // Empty dependency array ensures this runs only once on the client after mount

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

      <Box sx={{ px: 2, pt: 2 }}>
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

      <Divider />

      <Box sx={{ p: 2, pb: 1 }}>
        <Tooltip
          title="API base URL for your OpenAI-compatible provider."
          placement="left"
        >
          <TextField
            size="small"
            fullWidth
            label="Provider API URL"
            variant="outlined"
            value={providerApiUrl}
            onChange={(e) => handleProviderApiUrlChange(e.target.value)}
            placeholder="https://api.voidai.app/v1"
            sx={{ mb: 2 }}
          />
        </Tooltip>
        <Tooltip
          title="Your Provider API Key. Stored locally in your browser."
          placement="left"
        >
          <TextField
            size="small"
            fullWidth
            label="Provider API Key"
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

        {/* Add Provider URL Test component */}
        <Box sx={{ mt: 1 }}>
          <ProviderUrlTest />
        </Box>
      </Box>

      {/* Show "Show only free models" toggle only for OpenRouter */}
      {providerApiUrl.includes('openrouter.ai') && (
        <Box sx={{ px: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isSwitchChecked} // Use local state for checked status
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setIsSwitchChecked(newValue); // Update local state immediately
                  setShowFreeOnlyEvent(newValue); // Update the persisted Effector store
                }}
                color="primary"
              />
            }
            label="Show only free models"
          />
        </Box>
      )}

      {/* Add Mini Chat Model Selector Here */}
      <Box sx={{ px: 2, py: 1 }}>
        <MiniChatModelSelector />
      </Box>

      <Box sx={{ px: 2, pb: 2, pt: 1 }}>
        <Autocomplete
          size="small"
          options={availableModels}
          groupBy={(
            option: import("@/features/models-select/model").ModelInfo
          ) => {
            if (option.created) {
              const date = new Date(option.created * 1000);
              return date.toLocaleString("default", {
                month: "long",
                year: "numeric",
              });
            }
            return "Unknown";
          }}
          // TODO: Why is there no model.name?
          getOptionLabel={(option) =>
            option.name ? option.name.replace(/^[^:]+:\s*/, "") : option.id
          }
          value={selectedAutoTitleModel}
          onChange={(_, newValue) => {
            if (newValue) {
              autoTitleModelSelected(newValue.id);
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="AutoTitle Model"
              variant="outlined"
              fullWidth
            />
          )}
          isOptionEqualToValue={(option, value) => option.id === value.id}
        />
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
