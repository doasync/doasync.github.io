import React, { useState, useMemo } from "react";
import { useMediaQuery, useTheme } from "@mui/material";
import { openMobileDrawer } from "@/features/ui-state";
import { useUnit } from "effector-react";
import {
  Autocomplete, // Added Autocomplete
  TextField,
  Box,
  Typography,
  CircularProgress,
  Tooltip,
  IconButton,
} from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import { styled, lighten, darken, padding } from "@mui/system";
import { openModelInfoAlert } from "@/features/ui-state";
import {
  $availableModels,
  $selectedModelId,
  $isLoadingModels,
  $modelsError,
  modelSelected,
  ModelInfo,
  fetchModels,
  $showFreeOnly,
} from "@/features/models-select";

const GroupHeader = styled("div")(({ theme }) => ({
  position: "sticky",
  top: -8,
  paddingLeft: 16,
  paddingBottom: 1,
  paddingTop: 1,
  color: lighten(theme.palette.secondary.light, 0.4),
  backgroundColor: lighten(theme.palette.secondary.light, 0.9),
  ...theme.applyStyles("dark", {
    backgroundColor: darken(theme.palette.secondary.light, 0.5),
  }),
}));

const GroupItems = styled("ul")({
  padding: 0,
});

export const ModelSelector: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const {
    models,
    selectedModelId,
    isLoading,
    error,
    handleModelSelect,
    retryFetch,
    showFreeOnly,
  } = useUnit({
    models: $availableModels,
    selectedModelId: $selectedModelId,
    isLoading: $isLoadingModels,
    error: $modelsError,
    handleModelSelect: modelSelected,
    retryFetch: fetchModels,
    showFreeOnly: $showFreeOnly,
  });

  const [autocompleteOpen, setAutocompleteOpen] = useState(false); // State for Autocomplete dropdown

  const handleAutocompleteChange = (
    event: React.SyntheticEvent,
    newValue: ModelInfo | null
  ) => {
    if (newValue) {
      handleModelSelect(newValue.id);
    }
  };

  const filteredModels = useMemo(() => {
    let list = models;
    if (showFreeOnly) {
      list = list.filter(
        (m) => m.pricing?.prompt === "0" && m.pricing?.completion === "0"
      );
    }
    return list;
  }, [models, showFreeOnly]); // Removed searchTerm dependency

  const selectedModelName = useMemo(() => {
    const model = models.find((m) => m.id === selectedModelId);
    return model ? model.name.replace(/^[^:]+:\s*/, "") : selectedModelId;
  }, [models, selectedModelId]);

  const selectedModel: ModelInfo | undefined = useMemo(() => {
    return models.find((m) => m.id === selectedModelId);
  }, [models, selectedModelId]);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexGrow: 1,
      }}
    >
      {/* Keep Loading/Error Indicators */}
      {error && !isLoading && (
        <Tooltip title={`Error loading models: ${error}. Click to retry.`}>
          <ErrorOutlineIcon
            color="error"
            sx={{ mr: 1, cursor: "pointer" }}
            onClick={() => retryFetch()}
          />
        </Tooltip>
      )}

      {/* Replace Button/Menu with Autocomplete */}
      <Autocomplete<ModelInfo, false, false, false>
        groupBy={(option) => {
          if (option.created) {
            const date = new Date(option.created * 1000); // Assuming seconds
            return date.toLocaleString("default", {
              month: "long",
              year: "numeric",
            });
          }
          return "Unknown";
        }}
        renderGroup={(params) => (
          <li key={params.key}>
            <GroupHeader>{params.group}</GroupHeader>
            <GroupItems>{params.children}</GroupItems>
          </li>
        )}
        id="appbar-model-selector"
        value={selectedModel ?? null}
        open={autocompleteOpen}
        onOpen={() => setAutocompleteOpen(true)}
        onClose={() => setAutocompleteOpen(false)}
        onChange={handleAutocompleteChange} // Use new handler
        options={filteredModels} // Use the existing filtered list (includes free filter)
        getOptionLabel={(option) =>
          option.name.replace(/^[^:]+:\s*/, "") || option.id
        } // Clean name for display
        isOptionEqualToValue={(option, value) => option.id === value.id}
        loading={isLoading}
        disabled={isLoading || error !== null}
        // disableClearable removed to allow clearing (null value)
        sx={{
          maxWidth: 460,
          flexGrow: 1,
          mx: 0.6,
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined" // Use standard variant for AppBar look
            placeholder="Select Model..."
            // Remove label for cleaner AppBar look
            InputProps={{
              ...params.InputProps,
              style: {
                color: "inherit", // Inherit color from AppBar
                height: "36px", // Adjust height to vertically align better
              },
              endAdornment: (
                <React.Fragment>
                  {params.InputProps.endAdornment}
                </React.Fragment>
              ),
            }}
            // Ensure text doesn't wrap and stays on one line
            inputProps={{
              ...params.inputProps,
              style: {
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                overflow: "hidden",
              },
            }}
          />
        )}
        renderOption={(props, option) => (
          // Use Box with key for proper rendering
          <Box component="li" {...props} key={option.id}>
            {option.name} {/* Show full name in dropdown */}
          </Box>
        )}
        // Removed invalid PaperProps
      />
      {/* Keep Info Button */}
      {!isMobile && (
        <IconButton
          size="small"
          onClick={() => {
            if (isMobile) {
              openMobileDrawer({ tab: "modelInfo" });
            } else {
              openModelInfoAlert();
            }
          }}
          disabled={!selectedModel}
          sx={{ color: "inherit" }} // Ensure icon inherits AppBar color
        >
          <InfoOutlinedIcon />
        </IconButton>
      )}
    </Box>
  );
};
