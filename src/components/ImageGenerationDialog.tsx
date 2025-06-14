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
  CircularProgress,
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
    dialogClosed();
  };

  const handleSendToChat = (imageId: string) => {
    sendImageToChat(imageId);
    // Close dialog after sending to chat
    dialogClosed();
  };

  const handleRemoveImage = (imageId: string) => {
    removeGeneratedImage(imageId);
  };

  const openImageInNewTab = (imageUrl: string, image?: any) => {
    // If it's a data URL (base64), convert to blob URL for better browser support
    if (imageUrl.startsWith("data:")) {
      try {
        // Extract base64 data and convert to blob
        const base64Data = imageUrl.split(",")[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/png" });
        const blobUrl = URL.createObjectURL(blob);

        // Open blob URL and clean up after a delay
        const newWindow = window.open(blobUrl, "_blank");
        if (newWindow) {
          // Clean up blob URL after window loads or after a delay
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 1000);
        }
      } catch (error) {
        console.error("Failed to convert data URL to blob:", error);
        // Fallback to original method
        window.open(imageUrl, "_blank");
      }
    } else {
      // Regular URL, open directly
      window.open(imageUrl, "_blank");
    }
  };

  const downloadImage = (imageUrl: string, fileName: string) => {
    // Handle both regular URLs and data URLs
    if (imageUrl.startsWith("data:")) {
      // For data URLs, use them directly - they work fine for downloads
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // For regular URLs, we might need to fetch and convert to blob for cross-origin downloads
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
            rows={6}
            value={state.prompt}
            onChange={handlePromptChange}
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

          {/* Error Alert - positioned near Generate button */}
          {state.error && <Alert severity="error">{state.error}</Alert>}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            variant="contained"
            disabled={!isFormValid || isPromptTooLong}
            fullWidth
            sx={{ py: 1.5 }}
          >
            {state.isGenerating ? "Generate Another Image" : "Generate Image"}
          </Button>
        </Box>

        {/* Generated Images History */}
        {state.generatedImages.length > 0 && (
          <Box sx={{ mt: 1 }}>
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

                  const isCompleted = image.status === "completed";
                  const isPending = image.status === "pending";
                  const isGenerating = image.status === "generating";
                  const isError = image.status === "error";

                  return (
                    <Card key={image.id} sx={{ height: "fit-content" }}>
                      {isCompleted ? (
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
                      ) : (
                        <Box
                          sx={{
                            height: 200,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: isError
                              ? "error.light"
                              : "grey.100",
                            color: isError
                              ? "error.contrastText"
                              : "text.secondary",
                            position: "relative",
                          }}
                        >
                          {isPending && (
                            <>
                              <CircularProgress size={40} sx={{ mb: 1 }} />
                              <Typography variant="body2">Queued...</Typography>
                            </>
                          )}
                          {isGenerating && (
                            <>
                              <CircularProgress size={40} sx={{ mb: 1 }} />
                              <Typography variant="body2">
                                Generating...
                              </Typography>
                              {image.progress !== undefined && (
                                <LinearProgress
                                  variant="determinate"
                                  value={image.progress}
                                  sx={{ width: "80%", mt: 1 }}
                                />
                              )}
                            </>
                          )}
                          {isError && (
                            <>
                              <Typography variant="body2" color="error">
                                Generation Failed
                              </Typography>
                              {image.error && (
                                <Typography
                                  variant="caption"
                                  sx={{ mt: 1, textAlign: "center", px: 1 }}
                                >
                                  {image.error}
                                </Typography>
                              )}
                            </>
                          )}
                        </Box>
                      )}
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
                          {new Date(image.timestamp)
                            .toLocaleDateString("en-US", {
                              month: "2-digit",
                              day: "2-digit",
                            })
                            .replace("/", "-")}{" "}
                          {new Date(image.timestamp).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            }
                          )}
                        </Typography>
                      </CardContent>
                      <CardActions
                        sx={{ pt: 0, justifyContent: "space-between" }}
                      >
                        {isCompleted ? (
                          <>
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
                          </>
                        ) : (
                          <>
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {isPending && "Waiting to start..."}
                                {isGenerating && "Generating image..."}
                                {isError && "Failed to generate"}
                              </Typography>
                            </Box>
                            <Box>
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveImage(image.id)}
                                title="Cancel/Delete"
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </>
                        )}
                      </CardActions>
                    </Card>
                  );
                })}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageGenerationDialog;
