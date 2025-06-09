import React, { useRef } from 'react';
import { useUnit } from 'effector-react';
import {
  Box,
  IconButton,
  Typography,
  Tooltip,
  Alert,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import {
  $isProcessingFile,
  filesSelected,
} from '@/features/chat';
import { $currentModelSupportsVision } from '@/features/models-select';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

interface ImageAttachmentInputProps {
  disabled?: boolean;
}

export const ImageAttachmentInput: React.FC<ImageAttachmentInputProps> = ({ 
  disabled = false 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isProcessingFile, modelSupportsVision] = useUnit([
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

    // Convert FileList to array and validate
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    
    for (const file of fileArray) {
      // Validate file type
      if (!SUPPORTED_TYPES.includes(file.type)) {
        // TODO: Show error via snackbar
        console.error('Unsupported file type:', file.type);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        // TODO: Show error via snackbar
        console.error('File too large:', file.size);
        continue;
      }
      
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      filesSelected(validFiles);
    }
    
    // Clear the input so the same files can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Show warning if model doesn't support vision
  const showVisionWarning = !modelSupportsVision;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      {/* File Input Button */}
      <Tooltip title={disabled ? "Attach images" : "Attach images (JPG, PNG, GIF, WebP) - multiple selection supported"}>
        <span>
          <IconButton
            onClick={handleAttachClick}
            disabled={disabled || isProcessingFile}
            color="primary"
            aria-label="attach images"
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
        multiple={true}
      />

      {/* Model Vision Warning - positioned above the input row */}
      {showVisionWarning && (
        <Alert 
          severity="info" 
          sx={{ 
            position: 'absolute',
            top: -60, // Position above the input area
            left: 0,
            right: 0,
            fontSize: '0.875rem',
            zIndex: 1,
          }}
        >
          Current model doesn't support vision. Images will be uploaded but switch to a vision model for analysis.
        </Alert>
      )}

      {/* Processing Indicator - positioned above the input row */}
      {isProcessingFile && (
        <Box sx={{ 
          position: 'absolute',
          top: -30, // Position above the input area
          left: 0,
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          zIndex: 1,
        }}>
          <Typography variant="caption" color="text.secondary">
            Processing images...
          </Typography>
        </Box>
      )}
    </Box>
  );
};


export default ImageAttachmentInput;