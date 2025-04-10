import React, { useState, useEffect } from "react";
import { useUnit } from "effector-react";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import {
  $availableModels,
  $isLoadingModels, // Corrected import name
  fetchModels,
  ModelInfo, // Assuming ModelInfo type is exported from models-select
  $showFreeOnly,
} from "@/features/models-select/model";
import {
  $miniChatModelId,
  miniChatModelSelected,
} from "@/features/mini-chat/model";

export const MiniChatModelSelector: React.FC = () => {
  const [open, setOpen] = useState(false);
  const availableModels = useUnit($availableModels);
  const loading = useUnit($isLoadingModels); // Corrected usage
  const selectedModelId = useUnit($miniChatModelId);
  const showFreeOnly = useUnit($showFreeOnly);

  // Find the selected model object based on the ID
  const selectedModel = React.useMemo(() => {
    return availableModels.find((m) => m.id === selectedModelId) ?? null;
  }, [availableModels, selectedModelId]);

  // Filter models based on "show only free"
  const filteredModels = React.useMemo(() => {
    let list = availableModels;
    if (showFreeOnly) {
      list = list.filter(
        (m) => m.pricing?.prompt === "0" && m.pricing?.completion === "0"
      );
    }
    return list;
  }, [availableModels, showFreeOnly]);

  const handleOpen = () => {
    setOpen(true);
    // Fetch models only if the list is empty
    if (availableModels.length === 0) {
      fetchModels();
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleChange = (
    event: React.SyntheticEvent,
    newValue: ModelInfo | null
  ) => {
    if (newValue) {
      miniChatModelSelected(newValue.id);
    }
  };

  return (
    <Box sx={{ mt: 2, mb: 1 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ mb: 1 }}>
        Mini Chat Model
      </Typography>
      <Autocomplete
        id="mini-chat-model-selector"
        sx={{ width: "100%" }}
        open={open}
        onOpen={handleOpen}
        onClose={handleClose}
        value={selectedModel} // Use the derived model object
        onChange={handleChange}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        getOptionLabel={(option) => option.name || option.id} // Display name, fallback to id
        options={filteredModels} // Use filtered list
        loading={loading} // Use loading state from the store
        renderInput={(params) => (
          <TextField
            {...params}
            label="Select Model"
            variant="outlined"
            size="small"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <React.Fragment>
                  {loading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </React.Fragment>
              ),
            }}
          />
        )}
        // Explicitly render each option to ensure unique key from model ID
        renderOption={(props, option) => (
          <Box component="li" {...props} key={option.id}>
            {option.name || option.id}
          </Box>
        )}
      />
    </Box>
  );
};
