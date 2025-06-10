import React, { useRef, useState, useEffect } from 'react';
import { useUnit } from 'effector-react';
import {
  Box,
  IconButton,
  Typography,
  Tooltip,
  Alert,
  CircularProgress,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import {
  $isProcessingFile,
  filesSelected,
} from '@/features/chat';
import { $currentModelSupportsAudio } from '@/features/models-select';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const SUPPORTED_TYPES = [
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

interface AudioAttachmentInputProps {
  disabled?: boolean;
}

export const AudioAttachmentInput: React.FC<AudioAttachmentInputProps> = ({ 
  disabled = false 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isProcessingFile, modelSupportsAudio] = useUnit([
    $isProcessingFile,
    $currentModelSupportsAudio,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [mediaRecorder, isRecording]);

  const handleAttachClick = () => {
    if (disabled || isProcessingFile || isRecording) return;
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
        console.error('Unsupported audio file type:', file.type);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        // TODO: Show error via snackbar
        console.error('Audio file too large:', file.size);
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

  const startRecording = async () => {
    if (disabled || isProcessingFile) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder with appropriate MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';
      
      const recorder = new MediaRecorder(stream, { mimeType });
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: mimeType });
        const audioFile = new File([audioBlob], `recording-${Date.now()}.${mimeType.split('/')[1]}`, {
          type: mimeType,
        });
        
        // Send the recorded audio file
        filesSelected([audioFile]);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Reset state
        setIsRecording(false);
        setRecordingDuration(0);
        setAudioChunks([]);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAudioChunks(chunks);
      
      // Start duration counter
      const startTime = Date.now();
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 100);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      // TODO: Show error via snackbar
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show warning if model doesn't support audio
  const showAudioWarning = !modelSupportsAudio;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      {/* Audio Input Buttons */}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {/* File Upload Button */}
        <Tooltip title={disabled ? "Attach audio files" : "Attach audio files (WAV, MP3, AIFF, AAC, OGG, FLAC, MP4, MPEG, MPGA, M4A, WEBM)"}>
          <span>
            <IconButton
              onClick={handleAttachClick}
              disabled={disabled || isProcessingFile || isRecording}
              color="primary"
              aria-label="attach audio files"
              sx={{ mx: -0.5 }}
            >
              <AudioFileIcon />
            </IconButton>
          </span>
        </Tooltip>

        {/* Recording Button */}
        <Tooltip title={isRecording ? "Stop recording" : "Start recording"}>
          <span>
            <IconButton
              onClick={isRecording ? stopRecording : startRecording}
              disabled={disabled || isProcessingFile}
              color={isRecording ? "error" : "primary"}
              aria-label={isRecording ? "stop recording" : "start recording"}
              sx={{ mx: -0.5 }}
            >
              {isRecording ? <StopIcon /> : <MicIcon />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_TYPES.join(',')}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        multiple={true}
      />

      {/* Model Audio Warning - positioned above the input row */}
      {showAudioWarning && (
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
          Current model doesn't support audio. Audio will be uploaded but switch to an audio model for processing.
        </Alert>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <Box sx={{ 
          position: 'absolute',
          top: -30, // Position above the input area
          left: 0,
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          zIndex: 1,
        }}>
          <CircularProgress size={16} color="error" />
          <Typography variant="caption" color="error.main">
            Recording... {formatDuration(recordingDuration)}
          </Typography>
        </Box>
      )}

      {/* Processing Indicator */}
      {isProcessingFile && !isRecording && (
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
            Processing audio...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AudioAttachmentInput;