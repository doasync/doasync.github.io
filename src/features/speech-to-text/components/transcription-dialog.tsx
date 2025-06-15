'use client';

import {
  AudioFile as AudioFileIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Mic as MicIcon,
  Send as SendIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
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
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useUnit } from 'effector-react';
import React from 'react';

import { RESPONSE_FORMAT_OPTIONS } from '@/features/speech-to-text/api';
import {
  $sttState,
  audioDurationDetected,
  clearError,
  deleteResultClicked,
  dialogClosed,
  fileCleared,
  fileSelected,
  generateMessageClicked,
  modelChanged,
  promptChanged,
  responseFormatChanged,
  transcribeClicked,
} from '@/features/speech-to-text/model';
import { ResponseFormat } from '@/features/speech-to-text/types';

// Helper functions that don't depend on component state
const handleClose = () => {
  dialogClosed();
};

const handleTranscribe = () => {
  transcribeClicked();
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const index = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** index).toFixed(2))} ${sizes[index]}`;
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getMimeTypeDisplay = (mimeType: string) => {
  const mimeMap: Record<string, string> = {
    'audio/mpeg': 'MP3',
    'audio/mp3': 'MP3',
    'audio/mp4': 'MP4',
    'audio/mpeg4-generic': 'MP4',
    'audio/x-mpeg': 'MPEG',
    'audio/mpga': 'MPGA',
    'audio/x-mpga': 'MPGA',
    'audio/wav': 'WAV',
    'audio/wave': 'WAV',
    'audio/x-wav': 'WAV',
    'audio/webm': 'WEBM',
    'audio/ogg': 'OGG',
    'audio/flac': 'FLAC',
    'audio/x-flac': 'FLAC',
    'audio/aac': 'AAC',
    'audio/aacp': 'AAC',
    'audio/3gp': '3GP',
    'audio/3gpp': '3GP',
    'audio/amr': 'AMR',
    'audio/amr-nb': 'AMR',
    'audio/m4a': 'M4A',
    'audio/x-m4a': 'M4A',
    'audio/mp4a-latm': 'M4A',
    'audio/x-ms-wma': 'WMA',
  };
  return mimeMap[mimeType] || mimeType.toUpperCase();
};

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleString();

export function TranscriptionDialog() {
  const state = useUnit($sttState);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);

  // Debug logging in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('TranscriptionDialog state:', {
        transcriptionResultsCount: state.transcriptionResults.length,
        transcriptionResults: state.transcriptionResults,
        isLoading: state.isLoading,
        error: state.error,
      });
    }
  }, [state.transcriptionResults, state.isLoading, state.error, audioUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      fileSelected(file);
    }
  };

  // State for audio file analysis and player
  const [audioInfo, setAudioInfo] = React.useState<{
    duration?: number;
    sampleRate?: number;
  } | null>(null);

  // Analyze audio file and create URL when selected
  React.useEffect(() => {
    if (!state.file) {
      setAudioInfo(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      // Return empty cleanup function to maintain consistent-return
      return () => {};
    }

    // Create blob URL for audio player
    const url = URL.createObjectURL(state.file);
    setAudioUrl(url);

    const analyzeAudio = async () => {
      try {
        const audioContext = new (window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext)();
        const arrayBuffer = await state.file!.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        setAudioInfo({
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
        });

        // Report the audio duration to the state model
        audioDurationDetected(audioBuffer.duration);

        audioContext.close().catch(console.error);
      } catch (error) {
        console.warn('Could not analyze audio file:', error);
        setAudioInfo(null);
      }
    };

    analyzeAudio().catch(console.error);

    // Cleanup function
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [state.file, audioUrl]);

  return (
    <Dialog
      open={state.isDialogOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '60vh',
          maxHeight: '90vh',
        },
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
                borderColor:
                  state.fileValidation?.isValid === false
                    ? 'error.main'
                    : 'divider',
                borderRadius: 1,
                p: 3,
                textAlign: 'center',
                backgroundColor: state.file ? 'action.selected' : 'transparent',
              }}
            >
              {state.file ? (
                <Box>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <AudioFileIcon color="primary" />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {state.file.name}
                    </Typography>
                  </Box>

                  {/* Audio Player */}
                  {audioUrl && (
                    <Box mb={1}>
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio
                        controls
                        style={{ width: '100%', maxWidth: '400px' }}
                        preload="metadata"
                      >
                        <source src={audioUrl} type={state.file.type} />
                        Your browser does not support the audio element.
                      </audio>
                    </Box>
                  )}

                  {/* File Information - Compact List */}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {formatFileSize(state.file.size)}
                    {audioInfo?.duration &&
                      ` • Duration: ${formatDuration(audioInfo.duration)}`}
                    {` • ${getMimeTypeDisplay(state.file.type)} Audio`}
                    {audioInfo?.sampleRate &&
                      ` • ${(audioInfo.sampleRate / 1000).toFixed(1)} kHz`}
                  </Typography>

                  <Button
                    size="small"
                    onClick={() => {
                      if (audioUrl) {
                        URL.revokeObjectURL(audioUrl);
                        setAudioUrl(null);
                      }
                      fileCleared();
                    }}
                    sx={{ mt: 1 }}
                  >
                    Remove
                  </Button>
                </Box>
              ) : (
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
                  onChange={(event) => modelChanged(event.target.value)}
                >
                  {state.availableModels.map((model) => (
                    <MenuItem key={model.id} value={model.id}>
                      <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2">{model.name}</Typography>
                          {model.hasLimitedParams && (
                            <Chip
                              label="Limited params"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {model.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Response Format</InputLabel>
                <Select
                  value={state.currentResponseFormat}
                  label="Response Format"
                  onChange={(event) =>
                    responseFormatChanged(event.target.value as ResponseFormat)
                  }
                >
                  {RESPONSE_FORMAT_OPTIONS.filter((option) =>
                    state.currentModel?.supportedResponseFormats.includes(
                      option.value,
                    ),
                  ).map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box>
                        <Typography variant="body2">{option.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Context Prompt (Optional)"
                multiline
                rows={2}
                value={state.prompt}
                onChange={(event) => promptChanged(event.target.value)}
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
              <Typography
                variant="body2"
                color="text.secondary"
                align="center"
                sx={{ mt: 1 }}
              >
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
                {state.transcriptionResults.map((result) => {
                  // Debug logging in development
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Rendering transcription result...');
                  }
                  return (
                    <Card
                      key={result.id}
                      variant="outlined"
                      sx={{
                        overflow: 'visible',
                        '& .MuiCardContent-root': {
                          paddingBottom: '8px',
                        },
                        '& .MuiCardActions-root': {
                          paddingTop: '8px',
                        },
                      }}
                    >
                      <CardContent>
                        <Box mb={2}>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            gutterBottom
                          >
                            {result.fileName} • {result.model} •{' '}
                            {formatTimestamp(result.timestamp)}
                          </Typography>
                          <Box display="flex" gap={2} flexWrap="wrap">
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {result.wordCount} words
                            </Typography>
                            {result.audioDuration && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Duration: {formatDuration(result.audioDuration)}
                              </Typography>
                            )}
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {formatFileSize(result.textSize)}
                            </Typography>
                            {result.responseFormat &&
                              result.responseFormat !== 'json' && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Format: {result.responseFormat.toUpperCase()}
                                </Typography>
                              )}
                          </Box>
                        </Box>

                        <TextField
                          multiline
                          fullWidth
                          value={result.rawResponse || result.text}
                          variant="outlined"
                          rows={
                            result.responseFormat === 'json' ||
                            result.responseFormat === 'verbose_json'
                              ? 8
                              : 3
                          }
                          InputProps={{
                            readOnly: true,
                          }}
                          sx={{
                            '& .MuiInputBase-input': {
                              fontSize: '0.9rem',
                              lineHeight: 1.4,
                              fontFamily:
                                result.responseFormat === 'json' ||
                                result.responseFormat === 'verbose_json'
                                  ? 'monospace'
                                  : 'inherit',
                            },
                          }}
                        />
                      </CardContent>

                      <CardActions
                        sx={{ justifyContent: 'space-between', pt: 1 }}
                      >
                        <Box display="flex" gap={1}>
                          <Tooltip title="Copy">
                            <IconButton
                              size="small"
                              onClick={() => {
                                const textToCopy =
                                  result.rawResponse || result.text;
                                navigator.clipboard
                                  .writeText(textToCopy)
                                  .catch(console.error);
                              }}
                              color="primary"
                            >
                              <CopyIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Download">
                            <IconButton
                              size="small"
                              onClick={() => {
                                const content =
                                  result.rawResponse || result.text;
                                let extension: string;
                                if (
                                  result.responseFormat === 'json' ||
                                  result.responseFormat === 'verbose_json'
                                ) {
                                  extension = 'json';
                                } else if (result.responseFormat === 'text') {
                                  extension = 'txt';
                                } else {
                                  extension = result.responseFormat; // srt, vtt
                                }
                                const blob = new Blob([content], {
                                  type: 'text/plain',
                                });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${result.fileName.replace(
                                  /\.[^./]+$/,
                                  '',
                                )}_transcription.${extension}`;
                                document.body.append(a);
                                a.click();
                                a.remove();
                                URL.revokeObjectURL(url);
                              }}
                              color="primary"
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Paste to chat">
                            <IconButton
                              size="small"
                              onClick={() => generateMessageClicked(result.id)}
                              color="primary"
                            >
                              <SendIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>

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
                  );
                })}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
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
