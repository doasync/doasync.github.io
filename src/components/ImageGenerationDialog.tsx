import React, { useState } from "react";
import { useUnit } from "effector-react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Chip,
  Alert,
  LinearProgress,
} from "@mui/material";
import {
  $selectedImageGenModel,
  $imageGenerationSettings,
  $isGeneratingImage,
  $imageGenerationError,
  $availableImageGenModels,
  $selectedImageGenModelInfo,
  imageGenModelSelected,
  updateImageGenSettings,
  generateImage,
  generateImageFx,
  type ImageGenerationParams,
} from "@/features/image-generation";
import { $apiKey } from "@/features/chat-settings";

interface ImageGenerationDialogProps {
  open: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

export const ImageGenerationDialog: React.FC<ImageGenerationDialogProps> = ({
  open,
  onClose,
  initialPrompt = "",
}) => {
  const [
    selectedModel,
    settings,
    isGenerating,
    error,
    availableModels,
    modelInfo,
    apiKey,
  ] = useUnit([
    $selectedImageGenModel,
    $imageGenerationSettings,
    $isGeneratingImage,
    $imageGenerationError,
    $availableImageGenModels,
    $selectedImageGenModelInfo,
    $apiKey,
  ]);

  const [prompt, setPrompt] = useState(initialPrompt);
  const [generatedImages, setGeneratedImages] = useState<
    Array<{ url?: string; b64_json?: string }>
  >([]);

  React.useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);

  // Reset generated images when dialog opens
  React.useEffect(() => {
    if (open) {
      setGeneratedImages([]);
    }
  }, [open]);

  // Subscribe to generation results
  React.useEffect(() => {
    const unsubscribe = generateImageFx.done.watch(({ result }) => {
      setGeneratedImages(result.data);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleModelChange = (modelId: string) => {
    imageGenModelSelected(modelId);
  };

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    updateImageGenSettings({ [key]: value });
  };

  const handleGenerate = () => {
    if (!prompt.trim() || !apiKey) return;

    const params: ImageGenerationParams = {
      prompt: prompt.trim(),
      model: selectedModel,
      size: settings.size,
      quality: settings.quality,
      style: settings.style,
      n: settings.n,
    };

    generateImage(params);
  };

  const handleClose = () => {
    if (!isGenerating) {
      onClose();
      // Reset state when closing
      setGeneratedImages([]);
      setPrompt(initialPrompt);
    }
  };

  const isFormValid = prompt.trim().length > 0 && !!apiKey;
  const promptLength = prompt.length;
  const maxPromptLength = modelInfo?.maxPromptLength || 1000;
  const isPromptTooLong = promptLength > maxPromptLength;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: 400 },
      }}
    >
      <DialogTitle>Generate Images</DialogTitle>

      <DialogContent>
        {isGenerating ? (
          // Loading state
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 4,
              gap: 2,
            }}
          >
            <LinearProgress sx={{ width: "100%", mb: 2 }} />
            <Typography>Generating your image...</Typography>
            <Typography variant="body2" color="text.secondary">
              This may take a few moments
            </Typography>
          </Box>
        ) : generatedImages.length > 0 ? (
          // Results view
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, py: 1 }}>
            {generatedImages.map((image, index) => {
              const imageUrl =
                image.url ||
                (image.b64_json
                  ? `data:image/png;base64,${image.b64_json}`
                  : "");

              return (
                <Box key={index}>
                  <img
                    src={imageUrl}
                    alt={`Generated image ${index + 1}`}
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: 4,
                    }}
                  />
                  <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                    <Button
                      size="small"
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = imageUrl;
                        link.download = `generated-image-${Date.now()}.png`;
                        link.click();
                      }}
                    >
                      Download
                    </Button>
                  </Box>
                </Box>
              );
            })}
            <Button
              variant="outlined"
              fullWidth
              onClick={() => {
                setGeneratedImages([]);
                setPrompt("");
              }}
            >
              Generate Another Image
            </Button>
          </Box>
        ) : (
          // Form view
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, py: 1 }}>
            {/* Error Alert */}
            {error && (
              <Alert
                severity="error"
                onClose={() => {
                  /* Clear error */
                }}
              >
                {error}
              </Alert>
            )}

            {/* No API Key Alert */}
            {!apiKey && (
              <Alert severity="warning">
                Please set your API key in Chat Settings to generate images.
              </Alert>
            )}

            {/* Model Selection */}
            <FormControl fullWidth>
              <InputLabel>Image Generation Model</InputLabel>
              <Select
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
                disabled={isGenerating}
                label="Image Generation Model"
              >
                {availableModels.map((model: any) => (
                  <MenuItem key={model.id} value={model.id}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                      }}
                    >
                      <Typography variant="body2">{model.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {model.provider} • Max {model.maxImages} image
                        {model.maxImages > 1 ? "s" : ""}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Prompt Input */}
            <TextField
              label="Image Prompt"
              placeholder="Describe the image you want to generate..."
              multiline
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
              fullWidth
              error={isPromptTooLong}
              helperText={
                isPromptTooLong
                  ? `Prompt too long: ${promptLength}/${maxPromptLength} characters`
                  : `${promptLength}/${maxPromptLength} characters`
              }
            />

            {/* Size Selection */}
            <FormControl fullWidth>
              <InputLabel>Image Size</InputLabel>
              <Select
                value={settings.size}
                onChange={(e) => handleSettingChange("size", e.target.value)}
                disabled={isGenerating}
                label="Image Size"
              >
                {modelInfo?.supportedSizes.map((size: string) => (
                  <MenuItem key={size} value={size}>
                    {size}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Quality Selection */}
            <FormControl fullWidth>
              <InputLabel>Quality</InputLabel>
              <Select
                value={settings.quality}
                onChange={(e) => handleSettingChange("quality", e.target.value)}
                disabled={isGenerating}
                label="Quality"
              >
                {modelInfo?.supportedQualities.map((quality: string) => (
                  <MenuItem key={quality} value={quality}>
                    {quality}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Style Selection (if supported) */}
            {modelInfo?.supportedStyles &&
              modelInfo.supportedStyles.length > 0 && (
                <FormControl fullWidth>
                  <InputLabel>Style</InputLabel>
                  <Select
                    value={settings.style || ""}
                    onChange={(e) =>
                      handleSettingChange("style", e.target.value)
                    }
                    disabled={isGenerating}
                    label="Style"
                  >
                    {modelInfo.supportedStyles.map((style: string) => (
                      <MenuItem key={style} value={style}>
                        {style}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

            {/* Number of Images */}
            {modelInfo && modelInfo.maxImages > 1 && (
              <FormControl fullWidth>
                <InputLabel>Number of Images</InputLabel>
                <Select
                  value={settings.n}
                  onChange={(e) =>
                    handleSettingChange("n", Number(e.target.value))
                  }
                  disabled={isGenerating}
                  label="Number of Images"
                >
                  {Array.from(
                    { length: modelInfo.maxImages },
                    (_, i) => i + 1
                  ).map((num) => (
                    <MenuItem key={num} value={num}>
                      {num}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Model Info */}
            {modelInfo && (
              <Box
                sx={{ p: 2, backgroundColor: "action.hover", borderRadius: 1 }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Model Information
                </Typography>
                <Box
                  sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}
                >
                  <Chip
                    label={`${modelInfo.provider}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`Max: ${modelInfo.maxImages} image${
                      modelInfo.maxImages > 1 ? "s" : ""
                    }`}
                    size="small"
                    variant="outlined"
                  />
                  {modelInfo.supportsEditing && (
                    <Chip
                      label="Supports Editing"
                      size="small"
                      variant="outlined"
                      color="success"
                    />
                  )}
                  {modelInfo.supportsVariations && (
                    <Chip
                      label="Supports Variations"
                      size="small"
                      variant="outlined"
                      color="success"
                    />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Max prompt length:{" "}
                  {modelInfo.maxPromptLength.toLocaleString()} characters
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {generatedImages.length > 0 ? (
          // Results actions
          <Button onClick={handleClose}>Close</Button>
        ) : (
          // Form actions
          <>
            <Button onClick={handleClose} disabled={isGenerating}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              variant="contained"
              disabled={!isFormValid || isPromptTooLong || isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate Image"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImageGenerationDialog;
