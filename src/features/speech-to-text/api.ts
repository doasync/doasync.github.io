import {
  ResponseFormatOption,
  STTModel,
  STTResponse,
  TranscribeParams,
} from './types';

export async function transcribeAudio(
  params: TranscribeParams & { apiKey: string; providerUrl: string },
): Promise<STTResponse> {
  const { apiKey, providerUrl } = params;

  if (!apiKey) {
    throw new Error(
      'API key is not set. Please configure your API key in settings.',
    );
  }

  // VoidAI only supports transcriptions endpoint
  const endpoint = `${providerUrl}/audio/transcriptions`;

  // Prepare form data
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('model', params.model);

  // Add optional prompt for context/domain-specific terms
  if (params.prompt?.trim()) {
    formData.append('prompt', params.prompt.trim());
  }

  // Add response format
  formData.append('response_format', params.responseFormat);

  // Debug logging for troubleshooting
  if (process.env.NODE_ENV === 'development') {
    console.log('STT API Request:', {
      endpoint,
      model: params.model,
      fileName: params.file.name,
      fileSize: params.file.size,
      fileType: params.file.type,
      hasPrompt: Boolean(params.prompt?.trim()),
      responseFormat: params.responseFormat,
    });
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Transcription failed';
      try {
        const errorData = await response.json();
        // Check for different error message formats from VoidAI API
        errorMessage =
          errorData.error?.message ||
          errorData.message ||
          errorData.detail ||
          errorMessage;
      } catch {
        errorMessage = `${errorMessage}: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // Handle different response formats
    if (params.responseFormat === 'text') {
      const rawText = await response.text();
      return {
        text: rawText,
        rawResponse: rawText,
        language: undefined,
        duration: undefined,
        segments: undefined,
      };
    }
    if (params.responseFormat === 'srt' || params.responseFormat === 'vtt') {
      // SRT and VTT formats return subtitles as plain text
      const rawText = await response.text();
      return {
        text: rawText,
        rawResponse: rawText,
        language: undefined,
        duration: undefined,
        segments: undefined,
      };
    }
    // JSON and verbose_json formats
    const rawText = await response.text();
    const data = JSON.parse(rawText);

    // Validate response has required text field
    if (!data.text) {
      throw new Error('No transcription text in response');
    }

    return {
      text: data.text,
      rawResponse: rawText, // Store the original JSON string
      language: data.language,
      duration: data.duration,
      segments: data.segments,
    };
  } catch (error) {
    // Handle network-level errors (Failed to fetch, CORS, timeout, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        'Network error: Unable to connect to transcription service. Please check your internet connection and try again.',
      );
    }

    // Re-throw with more user-friendly error messages for API errors
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        throw new Error(
          'Invalid API key. Please check your API key in settings.',
        );
      } else if (error.message.includes('413')) {
        throw new Error('File size too large. Maximum file size is 25MB.');
      } else if (error.message.includes('415')) {
        throw new Error(
          'Unsupported file format. Please use MP3, MP4, MPEG, MPGA, M4A, WAV, or WEBM.',
        );
      } else if (error.message.includes('Audio file might be corrupted')) {
        throw new Error(
          'Audio file might be corrupted or unsupported. Try using a different audio file or convert to a supported format (MP3, WAV, M4A).',
        );
      }
      throw error;
    }
    throw new Error('Unknown error occurred during transcription');
  }
}

export function validateAudioFile(file: File): {
  isValid: boolean;
  error?: string;
} {
  // Check file type
  const supportedFormats = [
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/mpeg4-generic',
    'audio/x-mpeg',
    'audio/mpga',
    'audio/x-mpga',
    'audio/m4a',
    'audio/x-m4a',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/webm',
  ];

  if (!supportedFormats.includes(file.type)) {
    return {
      isValid: false,
      error:
        'Unsupported file format. Please use MP3, MP4, MPEG, MPGA, M4A, WAV, or WEBM files.',
    };
  }

  // Check file size (25MB limit per VoidAI docs)
  const maxSize = 25 * 1024 * 1024; // 25MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size exceeds 25MB limit. Please use a smaller file.',
    };
  }

  return { isValid: true };
}

// Response format options with descriptions
export const RESPONSE_FORMAT_OPTIONS: ResponseFormatOption[] = [
  {
    value: 'json',
    label: 'JSON',
    description: 'Simple JSON with text',
  },
  {
    value: 'text',
    label: 'Plain Text',
    description: 'Plain text response for simple integration',
  },
  {
    value: 'srt',
    label: 'SRT',
    description: 'SubRip subtitle format for video captioning',
  },
  {
    value: 'vtt',
    label: 'WebVTT',
    description: 'Web Video Text Tracks for web video captioning',
  },
  {
    value: 'verbose_json',
    label: 'Verbose JSON',
    description: 'Detailed JSON with metadata for advanced applications',
  },
];

// Available STT models from VoidAI documentation
export const STT_MODELS: STTModel[] = [
  {
    id: 'whisper-1',
    name: 'Whisper-1',
    description: 'Versatile baseline model with full parameter support',
    maxFileSize: 25 * 1024 * 1024,
    supportedFormats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'],
    supportedResponseFormats: ['json', 'text', 'srt', 'verbose_json', 'vtt'],
    defaultResponseFormat: 'text',
    hasLimitedParams: false,
  },
  {
    id: 'gpt-4o-mini-transcribe',
    name: 'GPT-4o Mini Transcribe',
    description:
      'Higher quality model with improved accuracy (limited parameters)',
    maxFileSize: 25 * 1024 * 1024,
    supportedFormats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'],
    supportedResponseFormats: ['json', 'text'],
    defaultResponseFormat: 'text',
    hasLimitedParams: true,
  },
  {
    id: 'gpt-4o-transcribe',
    name: 'GPT-4o Transcribe',
    description:
      'Premium quality model for highest accuracy (limited parameters)',
    maxFileSize: 25 * 1024 * 1024,
    supportedFormats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'],
    supportedResponseFormats: ['json', 'text'],
    defaultResponseFormat: 'text',
    hasLimitedParams: true,
  },
];
