import React, { useState, useMemo } from 'react';
import { useUnit } from 'effector-react';
import {
    Button, Menu, MenuItem, TextField, Box, Typography, CircularProgress, Tooltip, ListSubheader
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {
    $availableModels,
    $selectedModelId,
    $isLoadingModels,
    $modelsError,
    modelSelected,
    ModelInfo, // Import the type
    fetchModels, // To potentially add a retry button
} from '@/model/models';

export const ModelSelector: React.FC = () => {
    const {
        models,
        selectedModelId,
        isLoading,
        error,
        handleModelSelect,
        retryFetch,
    } = useUnit({
        models: $availableModels,
        selectedModelId: $selectedModelId,
        isLoading: $isLoadingModels,
        error: $modelsError,
        handleModelSelect: modelSelected,
        retryFetch: fetchModels, // Use fetchModels event to retry
    });

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
        setSearchTerm(''); // Reset search on close
    };

    const handleMenuItemClick = (modelId: string) => {
        handleModelSelect(modelId);
        handleClose();
    };

    const filteredModels = useMemo(() => {
        if (!searchTerm) {
            return models;
        }
        const lowerCaseSearch = searchTerm.toLowerCase();
        return models.filter(model =>
            model.name.toLowerCase().includes(lowerCaseSearch) ||
            model.id.toLowerCase().includes(lowerCaseSearch)
        );
    }, [models, searchTerm]);

    const selectedModelName = useMemo(() => {
        const model = models.find(m => m.id === selectedModelId);
        return model ? model.name : selectedModelId; // Show ID if name not found (e.g., during initial load)
    }, [models, selectedModelId]);

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isLoading && <CircularProgress size={20} sx={{ mr: 1 }} />}
            {error && !isLoading && (
                <Tooltip title={`Error loading models: ${error}. Click to retry.`}>
                    <ErrorOutlineIcon color="error" sx={{ mr: 1, cursor: 'pointer' }} onClick={() => retryFetch()} />
                </Tooltip>
            )}
            <Button
                id="model-selector-button"
                aria-controls={open ? 'model-selector-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                onClick={handleClick}
                endIcon={<KeyboardArrowDownIcon />}
                disabled={isLoading || error !== null} // Disable button if loading or if an error exists
                sx={{ textTransform: 'none', color: 'inherit' }} // Keep AppBar color
            >
                <Typography variant="h6" component="span" noWrap sx={{ maxWidth: '250px' }}> {/* Limit width */}
                    {selectedModelName}
                </Typography>
            </Button>
            <Menu
                id="model-selector-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{
                    'aria-labelledby': 'model-selector-button',
                }}
                PaperProps={{
                    style: {
                        maxHeight: 400, // Limit menu height
                        width: '35ch', // Set a reasonable width
                    },
                }}
            >
                {/* Sticky Search Input */}
                <ListSubheader>
                    <TextField
                        fullWidth
                        placeholder="Search models..."
                        variant="standard"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()} // Prevent menu close on click inside textfield
                        sx={{ px: 2, py: 1 }}
                        autoFocus
                    />
                </ListSubheader>
                {filteredModels.length > 0 ? (
                    filteredModels.map((model) => (
                        <MenuItem
                            key={model.id}
                            selected={model.id === selectedModelId}
                            onClick={() => handleMenuItemClick(model.id)}
                            title={model.description} // Show description on hover
                        >
                            {model.name}
                        </MenuItem>
                    ))
                ) : (
                    <MenuItem disabled>No models found</MenuItem>
                )}
            </Menu>
        </Box>
    );
};