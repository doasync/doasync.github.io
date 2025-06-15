/**
 * FileAttachmentWrapper Component
 *
 * Provides a unified UI structure for all file attachments in messages.
 * Includes consistent styling, icons, metadata, and action buttons.
 */

import {
  AudioFile as AudioIcon,
  AutoAwesome as GeneratedIcon,
  Delete as DeleteIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { Box, IconButton, Typography, useTheme } from '@mui/material';
import React from 'react';

export interface FileAttachmentAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface FileAttachmentWrapperProps {
  type: 'image' | 'audio' | 'document' | 'generated_image';
  fileName: string;
  metadata?: string[];
  actions?: FileAttachmentAction[];
  onDelete?: () => void;
  children: React.ReactNode;
  sx?: object;
}

const FILE_TYPE_ICONS = {
  image: ImageIcon,
  audio: AudioIcon,
  document: DocumentIcon,
  generated_image: GeneratedIcon,
};

export function FileAttachmentWrapper({
  type,
  fileName,
  metadata = [],
  actions = [],
  onDelete,
  children,
  sx: customSx,
}: FileAttachmentWrapperProps): React.JSX.Element {
  const theme = useTheme();
  const IconComponent = FILE_TYPE_ICONS[type];

  // Always include delete button if onDelete is provided
  const allActions: FileAttachmentAction[] = [
    ...actions,
    ...(onDelete
      ? [
          {
            icon: <DeleteIcon fontSize="small" />,
            label: 'Delete attachment',
            onClick: onDelete,
            disabled: false,
          },
        ]
      : []),
  ];

  return (
    <Box
      sx={{
        borderRadius: 1,
        backgroundColor: theme.palette.action.hover,
        border: `1px solid ${theme.palette.divider}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        ...customSx,
      }}
    >
      {/* Header with icon, filename, and actions */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          pb: metadata.length > 0 ? 0.5 : 1.5,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minWidth: 0, // Allow text truncation
            flex: 1, // Take up available space
            mr: 2, // Add margin right to create gap from action buttons
          }}
        >
          <IconComponent color="primary" sx={{ flexShrink: 0 }} />
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fileName}
          </Typography>
        </Box>

        {/* Action buttons */}
        {allActions.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            {allActions.map((action) => (
              <IconButton
                key={action.label}
                size="small"
                onClick={action.onClick}
                title={action.label}
                disabled={action.disabled || false}
                sx={{ p: 0.5 }}
              >
                {action.icon}
              </IconButton>
            ))}
          </Box>
        )}
      </Box>

      {/* Metadata */}
      {metadata.length > 0 && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            px: 1.5,
            pb: 1.5,
            color: 'text.secondary',
            fontSize: '0.75rem',
          }}
        >
          {metadata.join(' • ')}
        </Typography>
      )}

      {/* File content */}
      <Box sx={{ position: 'relative' }}>{children}</Box>
    </Box>
  );
}
