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
  IconButton,
  Card,
  CardMedia,
  CardContent,
  CardActions,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
  Fullscreen as FullscreenIcon,
} from "@mui/icons-material";
import {
  $imageGenerationState,
  dialogOpened,
  dialogClosed,
  promptChanged,
  imageGenModelSelected,
  updateImageGenSettings,
  generateImage,
  removeGeneratedImage,
  sendImageToChat,
  type ImageGenerationParams,
} from "@/features/image-generation";
import { $apiKey } from "@/features/chat-settings";

interface ImageGenerationDialogProps {
  initialPrompt?: string;
}

export const ImageGenerationDialog: React.FC<ImageGenerationDialogProps> = ({
  initialPrompt = "",
}) => {
  const [state, apiKey] = useUnit([$imageGenerationState, $apiKey]);

  // Open dialog when component mounts and close when unmounts
  React.useEffect(() => {
    dialogOpened();
    return () => {
      dialogClosed();
    };
  }, []);

  // Set initial prompt
  React.useEffect(() => {
    if (initialPrompt) {
      promptChanged(initialPrompt);
    }
  }, [initialPrompt]);

  const handleModelChange = (modelId: string) => {
    imageGenModelSelected(modelId);
  };

  const handleSettingChange = (
    key: keyof typeof state.settings,
    value: any
  ) => {
    updateImageGenSettings({ [key]: value });
  };

  const handlePromptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    promptChanged(event.target.value);
  };

  const handleGenerate = () => {
    if (!state.prompt.trim() || !apiKey) return;

    const params: ImageGenerationParams = {
      prompt: state.prompt.trim(),
      model: state.selectedModel,
      size: state.settings.size,
      quality: state.settings.quality,
      style: state.settings.style,
      n: state.settings.n,
    };

    generateImage(params);
  };

  const handleClose = () => {
    if (!state.isGenerating) {
      dialogClosed();
    }
  };

  const handleSendToChat = (imageId: string) => {
    sendImageToChat(imageId);
    // Close dialog after sending to chat
    dialogClosed();
  };

  const handleRemoveImage = (imageId: string) => {
    removeGeneratedImage(imageId);
  };

  const openImageInNewTab = (imageUrl: string) => {
    window.open(imageUrl, "_blank");
  };

  const downloadImage = (imageUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isFormValid = state.prompt.trim().length > 0 && !!apiKey;
  const promptLength = state.prompt.length;
  const maxPromptLength = state.modelInfo?.maxPromptLength || 1000;
  const isPromptTooLong = promptLength > maxPromptLength;

  return (
    <Dialog
      open={state.isDialogOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 600, maxHeight: "90vh" },
      }}
    >
      <DialogTitle>
        Generate Images
        {state.generatedImages.length > 0 && (
          <Typography variant="caption" sx={{ ml: 2, color: "text.secondary" }}>
            {state.generatedImages.length} image
            {state.generatedImages.length !== 1 ? "s" : ""} in history
          </Typography>
        )}
      </DialogTitle>

      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 2, py: 2 }}
      >
        {/* Generation Form */}
        <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Error Alert */}
          {state.error && <Alert severity="error">{state.error}</Alert>}

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
              value={state.selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={state.isGenerating}
              label="Image Generation Model"
            >
              {state.availableModels.map((model: any) => (
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
            value={state.prompt}
            onChange={handlePromptChange}
            disabled={state.isGenerating}
            fullWidth
            error={isPromptTooLong}
            helperText={
              isPromptTooLong
                ? `Prompt too long: ${promptLength}/${maxPromptLength} characters`
                : `${promptLength}/${maxPromptLength} characters`
            }
          />

          {/* Settings Row */}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {/* Size Selection */}
            <FormControl sx={{ minWidth: 120, flex: 1 }}>
              <InputLabel>Size</InputLabel>
              <Select
                value={state.settings.size}
                onChange={(e) => handleSettingChange("size", e.target.value)}
                disabled={state.isGenerating}
                label="Size"
              >
                {state.supportedSizes.map((size: string) => (
                  <MenuItem key={size} value={size}>
                    {size}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Quality Selection */}
            <FormControl sx={{ minWidth: 120, flex: 1 }}>
              <InputLabel>Quality</InputLabel>
              <Select
                value={state.settings.quality}
                onChange={(e) => handleSettingChange("quality", e.target.value)}
                disabled={state.isGenerating}
                label="Quality"
              >
                {state.supportedQualities.map((quality: string) => (
                  <MenuItem key={quality} value={quality}>
                    {quality}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Style Selection (if supported) */}
            {state.supportedStyles.length > 0 && (
              <FormControl sx={{ minWidth: 120, flex: 1 }}>
                <InputLabel>Style</InputLabel>
                <Select
                  value={state.settings.style || ""}
                  onChange={(e) => handleSettingChange("style", e.target.value)}
                  disabled={state.isGenerating}
                  label="Style"
                >
                  {state.supportedStyles.map((style: string) => (
                    <MenuItem key={style} value={style}>
                      {style}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            variant="contained"
            disabled={!isFormValid || isPromptTooLong || state.isGenerating}
            fullWidth
            sx={{ py: 1.5 }}
          >
            {state.isGenerating ? (
              <>
                <LinearProgress sx={{ width: 100, mr: 2 }} />
                Generating...
              </>
            ) : (
              "Generate Image"
            )}
          </Button>
        </Box>

        {/* Generated Images History */}
        {state.generatedImages.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Generated Images ({state.generatedImages.length})
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 2,
                maxHeight: "400px",
                overflowY: "auto",
              }}
            >
              {state.generatedImages
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((image) => {
                  const imageUrl =
                    image.url ||
                    (image.b64_json
                      ? `data:image/png;base64,${image.b64_json}`
                      : "");

                  return (
                    <Card key={image.id} sx={{ height: "fit-content" }}>
                      <CardMedia
                        component="img"
                        image={imageUrl}
                        alt={`Generated: ${image.prompt.substring(0, 50)}...`}
                        sx={{
                          height: 200,
                          objectFit: "cover",
                          cursor: "pointer",
                        }}
                        onClick={() => openImageInNewTab(imageUrl)}
                      />
                      <CardContent sx={{ pb: 1 }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                        >
                          "
                          {image.prompt.length > 80
                            ? image.prompt.substring(0, 80) + "..."
                            : image.prompt}
                          "
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {image.model} • {image.parameters?.size} •{" "}
                          {new Date(image.timestamp).toLocaleString()}
                        </Typography>
                      </CardContent>
                      <CardActions
                        sx={{ pt: 0, justifyContent: "space-between" }}
                      >
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => openImageInNewTab(imageUrl)}
                            title="Open in new tab"
                          >
                            <FullscreenIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() =>
                              downloadImage(
                                imageUrl,
                                `generated-image-${image.id}.png`
                              )
                            }
                            title="Download"
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Box>
                          <Button
                            size="small"
                            startIcon={<SendIcon />}
                            onClick={() => handleSendToChat(image.id)}
                            variant="outlined"
                            sx={{ mr: 1 }}
                          >
                            Send to Chat
                          </Button>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveImage(image.id)}
                            title="Delete"
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </CardActions>
                    </Card>
                  );
                })}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={state.isGenerating}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageGenerationDialog;
