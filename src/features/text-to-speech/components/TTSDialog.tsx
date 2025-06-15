'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
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
} from '@mui/material';
import {
  Close as CloseIcon,
  VolumeUp as VolumeUpIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useUnit } from 'effector-react';
import {
  $ttsState,
  $generatedAudios,
  $supportedFormats,
  textChanged,
  voiceSelected,
  formatSelected,
  modelSelected,
  instructionsChanged,
  generateTTSClicked,
  generateTTSStreamClicked,
  clearError,
  ttsDialogClosed,
  ttsDialogOpened,
  deleteAudio,
  $isStreaming,
} from '../model';
import { $ttsModels, loadVoiceModels } from '../../voice-models';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';

import type { GeneratedAudio, AudioFormat } from '../types';

// Get proper MIME type for audio format
const getAudioMimeType = (format: AudioFormat): string => {
  switch (format) {
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'aac':
      return 'audio/aac';
    case 'opus':
      return 'audio/opus';
    case 'flac':
      return 'audio/flac';
    case 'pcm':
      return 'audio/wav'; // PCM data is typically in WAV container
    default:
      return 'audio/mpeg'; // fallback
  }
};

interface TTSDialogProps {
  open: boolean;
  onClose: () => void;
  initialText?: string;
}

interface AudioGenerationItemProps {
  audio: GeneratedAudio;
}

function AudioGenerationItem({ audio }: AudioGenerationItemProps) {
  const theme = useTheme();

  // Format the timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Truncate text for preview
  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 1,
        backgroundColor: theme.palette.action.hover,
        border: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {/* Header with metadata */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <Box>
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, color: 'text.primary' }}
          >
            🎵 {audio.filename}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', display: 'block' }}
          >
            {audio.model} • {audio.voice} • {audio.format.toUpperCase()} •{' '}
            {formatFileSize(audio.size)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {formatTime(audio.timestamp)}
          </Typography>
          <IconButton
            size="small"
            onClick={() => {
              const link = document.createElement('a');
              link.href = audio.url;
              link.download = audio.filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            sx={{ p: 0.5 }}
            title="Download audio"
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => deleteAudio(audio.id)}
            sx={{ p: 0.5 }}
            title="Delete audio"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Text preview */}
      <Typography
        variant="caption"
        sx={{
          fontStyle: 'italic',
          color: 'text.secondary',
          backgroundColor: theme.palette.background.paper,
          p: 1,
          borderRadius: 0.5,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        &quot;{truncateText(audio.text, 100)}&quot;
      </Typography>

      {/* Native audio player */}
      <audio
        controls
        style={{
          width: '100%',
          minWidth: '280px',
        }}
      >
        <source src={audio.url} type={getAudioMimeType(audio.format)} />
        Your browser does not support the audio element.
      </audio>
    </Box>
  );
}

export function TTSDialog({ open, onClose, initialText = '' }: TTSDialogProps) {
  const ttsState = useUnit($ttsState);
  const generatedAudios = useUnit($generatedAudios);
  const { availableVoices } = ttsState;
  const ttsModels = useUnit($ttsModels);
  const isStreaming = useUnit($isStreaming);
  const supportedFormats = useUnit($supportedFormats);

  const [localText, setLocalText] = useState(initialText);
  const [enableStreaming, setEnableStreaming] = useState(false);

  React.useEffect(() => {
    if (initialText && open) {
      setLocalText(initialText);
      textChanged(initialText);
    }
    if (open) {
      ttsDialogOpened();
      loadVoiceModels();
    }
  }, [initialText, open]);

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    setLocalText(text);
    textChanged(text);
  };

  const handleVoiceChange = (event: SelectChangeEvent) => {
    voiceSelected(event.target.value as string);
  };

  const handleFormatChange = (event: SelectChangeEvent) => {
    formatSelected(event.target.value as AudioFormat);
  };

  const handleModelChange = (event: SelectChangeEvent) => {
    modelSelected(event.target.value as string);
  };

  const handleGenerate = () => {
    if (ttsState.text.trim()) {
      if (enableStreaming) {
        generateTTSStreamClicked();
      } else {
        generateTTSClicked();
      }
    }
  };

  const handleClose = () => {
    ttsDialogClosed();
    onClose();
  };

  const canGenerate = ttsState.text.trim().length > 0 && !ttsState.isLoading;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VolumeUpIcon />
          Text to Speech
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 1 }}>
          {/* Text Input */}
          <TextField
            label="Text to convert"
            multiline
            rows={6}
            value={localText}
            onChange={handleTextChange}
            placeholder="Enter the text you want to convert to speech..."
            variant="outlined"
            fullWidth
            inputProps={{
              maxLength: 4000,
            }}
            helperText={`${ttsState.text.length}/4000 characters`}
          />

          {/* Model Selection */}
          <FormControl fullWidth>
            <InputLabel>TTS Model</InputLabel>
            <Select
              value={ttsState.selectedModel}
              onChange={handleModelChange}
              label="TTS Model"
            >
              {ttsModels.map((model) => (
                <MenuItem key={model.id} value={model.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ fontWeight: 'medium' }}>{model.name}</Box>
                    <Chip
                      label={model.provider}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Voice and Format Selection */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 150, flex: 1 }}>
              <InputLabel>Voice</InputLabel>
              <Select
                value={ttsState.selectedVoice}
                onChange={handleVoiceChange}
                label="Voice"
              >
                {availableVoices.map((voice) => (
                  <MenuItem key={voice.id} value={voice.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {voice.name}
                      {voice.gender && (
                        <Chip
                          label={voice.gender}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Format</InputLabel>
              <Select
                value={ttsState.selectedFormat}
                onChange={handleFormatChange}
                label="Format"
              >
                {supportedFormats.map((format) => (
                  <MenuItem key={format} value={format}>
                    {format.toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Instructions (only for gpt-4o-mini-tts) */}
          {ttsState.selectedModel === 'gpt-4o-mini-tts' && (
            <TextField
              label="Voice Instructions"
              multiline
              rows={2}
              value={ttsState.instructions}
              onChange={(e) => instructionsChanged(e.target.value)}
              placeholder="e.g., Speak in a cheerful and positive tone, use a slower pace, add emphasis on key words..."
              variant="outlined"
              fullWidth
              helperText="Control accent, emotional range, tone, speed, and other speech characteristics"
            />
          )}

          {/* Progress */}
          {ttsState.isLoading && (
            <Box>
              <LinearProgress />
              <Box
                sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}
              >
                Generating audio...
              </Box>
            </Box>
          )}

          {/* Error */}
          {ttsState.error && (
            <Alert severity="error" onClose={() => clearError()}>
              {ttsState.error}
            </Alert>
          )}

          {/* Generated Audios List */}
          {generatedAudios.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                Generated Audio Files ({generatedAudios.length})
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  maxHeight: 400,
                  overflowY: 'auto',
                }}
              >
                {generatedAudios.map((audio) => (
                  <AudioGenerationItem key={audio.id} audio={audio} />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button onClick={handleClose} color="inherit">
              Cancel
            </Button>

            {/* Streaming toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={enableStreaming}
                  onChange={(e) => setEnableStreaming(e.target.checked)}
                  disabled={ttsState.isLoading}
                />
              }
              label="Stream audio"
              sx={{ ml: 2 }}
            />
          </Box>

          <Tooltip
            title={
              enableStreaming
                ? 'Generate and stream audio'
                : 'Generate audio from text'
            }
          >
            <span>
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                variant="contained"
                startIcon={<VolumeUpIcon />}
              >
                {isStreaming ? 'Streaming...' : 'Generate Audio'}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
