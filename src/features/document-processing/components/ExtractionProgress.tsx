import React from "react";
import {
  Box,
  LinearProgress,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert
} from "@mui/material";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import type { DocumentProcessingResult } from "../types";

interface ExtractionProgressProps {
  files: File[];
  isProcessing: boolean;
  error: string | null;
  results: DocumentProcessingResult[];
}

export const ExtractionProgress: React.FC<ExtractionProgressProps> = ({
  files,
  isProcessing,
  error,
  results
}) => {
  const getFileStatus = (file: File, index: number) => {
    if (error) return 'error';
    if (results.length > index) return 'complete';
    if (isProcessing) return 'processing';
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'processing':
        return <HourglassEmptyIcon color="primary" />;
      default:
        return <InsertDriveFileIcon />;
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
              <ListItem key={`${file.name}-${index}`}>
                <ListItemIcon>
                  {getStatusIcon(status)}
                </ListItemIcon>
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
};