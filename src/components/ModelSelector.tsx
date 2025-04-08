import React, { useState, useMemo } from "react";
import { useMediaQuery, useTheme } from "@mui/material";
import { openMobileDrawer } from "@/features/ui-state";
import { useUnit } from "effector-react";
import {
  Button,
  Menu,
  MenuItem,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Tooltip,
  ListSubheader,
  InputAdornment,
  IconButton,
  Drawer,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SearchIcon from "@mui/icons-material/Search";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ModelInfoDrawer from "./ModelInfoDrawer";
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

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearchTerm("");
  };

  const handleMenuItemClick = (modelId: string) => {
    handleModelSelect(modelId);
    handleClose();
  };

  const filteredModels = useMemo(() => {
    let list = models;
    if (showFreeOnly) {
      list = list.filter(
        (m) => m.pricing?.prompt === "0" && m.pricing?.completion === "0"
      );
    }
    if (!searchTerm) return list;
    const lower = searchTerm.toLowerCase();
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(lower) ||
        m.id.toLowerCase().includes(lower)
    );
  }, [models, searchTerm, showFreeOnly]);

  const selectedModelName = useMemo(() => {
    const model = models.find((m) => m.id === selectedModelId);
    return model ? model.name.replace(/^[^:]+:\s*/, "") : selectedModelId;
  }, [models, selectedModelId]);

  const selectedModel: ModelInfo | undefined = useMemo(() => {
    return models.find((m) => m.id === selectedModelId);
  }, [models, selectedModelId]);

  return (
    <Box
      sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {isLoading && <CircularProgress size={20} sx={{ mr: 1 }} />}
      {error && !isLoading && (
        <Tooltip title={`Error loading models: ${error}. Click to retry.`}>
          <ErrorOutlineIcon
            color="error"
            sx={{ mr: 1, cursor: "pointer" }}
            onClick={() => retryFetch()}
          />
        </Tooltip>
      )}
      <Button
        id="model-selector-button"
        aria-controls={open ? "model-selector-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
        endIcon={<KeyboardArrowDownIcon />}
        disabled={isLoading || error !== null}
        sx={{ textTransform: "none", color: "inherit" }}
      >
        <Typography
          variant="h6"
          component="span"
          noWrap
          sx={{ maxWidth: "250px" }}
        >
          {" "}
          {selectedModelName}
        </Typography>
      </Button>
      <IconButton
        onClick={() => {
          if (isMobile) {
            openMobileDrawer({ tab: "modelInfo" });
          } else {
            setInfoOpen(true);
          }
        }}
        disabled={!selectedModel}
      >
        <InfoOutlinedIcon />
      </IconButton>
      <Menu
        id="model-selector-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        disableAutoFocusItem
        MenuListProps={{
          "aria-labelledby": "model-selector-button",
        }}
        PaperProps={{
          style: {
            maxHeight: 400,
            width: "35ch",
          },
        }}
      >
        <ListSubheader sx={{ padding: 0 }}>
          <TextField
            fullWidth
            placeholder="Search models..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            sx={{ px: 2, py: 1 }}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </ListSubheader>
        {filteredModels.length > 0 ? (
          filteredModels.map((model) => (
            <MenuItem
              key={model.id}
              selected={model.id === selectedModelId}
              onClick={() => handleMenuItemClick(model.id)}
              title={model.description}
            >
              {model.name}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>No models found</MenuItem>
        )}
      </Menu>
      <Drawer anchor="right" open={infoOpen} onClose={() => setInfoOpen(false)}>
        {selectedModel && <ModelInfoDrawer model={selectedModel} />}
      </Drawer>
    </Box>
  );
};
