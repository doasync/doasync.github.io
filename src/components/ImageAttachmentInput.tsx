import React, { useRef } from 'react';
import { useUnit } from 'effector-react';
import {
  Box,
  IconButton,
  Chip,
  Stack,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Tooltip,
  Alert,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import {
  $pendingAttachments,
  $isProcessingFile,
  fileSelected,
  attachmentRemoved,
  attachmentCleared,
  type Attachment,
} from '@/features/chat';
import { $currentModelSupportsVision } from '@/features/models-select';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

interface ImageAttachmentInputProps {
  disabled?: boolean;
}

export const ImageAttachmentInput: React.FC<ImageAttachmentInputProps> = ({ 
  disabled = false 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [pendingAttachments, isProcessingFile, modelSupportsVision] = useUnit([
    $pendingAttachments,
    $isProcessingFile,
    $currentModelSupportsVision,
  ]);

  const handleAttachClick = () => {
    if (disabled || isProcessingFile) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    if (!SUPPORTED_TYPES.includes(file.type)) {
      // TODO: Show error via snackbar
      console.error('Unsupported file type:', file.type);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      // TODO: Show error via snackbar
      console.error('File too large:', file.size);
      return;
    }

    fileSelected(file);
    
    // Clear the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    attachmentRemoved(attachmentId);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Show warning if model doesn't support vision but has image attachments
  const showVisionWarning = pendingAttachments.length > 0 && !modelSupportsVision;

  return (
    <Box>
      {/* File Input Button */}
      <Tooltip title={disabled ? "Attach image" : "Attach image (JPG, PNG, GIF, WebP)"}>
        <span>
          <IconButton
            onClick={handleAttachClick}
            disabled={disabled || isProcessingFile}
            color="primary"
            aria-label="attach image"
            sx={{ mx: -0.5 }}
          >
            <AttachFileIcon />
          </IconButton>
        </span>
      </Tooltip>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_TYPES.join(',')}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        multiple={false}
      />

      {/* Model Vision Warning */}
      {showVisionWarning && (
        <Alert 
          severity="warning" 
          sx={{ mb: 1, fontSize: '0.875rem' }}
          action={
            <IconButton
              aria-label="clear all attachments"
              color="inherit"
              size="small"
              onClick={() => attachmentCleared()}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          Current model doesn't support images. Switch to a vision model or remove attachments.
        </Alert>
      )}

      {/* Attachment Previews */}
      {pendingAttachments.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            {pendingAttachments.map((attachment) => (
              <AttachmentPreview
                key={attachment.id}
                attachment={attachment}
                onRemove={handleRemoveAttachment}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Processing Indicator */}
      {isProcessingFile && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Processing image...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

interface AttachmentPreviewProps {
  attachment: Attachment;
  onRemove: (id: string) => void;
}

const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ 
  attachment, 
  onRemove 
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (attachment.type === 'image' && attachment.dataUrl) {
    return (
      <Card sx={{ maxWidth: 120, position: 'relative' }}>
        <CardMedia
          component="img"
          height="80"
          image={attachment.dataUrl}
          alt={attachment.fileName}
          sx={{ objectFit: 'cover' }}
        />
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
          <Typography variant="caption" color="text.secondary" noWrap>
            {attachment.fileName}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            {formatFileSize(attachment.size)}
          </Typography>
        </CardContent>
        <IconButton
          size="small"
          onClick={() => onRemove(attachment.id)}
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Card>
    );
  }

  // Fallback for non-image attachments
  return (
    <Chip
      icon={<ImageIcon />}
      label={`${attachment.fileName} (${formatFileSize(attachment.size)})`}
      onDelete={() => onRemove(attachment.id)}
      variant="outlined"
      color="primary"
    />
  );
};

export default ImageAttachmentInput;