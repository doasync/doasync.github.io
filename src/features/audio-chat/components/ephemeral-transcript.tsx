/**
 * EphemeralTranscript Component
 *
 * Displays temporary STT transcripts generated from audio messages.
 * This transcript is session-only and not persisted to chat history.
 */

import { ContentCopy, TextFields } from '@mui/icons-material';
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Typography,
} from '@mui/material';
import React from 'react';

import type { EphemeralTranscriptData } from '@/features/audio-chat/types';

export interface EphemeralTranscriptProps {
  transcriptData: EphemeralTranscriptData;
  onError?: (error: string) => void;
}

export function EphemeralTranscript({
  transcriptData,
  onError,
}: EphemeralTranscriptProps) {
  if (!transcriptData.isVisible) {
    return null;
  }

  const handleCopyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(transcriptData.text);
      // You might want to show a snackbar here
    } catch (error) {
      console.error('Failed to copy transcript:', error);
      onError?.('Failed to copy transcript');
    }
  };

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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextFields sx={{ fontSize: 18, color: '#bad1ff' }} />
          <Typography
            variant="subtitle2"
            sx={{
              color: '#bad1ff',
              fontWeight: 'bold',
            }}
          >
            Transcript
          </Typography>
          {transcriptData.model && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontStyle: 'italic' }}
            >
              • {transcriptData.model}
            </Typography>
          )}
          {transcriptData.format && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontStyle: 'italic' }}
            >
              • {transcriptData.format}
            </Typography>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontStyle: 'italic' }}
          >
            •{' '}
            {new Date(transcriptData.timestamp).toLocaleTimeString('en-GB', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Typography>
        </Box>

        {/* Copy button */}
        {transcriptData.text &&
          !transcriptData.isLoading &&
          !transcriptData.error && (
            <IconButton
              size="small"
              onClick={() => {
                handleCopyTranscript().catch((error) => {
                  console.error('Failed to copy transcript:', error);
                });
              }}
              title="Copy transcript"
              sx={{ p: 0.5 }}
            >
              <ContentCopy sx={{ fontSize: 14 }} />
            </IconButton>
          )}
      </Box>

      {/* Loading state */}
      {transcriptData.isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Transcribing audio...
          </Typography>
        </Box>
      )}

      {/* Error state */}
      {transcriptData.error && (
        <Alert severity="error" variant="outlined" sx={{ mt: 1 }}>
          <Typography variant="body2">{transcriptData.error}</Typography>
        </Alert>
      )}

      {/* Transcript text */}
      {transcriptData.text &&
        !transcriptData.isLoading &&
        !transcriptData.error && (
          <Typography
            variant="body2"
            sx={{
              fontStyle: 'italic',
              lineHeight: 1.4,
              color: 'text.primary',
              '&::before': {
                content: '"\u201C"',
                color: 'text.secondary',
              },
              '&::after': {
                content: '"\u201D"',
                color: 'text.secondary',
              },
            }}
          >
            {transcriptData.text}
          </Typography>
        )}
    </Box>
  );
}

// Named export already available above
