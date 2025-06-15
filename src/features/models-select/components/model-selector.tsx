import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Autocomplete,
  Box,
  IconButton,
  TextField,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { darken, lighten, styled, type Theme } from '@mui/system';
import { useUnit } from 'effector-react';
import React, { useMemo, useState } from 'react';

import type { ModelInfo } from '@/features/models-select';
import {
  $availableModels,
  $filteredModels,
  $isLoadingModels,
  $modelsError,
  $selectedModelId,
  fetchModels,
  modelSelected,
  modelSelectorFocused, // Import the new event
  openModelInfoAlert,
} from '@/features/models-select';
import { openMobileDrawer } from '@/features/ui-state';

const GroupHeader = styled('div')(({ theme }: { theme: Theme }) => {
  const secondaryLight: string =
    typeof theme.palette.secondary.light === 'string'
      ? theme.palette.secondary.light
      : '#9c27b0'; // Fallback to default Material-UI secondary light color

  return {
    position: 'sticky',
    top: -8,
    paddingLeft: 16,
    paddingBottom: 1,
    paddingTop: 1,
    color: lighten(secondaryLight, 0.4),
    backgroundColor: lighten(secondaryLight, 0.9),
    ...theme.applyStyles('dark', {
      backgroundColor: darken(secondaryLight, 0.5),
    }),
  };
});

const GroupItems = styled('ul')({
  padding: 0,
});

export function ModelSelector() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const {
    allModels,
    models,
    selectedModelId,
    isLoading,
    error,
    handleModelSelect,
    retryFetch,
  } = useUnit({
    allModels: $availableModels, // Keep all models for selected model info
    models: $filteredModels, // Use filtered models for the dropdown
    selectedModelId: $selectedModelId,
    isLoading: $isLoadingModels,
    error: $modelsError,
    handleModelSelect: modelSelected,
    retryFetch: fetchModels,
  });

  const [autocompleteOpen, setAutocompleteOpen] = useState(false); // State for Autocomplete dropdown

  const handleAutocompleteChange = (
    event: React.SyntheticEvent,
    newValue: ModelInfo | null,
  ) => {
    if (newValue) {
      handleModelSelect(newValue.id);
    }
  };

  const selectedModel: ModelInfo | undefined = useMemo(
    () => allModels.find((m) => m.id === selectedModelId),
    [allModels, selectedModelId],
  );

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
      }}
    >
      {/* Keep Loading/Error Indicators */}
      {error && !isLoading && (
        <Tooltip title={`Error loading models: ${error}. Click to retry.`}>
          <ErrorOutlineIcon
            color="error"
            sx={{ mr: 1, cursor: 'pointer' }}
            onClick={() => retryFetch()}
          />
        </Tooltip>
      )}

      {/* Replace Button/Menu with Autocomplete */}
      <Autocomplete<ModelInfo, false, false, false>
        groupBy={(option) => {
          if (option.created) {
            const date = new Date(option.created * 1000); // Assuming seconds
            return date.toLocaleString('default', {
              month: 'long',
              year: 'numeric',
            });
          }
          return 'Unknown';
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
        onOpen={() => {
          setAutocompleteOpen(true);
          modelSelectorFocused(true); // Trigger event on open
        }}
        onClose={() => {
          setAutocompleteOpen(false);
          modelSelectorFocused(false); // Trigger event on close
        }}
        onChange={handleAutocompleteChange} // Use new handler
        options={models} // Use the pre-filtered models from store
        // TODO: Why is there no option.name?
        getOptionLabel={(option) =>
          option.name ? option.name.replace(/^[^:]+:\s*/, '') : option.id
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
                color: 'inherit', // Inherit color from AppBar
                height: '36px', // Adjust height to vertically align better
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
              openMobileDrawer({ tab: 'modelInfo' });
            } else {
              openModelInfoAlert();
            }
          }}
          disabled={!selectedModel}
          sx={{ color: 'inherit' }} // Ensure icon inherits AppBar color
        >
          <InfoOutlinedIcon />
        </IconButton>
      )}
    </Box>
  );
}
