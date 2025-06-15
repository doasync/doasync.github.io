import AudioFileIcon from '@mui/icons-material/Audiotrack';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DocumentIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import MicIcon from '@mui/icons-material/Mic';
import AddIcon from '@mui/icons-material/MoreVert';
import TranscribeIcon from '@mui/icons-material/RecordVoiceOver';
import StopIcon from '@mui/icons-material/Stop';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
  Alert,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import { useUnit } from 'effector-react';
import React, { useEffect, useRef, useState } from 'react';

import { $isProcessingFile, filesSelected } from '@/features/chat';
import { $selectedImageGenModel } from '@/features/image-generation';
import {
  $currentModelSupportsAudio,
  $currentModelSupportsVision,
} from '@/features/models-select';
import { dialogOpened as sttDialogOpened } from '@/features/speech-to-text';

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const SUPPORTED_AUDIO_TYPES = [
  'audio/wav',
  'audio/mp3',
  'audio/aiff',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
  'audio/mp4',
  'audio/mpeg',
  'audio/mpga',
  'audio/m4a',
  'audio/webm',
];
const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
  'application/x-markdown',
  'text/html',
  'application/xhtml+xml',
];

interface AttachmentMenuProps {
  disabled?: boolean;
  onImageGenerationClick?: () => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onTTSClick?: () => void;
}

export function AttachmentMenu({
  disabled = false,
  onImageGenerationClick,
  onRecordingStateChange,
  onTTSClick,
}: AttachmentMenuProps) {
  const [anchorElement, setAnchorElement] = useState<null | HTMLElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingStartTimeRef = useRef<number | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const [
    isProcessingFile,
    modelSupportsVision,
    modelSupportsAudio,
    selectedImageGenModel,
  ] = useUnit([
    $isProcessingFile,
    $currentModelSupportsVision,
    $currentModelSupportsAudio,
    $selectedImageGenModel,
  ]);

  const open = Boolean(anchorElement);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isProcessingFile) return;
    setAnchorElement(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorElement(null);
  };

  // Image upload handlers
  const handleImageUpload = () => {
    handleMenuClose();
    imageInputRef.current?.click();
  };

  const handleImageFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { files } = event.target;
    if (!files || files.length === 0) return;

    const fileArray = [...files];
    const validFiles: File[] = [];

    for (const file of fileArray) {
      if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        // Skip unsupported image type
      } else if (file.size > MAX_IMAGE_SIZE) {
        // Skip image file too large
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length > 0) {
      filesSelected(validFiles);
    }

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // Audio file upload handlers
  const handleAudioUpload = () => {
    handleMenuClose();
    audioInputRef.current?.click();
  };

  const handleAudioFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { files } = event.target;
    if (!files || files.length === 0) return;

    const fileArray = [...files];
    const validFiles: File[] = [];

    for (const file of fileArray) {
      if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) {
        // Skip unsupported audio type
      } else if (file.size > MAX_AUDIO_SIZE) {
        // Skip audio file too large
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length > 0) {
      filesSelected(validFiles);
    }

    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
  };

  // Document upload handlers
  const handleDocumentUpload = () => {
    handleMenuClose();
    documentInputRef.current?.click();
  };

  const handleDocumentFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { files } = event.target;
    if (!files || files.length === 0) return;

    const fileArray = [...files];
    const validFiles: File[] = [];

    for (const file of fileArray) {
      if (!SUPPORTED_DOCUMENT_TYPES.includes(file.type)) {
        // Skip unsupported document type
      } else if (file.size > MAX_DOCUMENT_SIZE) {
        // Skip document file too large
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length > 0) {
      filesSelected(validFiles);
    }

    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
  };

  // Audio recording handlers
  const handleStartRecording = async () => {
    handleMenuClose();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16_000,
        },
      });

      // Prefer M4A format for better metadata support
      let mimeType = 'audio/wav';
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: mimeType });
        // Determine proper file extension
        const extensionMap: Record<string, string> = {
          'audio/mp4': 'm4a',
          'audio/webm': 'webm',
          'audio/wav': 'wav',
        };
        const extension = extensionMap[mimeType] || 'mp3';

        const audioFile = new File(
          [audioBlob],
          `recording_${Date.now()}.${extension}`,
          {
            type: mimeType,
          },
        );

        filesSelected([audioFile]);

        // Clean up
        for (const track of stream.getTracks()) track.stop();
        recordingStartTimeRef.current = null;
        onRecordingStateChange?.(false);
      };

      recorder.addEventListener('error', () => {
        // Recording error occurred
        setIsRecording(false);
        setMediaRecorder(null);
        onRecordingStateChange?.(false);
        for (const track of stream.getTracks()) track.stop();
      });

      setMediaRecorder(recorder);
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      onRecordingStateChange?.(true);

      recorder.start();
    } catch {
      // Error starting recording
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
      onRecordingStateChange?.(false);

      // Clear the recording state
      recordingStartTimeRef.current = null;
    }
  };

  // Cleanup effect
  useEffect(
    () => () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    },
    [mediaRecorder],
  );

  // Show warnings for unsupported models
  const showVisionWarning = !modelSupportsVision;
  const showAudioWarning = !modelSupportsAudio;

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Main attachment button */}
      <Tooltip title="Attach files or record audio">
        <span>
          <IconButton
            onClick={isRecording ? handleStopRecording : handleMenuOpen}
            disabled={disabled || (isProcessingFile && !isRecording)}
            color={isRecording ? 'error' : 'primary'}
            aria-label={isRecording ? 'stop recording' : 'attachment menu'}
            sx={{ mx: -0.5 }}
          >
            {isRecording ? <StopIcon /> : <AddIcon />}
          </IconButton>
        </span>
      </Tooltip>

      {/* Attachment menu */}
      <Menu
        anchorEl={anchorElement}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            sx: { minWidth: 200 },
          },
        }}
      >
        <MenuItem
          onClick={handleImageUpload}
          disabled={disabled || isProcessingFile}
        >
          <ListItemIcon>
            <ImageIcon />
          </ListItemIcon>
          <ListItemText
            primary="Upload Image"
            secondary="JPG, PNG, GIF, WebP"
          />
        </MenuItem>

        <MenuItem
          onClick={handleAudioUpload}
          disabled={disabled || isProcessingFile}
        >
          <ListItemIcon>
            <AudioFileIcon />
          </ListItemIcon>
          <ListItemText
            primary="Upload Audio"
            secondary="MP3, WAV, FLAC, M4A..."
          />
        </MenuItem>

        <MenuItem
          onClick={handleDocumentUpload}
          disabled={disabled || isProcessingFile}
        >
          <ListItemIcon>
            <DocumentIcon />
          </ListItemIcon>
          <ListItemText
            primary="Upload Document"
            secondary="PDF, DOCX, TXT, MD, HTML"
          />
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={() => {
            handleStartRecording().catch(() => {});
          }}
          disabled={disabled || isProcessingFile}
        >
          <ListItemIcon>
            <MicIcon />
          </ListItemIcon>
          <ListItemText
            primary="Record Audio"
            secondary="Start voice recording"
          />
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={() => {
            handleMenuClose();
            onImageGenerationClick?.();
          }}
          disabled={disabled || isProcessingFile}
        >
          <ListItemIcon>
            <AutoFixHighIcon />
          </ListItemIcon>
          <ListItemText
            primary="Generate Image"
            secondary={`Use ${selectedImageGenModel}`}
          />
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleMenuClose();
            onTTSClick?.();
          }}
          disabled={disabled || isProcessingFile}
        >
          <ListItemIcon>
            <VolumeUpIcon />
          </ListItemIcon>
          <ListItemText
            primary="Text to Speech"
            secondary="Convert text to audio"
          />
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleMenuClose();
            sttDialogOpened();
          }}
          disabled={disabled || isProcessingFile}
        >
          <ListItemIcon>
            <TranscribeIcon />
          </ListItemIcon>
          <ListItemText
            primary="Transcribe Audio"
            secondary="Convert audio to text"
          />
        </MenuItem>
      </Menu>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept={SUPPORTED_IMAGE_TYPES.join(',')}
        onChange={handleImageFileChange}
        style={{ display: 'none' }}
        multiple
      />

      <input
        ref={audioInputRef}
        type="file"
        accept={SUPPORTED_AUDIO_TYPES.join(',')}
        onChange={handleAudioFileChange}
        style={{ display: 'none' }}
        multiple
      />

      <input
        ref={documentInputRef}
        type="file"
        accept={SUPPORTED_DOCUMENT_TYPES.join(',')}
        onChange={handleDocumentFileChange}
        style={{ display: 'none' }}
        multiple
      />

      {/* Processing indicator */}
      {isProcessingFile && (
        <Box
          sx={{
            position: 'absolute',
            top: -30,
            left: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            zIndex: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Processing files...
          </Typography>
        </Box>
      )}

      {/* Model capability warnings */}
      {(showVisionWarning || showAudioWarning) && open && (
        <Alert
          severity="info"
          sx={{
            position: 'absolute',
            top: -100,
            left: 0,
            right: 0,
            fontSize: '0.875rem',
            zIndex: 11,
            maxWidth: 300,
          }}
        >
          {(() => {
            if (showVisionWarning && showAudioWarning) {
              return "Current model doesn't support vision or audio. Switch models for analysis.";
            }
            if (showVisionWarning) {
              return "Current model doesn't support vision. Switch models for image analysis.";
            }
            return "Current model doesn't support audio. Switch models for audio analysis.";
          })()}
        </Alert>
      )}
    </Box>
  );
}

// Named export already available above
