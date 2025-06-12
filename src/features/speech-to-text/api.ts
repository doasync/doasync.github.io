import { STTParams, STTResponse, TranscribeParams } from './types';
import { $apiKey, $providerApiUrl } from '../chat-settings/model';

export async function transcribeAudio(params: TranscribeParams): Promise<STTResponse> {
  const apiKey = $apiKey.getState();
  const providerUrl = $providerApiUrl.getState();
  
  if (!apiKey) {
    throw new Error('API key is not set. Please configure your API key in settings.');
  }

  // Determine endpoint based on isTranslation flag
  const endpoint = params.isTranslation 
    ? `${providerUrl}/v1/audio/translations`
    : `${providerUrl}/v1/audio/transcriptions`;

  // Prepare form data
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('model', params.model);
  
  // Add optional prompt for context/domain-specific terms
  if (params.prompt?.trim()) {
    formData.append('prompt', params.prompt.trim());
  }

  // Add response format - always use json for our dialog
  formData.append('response_format', 'json');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Transcription failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        errorMessage = `${errorMessage}: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Validate response has required text field
    if (!data.text) {
      throw new Error('No transcription text in response');
    }

    return {
      text: data.text,
      language: data.language,
      duration: data.duration,
      segments: data.segments,
    };
  } catch (error) {
    // Re-throw with more user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        throw new Error('Invalid API key. Please check your API key in settings.');
      } else if (error.message.includes('413')) {
        throw new Error('File size too large. Maximum file size is 25MB.');
      } else if (error.message.includes('415')) {
        throw new Error('Unsupported file format. Please use MP3, MP4, MPEG, MPGA, M4A, WAV, or WEBM.');
      }
      throw error;
    }
    throw new Error('Unknown error occurred during transcription');
  }
}

export function validateAudioFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  const supportedFormats = [
    'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/mpeg4-generic',
    'audio/x-mpeg', 'audio/mpga', 'audio/x-mpga',
    'audio/m4a', 'audio/x-m4a',
    'audio/wav', 'audio/wave', 'audio/x-wav',
    'audio/webm'
  ];
  
  if (!supportedFormats.includes(file.type)) {
    return {
      isValid: false,
      error: 'Unsupported file format. Please use MP3, MP4, MPEG, MPGA, M4A, WAV, or WEBM files.'
    };
  }

  // Check file size (25MB limit per VoidAI docs)
  const maxSize = 25 * 1024 * 1024; // 25MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size exceeds 25MB limit. Please use a smaller file.'
    };
  }

  return { isValid: true };
}

// Available STT models from VoidAI documentation
export const STT_MODELS = [
  {
    id: 'whisper-1',
    name: 'Whisper-1',
    description: 'Versatile baseline model with full parameter support',
    supportsTranslation: true,
    maxFileSize: 25 * 1024 * 1024,
    supportedFormats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm']
  },
  {
    id: 'gpt-4o-mini-transcribe',
    name: 'GPT-4o Mini Transcribe',
    description: 'Improved accuracy model with faster processing',
    supportsTranslation: false,
    maxFileSize: 25 * 1024 * 1024,
    supportedFormats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm']
  },
  {
    id: 'gpt-4o-transcribe',
    name: 'GPT-4o Transcribe',
    description: 'Premium accuracy model for highest quality transcriptions',
    supportsTranslation: false,
    maxFileSize: 25 * 1024 * 1024,
    supportedFormats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm']
  }
];