import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Fullscreen as FullscreenIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useUnit } from 'effector-react';
import React from 'react';

import { $apiKey } from '@/features/chat-settings';
import {
  $imageGenerationState,
  dialogClosed,
  dialogOpened,
  generateImage,
  imageGenModelSelected,
  promptChanged,
  removeGeneratedImage,
  sendImageToChat,
  updateImageGenSettings,
} from '@/features/image-generation/model';
import type { ImageGenerationParams } from '@/features/image-generation/types';

interface ImageGenerationDialogProps {
  initialPrompt?: string;
}

// Helper functions that don't need component state
const handleModelChange = (modelId: string) => {
  imageGenModelSelected(modelId);
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

const openImageInNewTab = (imageUrl: string) => {
  // If it's a data URL (base64), convert to blob URL for better browser support
  if (imageUrl.startsWith('data:')) {
    try {
      // Extract base64 data and convert to blob
      const base64Data = imageUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = Array.from<number>({ length: byteCharacters.length });
      for (let index = 0; index < byteCharacters.length; index++) {
        byteNumbers[index] = byteCharacters.codePointAt(index) ?? 0;
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      const blobUrl = URL.createObjectURL(blob);

      // Open blob URL and clean up after a delay
      const newWindow = window.open(blobUrl, '_blank');
      if (newWindow) {
        // Clean up blob URL after window loads or after a delay
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to convert data URL to blob:', error);
      // Fallback to original method
      window.open(imageUrl, '_blank');
    }
  } else {
    // Regular URL, open directly
    window.open(imageUrl, '_blank');
  }
};

const downloadImage = async (imageUrl: string, fileName: string) => {
  try {
    if (imageUrl.startsWith('data:')) {
      // For data URLs, use them directly - they work fine for downloads
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
    } else {
      // For regular URLs, try different approaches based on the URL
      const isAzureBlobUrl = imageUrl.includes(
        'oaidalleapiprodscus.blob.core.windows.net',
      );

      if (isAzureBlobUrl) {
        // For Azure blob URLs (common with OpenAI DALL-E), try a direct download
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(blobUrl);
      } else {
        // For other URLs, open in a new tab and suggest right-click save
        window.open(imageUrl, '_blank');
        console.log('Right-click on the image and select "Save As..."');
      }
    }
  } catch (error) {
    console.error('Failed to download image:', error);
    // Fallback: open in new tab
    window.open(imageUrl, '_blank');
  }
};

export function ImageGenerationDialog({
  initialPrompt = '',
}: ImageGenerationDialogProps) {
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

  const handleSettingChange = (
    key: keyof typeof state.settings,
    value: string | number,
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
        sx: { minHeight: 600, maxHeight: '90vh' },
      }}
    >
      <DialogTitle>
        Generate Images
        {state.generatedImages.length > 0 && (
          <Typography variant="caption" sx={{ ml: 2, color: 'text.secondary' }}>
            {state.generatedImages.length} image
            {state.generatedImages.length === 1 ? '' : 's'} in history
          </Typography>
        )}
      </DialogTitle>

      <DialogContent
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}
      >
        {/* Generation Form */}
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
              onChange={(event) => handleModelChange(event.target.value)}
              label="Image Generation Model"
            >
              {state.availableModels.map((model) => (
                <MenuItem key={model.id} value={model.id}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Typography variant="body2">{model.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {model.provider} • Max {model.maxImages} image
                      {model.maxImages > 1 ? 's' : ''}
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
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {/* Size Selection */}
            <FormControl sx={{ minWidth: 120, flex: 1 }}>
              <InputLabel>Size</InputLabel>
              <Select
                value={state.settings.size}
                onChange={(event) =>
                  handleSettingChange('size', event.target.value)
                }
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
                onChange={(event) =>
                  handleSettingChange('quality', event.target.value)
                }
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
                  value={state.settings.style || ''}
                  onChange={(event) =>
                    handleSettingChange('style', event.target.value)
                  }
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
            {state.isGenerating ? 'Generate Another Image' : 'Generate Image'}
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
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 2,
                maxHeight: '400px',
                overflowY: 'auto',
              }}
            >
              {state.generatedImages
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((image) => {
                  const imageUrl =
                    image.url ||
                    (image.b64_json
                      ? `data:image/png;base64,${image.b64_json}`
                      : '');

                  const isCompleted = image.status === 'completed';
                  const isPending = image.status === 'pending';
                  const isGenerating = image.status === 'generating';
                  const isError = image.status === 'error';

                  return (
                    <Card key={image.id} sx={{ height: 'fit-content' }}>
                      {isCompleted ? (
                        <CardMedia
                          component="img"
                          image={imageUrl}
                          alt={`Generated: ${image.prompt.slice(0, 50)}...`}
                          sx={{
                            height: 200,
                            objectFit: 'cover',
                            cursor: 'pointer',
                          }}
                          onClick={() => openImageInNewTab(imageUrl)}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: 200,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isError ? '#19060a' : 'grey.100',
                            color: isError ? '#ffb4c3' : 'text.secondary',
                            position: 'relative',
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
                                  sx={{ width: '80%', mt: 1 }}
                                />
                              )}
                            </>
                          )}
                          {isError && (
                            <>
                              <Typography variant="body2" color="inherit">
                                Generation Failed
                              </Typography>
                              {image.error && (
                                <Typography
                                  variant="caption"
                                  color="inherit"
                                  sx={{ mt: 1, textAlign: 'center', px: 1 }}
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
                          &quot;
                          {image.prompt.length > 80
                            ? `${image.prompt.slice(0, 80)}...`
                            : image.prompt}
                          &quot;
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {image.model} • {image.parameters?.size} •{' '}
                          {new Date(image.timestamp)
                            .toLocaleDateString('en-US', {
                              month: '2-digit',
                              day: '2-digit',
                            })
                            .replace('/', '-')}{' '}
                          {new Date(image.timestamp).toLocaleTimeString(
                            'en-US',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            },
                          )}
                        </Typography>
                      </CardContent>
                      <CardActions
                        sx={{ pt: 0, justifyContent: 'space-between' }}
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
                              {/* Hide download button for CORS-restricted Azure blob URLs */}
                              {!imageUrl.includes(
                                'oaidalleapiprodscus.blob.core.windows.net',
                              ) && (
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    downloadImage(
                                      imageUrl,
                                      `generated-image-${image.id}.png`,
                                    ).catch(console.error);
                                  }}
                                  title="Download"
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              )}
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
                                sx={{ px: 1 }}
                              >
                                {isPending && 'Waiting to start...'}
                                {isGenerating && 'Generating image...'}
                                {isError && 'Failed to generate'}
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
}
