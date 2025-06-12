import { TTSParams, TTSResponse, VoiceProvider } from "./types";
import { $apiKey, $providerApiUrl } from "../chat-settings/model";

interface ProviderConfig {
  endpoint: string;
  headers: Record<string, string>;
  body: (params: TTSParams) => Record<string, any>;
  parseResponse: (response: Response) => Promise<TTSResponse>;
}

async function getProviderConfig(
  provider: VoiceProvider
): Promise<ProviderConfig> {
  const apiKey = $apiKey.getState();
  const providerUrl = $providerApiUrl.getState();

  if (!apiKey) {
    throw new Error("API key is not set");
  }

  const baseConfigs: Record<VoiceProvider, ProviderConfig> = {
    voidai: {
      endpoint: `${providerUrl}/audio/speech`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: (params) => ({
        model: params.model,
        input: params.text,
        voice: params.voice,
        response_format: params.format,
        ...(params.speed && params.model !== "gpt-4o-mini-tts"
          ? { speed: params.speed }
          : {}),
        ...(params.instructions && params.model === "gpt-4o-mini-tts"
          ? { instructions: params.instructions }
          : {}),
      }),
      parseResponse: async (response) => {
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`TTS failed: ${error}`);
        }
        const audio = await response.arrayBuffer();
        return {
          audio,
          format: "mp3", // Default format
        };
      },
    },
    openai: {
      endpoint: "https://api.openai.com/v1/audio/speech",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: (params) => ({
        model: params.model,
        input: params.text,
        voice: params.voice,
        response_format: params.format,
        ...(params.speed && params.model !== "gpt-4o-mini-tts"
          ? { speed: params.speed }
          : {}),
        ...(params.instructions && params.model === "gpt-4o-mini-tts"
          ? { instructions: params.instructions }
          : {}),
      }),
      parseResponse: async (response) => {
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`TTS failed: ${error}`);
        }
        const audio = await response.arrayBuffer();
        return {
          audio,
          format: "mp3",
        };
      },
    },
    gemini: {
      endpoint: `${providerUrl}/audio/speech`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: (params) => ({
        // OpenAI-style fields for compatibility
        model: params.model,
        input: params.text,
        voice: params.voice,
        response_format: params.format,
        ...(params.speed && params.speed !== 1.0 ? { speed: params.speed } : {}),
        
        // Gemini-style fields for native support
        contents: [{
          parts: [{
            text: params.text
          }]
        }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: params.voice
              }
            }
          }
        }
      }),
      parseResponse: async (response) => {
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`TTS failed: ${error}`);
        }
        
        // Try to parse as JSON first (Gemini native response)
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();
          const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          
          if (audioData) {
            // Convert base64 to ArrayBuffer (Gemini native response)
            const binaryString = atob(audioData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            return {
              audio: bytes.buffer,
              format: "wav",
            };
          }
        }
        
        // Fallback to binary audio data (OpenAI-style response)
        const audio = await response.arrayBuffer();
        return {
          audio,
          format: "wav", // Gemini TTS always returns WAV format
        };
      },
    },
  };

  return baseConfigs[provider];
}


export async function generateSpeechStream(
  params: TTSParams,
  onChunk?: (chunk: ArrayBuffer) => void
): Promise<Response> {
  // Handle GPT-4o audio models that use chat completions endpoint
  if (params.model === 'gpt-4o-audio-preview' || params.model === 'gpt-4o-audio-preview-2024-12-17') {
    const result = await generateSpeechWithChatCompletions(params);
    const blob = new Blob([result.audio]);
    return new Response(blob);
  }

  // Determine provider based on model - Gemini models still use VoidAI endpoint with hybrid format
  const provider: VoiceProvider = params.model.startsWith('gemini-') ? "gemini" : "voidai";
  const config = await getProviderConfig(provider);
    
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify(config.body(params)),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TTS failed: ${error}`);
  }

  // For streaming, return the response directly
  if (onChunk && response.body) {
    const reader = response.body.getReader();
    const chunks: ArrayBuffer[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert Uint8Array to ArrayBuffer
        const buffer = new ArrayBuffer(value.byteLength);
        const view = new Uint8Array(buffer);
        view.set(value);

        chunks.push(buffer);
        onChunk(buffer);
      }
    } finally {
      reader.releaseLock();
    }

    // Return a new response with the collected chunks
    const blob = new Blob(chunks);
    return new Response(blob);
  }

  return response;
}

export async function generateSpeech(params: TTSParams): Promise<TTSResponse> {
  // Handle GPT-4o audio models that use chat completions endpoint
  if (params.model === 'gpt-4o-audio-preview' || params.model === 'gpt-4o-audio-preview-2024-12-17') {
    return await generateSpeechWithChatCompletions(params);
  }

  // Determine provider based on model - Gemini models still use VoidAI endpoint with hybrid format
  const provider: VoiceProvider = params.model.startsWith('gemini-') ? "gemini" : "voidai";
  const config = await getProviderConfig(provider);
    
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify(config.body(params)),
  });

  const result = await config.parseResponse(response);

  // Override format with the requested format
  result.format = params.format;

  return result;
}

// Special handler for GPT-4o audio models using chat completions endpoint
async function generateSpeechWithChatCompletions(params: TTSParams): Promise<TTSResponse> {
  const apiKey = $apiKey.getState();
  const providerUrl = $providerApiUrl.getState();

  if (!apiKey) {
    throw new Error("API key is not set");
  }

  // Map audio format names to chat completions format
  const formatMapping: Record<string, string> = {
    'mp3': 'mp3',
    'wav': 'wav',
    'opus': 'opus',
    'flac': 'flac',
    'pcm': 'pcm16',
    'aac': 'wav' // AAC not supported, fallback to WAV
  };

  const audioFormat = formatMapping[params.format] || 'mp3';

  const requestBody = {
    model: params.model,
    messages: [
      {
        role: "user",
        content: params.text
      }
    ],
    modalities: ["text", "audio"],
    audio: {
      voice: params.voice,
      format: audioFormat
    }
  };

  const response = await fetch(`${providerUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat completions TTS failed: ${error}`);
  }

  const data = await response.json();
  
  // Extract audio data from the response
  const choice = data.choices?.[0];
  const audioData = choice?.message?.audio?.data;
  
  if (!audioData) {
    throw new Error("No audio data in chat completions response");
  }

  // Convert base64 to ArrayBuffer
  const binaryString = atob(audioData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return {
    audio: bytes.buffer,
    format: audioFormat === 'pcm16' ? 'pcm' : audioFormat as any,
  };
}
