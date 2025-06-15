/**
 * EphemeralAudioPlayer Component
 *
 * Displays temporary TTS audio generated from text messages.
 * This audio is session-only and not persisted to chat history.
 */

import { VolumeUp } from '@mui/icons-material';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import React from 'react';

import type { EphemeralAudioData } from '@/features/audio-chat/types';

export interface EphemeralAudioPlayerProps {
  audioData: EphemeralAudioData;
  onError?: (error: string) => void;
}

export function EphemeralAudioPlayer({
  audioData,
  onError,
}: EphemeralAudioPlayerProps) {
  if (!audioData.isVisible) {
    return null;
  }

  return (
    <Box
      sx={{
        border: '1px dashed #bad1ff',
        borderRadius: 2,
        p: 2,
        mt: 2,
        backgroundColor: '#bad1ff0a', // Light blue background with low opacity
        position: 'relative',
        '&::before': {
          content: '"TEMPORARY"',
          position: 'absolute',
          top: -8,
          left: 16,
          fontSize: '10px',
          fontWeight: 'bold',
          color: '#bad1ff',
          backgroundColor: 'background.paper',
          px: 1,
        },
      }}
    >
      {/* Header with temporary indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <VolumeUp sx={{ fontSize: 18, color: '#bad1ff' }} />
        <Typography
          variant="subtitle2"
          sx={{
            color: '#bad1ff',
            fontWeight: 'bold',
          }}
        >
          Speech
        </Typography>
        {audioData.model && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontStyle: 'italic' }}
          >
            • {audioData.model}
          </Typography>
        )}
        {audioData.voice && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontStyle: 'italic' }}
          >
            • {audioData.voice}
          </Typography>
        )}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontStyle: 'italic' }}
        >
          •{' '}
          {new Date(audioData.timestamp).toLocaleTimeString('en-GB', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography>
      </Box>

      {/* Loading state */}
      {audioData.isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Generating audio...
          </Typography>
        </Box>
      )}

      {/* Error state */}
      {audioData.error && (
        <Alert severity="error" variant="outlined" sx={{ mt: 1 }}>
          <Typography variant="body2">{audioData.error}</Typography>
        </Alert>
      )}

      {/* Audio player */}
      {audioData.url && !audioData.isLoading && !audioData.error && (
        <audio
          controls
          src={audioData.url}
          style={{
            width: '100%',
            height: '32px',
            marginTop: '4px',
          }}
          onError={(error) => {
            console.error('Audio playback error:', error);
            onError?.('Audio playback failed');
          }}
          preload="metadata"
        >
          <track kind="captions" />
          Your browser does not support the audio element.
        </audio>
      )}
    </Box>
  );
}

// Named export already available above
