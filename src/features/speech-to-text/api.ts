import { STTParams, STTResponse } from './types';
import { $apiKey, $providerApiUrl } from '../chat-settings/model';
import { $selectedModelInfo } from '../models-select';

interface STTProviderConfig {
  endpoint: string;
  prepareRequest: (params: STTParams) => Promise<RequestInit>;
  parseResponse: (response: Response) => Promise<STTResponse>;
}

async function getProviderConfig(provider: 'voidai' | 'openai' | 'gemini'): Promise<STTProviderConfig> {
  const apiKey = $apiKey.getState();
  const providerUrl = $providerApiUrl.getState();
  
  if (!apiKey) {
    throw new Error('API key is not set');
  }

  const configs: Record<string, STTProviderConfig> = {
    voidai: {
      endpoint: `${providerUrl}/v1/audio/transcriptions`,
      prepareRequest: async (params) => {
        const formData = new FormData();
        formData.append('file', params.audio);
        formData.append('model', params.model || 'whisper-1');
        if (params.language) formData.append('language', params.language);
        if (params.prompt) formData.append('prompt', params.prompt);
        
        return {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: formData,
        };
      },
      parseResponse: async (response) => {
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Transcription failed: ${error}`);
        }
        
        const data = await response.json();
        return {
          text: data.text,
          language: data.language,
          duration: data.duration,
          segments: data.segments,
        };
      },
    },
    openai: {
      endpoint: 'https://api.openai.com/v1/audio/transcriptions',
      prepareRequest: async (params) => {
        const formData = new FormData();
        formData.append('file', params.audio);
        formData.append('model', params.model || 'whisper-1');
        if (params.language) formData.append('language', params.language);
        if (params.prompt) formData.append('prompt', params.prompt);
        
        return {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: formData,
        };
      },
      parseResponse: async (response) => {
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Transcription failed: ${error}`);
        }
        
        const data = await response.json();
        return {
          text: data.text,
          language: data.language,
          duration: data.duration,
          segments: data.segments,
        };
      },
    },
    gemini: {
      endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      prepareRequest: async (params) => {
        // Convert audio to base64 for Gemini
        const arrayBuffer = await params.audio.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        
        return {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: params.prompt || 'Please transcribe this audio file.',
              }, {
                inline_data: {
                  mime_type: params.audio.type || 'audio/mpeg',
                  data: base64,
                },
              }],
            }],
            generationConfig: {
              temperature: 0.1,
              topK: 1,
              topP: 0.1,
            },
          }),
        };
      },
      parseResponse: async (response) => {
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Transcription failed: ${error}`);
        }
        
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!text) {
          throw new Error('No transcription text in response');
        }
        
        return {
          text: text.trim(),
        };
      },
    },
  };

  return configs[provider];
}

export async function transcribeAudio(params: STTParams): Promise<STTResponse> {
  // Determine provider based on current model or default to voidai
  const currentModel = $selectedModelInfo.getState();
  let provider: 'voidai' | 'openai' | 'gemini' = 'voidai';
  
  if (currentModel?.id.includes('gemini')) {
    provider = 'gemini';
  } else if (currentModel?.id.includes('gpt-4o-transcribe')) {
    provider = 'openai';
  }
  
  const config = await getProviderConfig(provider);
  const requestInit = await config.prepareRequest(params);
  
  const response = await fetch(config.endpoint, requestInit);
  
  return config.parseResponse(response);
}