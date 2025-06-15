import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import { useUnit } from 'effector-react';
import React, { useState } from 'react';

import {
  $availableModels,
  $isLoadingModels, // Corrected import name
  $showFreeOnly,
  fetchModels,
} from '@/features/models-select';
import type { ModelInfo } from '@/features/models-select/types';

import { $miniChatModelId, miniChatModelSelected } from './model';

export function MiniChatModelSelector() {
  const [open, setOpen] = useState(false);
  const availableModels = useUnit($availableModels);
  const loading = useUnit($isLoadingModels); // Corrected usage
  const selectedModelId = useUnit($miniChatModelId);
  const showFreeOnly = useUnit($showFreeOnly);

  // Find the selected model object based on the ID
  const selectedModel = React.useMemo(
    () => availableModels.find((m) => m.id === selectedModelId) ?? null,
    [availableModels, selectedModelId],
  );

  // Filter models based on "show only free"
  const filteredModels = React.useMemo(() => {
    let list = availableModels;
    if (showFreeOnly) {
      list = list.filter(
        (m) => m.pricing?.prompt === '0' && m.pricing?.completion === '0',
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
    _event: React.SyntheticEvent,
    newValue: ModelInfo | null,
  ) => {
    if (newValue) {
      miniChatModelSelected(newValue.id);
    }
  };

  return (
    <Box sx={{ my: 1 }}>
      <Autocomplete
        id="mini-chat-model-selector"
        sx={{ width: '100%' }}
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
            label="Mini-Chat Model"
            variant="outlined"
            size="small"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
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
}
