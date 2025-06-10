import React from "react";
import { useUnit } from "effector-react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Chip,
} from "@mui/material";
import {
  $selectedImageGenModel,
  $availableImageGenModels,
  imageGenModelSelected,
} from "@/features/image-generation";

export const ImageGenerationModelSelector: React.FC = () => {
  const [selectedModel, availableModels] = useUnit([
    $selectedImageGenModel,
    $availableImageGenModels,
  ]);

  const handleModelChange = (modelId: string) => {
    imageGenModelSelected(modelId);
  };

  return (
    <FormControl fullWidth sx={{ mb: 1 }}>
      <InputLabel>Image Generation Model</InputLabel>
      <Select
        value={selectedModel}
        sx={{ ".MuiSelect-select": { p: 1, pl: 1.7 } }}
        onChange={(e) => handleModelChange(e.target.value)}
        label="Image Generation Model"
        renderValue={(value) => {
          const model = availableModels.find((m) => m.id === value);
          return model ? model.name : value;
        }}
      >
        {availableModels.map((model) => (
          <MenuItem key={model.id} value={model.id}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                width: "100%",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {model.name}
              </Typography>
              <Box
                sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}
              >
                <Chip
                  label={model.provider}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: "0.675rem", height: 20 }}
                />
                <Chip
                  label={`Max: ${model.maxImages}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: "0.675rem", height: 20 }}
                />
                {model.supportsEditing && (
                  <Chip
                    label="Editing"
                    size="small"
                    variant="outlined"
                    color="success"
                    sx={{ fontSize: "0.675rem", height: 20 }}
                  />
                )}
                {model.supportsVariations && (
                  <Chip
                    label="Variations"
                    size="small"
                    variant="outlined"
                    color="success"
                    sx={{ fontSize: "0.675rem", height: 20 }}
                  />
                )}
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.25 }}
              >
                Max prompt: {model.maxPromptLength.toLocaleString()} chars
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default ImageGenerationModelSelector;
