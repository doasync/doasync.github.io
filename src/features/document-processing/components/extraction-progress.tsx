import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import {
  Alert,
  Box,
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import React from 'react';

import type { DocumentProcessingResult } from '@/features/document-processing/types';

interface ExtractionProgressProps {
  files: File[];
  isProcessing: boolean;
  error: string | null;
  results: DocumentProcessingResult[];
}

export function ExtractionProgress({
  files,
  isProcessing,
  error,
  results,
}: ExtractionProgressProps): React.JSX.Element {
  const getFileStatus = (file: File, index: number) => {
    if (error) return 'error';
    if (results.length > index) return 'complete';
    if (isProcessing) return 'processing';
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': {
        return <CheckCircleIcon color="success" />;
      }
      case 'error': {
        return <ErrorIcon color="error" />;
      }
      case 'processing': {
        return <HourglassEmptyIcon color="primary" />;
      }
      default: {
        return <InsertDriveFileIcon />;
      }
    }
  };

  const progress = files.length > 0 ? (results.length / files.length) * 100 : 0;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Document Processing
        </Typography>

        {isProcessing && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Processing {results.length} of {files.length} files...
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <List dense>
          {files.map((file, index) => {
            const status = getFileStatus(file, index);
            return (
              <ListItem key={`${file.name}-${file.size}-${file.lastModified}`}>
                <ListItemIcon>{getStatusIcon(status)}</ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB • ${file.type}`}
                />
              </ListItem>
            );
          })}
        </List>
      </CardContent>
    </Card>
  );
}
