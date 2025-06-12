'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  Typography,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  CardActions,
  Divider,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  Mic as MicIcon,
  Upload as UploadIcon,
  ContentCopy as CopyIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
  AudioFile as AudioFileIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useUnit } from 'effector-react';
import {
  $sttState,
  dialogOpened,
  dialogClosed,
  fileSelected,
  fileCleared,
  modelChanged,
  promptChanged,
  translateToggled,
  transcribeClicked,
  copyTextClicked,
  generateMessageClicked,
  deleteResultClicked,
  clearError,
} from '../model';

interface TranscriptionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function TranscriptionDialog({ open, onClose }: TranscriptionDialogProps) {
  const theme = useTheme();
  const state = useUnit($sttState);

  React.useEffect(() => {
    if (open) {
      dialogOpened();
    }
  }, [open]);

  const handleClose = () => {
    dialogClosed();
    onClose();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      fileSelected(file);
    }
  };

  const handleTranscribe = () => {
    transcribeClicked();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '60vh',
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <MicIcon color="primary" />
          <Typography variant="h6" component="span">
            Speech to Text
          </Typography>
          <Box flexGrow={1} />
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* File Upload Section */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Select Audio File
            </Typography>
            <Box
              sx={{
                border: '2px dashed',
                borderColor: state.fileValidation?.isValid === false ? 'error.main' : 'divider',
                borderRadius: 1,
                p: 3,
                textAlign: 'center',
                backgroundColor: state.file ? 'action.selected' : 'transparent',
              }}
            >
              {!state.file ? (
                <Box>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    sx={{ mb: 2 }}
                  >
                    Choose Audio File
                    <input
                      type="file"
                      hidden
                      accept="audio/*"
                      onChange={handleFileChange}
                    />
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    Supports: MP3, MP4, MPEG, MPGA, M4A, WAV, WEBM (max 25MB)
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
                    <AudioFileIcon color="primary" />
                    <Typography variant="body1">
                      {state.file.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {formatFileSize(state.file.size)}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => fileCleared()}
                    sx={{ mt: 1 }}
                  >
                    Remove
                  </Button>
                </Box>
              )}
            </Box>
            
            {state.fileValidation && !state.fileValidation.isValid && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {state.fileValidation.error}
              </Alert>
            )}
          </Box>

          {/* Configuration Section */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Transcription Settings
            </Typography>
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Model</InputLabel>
                <Select
                  value={state.selectedModel}
                  label="Model"
                  onChange={(e) => modelChanged(e.target.value)}
                >
                  {state.availableModels.map((model) => (
                    <MenuItem key={model.id} value={model.id}>
                      <Box>
                        <Typography variant="body2">
                          {model.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {model.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {state.isTranslateEnabled && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={state.isTranslation}
                      onChange={(e) => translateToggled(e.target.checked)}
                    />
                  }
                  label="Translate to English"
                />
              )}

              <TextField
                label="Context Prompt (Optional)"
                multiline
                rows={2}
                value={state.prompt}
                onChange={(e) => promptChanged(e.target.value)}
                placeholder="Provide domain-specific terms or context to improve accuracy..."
                helperText="Include technical terms, names, or specific jargon that might appear in the audio"
              />
            </Stack>
          </Box>

          {/* Error Display */}
          {state.error && (
            <Alert 
              severity="error" 
              action={
                <IconButton
                  aria-label="close"
                  color="inherit"
                  size="small"
                  onClick={() => clearError()}
                >
                  <CloseIcon fontSize="inherit" />
                </IconButton>
              }
            >
              {state.error}
            </Alert>
          )}

          {/* Loading Progress */}
          {state.isLoading && (
            <Box>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                Transcribing audio...
              </Typography>
            </Box>
          )}

          {/* Results History */}
          {state.transcriptionResults.length > 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Transcription Results ({state.transcriptionResults.length})
              </Typography>
              <Stack spacing={2} sx={{ maxHeight: '400px', overflow: 'auto' }}>
                {state.transcriptionResults.map((result) => (
                  <Card key={result.id} variant="outlined">
                    <CardContent>
                      <Box mb={2}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {result.fileName} • {result.model} • {formatTimestamp(result.timestamp)}
                          {result.isTranslation && (
                            <Chip label="Translation" size="small" sx={{ ml: 1 }} />
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {result.wordCount} words • {formatFileSize(result.fileSize)}
                        </Typography>
                      </Box>
                      
                      <TextField
                        multiline
                        fullWidth
                        value={result.text}
                        variant="outlined"
                        rows={3}
                        InputProps={{
                          readOnly: true,
                        }}
                        sx={{
                          '& .MuiInputBase-input': {
                            fontSize: '0.9rem',
                            lineHeight: 1.4,
                          }
                        }}
                      />
                    </CardContent>
                    
                    <CardActions>
                      <Tooltip title="Copy text">
                        <IconButton
                          size="small"
                          onClick={() => copyTextClicked(result.id)}
                        >
                          <CopyIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Generate message">
                        <IconButton
                          size="small"
                          onClick={() => generateMessageClicked(result.id)}
                        >
                          <SendIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Box flexGrow={1} />
                      
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => deleteResultClicked(result.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleTranscribe}
          disabled={!state.canTranscribe}
          startIcon={<MicIcon />}
        >
          {state.isLoading ? 'Transcribing...' : 'Transcribe'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}