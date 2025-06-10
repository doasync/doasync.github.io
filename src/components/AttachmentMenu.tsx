import React, { useRef, useState, useEffect } from "react";
import { useUnit } from "effector-react";
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Tooltip,
  Alert,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/MoreVert";
import ImageIcon from "@mui/icons-material/Image";
import AudioFileIcon from "@mui/icons-material/Audiotrack";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { $isProcessingFile, filesSelected } from "@/features/chat";
import {
  $currentModelSupportsVision,
  $currentModelSupportsAudio,
} from "@/features/models-select";
import { $selectedImageGenModel } from "@/features/image-generation";

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const SUPPORTED_AUDIO_TYPES = [
  "audio/wav",
  "audio/mp3",
  "audio/aiff",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "audio/mp4",
  "audio/mpeg",
  "audio/mpga",
  "audio/m4a",
  "audio/webm",
];

interface AttachmentMenuProps {
  disabled?: boolean;
  onImageGenerationClick?: () => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({
  disabled = false,
  onImageGenerationClick,
  onRecordingStateChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingStartTimeRef = useRef<number | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

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

  const open = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isProcessingFile) return;
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Image upload handlers
  const handleImageUpload = () => {
    handleMenuClose();
    imageInputRef.current?.click();
  };

  const handleImageFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        console.error("Unsupported image type:", file.type);
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        console.error("Image file too large:", file.size);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      filesSelected(validFiles);
    }

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  // Audio file upload handlers
  const handleAudioUpload = () => {
    handleMenuClose();
    audioInputRef.current?.click();
  };

  const handleAudioFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) {
        console.error("Unsupported audio type:", file.type);
        continue;
      }
      if (file.size > MAX_AUDIO_SIZE) {
        console.error("Audio file too large:", file.size);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      filesSelected(validFiles);
    }

    if (audioInputRef.current) {
      audioInputRef.current.value = "";
    }
  };

  // Audio recording handlers
  const handleStartRecording = async () => {
    handleMenuClose();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      });

      // Prefer M4A format for better metadata support
      const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/wav";

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
          "audio/mp4": "m4a",
          "audio/webm": "webm", 
          "audio/wav": "wav"
        };
        const extension = extensionMap[mimeType] || "mp3";
        
        const audioFile = new File(
          [audioBlob],
          `recording_${Date.now()}.${extension}`,
          {
            type: mimeType,
          }
        );

        filesSelected([audioFile]);

        // Clean up
        stream.getTracks().forEach((track) => track.stop());
        recordingStartTimeRef.current = null;
        onRecordingStateChange?.(false);
      };

      recorder.onerror = (event) => {
        console.error("Recording error:", event);
        setIsRecording(false);
        setMediaRecorder(null);
        onRecordingStateChange?.(false);
        stream.getTracks().forEach((track) => track.stop());
      };

      setMediaRecorder(recorder);
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      onRecordingStateChange?.(true);

      recorder.start();
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
      onRecordingStateChange?.(false);
      
      // Clear the recording state
      recordingStartTimeRef.current = null;
    }
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
    };
  }, [mediaRecorder]);


  // Show warnings for unsupported models
  const showVisionWarning = !modelSupportsVision;
  const showAudioWarning = !modelSupportsAudio;

  return (
    <Box sx={{ position: "relative" }}>
      {/* Main attachment button */}
      <Tooltip title="Attach files or record audio">
        <span>
          <IconButton
            onClick={isRecording ? handleStopRecording : handleMenuOpen}
            disabled={disabled || (isProcessingFile && !isRecording)}
            color={isRecording ? "error" : "primary"}
            aria-label={isRecording ? "stop recording" : "attachment menu"}
            sx={{ mx: -0.5 }}
          >
            {isRecording ? <StopIcon /> : <AddIcon />}
          </IconButton>
        </span>
      </Tooltip>

      {/* Attachment menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "left",
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

        <Divider />

        <MenuItem
          onClick={handleStartRecording}
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
      </Menu>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept={SUPPORTED_IMAGE_TYPES.join(",")}
        onChange={handleImageFileChange}
        style={{ display: "none" }}
        multiple={true}
      />

      <input
        ref={audioInputRef}
        type="file"
        accept={SUPPORTED_AUDIO_TYPES.join(",")}
        onChange={handleAudioFileChange}
        style={{ display: "none" }}
        multiple={true}
      />


      {/* Processing indicator */}
      {isProcessingFile && (
        <Box
          sx={{
            position: "absolute",
            top: -30,
            left: 0,
            display: "flex",
            alignItems: "center",
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
            position: "absolute",
            top: -100,
            left: 0,
            right: 0,
            fontSize: "0.875rem",
            zIndex: 11,
            maxWidth: 300,
          }}
        >
          {showVisionWarning && showAudioWarning
            ? "Current model doesn't support vision or audio. Switch models for analysis."
            : showVisionWarning
            ? "Current model doesn't support vision. Switch models for image analysis."
            : "Current model doesn't support audio. Switch models for audio analysis."}
        </Alert>
      )}
    </Box>
  );
};

export default AttachmentMenu;
